import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "../lib/format";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";

// Archive shown at the bottom of the Profile tab: confirmed collabs.
// Shows whether you posted it or joined it, with timestamps.
// The original poster can reupload a post if the collab fell through.
export default function MyCollabs({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(null);

  async function load() {
    setLoading(true);

    // All accepted requests I can see (RLS: mine + on my posts).
    const { data } = await supabase
      .from("collab_requests")
      .select(
        `id, status, requester_id, responded_at,
         post:collab_posts!collab_requests_post_id_fkey(id, title, author_id, created_at, status),
         requester:profiles!collab_requests_requester_id_fkey(id, username, avatar_url)`
      )
      .eq("status", "accepted");

    const rows = (data || []).filter((r) => r.post);

    // Load author profiles for posts I joined.
    const authorIds = [
      ...new Set(
        rows
          .filter((r) => r.post.author_id !== userId)
          .map((r) => r.post.author_id)
          .filter(Boolean)
      ),
    ];
    let authorMap = {};
    if (authorIds.length) {
      const { data: authors } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", authorIds);
      (authors || []).forEach((a) => (authorMap[a.id] = a));
    }

    const built = rows.map((r) => {
      const iPosted = r.post.author_id === userId;
      const other = iPosted ? r.requester : authorMap[r.post.author_id];
      return {
        reqId: r.id,
        postId: r.post.id,
        title: r.post.title,
        postedAt: r.post.created_at,
        acceptedAt: r.responded_at,
        active: r.post.status === "closed",
        iPosted,
        other,
      };
    });

    setItems(built);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function reupload(item) {
    // Reopen the post fresh and reset the accepted request so others can apply.
    await supabase
      .from("collab_posts")
      .update({ status: "open", created_at: new Date().toISOString() })
      .eq("id", item.postId);
    await supabase
      .from("collab_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", item.reqId);
    // The collab fell through -> remove it from the public record.
    await supabase.from("collabs").delete().eq("post_id", item.postId);
    await load();
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="grid" style={{ marginTop: 24 }}>
      <div>
        <div className="eyebrow">Archive</div>
        <h2 style={{ margin: "2px 0 8px" }}>Your collabs</h2>
      </div>

      {items.map((it) => (
        <div key={it.reqId} className="card grid" style={{ gap: 10 }}>
          <div className="spread">
            <div className="row" style={{ gap: 8 }}>
              <span className={"arch-role " + (it.iPosted ? "posted" : "joined")}>
                {it.iPosted ? "You posted" : "You joined"}
              </span>
              <h3 style={{ fontSize: 16 }}>{it.title}</h3>
            </div>
          </div>

          {it.other && (
            <button
              className="post-author"
              onClick={() => setModalUser(it.other.id)}
              style={{ alignSelf: "flex-start" }}
            >
              <Avatar url={it.other.avatar_url} name={it.other.username} size={26} />
              <span className="post-author-name" style={{ fontSize: 13 }}>
                {it.iPosted ? "with " : "by "} {it.other.username}
              </span>
            </button>
          )}

          <div
            className="row"
            style={{ gap: 16, fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}
          >
            <span>posted {formatDateTime(it.postedAt)}</span>
            <span>accepted {formatDateTime(it.acceptedAt)}</span>
          </div>

          {it.iPosted && it.active && (
            <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => reupload(it)}>
              Reupload post
            </button>
          )}
          {it.iPosted && !it.active && (
            <span className="muted" style={{ fontSize: 12 }}>Reuploaded — back on the board.</span>
          )}
        </div>
      ))}

      {modalUser && <ProfileModal userId={modalUser} onClose={() => setModalUser(null)} />}
    </div>
  );
}
