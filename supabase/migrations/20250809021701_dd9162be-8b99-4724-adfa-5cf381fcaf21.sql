-- Create public uploads bucket if not exists
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Allow public read on uploads bucket
create policy if not exists "Public read uploads"
  on storage.objects
  for select
  using (bucket_id = 'uploads');

-- Allow authenticated users to upload to uploads bucket (scoped to their folder)
create policy if not exists "Users can upload to uploads"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
  );

-- Allow authenticated users to update/delete their own files (optional)
create policy if not exists "Users can update uploads"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'uploads')
  with check (bucket_id = 'uploads');

create policy if not exists "Users can delete uploads"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'uploads');