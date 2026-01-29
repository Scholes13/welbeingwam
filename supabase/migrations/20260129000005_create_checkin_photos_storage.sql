-- Create checkin-photos storage bucket for check-in photos
insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own photos
create policy "Users can upload their own check-in photos"
on storage.objects for insert
with check (
  bucket_id = 'checkin-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to check-in photos
create policy "Public can view check-in photos"
on storage.objects for select
using (bucket_id = 'checkin-photos');
