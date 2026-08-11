-- =====================================================================
--  PRODUCER HUB – Collab-Board Schema (Phase 1)
--  Für Supabase (Postgres). Im SQL-Editor deines Projekts einmal ausführen.
--
--  Enthält: profiles, private_contacts, collab_posts, collab_requests
--  Wichtig: Row Level Security (RLS) erzwingt das Kontakt-Verstecken auf
--  DB-Ebene. Das ist der Grund für die separate Tabelle private_contacts –
--  RLS wirkt zeilenweise, kann also keine einzelne Spalte verstecken.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PROFILES  (öffentlich lesbare Felder)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text unique not null,
  roles             text[]  not null default '{}',   -- z.B. {"Music Prod","Vocalist"}
  genres            text[]  not null default '{}',   -- z.B. {"Phonk","Hardtekk"}
  monthly_listeners integer,                          -- optional, self-reported
  total_streams     bigint,                           -- optional, self-reported
  spotify_url       text,                             -- optional
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- username-Format leicht absichern (3–24 Zeichen, keine Leerzeichen)
alter table profiles
  add constraint username_format
  check (char_length(username) between 3 and 24 and username !~ '\s');

alter table profiles enable row level security;

-- Jeder eingeloggte User darf alle öffentlichen Profile lesen (fürs Board)
create policy "profiles are readable by authenticated"
  on profiles for select
  to authenticated
  using (true);

-- Nur du selbst darfst dein Profil anlegen / ändern / löschen
create policy "insert own profile"
  on profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "update own profile"
  on profiles for update to authenticated
  using (auth.uid() = id);

create policy "delete own profile"
  on profiles for delete to authenticated
  using (auth.uid() = id);


-- ---------------------------------------------------------------------
-- 2. PRIVATE_CONTACTS  (Kontakt + Hide-Switch, streng geschützt)
-- ---------------------------------------------------------------------
create table if not exists private_contacts (
  user_id        uuid primary key references profiles(id) on delete cascade,
  contact        text not null default '',   -- Discord-User o.ä.
  contact_hidden boolean not null default true
);

alter table private_contacts enable row level security;

-- Helfer: gibt es eine ANGENOMMENE Collab zwischen mir und other_user?
-- security definer => läuft mit erhöhten Rechten, umgeht RLS der Subquery sauber.
create or replace function has_accepted_collab(other_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from collab_requests cr
    join collab_posts cp on cp.id = cr.post_id
    where cr.status = 'accepted'
      and (
        (cr.requester_id = auth.uid() and cp.author_id = other_user)
        or
        (cp.author_id = auth.uid() and cr.requester_id = other_user)
      )
  );
$$;

-- Kontakt sichtbar wenn:
--   (a) es dein eigener ist, ODER
--   (b) der Hide-Switch aus ist (contact_hidden = false), ODER
--   (c) ihr eine bestätigte Collab habt.
create policy "read contact when allowed"
  on private_contacts for select to authenticated
  using (
    user_id = auth.uid()
    or contact_hidden = false
    or has_accepted_collab(user_id)
  );

create policy "insert own contact"
  on private_contacts for insert to authenticated
  with check (user_id = auth.uid());

create policy "update own contact"
  on private_contacts for update to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 3. COLLAB_POSTS  (das Board)
-- ---------------------------------------------------------------------
create table if not exists collab_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references profiles(id) on delete cascade,
  title       text not null,
  looking_for text[] not null default '{}',   -- gesuchte Rollen: {"Vocals","Mixing"}
  offering    text not null default '',        -- was ich biete (Freitext)
  genres      text[] not null default '{}',
  description text not null default '',
  preview_url text,                            -- kurzer Audio-Schnipsel (Storage)
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz                      -- optional, für Auto-Ablauf später
);

create index if not exists collab_posts_status_idx on collab_posts (status, created_at desc);

alter table collab_posts enable row level security;

create policy "posts readable by authenticated"
  on collab_posts for select to authenticated
  using (true);

create policy "insert own post"
  on collab_posts for insert to authenticated
  with check (author_id = auth.uid());

create policy "update own post"
  on collab_posts for update to authenticated
  using (author_id = auth.uid());

create policy "delete own post"
  on collab_posts for delete to authenticated
  using (author_id = auth.uid());


-- ---------------------------------------------------------------------
-- 4. COLLAB_REQUESTS  (Anfrage -> Annehmen/Ablehnen)
-- ---------------------------------------------------------------------
create table if not exists collab_requests (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references collab_posts(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at   timestamptz not null default now(),
  unique (post_id, requester_id)   -- nur eine Anfrage pro Post pro User
);

create index if not exists collab_requests_post_idx on collab_requests (post_id);
create index if not exists collab_requests_requester_idx on collab_requests (requester_id);

alter table collab_requests enable row level security;

-- Sichtbar: Anfragen die ICH gestellt habe, ODER Anfragen auf MEINEN Posts.
create policy "read own or incoming requests"
  on collab_requests for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from collab_posts cp
      where cp.id = post_id and cp.author_id = auth.uid()
    )
  );

-- Anfrage stellen: als du selbst, aber NICHT auf deinen eigenen Post.
create policy "create request (not on own post)"
  on collab_requests for insert to authenticated
  with check (
    requester_id = auth.uid()
    and not exists (
      select 1 from collab_posts cp
      where cp.id = post_id and cp.author_id = auth.uid()
    )
  );

-- Status ändern (annehmen/ablehnen): nur der Post-Autor.
create policy "post author updates request"
  on collab_requests for update to authenticated
  using (
    exists (
      select 1 from collab_posts cp
      where cp.id = post_id and cp.author_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------
-- 5. updated_at automatisch pflegen (nur profiles)
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();
