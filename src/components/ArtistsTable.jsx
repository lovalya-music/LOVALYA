import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { badgeFor } from "../lib/badges";
import Avatar from "./Avatar";

export default function ArtistsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: "total", dir: "desc" });
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, spotify_url, total_streams");
      const { data: posts } = await supabase
        .from("collab_posts")
        .select("author_id");
      const { data: collabs } = await supabase
        .from("collabs")
        .select("poster_id, joiner_id");

      // Posted = number of collab posts a user created.
      const postsMade = {};
      (posts || []).forEach((p) => {
        postsMade[p.author_id] = (postsMade[p.author_id] || 0) + 1;
      });

      // Joined = confirmed collabs a user joined; confirmed total drives the badge.
      const joined = {};
      const confirmed = {};
      (collabs || []).forEach((c) => {
        joined[c.joiner_id] = (joined[c.joiner_id] || 0) + 1;
        confirmed[c.poster_id] = (confirmed[c.poster_id] || 0) + 1;
        confirmed[c.joiner_id] = (confirmed[c.joiner_id] || 0) + 1;
      });

      const built = (profiles || []).map((p) => ({
        ...p,
        posted: postsMade[p.id] || 0, // posts created
        joined: joined[p.id] || 0, // confirmed collabs joined
        total: confirmed[p.id] || 0, // confirmed collabs (badge)
      }));
      setRows(built);
      setLoading(false);
    })();
  }, []);

  function toggleSort(key) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "username" ? "asc" : "desc" }
    );
  }

  const sorted = useMemo(() => {
    const arr = [...rows];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      let av;
      let bv;
      if (key === "username") {
        av = (a.username || "").toLowerCase();
        bv = (b.username || "").toLowerCase();
      } else if (key === "streams") {
        av = a.total_streams || 0;
        bv = b.total_streams || 0;
      } else {
        av = a[key] || 0; // total (badge), posted, joined
        bv = b[key] || 0;
      }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort]);

  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">Directory</div>
        <h2 style={{ margin: "2px 0" }}>Artists</h2>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="empty">No artists yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="artists-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort("username")}>Artist{arrow("username")}</th>
                <th className="sortable" onClick={() => toggleSort("total")}>Badge{arrow("total")}</th>
                <th>Spotify</th>
                <th className="num sortable" onClick={() => toggleSort("streams")}>Total streams{arrow("streams")}</th>
                <th className="num sortable" onClick={() => toggleSort("posted")}>Posted{arrow("posted")}</th>
                <th className="num sortable" onClick={() => toggleSort("joined")}>Joined{arrow("joined")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="post-author"
                      onClick={() => navigate("/u/" + r.id, { state: { fromView: "artists" } })}
                    >
                      <Avatar url={r.avatar_url} name={r.username} size={26} />
                      <span className="post-author-name">{r.username}</span>
                    </button>
                  </td>
                  <td>
                    <span className="tag accent">{badgeFor(r.total)}</span>
                  </td>
                  <td>
                    {r.spotify_url ? (
                      <a className="link-row" href={r.spotify_url} target="_blank" rel="noreferrer">
                        Spotify ↗
                      </a>
                    ) : (
                      <span className="muted">n/a</span>
                    )}
                  </td>
                  <td className="num">
                    {r.total_streams != null ? Number(r.total_streams).toLocaleString() : "n/a"}
                  </td>
                  <td className="num">{r.posted}</td>
                  <td className="num">{r.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
