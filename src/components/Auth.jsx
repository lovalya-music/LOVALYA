import { useState } from "react";
import { supabase } from "../lib/supabase";
import Brand from "./Brand";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit() {
    setBusy(true);
    setMsg(null);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setBusy(false);
      if (error) setMsg({ type: "bad", text: error.message });
      else setMsg({ type: "good", text: "Reset link sent — check your email." });
      return;
    }

    const fn =
      mode === "signup"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    if (error) setMsg({ type: "bad", text: error.message });
    else if (mode === "signup")
      setMsg({ type: "good", text: "Almost there — confirm your email, then sign in." });
    setBusy(false);
  }

  async function discord() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin },
    });
    if (error) setMsg({ type: "bad", text: error.message });
  }

  return (
    <div className="app" style={{ maxWidth: 400, paddingTop: 80 }}>
      <div style={{ marginBottom: 6 }}>
        <Brand logoSize={64} fontSize={28} />
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
        Sounds, presets and collabs for the Phonk/Hardtekk scene.
      </p>

      <div className="card">
        <button className="btn" style={{ width: "100%", marginBottom: 14 }} onClick={discord}>
          Continue with Discord
        </button>

        <div
          className="row"
          style={{ gap: 10, margin: "0 0 14px", color: "var(--muted)", fontSize: 12 }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {mode !== "forgot" && (
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={submit}
          disabled={busy || !email || (mode !== "forgot" && !password)}
        >
          {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>

        {mode === "signin" && (
          <button
            className="tab"
            style={{ color: "var(--muted)", padding: "8px 0 0", fontSize: 12 }}
            onClick={() => {
              setMode("forgot");
              setMsg(null);
            }}
          >
            Forgot password?
          </button>
        )}

        {msg && (
          <p style={{ color: `var(--${msg.type})`, fontSize: 13, marginBottom: 0 }}>{msg.text}</p>
        )}
      </div>

      <p className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: 16 }}>
        {mode === "signup" ? "Already registered?" : mode === "forgot" ? "Remembered it?" : "No account yet?"}{" "}
        <button
          className="tab"
          style={{ color: "var(--accent)", padding: 0 }}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
        >
          {mode === "signup" ? "Sign in" : mode === "forgot" ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
