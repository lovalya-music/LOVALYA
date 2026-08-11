# Producer Hub – Collab Board (Phase 1)

The first pillar of the platform: a board where producers/vocalists create
collab posts, filter them, and send requests. Contact info (Discord etc.) is
hidden by default via a hide switch and only released after a **confirmed**
collab – enforced at the database level (Row Level Security), not just in the
frontend.

## Stack
- React + Vite (web)
- Supabase (Auth + Postgres + Storage)

## Setup

### 1. Create a Supabase project
- Create a new project on supabase.com.
- Under **Project Settings → API** you'll find the `Project URL` and the
  `anon public key`.

### 2. Set up the database
- Open the **SQL Editor** in the Supabase dashboard.
- Paste the contents of `schema.sql` and run it.
- This creates all tables + RLS policies.

### 3. Storage bucket for audio previews (required – posts must have audio)
- In the dashboard: **Storage → New bucket** → name it `previews` → enable **Public**.
- Posts require an audio snippet, so this bucket is needed for creating posts.

### 4. Auth setting (for quick testing)
- **Authentication → Providers → Email**: for local testing you can temporarily
  disable "Confirm email" so you can sign in right away. Turn it back on for
  production.

### 5. Run locally
```bash
cp .env.example .env      # then fill in URL + anon key
npm install
npm run dev
```
Runs on http://localhost:5173

## Data model (quick overview)
- `profiles` – public fields (username, roles, genres, streams, Spotify)
- `private_contacts` – contact + `contact_hidden` (strictly protected via RLS)
- `collab_posts` – the board posts
- `collab_requests` – requests with status `pending` / `accepted` / `declined`

## Flow
1. Register → set up profile (username + role required).
2. **Board**: browse posts, filter by role/genre, "Send request".
3. **Requests**: the post author sees incoming requests, accepts or declines.
   On acceptance, both sides' contact info is released.

## Next steps (ideas)
- Manually set a post to "closed" + auto-expire after 30 days.
- Realtime notifications (Supabase Realtime) instead of reload.
- After that: sound/preset sharing + credit & bounty systems as their own pillars.
