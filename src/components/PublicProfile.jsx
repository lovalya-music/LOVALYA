import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "../lib/format";
import { badgeFor } from "../lib/badges";
import { spotifyEmbedUrl } from "../lib/spotify";
import Avatar from "./Avatar";
import HiddenPosts from "./HiddenPosts";
import PostView from "./PostView";
import Reveal from "./Reveal";

// Full-page, shareable profile. Route: /u/:userId
// Also used inside the "Profile" tab for your own profile (isSelf).
export default function PublicProfile({ userId: propUserId, isSelf, hasSession, onEdit }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = propUserId || params.userId;

  function goBack() {
    if (location.state?.fromView) navigate("/app", { state: { view: location.state.fromView } });
    else navigate(-1);
  }

  const [p, setP] = useState(null);
  const [collabs, setCollabs] = useState([]);
  const [openPosts, setOpenPosts] = useState([]);
  const [carousel, setCarousel] = useState(0);
  const [slideDir, setSlideDir] = useState("next");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // Confirmed collabs (public) + partner names.
      const { data: cData } = await supabase
        .from("collabs")
        .select("id, poster_id, joiner_id, title, created_at")
        .or(`poster_id.eq.${userId},joiner_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      const rows = cData || [];
      const partnerIds = [
        ...new Set(rows.map((c) => (c.poster_id === userId ? c.joiner_id : c.poster_id))),
      ];
      let names = {};
      if (partnerIds.length) {
        const { data: pp } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", partnerIds);
        (pp || []).forEach((x) => (names[x.id] = x.username));
      }
      const builtCollabs = rows.map((c) => {
        const partnerId = c.poster_id === userId ? c.joiner_id : c.poster_id;
        return {
          id: c.id,
          title: c.title,
          at: c.created_at,
          role: c.poster_id === userId ? "posted" : "joined",
          partnerId,
          partnerName: names[partnerId] || "unknown",
        };
      });

      // Currently open posts (only readable when logged in).
      let open = [];
      if (hasSession) {
        const { data: op } = await supabase
          .from("collab_posts")
          .select(
            "*, author:profiles!collab_posts_author_id_fkey(id, username, roles, genres, avatar_url)"
          )
          .eq("author_id", userId)
          .eq("status", "open")
          .order("created_at", { ascending: false });
        open = op || [];
      }

      if (alive) {
        setP(prof);
        setCollabs(builtCollabs);
        setOpenPosts(open);
        setCarousel(0);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, hasSession]);

  function share() {
    const url = `${window.location.origin}/u/${userId}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <div className="empty">Loading…</div>;
  if (!p) return <div className="empty">Profile not found.</div>;

  const links = p.links || [];
  const badge = badgeFor(collabs.length);

  return (
    <div className="grid" style={{ gap: 18 }}>
      {!isSelf && (
        <button className="tab" style={{ alignSelf: "flex-start" }} onClick={goBack}>
          ← Back
        </button>
      )}

      <div className="card grid" style={{ gap: 16 }}>
        <div className="profile-hero">
          <Avatar url={p.avatar_url} name={p.username} size={84} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h1>{p.username}</h1>
              <span className="tag accent">{badge}</span>
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
              {(p.roles || []).map((r) => (
                <span key={r} className="tag accent">{r}</span>
              ))}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={share}>{copied ? "Copied ✓" : "Share"}</button>
            {isSelf && <button className="btn btn-primary" onClick={onEdit}>Edit</button>}
          </div>
        </div>

        {p.bio && <p style={{ margin: 0 }}>{p.bio}</p>}

        {(p.genres || []).length > 0 && (
          <div className="chips">
            {p.genres.map((g) => (
              <span key={g} className="chip static">{g}</span>
            ))}
          </div>
        )}

        {(p.monthly_listeners != null || p.total_streams != null) && (
          <div className="row" style={{ gap: 22, fontFamily: "var(--mono)", fontSize: 13 }}>
            {p.monthly_listeners != null && (
              <span className="muted">
                {Number(p.monthly_listeners).toLocaleString()} monthly listeners
              </span>
            )}
            {p.total_streams != null && (
              <span className="muted">
                {Number(p.total_streams).toLocaleString()} total streams
              </span>
            )}
          </div>
        )}

        {(p.spotify_url || links.length > 0) && (
          <div className="chips">
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

        {spotifyEmbedUrl(p.spotify_url) && (
          <iframe
            className="spotify-embed"
            src={spotifyEmbedUrl(p.spotify_url)}
            width="100%"
            height="352"
            frameBorder="0"
            loading="lazy"
            title="Spotify"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        )}
      </div>

      {/* Currently open collabs — carousel */}
      {hasSession && openPosts.length > 0 && (
        <Reveal>
        <div className="grid">
          <div className="eyebrow">Open collabs</div>
          <div className="carousel">
            {openPosts.length > 1 && (
              <button
                className="carousel-arrow"
                onClick={() => {
                  setSlideDir("prev");
                  setCarousel((c) => (c - 1 + openPosts.length) % openPosts.length);
                }}
                aria-label="Previous"
              >
                ‹
              </button>
            )}
            <div className="carousel-window">
              <div key={carousel} className={"carousel-slide " + slideDir}>
                <PostView post={openPosts[carousel]} />
              </div>
            </div>
            {openPosts.length > 1 && (
              <button
                className="carousel-arrow"
                onClick={() => {
                  setSlideDir("next");
                  setCarousel((c) => (c + 1) % openPosts.length);
                }}
                aria-label="Next"
              >
                ›
              </button>
            )}
          </div>
          {openPosts.length > 1 && (
            <div className="carousel-count">
              {carousel + 1}/{openPosts.length}
            </div>
          )}
        </div>
        </Reveal>
      )}

      {/* Recent (confirmed) collabs */}
      <div className="grid">
        <div className="eyebrow">Recent Collabs</div>
        {collabs.length === 0 ? (
          <div className="empty">No confirmed collabs yet.</div>
        ) : (
          collabs.map((c) => (
            <Reveal key={c.id}>
            <div className="card row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <span className={"arch-role " + c.role}>
                  {c.role === "posted" ? "Posted" : "Joined"}
                </span>
                <b>{c.title}</b>
                <span className="muted" style={{ fontSize: 13 }}>with</span>
                <Link
                  to={"/u/" + c.partnerId}
                  className="glow-name"
                  style={{ fontSize: 14, fontWeight: 600, textDecoration: "none", color: "var(--text)" }}
                >
                  {c.partnerName}
                </Link>
              </div>
              <span className="post-date">{formatDateTime(c.at)}</span>
            </div>
            </Reveal>
          ))
        )}
      </div>

      {isSelf && <HiddenPosts userId={userId} />}
    </div>
  );
}
