// Hands-free control from the Sahm research project (Abdallah, Alkhazraji, Al-Rajab):
// voice commands in English and Arabic, a head-tracked pointer (MediaPipe face landmarks, nose tip), and a one-eye wink to click.
// Everything runs in the browser: video frames and audio are never recorded or sent by Daleel.
// (Speech recognition uses the browser's own service, which in Chrome is provided by Google.)

const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const $ = (s) => document.querySelector(s);
let ctx = null, opts = { voice: false, head: false, wink: false, still: false };

/* ---------- status panel ---------- */
let msgTimer = 0;
function say(text, keep) {
  const el = $("#sahm-msg"); if (!el) return;
  el.textContent = text; clearTimeout(msgTimer);
  if (!keep && opts.voice) msgTimer = setTimeout(() => (el.textContent = ctx.t("sahmListening")), 4000);
}
function panel() {
  $("#sahm").hidden = !(opts.voice || opts.head);
  $("#sahm-cam").hidden = !opts.head;
  $("#sahm-pointer").hidden = !opts.head || !head.running;
  document.documentElement.classList.toggle("sahm-head", opts.head && head.running);
}

/* ---------- voice commands ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const voice = { rec: null, want: false, lang: "" };
// lower case, no punctuation, no Arabic diacritics or tatweel, unified alef/ya/ta marbuta
const norm = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[ً-ٰٟـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
  .replace(/[()«»“”"'.,!?؟،:;·]/g, " ").replace(/\s+/g, " ").trim();
const COMMANDS = [
  { w: ["index", "plan", "home", "الفهرس", "الخطه", "الرئيسيه"], run: () => ctx.go("index") },
  { w: ["plate", "اللوحه"], run: () => ctx.go("plate") },
  { w: ["colophon", "الخاتمه"], run: () => ctx.go("colophon") },
  { w: ["3d", "3 d", "three d", "explore", "ثلاثي الابعاد", "ثلاثي", "الابعاد الثلاثيه"], run: () => ctx.go("explore") },
  { w: ["recycle", "recycling", "اعاده التدوير", "اعد التدوير", "تدوير"], run: () => ctx.go("recycle") },
  { w: ["read aloud", "read", "describe", "اقرا", "اقرا بصوت مسموع", "صف"], run: () => ctx.readAloud() },
  { w: ["stop", "quiet", "be quiet", "توقف", "اسكت", "قف"], run: () => ctx.stopSpeech() },
  { w: ["scroll down", "down", "page down", "انزل", "للاسفل", "تحت"], run: () => scrollBy({ top: innerHeight * 0.6, behavior: opts.still ? "auto" : "smooth" }) },
  { w: ["scroll up", "up", "page up", "اصعد", "للاعلي", "فوق"], run: () => scrollBy({ top: -innerHeight * 0.6, behavior: opts.still ? "auto" : "smooth" }) },
  { w: ["back", "go back", "رجوع", "ارجع"], run: () => history.back() },
  { w: ["settings", "reading settings", "الاعدادات", "اعدادات القراءه"], run: () => ctx.openSettings() },
  { w: ["close", "اغلاق", "اغلق"], run: () => { const d = document.querySelector("dialog[open]"); if (d) d.close(); } },
  { w: ["arabic", "عربي", "العربيه"], run: () => ctx.setLang("ar") },
  { w: ["english", "انجليزي", "الانجليزيه", "انكليزي"], run: () => ctx.setLang("en") },
  { w: ["click", "select", "press", "انقر", "اضغط", "اختر"], run: () => clickAtPointer() },
  { w: ["centre", "center", "وسط", "توسيط"], run: () => centre() },
];
const PREFIX = /^(go to|open|show|show me|take me to|افتح|اذهب الي|اعرض|روح)\s+/;

function visibleClickables() {
  const root = document.querySelector("dialog[open]") || document;
  return [...root.querySelectorAll("button, a[href], [role=radio], label.check, select")].filter((el) => {
    if (el.disabled || el.closest("[hidden]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  });
}
function labelOf(el) { return norm(el.getAttribute("aria-label") || el.textContent || ""); }

function handle(raw) {
  const said = norm(raw); if (!said) return;
  say(ctx.t("sahmHeard", { t: raw.trim() }), true);
  const rest = said.replace(PREFIX, "");
  const exact = COMMANDS.find((c) => c.w.includes(said) || c.w.includes(rest));
  if (exact) { exact.run(); return done(raw); }
  // a place name (either language, with or without the part in brackets)
  const place = ctx.places().find((p) => p.names.some((n) => { const a = norm(n), b = norm(n.replace(/\(.*?\)/g, "")); return rest === a || rest === b || (b.length > 4 && rest.includes(b)); }));
  if (place) { ctx.openPlace(place.id); return done(raw); }
  // the words on any visible button or link
  const els = visibleClickables(), score = (el) => { const l = labelOf(el); return !l ? 0 : l === rest ? 3 : l.startsWith(rest) ? 2 : rest.length > 2 && l.includes(rest) ? 1 : 0; };
  const best = els.map((el) => [el, score(el)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1])[0];
  if (best) { activate(best[0]); return done(raw); }
  const loose = COMMANDS.find((c) => c.w.some((w) => w.length > 3 && said.includes(w)));
  if (loose) { loose.run(); return done(raw); }
  say(ctx.t("sahmNoMatch", { t: raw.trim() }));
}
function done(raw) { say(ctx.t("sahmDone", { t: raw.trim() })); ctx.announce(ctx.t("sahmDone", { t: raw.trim() })); }

function startVoice() {
  if (!SR) { say(ctx.t("sahmNoVoice"), true); return; }
  stopVoice(true);
  const rec = new SR(); voice.rec = rec; voice.want = true; voice.lang = ctx.getLang();
  rec.lang = voice.lang === "ar" ? "ar-AE" : "en-US"; rec.continuous = true; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onresult = (e) => { const r = e.results[e.results.length - 1]; if (r.isFinal) handle(r[0].transcript); };
  rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { voice.want = false; say(ctx.t("sahmNoMic"), true); } };
  rec.onend = () => { if (voice.want && voice.rec === rec) setTimeout(() => { try { rec.start(); } catch { /* already started */ } }, 250); };
  try { rec.start(); say(ctx.t("sahmListening"), true); } catch { say(ctx.t("sahmNoMic"), true); }
}
function stopVoice(silent) { voice.want = false; const r = voice.rec; voice.rec = null; if (r) { r.onend = null; try { r.abort(); } catch { /* not started */ } } if (!silent && !opts.head) say(""); }

/* ---------- head pointer and wink ---------- */
const head = { running: false, starting: false, stream: null, lm: null, neutral: null, calib: [], x: 0, y: 0, hover: null, wink: 0, lastClick: 0, edge: 0, last: 0 };
async function startHead() {
  if (head.running || head.starting) return;
  head.starting = true; say(ctx.t("sahmLoading"), true);
  try {
    head.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
    const v = $("#sahm-cam"); v.srcObject = head.stream; await v.play();
    if (!head.lm) {
      const vision = await import(`${MP}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`${MP}/wasm`);
      head.lm = await vision.FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: "GPU" }, runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true });
    }
    if (!opts.head) { head.starting = false; return stopHead(); }
    head.running = true; head.starting = false; centre(true); panel();
    say(ctx.t("sahmReady"));
    requestAnimationFrame(loop);
  } catch {
    head.starting = false; stopHead(); say(ctx.t("sahmNoCam"), true);
  }
}
function stopHead() {
  head.running = false;
  if (head.stream) head.stream.getTracks().forEach((tr) => tr.stop());
  head.stream = null; $("#sahm-cam").srcObject = null;
  setHover(null); panel();
}
function centre(silent) { head.neutral = null; head.calib = []; head.x = innerWidth / 2; head.y = innerHeight / 2; if (!silent) say(ctx.t("sahmCentre")); }

function loop(now) {
  if (!head.running) return;
  requestAnimationFrame(loop);
  if (now - head.last < 33) return; // about 30 frames a second is plenty
  head.last = now;
  const v = $("#sahm-cam"); if (v.readyState < 2) return;
  const r = head.lm.detectForVideo(v, now);
  const f = r.faceLandmarks && r.faceLandmarks[0]; if (!f) return;
  const nose = f[1];
  // the first half second of frames sets the neutral head position
  if (!head.neutral) { head.calib.push(nose); if (head.calib.length >= 15) head.neutral = { x: head.calib.reduce((a, p) => a + p.x, 0) / 15, y: head.calib.reduce((a, p) => a + p.y, 0) / 15 }; return; }
  const gain = 4.2, dx = -(nose.x - head.neutral.x), dy = nose.y - head.neutral.y;   // camera image is mirrored
  const tx = innerWidth / 2 + dx * innerWidth * gain, ty = innerHeight / 2 + dy * innerHeight * gain * 1.25;
  const k = opts.still ? 0.5 : 0.3;                                                   // smoothing
  head.x = Math.min(innerWidth - 2, Math.max(2, head.x + (tx - head.x) * k));
  head.y = Math.min(innerHeight - 2, Math.max(2, head.y + (ty - head.y) * k));
  const p = $("#sahm-pointer"); p.style.transform = `translate(${head.x}px, ${head.y}px)`;
  setHover(targetAt(head.x, head.y));
  // hold the pointer at the top or bottom edge to scroll
  const edge = head.y > innerHeight - 36 ? 1 : head.y < 36 ? -1 : 0;
  head.edge = edge ? head.edge + 1 : 0;
  if (head.edge > 15) scrollBy(0, edge * 14);
  // a deliberate wink with one eye (the other open) for a few frames clicks; blinking both eyes does nothing
  if (opts.wink && r.faceBlendshapes && r.faceBlendshapes[0]) {
    const c = r.faceBlendshapes[0].categories, L = c.find((x) => x.categoryName === "eyeBlinkLeft")?.score || 0, R = c.find((x) => x.categoryName === "eyeBlinkRight")?.score || 0;
    const wink = (L > 0.55 && R < 0.25) || (R > 0.55 && L < 0.25);
    head.wink = wink ? head.wink + 1 : 0;
    if (head.wink === 4 && now - head.lastClick > 900) { head.lastClick = now; clickAtPointer(); }
  }
}
function targetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest("button, a[href], input, select, textarea, label, summary, [role=radio], [tabindex]:not([tabindex='-1'])");
}
function setHover(el) {
  if (head.hover === el) return;
  head.hover?.classList.remove("sahm-hover"); head.hover = el; el?.classList.add("sahm-hover");
}
function activate(el) {
  if (!el) return;
  if (el.matches("input[type=range], input[type=text], input[type=date], textarea, select")) { el.focus(); }
  else { el.focus?.({ preventScroll: true }); el.click(); }
  const p = $("#sahm-pointer"); p.classList.remove("click"); void p.offsetWidth; p.classList.add("click");
  say(ctx.t("sahmClicked", { t: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60) }));
}
function clickAtPointer() { if (head.running) activate(targetAt(head.x, head.y)); }

/* ---------- public ---------- */
export function init(c) { ctx = c; }
export function configure(o) {
  if (!ctx) return;
  const prev = opts; opts = Object.assign({}, o);
  if (o.voice && (!voice.want || voice.lang !== ctx.getLang())) startVoice();
  else if (!o.voice && (voice.want || voice.rec)) stopVoice();
  if (o.head && !prev.head) startHead();
  else if (!o.head && (head.running || head.starting)) stopHead();
  panel();
}
// Runs a command as if it had been spoken (used by tests, and available for a typed command box later).
export function command(text) { if (ctx) handle(text); }
