import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Shown on your own profile: manage the posts you've hidden from the board.
export default function HiddenPosts({ userId }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("hidden_posts")
      .select(
        `post_id,
         post:collab_posts!hidden_posts_post_id_fkey(
           id, title, status,
           author:profiles!collab_posts_author_id_fkey(username)
         )`
      )
      .eq("user_id", userId);
    // Only keep posts that are still online.
    const rows = (data || []).filter((h) => h.post && h.post.status === "open");
    setItems(rows);
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function unhide(postId) {
    setItems((its) => its.filter((i) => i.post_id !== postId));
    await supabase
      .from("hidden_posts")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
  }

  if (!loaded) return null;

  return (
    <div className="grid" style={{ marginTop: 8 }}>
      <button
        className="tab"
        style={{ alignSelf: "flex-start", paddingLeft: 0 }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▾" : "▸"} Hidden posts ({items.length})
      </button>

      {open &&
        (items.length === 0 ? (
          <div className="empty">You haven't hidden any posts.</div>
        ) : (
          items.map((h) => (
            <div key={h.post_id} className="card row" style={{ justifyContent: "space-between" }}>
              <div>
                <b>{h.post.title}</b>{" "}
                <span className="muted" style={{ fontSize: 13 }}>
                  by {h.post.author?.username}
                </span>
              </div>
              <button className="btn" onClick={() => unhide(h.post_id)}>Unhide</button>
            </div>
          ))
        ))}
    </div>
  );
}
