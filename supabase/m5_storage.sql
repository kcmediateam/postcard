-- Postcard — Milestone 5: Storage bucket for design images. Run AFTER schema.sql.
-- Idempotent.

-- Public bucket: postcard art is not sensitive, and Lob must fetch front/back
-- images by URL at send time. Writes are still restricted by RLS below.
insert into storage.buckets (id, name, public)
values ('designs', 'designs', true)
on conflict (id) do update set public = true;

-- Anyone can read (bucket is public); only the owner can write to their folder.
-- Object path convention: "{auth.uid()}/{filename}".
drop policy if exists "designs_public_read" on storage.objects;
create policy "designs_public_read" on storage.objects
  for select using (bucket_id = 'designs');

drop policy if exists "designs_insert_own" on storage.objects;
create policy "designs_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "designs_update_own" on storage.objects;
create policy "designs_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "designs_delete_own" on storage.objects;
create policy "designs_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);
