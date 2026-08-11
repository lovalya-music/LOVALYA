import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "../lib/format";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";

export default function Requests({ userId, onChange }) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [contacts, setContacts] = useState({}); // user_id -> contact
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(null);

  async function load() {
    setLoading(true);

    // RLS only returns requests that concern me (sent OR on my posts).
    const { data } = await supabase
      .from("collab_requests")
      .select(
        `id, status, requester_id, created_at, responded_at,
         post:collab_posts!collab_requests_post_id_fkey(id, title, author_id),
         requester:profiles!collab_requests_requester_id_fkey(id, username, roles, avatar_url)`
      )
      .order("created_at", { ascending: false });

    const rows = data || [];
    const inc = rows.filter((r) => r.post?.author_id === userId && r.requester_id !== userId);
    const out = rows.filter((r) => r.requester_id === userId);

    // Load author profiles for outgoing requests (for display).
    const authorIds = [...new Set(out.map((r) => r.post?.author_id).filter(Boolean))];
    let authorMap = {};
    if (authorIds.length) {
      const { data: authors } = await supabase
        .from("profiles")
        .select("id, username, roles, avatar_url")
        .in("id", authorIds);
      (authors || []).forEach((a) => (authorMap[a.id] = a));
    }
    out.forEach((r) => (r.author = authorMap[r.post?.author_id]));

    // Load the other side's contacts — RLS only releases what's allowed.
    const otherIds = [
      ...inc.filter((r) => r.status === "accepted").map((r) => r.requester_id),
      ...out.filter((r) => r.status === "accepted").map((r) => r.post?.author_id),
    ].filter(Boolean);

    let cMap = {};
    if (otherIds.length) {
      const { data: cs } = await supabase
        .from("private_contacts")
        .select("user_id, contact")
        .in("user_id", otherIds);
      (cs || []).forEach((c) => (cMap[c.user_id] = c.contact));
    }

    setIncoming(inc);
    setOutgoing(out);
    setContacts(cMap);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function respond(req, status) {
    const now = new Date().toISOString();
    // The DB trigger handles closing the post, auto-declining the other
    // pending requests, and creating notifications.
    await supabase
      .from("collab_requests")
      .update({ status, responded_at: now })
      .eq("id", req.id);
    await load();
    onChange?.();
  }

  if (loading) return <div className="empty">Loading…</div>;

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">Incoming</div>
        <h2 style={{ margin: "2px 0 8px" }}>Requests on your posts</h2>
      </div>

      {incoming.length === 0 ? (
        <div className="empty">No open requests.</div>
      ) : (
        incoming.map((r) => (
          <div key={r.id} className="card grid" style={{ gap: 10 }}>
            <div className="spread">
              <button className="post-author" onClick={() => setModalUser(r.requester_id)}>
                <Avatar url={r.requester?.avatar_url} name={r.requester?.username} size={28} />
                <span className="post-author-name">{r.requester?.username}</span>
              </button>
              <StatusPill status={r.status} />
            </div>

            <div>
              <span className="muted">wants to collab on</span> "{r.post?.title}"
            </div>

            {r.requester?.roles?.length > 0 && (
              <div className="row" style={{ flexWrap: "wrap" }}>
                {r.requester.roles.map((role) => (
                  <span key={role} className="tag">{role}</span>
                ))}
              </div>
            )}

            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
              {r.status === "pending"
                ? `requested ${formatDateTime(r.created_at)}`
                : `${r.status} ${formatDateTime(r.responded_at)}`}
            </div>

            {r.status === "pending" && (
              <div className="row">
                <button className="btn btn-good" onClick={() => respond(r, "accepted")}>
                  Accept
                </button>
                <button className="btn btn-bad" onClick={() => respond(r, "declined")}>
                  Decline
                </button>
              </div>
            )}

            {r.status === "accepted" && <ContactBox contact={contacts[r.requester_id]} />}
          </div>
        ))
      )}

      <div style={{ marginTop: 16 }}>
        <div className="eyebrow">Outgoing</div>
        <h2 style={{ margin: "2px 0 8px" }}>Requests you've sent</h2>
      </div>

      {outgoing.length === 0 ? (
        <div className="empty">You haven't sent any requests yet.</div>
      ) : (
        outgoing.map((r) => (
          <div key={r.id} className="card grid" style={{ gap: 10 }}>
            <div className="spread">
              <div className="row" style={{ gap: 8 }}>
                <span className="muted">to</span>
                <button className="post-author" onClick={() => setModalUser(r.post?.author_id)}>
                  <Avatar url={r.author?.avatar_url} name={r.author?.username} size={26} />
                  <span className="post-author-name" style={{ fontSize: 13 }}>
                    {r.author?.username || "…"}
                  </span>
                </button>
              </div>
              <StatusPill status={r.status} />
            </div>

            <div>
              <span className="muted">for</span> "{r.post?.title}"
            </div>

            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
              {r.status === "pending"
                ? `requested ${formatDateTime(r.created_at)}`
                : `${r.status} ${formatDateTime(r.responded_at)}`}
            </div>

            {r.status === "accepted" && <ContactBox contact={contacts[r.post?.author_id]} />}
          </div>
        ))
      )}

      {modalUser && <ProfileModal userId={modalUser} onClose={() => setModalUser(null)} />}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { text: "pending", color: "var(--muted)" },
    accepted: { text: "accepted", color: "var(--good)" },
    declined: { text: "declined", color: "var(--bad)" },
  };
  const s = map[status] || map.pending;
  return (
    <span className="tag" style={{ color: s.color, borderColor: "currentColor" }}>
      {s.text}
    </span>
  );
}

function ContactBox({ contact }) {
  return (
    <div
      className="row"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--accent-dim)",
        borderRadius: 10,
        padding: "8px 12px",
        fontFamily: "var(--mono)",
        fontSize: 13,
      }}
    >
      <span className="muted">Contact:</span>
      <span>{contact || "— (no contact provided)"}</span>
    </div>
  );
}
