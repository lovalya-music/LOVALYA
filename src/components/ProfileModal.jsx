import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { badgeFor } from "../lib/badges";
import Avatar from "./Avatar";

// Opens when a username is clicked. Shows the public profile of that user.
export default function ProfileModal({ userId, onClose }) {
  const [p, setP] = useState(null);
  const [collabCount, setCollabCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setP(data));
    supabase
      .from("collabs")
      .select("id", { count: "exact", head: true })
      .or(`poster_id.eq.${userId},joiner_id.eq.${userId}`)
      .then(({ count }) => setCollabCount(count || 0));
  }, [userId]);

  const links = p?.links || [];

  const go = () => {
    onClose();
    navigate("/u/" + userId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        {!p ? (
          <div className="muted">Loading…</div>
        ) : (
          <>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <Avatar url={p.avatar_url} name={p.username} size={56} onClick={go} />
              <div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <h3
                    className="glow-name"
                    style={{ cursor: "pointer" }}
                    onClick={go}
                  >
                    {p.username}
                  </h3>
                  <span className="tag accent">{badgeFor(collabCount)}</span>
                </div>
                <div className="chips" style={{ marginTop: 4 }}>
                  {(p.roles || []).map((r) => (
                    <span key={r} className="tag">{r}</span>
                  ))}
                </div>
              </div>
            </div>

            {p.bio && <p style={{ marginTop: 14 }}>{p.bio}</p>}

            {(p.genres || []).length > 0 && (
              <div className="chips" style={{ marginTop: 12 }}>
                {p.genres.map((g) => (
                  <span key={g} className="chip static">{g}</span>
                ))}
              </div>
            )}

            {(p.monthly_listeners != null || p.total_streams != null) && (
              <div
                className="row"
                style={{ gap: 18, marginTop: 14, fontFamily: "var(--mono)", fontSize: 12 }}
              >
                {p.monthly_listeners != null && (
                  <span className="muted">
                    {Number(p.monthly_listeners).toLocaleString()} monthly
                  </span>
                )}
                {p.total_streams != null && (
                  <span className="muted">
                    {Number(p.total_streams).toLocaleString()} streams
                  </span>
                )}
              </div>
            )}

            {(p.spotify_url || links.length > 0) && (
              <div className="chips" style={{ marginTop: 14 }}>
                {p.spotify_url && (
                  <a className="link-row" href={p.spotify_url} target="_blank" rel="noreferrer">
                    Spotify ↗
                  </a>
                )}
                {links.map((l, i) => (
                  <a key={i} className="link-row" href={l.url} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}

            <div className="row" style={{ marginTop: 18, gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  navigate("/u/" + userId);
                }}
              >
                View full profile
              </button>
              <button className="btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
