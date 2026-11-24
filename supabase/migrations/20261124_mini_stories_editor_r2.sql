-- Mini Stories: project isolation, R2 media metadata, and editor-safe permissions.
-- Depends on 20261123_multi_product_catalog.sql.
begin;

alter table public.projects
  add column if not exists product_line text,
  add column if not exists package_code text,
  add column if not exists published_expires_at timestamptz,
  add column if not exists content_version integer not null default 1;

-- Derive product line from the selected template; clients cannot choose it themselves.
update public.projects p
set product_line = coalesce(t.product_line, 'wedding')
from public.templates t
where t.id = p.template_id and p.product_line is null;

update public.projects set product_line = 'wedding' where product_line is null;
alter table public.projects alter column product_line set default 'wedding';
alter table public.projects alter column product_line set not null;
alter table public.projects drop constraint if exists projects_product_line_check;
alter table public.projects add constraint projects_product_line_check
  check (product_line in ('wedding', 'mini_stories'));
alter table public.projects drop constraint if exists projects_package_code_check;
alter table public.projects add constraint projects_package_code_check
  check (package_code is null or package_code in ('basic', 'plus', 'premium'));
alter table public.projects drop constraint if exists projects_expiry_after_publish_check;
alter table public.projects add constraint projects_expiry_after_publish_check
  check (published_expires_at is null or (published_at is not null and published_expires_at > published_at));

create or replace function public.set_project_product_line()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_line text;
begin
  select t.product_line into v_line from public.templates t where t.id = new.template_id and t.is_active = true;
  if v_line is null then raise exception 'Template tidak aktif atau tidak ditemukan'; end if;
  if tg_op = 'UPDATE' and new.template_id <> old.template_id then
    raise exception 'Template project tidak dapat diganti setelah project dibuat';
  end if;
  new.product_line := v_line;
  return new;
end;
$$;

drop trigger if exists projects_set_product_line on public.projects;
create trigger projects_set_product_line
before insert or update of template_id on public.projects
for each row execute function public.set_project_product_line();

create unique index if not exists projects_id_owner_unique_idx
  on public.projects(id, owner_id);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_provider text not null default 'cloudflare_r2' check (storage_provider = 'cloudflare_r2'),
  object_key text not null unique,
  original_filename text,
  mime_type text not null check (mime_type in ('image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 2097152),
  width integer not null check (width between 1 and 6000),
  height integer not null check (height between 1 and 6000),
  position integer not null default 0 check (position between 0 and 29),
  created_at timestamptz not null default now(),
  unique(project_id, position),
  constraint media_assets_owner_project_fk
    foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete cascade
);

create index if not exists media_assets_project_position_idx
  on public.media_assets(project_id, position);
create index if not exists projects_line_status_idx
  on public.projects(product_line, status);

alter table public.media_assets enable row level security;

drop policy if exists "Owners can view project media metadata" on public.media_assets;
create policy "Owners can view project media metadata"
on public.media_assets for select to authenticated
using (owner_id = (select auth.uid()));

-- No client INSERT/UPDATE/DELETE policies: only the authenticated R2 Edge Function
-- using the service role may register or remove object metadata.
revoke all on public.media_assets from anon, authenticated;
grant select on public.media_assets to authenticated;
grant all on public.media_assets to service_role;

-- Restrict editor updates to content fields. Payment, ownership, publication,
-- expiry, product line, package and template fields remain server-controlled.
revoke update on public.projects from authenticated;
grant update (title, content, updated_at, content_version) on public.projects to authenticated;

commit;
