// Shared Web Audio graph for the little audio-reactive visuals.
// One AudioContext for the whole app; per <audio> element we tap the signal
// with TWO analysers — a calm one for the EQ bars and a snappy one for the
// kick-driven logo — so they can be tuned independently.

let ctx = null;
const cache = new WeakMap(); // audioEl -> entry

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function getAnalyser(audioEl) {
  if (cache.has(audioEl)) return cache.get(audioEl);
  const context = getCtx();
  if (!context) return null;
  let source;
  try {
    source = context.createMediaElementSource(audioEl);
  } catch {
    return null; // already connected / not allowed
  }

  const eq = context.createAnalyser();
  eq.fftSize = 256;
  eq.smoothingTimeConstant = 0.55; // calm EQ bars

  const bass = context.createAnalyser();
  bass.fftSize = 256;
  bass.smoothingTimeConstant = 0.2; // snappy, so kick transients stay sharp

  source.connect(eq);
  source.connect(bass);
  source.connect(context.destination); // keep the sound audible

  const entry = {
    eq,
    bass,
    freqEQ: new Uint8Array(eq.frequencyBinCount),
    freqBass: new Uint8Array(bass.frequencyBinCount),
  };
  cache.set(audioEl, entry);
  return entry;
}
