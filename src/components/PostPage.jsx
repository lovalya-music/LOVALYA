import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { badgeFor } from "../lib/badges";
import PostView from "./PostView";
import Avatar from "./Avatar";
import Brand from "./Brand";

export default function PostPage({ session }) {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [artist, setArtist] = useState(null);
  const [collabCount, setCollabCount] = useState(0);
  const [reqStatus, setReqStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  async function load() {
    setLoading(true);
    const { data: p } = await supabase
      .from("collab_posts")
      .select(
        "*, author:profiles!collab_posts_author_id_fkey(id, username, roles, genres, bio, avatar_url, spotify_url, links)"
      )
      .eq("id", postId)
      .maybeSingle();

    if (p) {
      setArtist(p.author);
      const { count } = await supabase
        .from("collabs")
        .select("id", { count: "exact", head: true })
        .or(`poster_id.eq.${p.author_id},joiner_id.eq.${p.author_id}`);
      setCollabCount(count || 0);

      if (userId && p.author_id !== userId) {
        const { data: r } = await supabase
          .from("collab_requests")
          .select("status")
          .eq("post_id", postId)
          .eq("requester_id", userId)
          .maybeSingle();
        setReqStatus(r?.status || null);
      }
    }
    setPost(p);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, userId]);

  async function requestCollab() {
    const { error } = await supabase
      .from("collab_requests")
      .insert({ post_id: postId, requester_id: userId });
    if (!error) setReqStatus("pending");
  }

  if (loading) return <div className="app"><div className="empty">Loading…</div></div>;
  if (!post)
    return (
      <div className="app">
        <div className="topbar">
          <Link to="/" className="brand-link">
            <Brand />
          </Link>
        </div>
        <div className="empty">Post not found.</div>
      </div>
    );

  const isOwn = userId && post.author_id === userId;

  return (
    <div className="app">
      <div className="topbar">
        <Link to="/" className="brand-link">
            <Brand />
          </Link>
        <button className="tab" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="grid" style={{ gap: 18 }}>
        <PostView post={post} linkTitle={false} />

        {post.status === "closed" && (
          <div className="muted" style={{ fontSize: 13 }}>This collab is already closed.</div>
        )}

        {userId && !isOwn && post.status === "open" && (
          <div>
            {reqStatus === "pending" ? (
              <button className="btn" disabled>Request sent</button>
            ) : reqStatus === "accepted" ? (
              <span className="btn btn-good" style={{ cursor: "default" }}>Collab confirmed ✓</span>
            ) : reqStatus === "declined" ? (
              <button className="btn" disabled>Declined</button>
            ) : (
              <button className="btn btn-primary" onClick={requestCollab}>Send request</button>
            )}
          </div>
        )}

        {/* About the artist */}
        {artist && (
          <div className="grid" style={{ marginTop: 8 }}>
            <div className="eyebrow">About the artist</div>
            <div className="card grid" style={{ gap: 14 }}>
              <div className="row" style={{ gap: 14, alignItems: "center" }}>
                <Avatar url={artist.avatar_url} name={artist.username} size={56} onClick={() => navigate("/u/" + artist.id)} />
                <div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <h3
                      className="glow-name"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate("/u/" + artist.id)}
                    >
                      {artist.username}
                    </h3>
                    <span className="tag accent">{badgeFor(collabCount)}</span>
                  </div>
                  <div className="chips" style={{ marginTop: 6 }}>
                    {(artist.roles || []).map((r) => (
                      <span key={r} className="tag">{r}</span>
                    ))}
                  </div>
                </div>
              </div>

              {artist.bio && <p style={{ margin: 0 }}>{artist.bio}</p>}

              <button
                className="btn btn-primary"
                style={{ alignSelf: "flex-start" }}
                onClick={() => navigate("/u/" + artist.id)}
              >
                View other collabs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
