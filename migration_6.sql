-- =====================================================================
--  MIGRATION 6 – Storage hardening
--  Users may only write/update/delete files inside their OWN folder
--  (uploads are stored under "<userId>/..."). Public read stays.
--  Im Supabase SQL-Editor ausführen. Wiederholbar.
-- =====================================================================

-- ---------- PREVIEWS ----------
drop policy if exists "authenticated can upload previews" on storage.objects;
drop policy if exists "previews own folder insert" on storage.objects;
create policy "previews own folder insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "previews own folder update" on storage.objects;
create policy "previews own folder update" on storage.objects
  for update to authenticated
  using (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "previews own folder delete" on storage.objects;
create policy "previews own folder delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- public read stays (recreate to be safe)
drop policy if exists "public can read previews" on storage.objects;
create policy "public can read previews" on storage.objects
  for select to public using (bucket_id = 'previews');

-- ---------- AVATARS ----------
drop policy if exists "authenticated can upload avatars" on storage.objects;
drop policy if exists "avatars own folder insert" on storage.objects;
create policy "avatars own folder insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "authenticated can update avatars" on storage.objects;
drop policy if exists "avatars own folder update" on storage.objects;
create policy "avatars own folder update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars own folder delete" on storage.objects;
create policy "avatars own folder delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "public can read avatars" on storage.objects;
create policy "public can read avatars" on storage.objects
  for select to public using (bucket_id = 'avatars');
