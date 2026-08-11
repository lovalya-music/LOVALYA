-- =====================================================================
--  MIGRATION 5 – Public collabs (with partner), badges source
--  Im Supabase SQL-Editor ausführen (nach migration_4.sql). Wiederholbar.
-- =====================================================================

-- Confirmed collabs, publicly readable (so anyone can see who worked with whom)
create table if not exists collabs (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references collab_posts(id) on delete set null,
  poster_id  uuid not null references profiles(id) on delete cascade,
  joiner_id  uuid not null references profiles(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);
create index if not exists collabs_poster_idx on collabs (poster_id);
create index if not exists collabs_joiner_idx on collabs (joiner_id);

alter table collabs enable row level security;

drop policy if exists "collabs public read" on collabs;
create policy "collabs public read" on collabs
  for select to anon, authenticated using (true);

drop policy if exists "collabs poster delete" on collabs;
create policy "collabs poster delete" on collabs
  for delete to authenticated using (poster_id = auth.uid());

-- Update the accept handler to also record the confirmed collab
create or replace function on_request_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare ptitle text; pauthor uuid;
begin
  if NEW.status is distinct from OLD.status then
    select title, author_id into ptitle, pauthor from collab_posts where id = NEW.post_id;

    if NEW.status = 'accepted' then
      perform notify_user(NEW.requester_id, 'accepted',
        jsonb_build_object('post_id', NEW.post_id, 'title', ptitle));
      update collab_posts set status = 'closed' where id = NEW.post_id;
      update collab_requests
        set status = 'declined', responded_at = now()
        where post_id = NEW.post_id and status = 'pending' and id <> NEW.id;
      insert into collabs (post_id, poster_id, joiner_id, title)
      select NEW.post_id, pauthor, NEW.requester_id, ptitle
      where not exists (
        select 1 from collabs where post_id = NEW.post_id and joiner_id = NEW.requester_id
      );
    elsif NEW.status = 'declined' then
      perform notify_user(NEW.requester_id, 'declined',
        jsonb_build_object('post_id', NEW.post_id, 'title', ptitle));
    end if;
  end if;
  return NEW;
end;
$$;
