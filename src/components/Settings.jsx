import { useState } from "react";
import { supabase } from "../lib/supabase";
import { isAudioReactive, setAudioReactive } from "../lib/audioSettings";
import ProfilePanel from "./ProfilePanel";

export default function Settings({ userId, authUser, profile, onSaved, onBack }) {
  const [reactive, setReactive] = useState(isAudioReactive());

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="spread">
        <div>
          <div className="eyebrow">Settings</div>
          <h2 style={{ margin: "2px 0" }}>Edit profile</h2>
        </div>
        <button className="tab" onClick={onBack}>Done</button>
      </div>

      <ProfilePanel
        userId={userId}
        authUser={authUser}
        existingProfile={profile}
        onSaved={onSaved}
      />

      <div>
        <div className="eyebrow">Visuals</div>
        <h2 style={{ margin: "2px 0 8px" }}>Audio reactivity</h2>
        <label className="card row" style={{ cursor: "pointer", gap: 10, color: "var(--text)" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={reactive}
            onChange={(e) => {
              setReactive(e.target.checked);
              setAudioReactive(e.target.checked);
            }}
          />
          <span>Let the logo &amp; wordmark pulse to the music (the EQ meter stays either way).</span>
        </label>
      </div>

      <div>
        <div className="eyebrow">Security</div>
        <h2 style={{ margin: "2px 0 8px" }}>Password</h2>
        <ChangePassword />
      </div>
    </div>
  );
}

function ChangePassword() {
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
    else {
      setMsg({ type: "good", text: "Password updated." });
      setPw("");
      setPw2("");
    }
  }

  return (
    <div className="card grid">
      <div className="split">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>New password</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Repeat password</label>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
        </div>
      </div>
      {msg && <p style={{ color: `var(--${msg.type})`, fontSize: 13, margin: 0 }}>{msg.text}</p>}
      <button
        className="btn"
        onClick={submit}
        disabled={busy || !pw || !pw2}
        style={{ alignSelf: "flex-start" }}
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </div>
  );
}
