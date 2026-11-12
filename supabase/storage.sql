-- Sela Cerita private project photo storage
-- Run once in Supabase SQL Editor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-photos', 'project-photos', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Project owners can view their photos" on storage.objects;
create policy "Project owners can view their photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "Project owners can upload their photos" on storage.objects;
create policy "Project owners can upload their photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status in ('draft','pending_payment')
  )
);

drop policy if exists "Project owners can delete their photos" on storage.objects;
create policy "Project owners can delete their photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
      and p.status in ('draft','pending_payment')
  )
);
