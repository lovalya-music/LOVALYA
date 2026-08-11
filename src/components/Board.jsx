import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, ROLES, GENRES } from "../lib/supabase";
import { formatDateTime } from "../lib/format";
import AudioPlayer from "./AudioPlayer";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";
import Reveal from "./Reveal";

export default function Board({ userId }) {
  const [posts, setPosts] = useState([]);
  const [myRequests, setMyRequests] = useState({}); // post_id -> status
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [roleFilter, setRoleFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [removingIds, setRemovingIds] = useState(new Set());
  const navigate = useNavigate();

  async function load() {
    setLoading(true);

    const { data: postData } = await supabase
      .from("collab_posts")
      .select(
        "*, author:profiles!collab_posts_author_id_fkey(username, roles, genres, avatar_url)"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false });

    const { data: reqData } = await supabase
      .from("collab_requests")
      .select("post_id, status")
      .eq("requester_id", userId);

    const { data: hiddenData } = await supabase
      .from("hidden_posts")
      .select("post_id")
      .eq("user_id", userId);

    const map = {};
    (reqData || []).forEach((r) => (map[r.post_id] = r.status));

    setPosts(postData || []);
    setMyRequests(map);
    setHiddenIds(new Set((hiddenData || []).map((h) => h.post_id)));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function requestCollab(postId) {
    const { error } = await supabase
      .from("collab_requests")
      .insert({ post_id: postId, requester_id: userId });
    if (!error) setMyRequests((m) => ({ ...m, [postId]: "pending" }));
  }

  // Play a glitch-out + collapse, then remove the post from the list.
  function animateRemove(postId, doAction) {
    setRemovingIds((s) => new Set(s).add(postId));
    // IMPORTANT: Supabase queries only run when awaited/resolved.
    Promise.resolve(doAction()).catch(() => {});
    setTimeout(() => {
      setPosts((ps) => ps.filter((p) => p.id !== postId));
      setRemovingIds((s) => {
        const n = new Set(s);
        n.delete(postId);
        return n;
      });
    }, 900);
  }

  function closePost(postId) {
    animateRemove(postId, () =>
      supabase.from("collab_posts").update({ status: "closed" }).eq("id", postId)
    );
  }

  function deletePost(postId) {
    if (!window.confirm("Delete this post permanently?")) return;
    animateRemove(postId, () => supabase.from("collab_posts").delete().eq("id", postId));
  }

  function hide(postId) {
    animateRemove(postId, () =>
      supabase.from("hidden_posts").insert({ user_id: userId, post_id: postId })
    );
  }

  const filtered = posts.filter((p) => {
    if (hiddenIds.has(p.id)) return false;
    if (roleFilter && !p.looking_for?.includes(roleFilter)) return false;
    if (genreFilter && !p.genres?.includes(genreFilter)) return false;
    return true;
  });

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">Board</div>
        <h2 style={{ margin: "2px 0" }}>Open collabs</h2>
      </div>

      <div className="card grid" style={{ gap: 10 }}>
        <div className="stack">
          <label style={{ margin: 0 }}>Looking for role</label>
          <div className="chips">
            <button
              className={"chip" + (roleFilter === "" ? " on" : "")}
              onClick={() => setRoleFilter("")}
            >
              All
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                className={"chip" + (roleFilter === r ? " on" : "")}
                onClick={() => setRoleFilter(roleFilter === r ? "" : r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="stack">
          <label style={{ margin: 0 }}>Genre</label>
          <div className="chips">
            <button
              className={"chip" + (genreFilter === "" ? " on" : "")}
              onClick={() => setGenreFilter("")}
            >
              All
            </button>
            {GENRES.map((g) => (
              <button
                key={g}
                className={"chip" + (genreFilter === g ? " on" : "")}
                onClick={() => setGenreFilter(genreFilter === g ? "" : g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          Nothing here yet. Create the first post under "New post".
        </div>
      ) : (
        filtered.slice(0, visibleCount).map((p) => {
          const isOwn = p.author_id === userId;
          const reqStatus = myRequests[p.id];
          return (
            <Reveal key={p.id}>
            <div className={"card post" + (removingIds.has(p.id) ? " removing" : "")}>
              <div className="post-head">
                <button className="post-author" onClick={() => setModalUser(p.author_id)}>
                  <Avatar url={p.author?.avatar_url} name={p.author?.username} size={30} />
                  <span className="post-author-name">{p.author?.username}</span>
                </button>
                <span className="post-date">{formatDateTime(p.created_at)}</span>
              </div>

              <h3
                className="post-title"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/p/" + p.id)}
              >
                {p.title}
              </h3>

              <div className="post-meta">
                {p.looking_for?.length > 0 && (
                  <div className="post-meta-block">
                    <div className="post-meta-label">Looking for</div>
                    <div className="chips">
                      {p.looking_for.map((r) => (
                        <span key={r} className="tag accent">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
                {p.offering && (
                  <div className="post-meta-block">
                    <div className="post-meta-label">Offers</div>
                    <div className="post-meta-value">{p.offering}</div>
                  </div>
                )}
              </div>

              {p.description && <p className="post-desc">{p.description}</p>}

              {p.genres?.length > 0 && (
                <div className="chips">
                  {p.genres.map((g) => (
                    <span key={g} className="chip static">{g}</span>
                  ))}
                </div>
              )}

              {p.preview_url && <AudioPlayer src={p.preview_url} />}

              <div className="post-foot">
                {isOwn ? (
                  <>
                    <span className="tag">Your post</span>
                    <button className="btn" onClick={() => closePost(p.id)}>Close</button>
                    <button className="btn btn-bad" onClick={() => deletePost(p.id)}>Delete</button>
                  </>
                ) : (
                  <>
                    {reqStatus === "pending" ? (
                      <button className="btn" disabled>Request sent</button>
                    ) : reqStatus === "accepted" ? (
                      <span className="btn btn-good" style={{ cursor: "default" }}>
                        Collab confirmed ✓
                      </span>
                    ) : reqStatus === "declined" ? (
                      <button className="btn" disabled>Declined</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => requestCollab(p.id)}>
                        Send request
                      </button>
                    )}
                    <button className="btn-ghost" onClick={() => hide(p.id)}>Hide</button>
                  </>
                )}
              </div>
            </div>
            </Reveal>
          );
        })
      )}

      {!loading && filtered.length > visibleCount && (
        <button
          className="btn"
          style={{ alignSelf: "center" }}
          onClick={() => setVisibleCount((c) => c + 8)}
        >
          Load more
        </button>
      )}

      {modalUser && <ProfileModal userId={modalUser} onClose={() => setModalUser(null)} />}
    </div>
  );
}
