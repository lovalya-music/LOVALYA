// Toggle for the audio-reactive logo/wordmark glow. The EQ meter is unaffected.
let enabled = true;
try {
  enabled = localStorage.getItem("audioReactive") !== "off";
} catch {
  // ignore
}

export function isAudioReactive() {
  return enabled;
}

export function setAudioReactive(v) {
  enabled = !!v;
  try {
    localStorage.setItem("audioReactive", v ? "on" : "off");
  } catch {
    // ignore
  }
  if (!v) document.documentElement.style.setProperty("--audio-level", "0");
}
