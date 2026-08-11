-- =====================================================================
--  MIGRATION 3 – Notifications, Auto-Decline, Public Profiles, Realtime
--  Im Supabase SQL-Editor ausführen (nach migration_2.sql). Wiederholbar.
-- =====================================================================

-- ---------- Notifications ----------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,               -- 'new_request' | 'accepted' | 'declined'
  data       jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "update own notifications" on notifications;
create policy "update own notifications" on notifications
  for update to authenticated using (user_id = auth.uid());

-- ---------- Profiles readable by anon (shareable public profile pages) ----------
drop policy if exists "profiles are readable by authenticated" on profiles;
drop policy if exists "profiles are readable" on profiles;
create policy "profiles are readable" on profiles
  for select to anon, authenticated using (true);

-- ---------- Notification helper (bypasses RLS) ----------
create or replace function notify_user(target uuid, ntype text, ndata jsonb)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, data) values (target, ntype, ndata);
$$;

-- ---------- On new request -> notify post author ----------
create or replace function on_request_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid; ptitle text; rname text;
begin
  select author_id, title into author, ptitle from collab_posts where id = NEW.post_id;
  select username into rname from profiles where id = NEW.requester_id;
  perform notify_user(author, 'new_request',
    jsonb_build_object('post_id', NEW.post_id, 'title', ptitle, 'from', rname));
  return NEW;
end;
$$;

drop trigger if exists trg_request_insert on collab_requests;
create trigger trg_request_insert after insert on collab_requests
  for each row execute function on_request_insert();

-- ---------- On status change -> notify + accept side effects ----------
create or replace function on_request_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare ptitle text;
begin
  if NEW.status is distinct from OLD.status then
    select title into ptitle from collab_posts where id = NEW.post_id;

    if NEW.status = 'accepted' then
      perform notify_user(NEW.requester_id, 'accepted',
        jsonb_build_object('post_id', NEW.post_id, 'title', ptitle));
      -- close the post so it leaves the board
      update collab_posts set status = 'closed' where id = NEW.post_id;
      -- auto-decline the other pending requests (this fires their own notify)
      update collab_requests
        set status = 'declined', responded_at = now()
        where post_id = NEW.post_id and status = 'pending' and id <> NEW.id;
    elsif NEW.status = 'declined' then
      perform notify_user(NEW.requester_id, 'declined',
        jsonb_build_object('post_id', NEW.post_id, 'title', ptitle));
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_request_update on collab_requests;
create trigger trg_request_update after update on collab_requests
  for each row execute function on_request_update();

-- ---------- Realtime for notifications (idempotent) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
