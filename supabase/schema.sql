-- Sela Cerita initial Supabase schema
-- Apply in Supabase SQL Editor after creating a new Supabase project.
-- This schema intentionally keeps payment verification and publishing under trusted admin/server control.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id text primary key,
  name text not null,
  description text,
  preview_path text,
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null references public.templates(id),
  title text not null default 'Cerita Baru',
  slug text unique,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending_payment', 'ready_to_publish', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  package_code text not null,
  amount integer not null check (amount >= 0),
  currency text not null default 'IDR',
  payment_provider text,
  provider_reference text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'expired', 'refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists orders_owner_id_idx on public.orders(owner_id);
create index if not exists orders_project_id_idx on public.orders(project_id);

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.projects enable row level security;
alter table public.orders enable row level security;

-- Profile: a user can view and update their own profile.
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "Users can update own display profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and role = 'customer'
);

-- Templates: active templates are visible to signed-in customers.
create policy "Authenticated users can view active templates"
on public.templates for select
to authenticated
using (is_active = true);

-- Projects: customers can access only projects they own.
create policy "Users can view own projects"
on public.projects for select
to authenticated
using (owner_id = (select auth.uid()));

create policy "Users can create own projects"
on public.projects for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and status = 'draft'
  and published_at is null
  and exists (
    select 1 from public.templates t
    where t.id = template_id and t.is_active = true
  )
);

create policy "Users can update own draft projects"
on public.projects for update
to authenticated
using (
  owner_id = (select auth.uid())
  and status in ('draft', 'pending_payment')
)
with check (
  owner_id = (select auth.uid())
  and status in ('draft', 'pending_payment')
  and published_at is null
);

-- Orders: customers may view their own orders and create pending orders.
-- No customer UPDATE policy is provided: payment state is trusted-server controlled.
create policy "Users can view own orders"
on public.orders for select
to authenticated
using (owner_id = (select auth.uid()));

create policy "Users can create own pending orders"
on public.orders for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and payment_status = 'pending'
  and verified_at is null
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

-- Seed the current public demo templates.
insert into public.templates (id, name, description)
values
  ('bloom', 'Bloom', 'Soft, romantic, and full of warmth.'),
  ('chapter', 'Chapter', 'Timeless, clean, and a little poetic.'),
  ('playdate', 'Playdate', 'Fun, colorful, and unapologetically you.')
on conflict (id) do nothing;

-- Storage bucket and object policies are intentionally created in a separate
-- setup step after confirming the desired photo visibility and retention model.
