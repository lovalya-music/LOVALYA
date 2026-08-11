import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { badgeFor } from "../lib/badges";
import Avatar from "./Avatar";

export default function ArtistsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, spotify_url, total_streams");
      const { data: collabs } = await supabase
        .from("collabs")
        .select("poster_id, joiner_id");

      const posted = {};
      const joined = {};
      (collabs || []).forEach((c) => {
        posted[c.poster_id] = (posted[c.poster_id] || 0) + 1;
        joined[c.joiner_id] = (joined[c.joiner_id] || 0) + 1;
      });

      const built = (profiles || []).map((p) => {
        const pc = posted[p.id] || 0;
        const jc = joined[p.id] || 0;
        return { ...p, posted: pc, joined: jc, total: pc + jc };
      });
      built.sort(
        (a, b) => b.total - a.total || (b.total_streams || 0) - (a.total_streams || 0)
      );

      setRows(built);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">Directory</div>
        <h2 style={{ margin: "2px 0" }}>Artists</h2>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty">No artists yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="artists-table">
            <thead>
              <tr>
                <th>Artist</th>
                <th>Badge</th>
                <th>Spotify</th>
                <th className="num">Total streams</th>
                <th className="num">Posted</th>
                <th className="num">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button className="post-author" onClick={() => navigate("/u/" + r.id)}>
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
