import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Early, clear hint instead of a cryptic network error later on.
  console.error(
    "Supabase-Env fehlt. Lege eine .env an (siehe .env.example) und starte dev neu."
  );
}

export const supabase = createClient(url, anonKey);

// Controlled vocabulary – keeps filters/tags consistent and typo-free.
export const ROLES = [
  "Co-Prod",
  "Vocalist",
  "Mixing",
  "Mastering",
  "Vocal-Chops",
  "Sound Design",
  "Music Prod",
];

export const GENRES = [
  "Phonk",
  "Hardtekk",
  "Angelcore",
  "EDM",
  "Brazilian Funk",
  "House",
  "Ambient",
  "Hyperpop",
  "Other",
];
