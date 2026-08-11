-- =====================================================================
--  MIGRATION 2 – Profile-Extras, Zeitstempel, Avatare
--  Im Supabase SQL-Editor ausführen (nach schema.sql). Wiederholbar.
-- =====================================================================

-- Profile: Bio, Avatar, Custom-Links
alter table profiles add column if not exists bio        text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists links      jsonb not null default '[]';

-- Requests: Zeitpunkt der Annahme/Ablehnung
alter table collab_requests add column if not exists responded_at timestamptz;

-- Storage-Bucket für Profilbilder (öffentlich)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "authenticated can upload avatars" on storage.objects;
create policy "authenticated can upload avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "authenticated can update avatars" on storage.objects;
create policy "authenticated can update avatars"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "public can read avatars" on storage.objects;
create policy "public can read avatars"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
