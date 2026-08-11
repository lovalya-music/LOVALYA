import { useEffect, useRef, useState } from "react";
import { getCtx, getAnalyser } from "../lib/audioReactive";
import { isAudioReactive } from "../lib/audioSettings";

const BARS = 5;

// Custom player + a little audio-reactive peak meter for the producer crowd.
export default function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const barsRef = useRef([]);
  const rafRef = useRef(0);
  const prevBassRef = useRef(0);
  const envRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
      stopMeter();
    };
    // If CORS ever blocks loading, drop crossOrigin and retry so audio still plays.
    const onErr = () => {
      if (a.crossOrigin) {
        a.crossOrigin = null;
        a.load();
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onErr);
      stopMeter();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function startMeter() {
    const a = audioRef.current;
    if (!a) return;
    const context = getCtx();
    if (context && context.state === "suspended") context.resume();
    const entry = getAnalyser(a);
    if (!entry) return; // no analyser (e.g. blocked) -> just play, no meter
    const { eq, bass, freqEQ, freqBass } = entry;

    const loop = () => {
      // --- EQ bars (calm analyser), low–mid spread ---
      eq.getByteFrequencyData(freqEQ);
      for (let i = 0; i < BARS; i++) {
        const idx = Math.floor(((i + 1) / (BARS + 1)) * freqEQ.length * 0.6);
        const v = freqEQ[idx] / 255;
        const el = barsRef.current[i];
        if (el) el.style.transform = `scaleY(${0.1 + v * 0.9})`;
      }

      // --- Logo: react to the KICK ATTACK, not the level ---
      // Snappy analyser, lowest bins only. We look at how much the bass
      // *rises* frame-to-frame (the onset), feed that into an envelope with a
      // fast attack + slow release. Sustained loud material and quiet intros
      // barely rise, so they stay calm; a kick hits -> sharp rise -> pump.
      bass.getByteFrequencyData(freqBass);
      let bassVal = 0;
      for (let b = 1; b <= 4; b++) bassVal += freqBass[b] / 255;
      bassVal /= 4;
      const rise = Math.max(0, bassVal - prevBassRef.current - 0.03); // small floor
      prevBassRef.current = bassVal;
      envRef.current = Math.max(envRef.current * 0.86, rise * 2.6);
      const pump = Math.min(1, envRef.current);
      document.documentElement.style.setProperty(
        "--audio-level",
        isAudioReactive() ? pump.toFixed(3) : "0"
      );

      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopMeter() {
    cancelAnimationFrame(rafRef.current);
    prevBassRef.current = 0;
    envRef.current = 0;
    barsRef.current.forEach((el) => {
      if (el) el.style.transform = "scaleY(0.1)";
    });
    document.documentElement.style.setProperty("--audio-level", "0");
  }

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      stopMeter();
      return;
    }
    // Resume the graph BEFORE playing — otherwise the first play after a fresh
    // page load routes through a still-suspended context and stays silent.
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }
    getAnalyser(a); // ensure source/analyser exist (cached)
    try {
      await a.play();
    } catch {
      // ignore
    }
    setPlaying(true);
    startMeter();
  }

  function seek(e) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  }

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="player">
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
      <button className="player-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="1" y="1" width="3.5" height="10" rx="1" />
            <rect x="7.5" y="1" width="3.5" height="10" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 1.5v9a.5.5 0 0 0 .77.42l7-4.5a.5.5 0 0 0 0-.84l-7-4.5A.5.5 0 0 0 2 1.5z" />
          </svg>
        )}
      </button>

      <div className="player-bar" onClick={seek}>
        <div className="player-fill" style={{ width: pct + "%" }} />
      </div>

      <div className="player-meter" aria-hidden="true">
        {Array.from({ length: BARS }).map((_, i) => (
          <span
            key={i}
            ref={(el) => (barsRef.current[i] = el)}
            className="meter-bar"
          />
        ))}
      </div>

      <span className="player-time">
        {fmt(current)} / {fmt(duration)}
      </span>
    </div>
  );
}

function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
}
