-- Ensure uploads bucket exists
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Recreate policies idempotently
drop policy if exists "Public read uploads" on storage.objects;
drop policy if exists "Users can upload to uploads" on storage.objects;
drop policy if exists "Users can update uploads" on storage.objects;
drop policy if exists "Users can delete uploads" on storage.objects;

create policy "Public read uploads"
  on storage.objects
  for select
  using (bucket_id = 'uploads');

create policy "Users can upload to uploads"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'uploads');

create policy "Users can update uploads"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'uploads')
  with check (bucket_id = 'uploads');

create policy "Users can delete uploads"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'uploads');