-- =====================================================================
--  MIGRATION 4 – Hide/dismiss posts per user
--  Im Supabase SQL-Editor ausführen (nach migration_3.sql). Wiederholbar.
-- =====================================================================

create table if not exists hidden_posts (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references collab_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table hidden_posts enable row level security;

drop policy if exists "select own hidden" on hidden_posts;
create policy "select own hidden" on hidden_posts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "insert own hidden" on hidden_posts;
create policy "insert own hidden" on hidden_posts
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "delete own hidden" on hidden_posts;
create policy "delete own hidden" on hidden_posts
  for delete to authenticated using (user_id = auth.uid());
