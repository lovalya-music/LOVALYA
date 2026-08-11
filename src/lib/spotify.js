// Turn a Spotify link into an embed URL (playable preview, like Discord's).
// Returns null if it's not a recognizable Spotify link.
export function spotifyEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(
    /open\.spotify\.com\/(?:intl-[a-z]+\/)?(artist|track|album|playlist)\/([A-Za-z0-9]+)/
  );
  if (!m) return null;
  const [, type, id] = m;
  return `https://open.spotify.com/embed/${type}/${id}`;
}
