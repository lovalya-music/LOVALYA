import { useEffect, useState } from "react";
import { supabase, ROLES, GENRES } from "../lib/supabase";
import ChipSelect from "./ChipSelect";
import AudioPlayer from "./AudioPlayer";

export default function CreatePost({ userId, onCreated }) {
  const [title, setTitle] = useState("");
  const [lookingFor, setLookingFor] = useState([]);
  const [offering, setOffering] = useState("");
  const [genres, setGenres] = useState([]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Local preview of the picked file (played through our custom player).
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPick(e) {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      return;
    }
    const okType = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"].includes(
      f.type
    );
    const okExt = /\.(mp3|wav)$/i.test(f.name);
    if (!okType && !okExt) {
      setFileError("Only MP3 and WAV files are accepted.");
      setFile(null);
      e.target.value = "";
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setFileError("File is too large — max 20 MB.");
      setFile(null);
      e.target.value = "";
      return;
    }
    // Check duration (max 1 minute) before accepting.
    const url = URL.createObjectURL(f);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (probe.duration && probe.duration > 61) {
        setFileError("Preview is too long — max 1 minute.");
        setFile(null);
        e.target.value = "";
      } else {
        setFileError(null);
        setFile(f);
      }
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      // If we can't read duration, accept it (size/type already checked).
      setFileError(null);
      setFile(f);
    };
    probe.src = url;
  }

  async function create() {
    setBusy(true);
    setMsg(null);

    // Upload the required audio snippet to the public "previews" bucket.
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("previews").upload(path, file);
    if (upErr) {
      setMsg({ type: "bad", text: "Upload failed: " + upErr.message });
      setBusy(false);
      return;
    }
    const preview_url = supabase.storage.from("previews").getPublicUrl(path).data.publicUrl;

    const { error } = await supabase.from("collab_posts").insert({
      author_id: userId,
      title: title.trim(),
      looking_for: lookingFor,
      offering: offering.trim(),
      genres,
      description: description.trim(),
      preview_url,
    });

    if (error) {
      setMsg({ type: "bad", text: error.message });
      setBusy(false);
      return;
    }

    setBusy(false);
    onCreated();
  }

  const valid = title.trim().length > 2 && lookingFor.length > 0 && !!file;

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">New post</div>
        <h2 style={{ margin: "4px 0" }}>Who are you looking for?</h2>
      </div>

      <div className="card grid">
        <div className="field">
          <label>Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Got a Hardtekk beat, looking for vocal chops"
          />
        </div>

        <div className="field">
          <label>I'm looking for * (roles)</label>
          <ChipSelect options={ROLES} value={lookingFor} onChange={setLookingFor} />
        </div>

        <div className="field">
          <label>Genre</label>
          <ChipSelect options={GENRES} value={genres} onChange={setGenres} />
        </div>

        <div className="field">
          <label>What I offer</label>
          <input
            value={offering}
            onChange={(e) => setOffering(e.target.value)}
            placeholder="Beat + stems, 50/50 split"
          />
        </div>

        <div className="field">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's it about? Tempo, vibe, what you have in mind…"
          />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Audio preview * (MP3 or WAV, max 20 MB / 1 min)</label>
          <input type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" onChange={onPick} />
          {fileError && (
            <p style={{ color: "var(--bad)", fontSize: 13, margin: "6px 0 0" }}>{fileError}</p>
          )}
          {previewUrl && (
            <div style={{ marginTop: 10 }}>
              <AudioPlayer src={previewUrl} />
            </div>
          )}
        </div>
      </div>

      {msg && <p style={{ color: `var(--${msg.type})`, fontSize: 13 }}>{msg.text}</p>}

      <button
        className="btn btn-primary"
        onClick={create}
        disabled={busy || !valid}
        style={{ alignSelf: "flex-start" }}
      >
        {busy ? "Publishing…" : "Publish post"}
      </button>
    </div>
  );
}
