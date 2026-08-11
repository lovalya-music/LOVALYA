import { useEffect, useState } from "react";
import { supabase, ROLES, GENRES } from "../lib/supabase";
import ChipSelect from "./ChipSelect";
import Avatar from "./Avatar";

// Creates a profile the first time (setup), otherwise edit mode.
export default function ProfilePanel({ userId, authUser, existingProfile, onSaved }) {
  const setup = !existingProfile;

  // Discord OAuth pre-fill (only relevant on first setup).
  const meta = authUser?.user_metadata || {};
  const isDiscord = authUser?.app_metadata?.provider === "discord";
  const discordName = meta.full_name || meta.name || meta.user_name || "";
  const discordAvatar = meta.avatar_url || null;

  const [importDiscord, setImportDiscord] = useState(true);

  const [username, setUsername] = useState(
    existingProfile?.username || (setup && isDiscord ? discordName.replace(/\s+/g, "") : "")
  );
  const [roles, setRoles] = useState(existingProfile?.roles || []);
  const [genres, setGenres] = useState(existingProfile?.genres || []);
  const [monthly, setMonthly] = useState(existingProfile?.monthly_listeners ?? "");
  const [streams, setStreams] = useState(existingProfile?.total_streams ?? "");
  const [spotify, setSpotify] = useState(existingProfile?.spotify_url || "");
  const [bio, setBio] = useState(existingProfile?.bio || "");
  const [links, setLinks] = useState(existingProfile?.links || []);

  const [avatarUrl, setAvatarUrl] = useState(
    existingProfile?.avatar_url || (setup && isDiscord ? discordAvatar : null)
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [contact, setContact] = useState(setup && isDiscord ? "discord: " + discordName : "");
  const [contactHidden, setContactHidden] = useState(true);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Toggle Discord import on/off during setup.
  useEffect(() => {
    if (!setup || !isDiscord) return;
    if (importDiscord) {
      setUsername((u) => u || discordName.replace(/\s+/g, ""));
      setAvatarUrl(discordAvatar);
      setContact((c) => c || "discord: " + discordName);
    } else {
      setAvatarUrl(null);
      setContact("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importDiscord]);

  // Load contact separately (your own row is readable via RLS).
  useEffect(() => {
    if (setup) return;
    supabase
      .from("private_contacts")
      .select("contact, contact_hidden")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContact(data.contact || "");
          setContactHidden(data.contact_hidden);
        }
      });
  }, [userId, setup]);

  // Local avatar preview
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function addLink() {
    setLinks((ls) => [...ls, { label: "", url: "" }]);
  }
  function updateLink(i, key, val) {
    setLinks((ls) => ls.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));
  }
  function removeLink(i) {
    setLinks((ls) => ls.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    setMsg(null);

    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      const path = `${userId}/${Date.now()}-${avatarFile.name}`;
      const { error: aErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (aErr) {
        setMsg({ type: "bad", text: "Avatar upload failed: " + aErr.message });
        setBusy(false);
        return;
      }
      newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const cleanLinks = links
      .filter((l) => l.label.trim() && l.url.trim())
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));

    const profileRow = {
      id: userId,
      username: username.trim(),
      roles,
      genres,
      monthly_listeners: monthly === "" ? null : Number(monthly),
      total_streams: streams === "" ? null : Number(streams),
      spotify_url: spotify.trim() || null,
      bio: bio.trim() || null,
      links: cleanLinks,
      avatar_url: newAvatarUrl,
    };

    const { error: pErr } = await supabase.from("profiles").upsert(profileRow);
    if (pErr) {
      setMsg({
        type: "bad",
        text: pErr.code === "23505" ? "Username is already taken." : pErr.message,
      });
      setBusy(false);
      return;
    }

    const { error: cErr } = await supabase.from("private_contacts").upsert({
      user_id: userId,
      contact: contact.trim(),
      contact_hidden: contactHidden,
    });
    if (cErr) {
      setMsg({ type: "bad", text: cErr.message });
      setBusy(false);
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setBusy(false);
    onSaved({ ...profileRow });
  }

  const valid = username.trim().length >= 3 && roles.length > 0;

  return (
    <div className="grid">
      {setup && (
        <div>
          <div className="eyebrow">First step</div>
          <h2 style={{ margin: "4px 0 2px" }}>Set up your profile</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            You need a username and at least one role — the rest is optional.
          </p>
        </div>
      )}

      {setup && isDiscord && (
        <label
          className="card row"
          style={{ cursor: "pointer", gap: 10, color: "var(--text)" }}
        >
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={importDiscord}
            onChange={(e) => setImportDiscord(e.target.checked)}
          />
          <span>Import my Discord name & picture</span>
        </label>
      )}

      <div className="card grid">
        <div className="row" style={{ gap: 14, alignItems: "center" }}>
          <Avatar url={avatarPreview || avatarUrl} name={username} size={64} />
          <div>
            <label style={{ marginBottom: 6 }}>Profile picture (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="field">
          <label>Username *</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. BRXDOW"
            maxLength={24}
          />
        </div>

        <div className="field">
          <label>Roles * (what do you do?)</label>
          <ChipSelect options={ROLES} value={roles} onChange={setRoles} />
        </div>

        <div className="field">
          <label>Genres</label>
          <ChipSelect options={GENRES} value={genres} onChange={setGenres} />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>About you (optional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short line about your sound, your setup, what you're into…"
          />
        </div>
      </div>

      <div className="card grid">
        <div className="split">
          <div className="field">
            <label>Monthly listeners (optional)</label>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="—"
            />
          </div>
          <div className="field">
            <label>Total streams (optional)</label>
            <input
              type="number"
              value={streams}
              onChange={(e) => setStreams(e.target.value)}
              placeholder="—"
            />
          </div>
        </div>

        <div className="field">
          <label>Spotify link (optional)</label>
          <input
            value={spotify}
            onChange={(e) => setSpotify(e.target.value)}
            placeholder="https://open.spotify.com/artist/…"
          />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Custom links (optional)</label>
          <div className="stack" style={{ gap: 8 }}>
            {links.map((l, i) => (
              <div key={i} className="link-edit-row">
                <input
                  value={l.label}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                  placeholder="Name (e.g. YouTube)"
                />
                <input
                  value={l.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://…"
                />
                <button className="icon-btn" onClick={() => removeLink(i)} aria-label="Remove link">
                  ×
                </button>
              </div>
            ))}
            <button className="btn" style={{ alignSelf: "flex-start" }} onClick={addLink}>
              + Add link
            </button>
          </div>
        </div>
      </div>

      <div className="card grid">
        <div className="field" style={{ marginBottom: 4 }}>
          <label>Contact (Discord etc.)</label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="discord: brxdow"
          />
        </div>
        <label
          className="row"
          style={{ cursor: "pointer", color: "var(--text)", marginBottom: 0 }}
        >
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={contactHidden}
            onChange={(e) => setContactHidden(e.target.checked)}
          />
          <span>Hide contact — only visible after a confirmed collab</span>
        </label>
      </div>

      {msg && <p style={{ color: `var(--${msg.type})`, fontSize: 13 }}>{msg.text}</p>}

      <button
        className="btn btn-primary"
        onClick={save}
        disabled={busy || !valid}
        style={{ alignSelf: "flex-start" }}
      >
        {busy ? "Saving…" : setup ? "Create profile" : "Save changes"}
      </button>
    </div>
  );
}
