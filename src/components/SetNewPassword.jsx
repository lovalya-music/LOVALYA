import { useState } from "react";
import { supabase } from "../lib/supabase";
import Brand from "./Brand";

export default function SetNewPassword({ onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit() {
    if (pw.length < 6) {
      setMsg({ type: "bad", text: "Password must be at least 6 characters." });
      return;
    }
    if (pw !== pw2) {
      setMsg({ type: "bad", text: "Passwords don't match." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ type: "bad", text: error.message });
    else onDone();
  }

  return (
    <div className="app" style={{ maxWidth: 400, paddingTop: 80 }}>
      <div style={{ marginBottom: 6 }}>
        <Brand logoSize={64} fontSize={28} />
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>Set a new password.</p>

      <div className="card grid">
        <div className="field">
          <label>New password</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Repeat password</label>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
        </div>
        {msg && <p style={{ color: `var(--${msg.type})`, fontSize: 13, margin: 0 }}>{msg.text}</p>}
        <button className="btn btn-primary" onClick={submit} disabled={busy || !pw || !pw2}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </div>
    </div>
  );
}
