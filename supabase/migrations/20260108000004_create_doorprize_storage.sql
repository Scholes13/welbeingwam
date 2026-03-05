-- Create doorprize-assets bucket if not exists
insert into storage.buckets (id, name, public)
values ('doorprize-assets', 'doorprize-assets', true)
on conflict (id) do nothing;

-- Policies
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'doorprize-assets' );

create policy "Auth Upload"
  on storage.objects for insert
  with check ( bucket_id = 'doorprize-assets' and auth.role() = 'authenticated' );

create policy "Auth Update"
  on storage.objects for update
  using ( bucket_id = 'doorprize-assets' and auth.role() = 'authenticated' );

create policy "Auth Delete"
  on storage.objects for delete
  using ( bucket_id = 'doorprize-assets' and auth.role() = 'authenticated' );
