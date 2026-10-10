// Read-aloud with visible captions: each sentence is spoken as its own utterance and highlighted while it plays,
// so hearing and deaf visitors get the same content, and listeners can follow the text.
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
let current = null;

function voiceFor(lang) {
  const voices = synth?.getVoices() || [];
  return voices.find((v) => v.lang?.toLowerCase().startsWith(lang)) || null;
}

export function isSpeaking() { return !!current; }

export function stop() {
  if (!synth) return;
  current = null;
  synth.cancel();
  document.querySelectorAll(".speaking").forEach((el) => el.classList.remove("speaking"));
}

export function speakSpans(spans, { lang = "en", rate = 1, onEnd } = {}) {
  if (!synth || !spans.length) return;
  stop();
  const token = (current = {});
  let i = 0;
  const next = () => {
    document.querySelectorAll(".speaking").forEach((el) => el.classList.remove("speaking"));
    if (current !== token || i >= spans.length) { if (current === token) current = null; onEnd?.(); return; }
    const el = spans[i++];
    const u = new SpeechSynthesisUtterance(el.textContent);
    u.lang = lang === "ar" ? "ar-AE" : "en-GB";
    u.rate = rate;
    const v = voiceFor(lang); if (v) u.voice = v;
    el.classList.add("speaking");
    u.onend = next; u.onerror = next;
    synth.speak(u);
  };
  next();
}

// Speak free text; if a caption element is given, show the current sentence there.
export function speakText(text, { lang = "en", rate = 1, captionEl = null, onEnd } = {}) {
  if (!synth) { onEnd?.(); return; }
  const parts = text.match(/[^.!?؟]+[.!?؟]*\s*/g) || [text];
  const holder = document.createElement("span");
  const spans = parts.map((p) => { const s = document.createElement("span"); s.textContent = p; holder.append(s); return s; });
  if (captionEl) { captionEl.dataset.prev = captionEl.textContent; captionEl.replaceChildren(holder); }
  speakSpans(spans, { lang, rate, onEnd: () => { if (captionEl && captionEl.dataset.prev != null) { captionEl.textContent = captionEl.dataset.prev; delete captionEl.dataset.prev; } onEnd?.(); } });
}
