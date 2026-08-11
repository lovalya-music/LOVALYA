import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "../lib/format";

export default function NotificationsBell({ userId }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data || []);
  }

  useEffect(() => {
    load();

    // Realtime: new notifications for me arrive live.
    const channel = supabase
      .channel("noti-" + userId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Mark all as read when the panel opens.
      const ids = items.filter((n) => !n.read).map((n) => n.id);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      await supabase.from("notifications").update({ read: true }).in("id", ids);
    }
  }

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button className="bell-btn" onClick={toggle} aria-label="Notifications">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="bell-dot" />}
      </button>

      {open && (
        <div className="bell-panel">
          {items.length === 0 ? (
            <div className="muted" style={{ padding: 12, fontSize: 13 }}>
              No notifications yet.
            </div>
          ) : (
            items.map((n) => (
              <div key={n.id} className={"noti" + (n.read ? "" : " unread")}>
                <span style={{ fontSize: 13 }}>{describe(n)}</span>
                <span className="noti-time">{formatDateTime(n.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function describe(n) {
  const t = n.data?.title ? `"${n.data.title}"` : "your post";
  if (n.type === "new_request")
    return `${n.data?.from || "Someone"} requested to collab on ${t}.`;
  if (n.type === "accepted") return `Your request for ${t} was accepted. 🎉`;
  if (n.type === "declined") return `Your request for ${t} was declined.`;
  return "Something happened.";
}
