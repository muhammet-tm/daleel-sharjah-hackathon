import * as E from "./engine.js";
import { t, setLang, getLang, name, field } from "./i18n.js";
import { askGuide } from "./guide.js";
import * as Speech from "./speech.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const H = E.fmtHour;

// ---------- persistence (per-device conveniences only; the app works without it) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem("daleel:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("daleel:" + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const DEFAULT_STOPS = [{ id: "al-hisn" }, { id: "blue-souk" }, { id: "al-noor-island", pinned: 16.5 }];
const state = {
  sites: [], byId: {},
  date: new Date(), start: 9,
  stops: store.get("stops", DEFAULT_STOPS),
  selected: store.get("selected", "al-hisn"),
  era: "today",
  heat: { live: null, sample: null, july: false },
  notes: {}, // siteId -> [{ q, a, offline, pending }]
  prefs: Object.assign({ lang: "en", scale: 100, theme: "light", calm: false, still: false, autoRead: false, rate: 1, heatSensitive: false, audience: "adult" }, store.get("prefs", {})),
  leaf: "index",
};
let plan = null, sugg = [];

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const announce = (msg) => { const a = $("#announce"); a.textContent = ""; setTimeout(() => (a.textContent = msg), 30); };

// ---------- heat ----------
function heatFor(date) {
  if (state.heat.july) return { data: state.heat.sample.july, src: t("heatJulyOn") };
  const live = state.heat.live?.[isoDate(date)];
  if (live) return { data: live, src: t("heatLive") };
  const m = date.getMonth();
  return { data: state.heat.sample[m >= 4 && m <= 8 ? "july" : "october"], src: t("heatSample") };
}

async function loadLiveHeat() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=25.35,25.13,25.34&longitude=55.39,55.88,56.35&hourly=apparent_temperature&timezone=Asia%2FDubai&forecast_days=7";
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const arr = await res.json();
    const regions = ["city", "central", "east"];
    const out = {};
    (Array.isArray(arr) ? arr : [arr]).forEach((loc, i) => {
      loc.hourly.time.forEach((ts, k) => {
        const day = ts.slice(0, 10), h = +ts.slice(11, 13);
        out[day] ??= { city: [], central: [], east: [] };
        out[day][regions[i]][h] = loc.hourly.apparent_temperature[k];
      });
    });
    state.heat.live = out;
    render();
  } catch { /* offline: the stored sample stays in use */ }
}

// ---------- planning ----------
function recompute() {
  const heat = heatFor(state.date).data;
  const opts = { date: state.date, startHour: state.start, heat, prefs: { heatSensitive: state.prefs.heatSensitive } };
  plan = E.planDay(state.stops, state.sites, opts);
  sugg = E.suggestions(plan, state.sites, opts);
  store.set("stops", state.stops);
}

function statusText(st) {
  switch (st.code) {
    case "quiet": return t("quiet");
    case "moderate": return t("moderate");
    case "busy": return st.window ? t("busy", { from: H(st.window.from), to: H(st.window.to) }) : t("moderate");
    case "closed": return t("closed");
    case "outside": return t("outside", { open: H(st.open), close: H(st.close) });
  }
  return "";
}

function suggestionText(s) {
  const site = state.byId[s.siteId];
  if (s.type === "shift") return t("shiftNote", { name: name(site), from: H(s.from), to: H(s.to), avoid: s.avoidsPeak ? t("shiftAvoid") : "",
    tf: Math.round(s.tempFrom ?? 0), tt: Math.round(s.tempTo ?? 0) });
  return t("swapNote", { name: name(site), from: H(s.from), alt: name(state.byId[s.altId]), to: H(s.to), extra: s.extraMinutes });
}

function applySuggestion(s) {
  const a = s.apply;
  if (a.op === "pin") state.stops = state.stops.map((x) => (x.id === a.id ? { id: x.id, pinned: a.hour } : x));
  if (a.op === "swap") state.stops = state.stops.map((x) => (x.id === a.id ? { id: a.alt, pinned: a.hour } : x));
  const before = plan.score;
  render();
  announce(`${t("planScore")}: ${before} → ${plan.score}`);
}

function moveStop(id, delta) {
  const item = plan.items.find((i) => i.site.id === id);
  state.stops = state.stops.map((x) => (x.id === id ? { id, pinned: Math.max(0, Math.min(23.5, item.hour + delta)) } : x));
  render();
  const now = plan.items.find((i) => i.site.id === id);
  announce(`${name(state.byId[id])} ${H(now.hour)}. ${statusText(now.status)}. ${t("planScore")} ${plan.score}.`);
}

function toggleStop(id) {
  const had = state.stops.some((x) => x.id === id);
  state.stops = had ? state.stops.filter((x) => x.id !== id) : [...state.stops, { id }];
  render();
  announce(`${name(state.byId[id])}: ${had ? t("remove") : t("added")}. ${t("planScore")} ${plan.score}.`);
}

// ---------- INDEX ----------
function renderIndex() {
  const heat = heatFor(state.date);
  $("#heat-src").textContent = heat.src;
  $("#july-btn").setAttribute("aria-pressed", String(state.heat.july));

  const rtl = getLang() === "ar";
  const noteFor = new Map();
  sugg.forEach((s, i) => { if (!noteFor.has(s.siteId)) noteFor.set(s.siteId, i + 1); });

  $("#plan").innerHTML = plan.items.length ? plan.items.map((it) => {
    const s = it.site, nm = esc(name(s)), n = noteFor.get(s.id);
    const trv = it.travel.mode === "walk" ? t("walk", { m: it.travel.minutes }) : it.travel.mode === "drive" ? t("drive", { m: it.travel.minutes }) : t("first");
    const env = s.indoor ? t("indoor") : s.shade ? t("shade") : t("sun");
    const temp = it.score.temp != null ? t("tempAt", { t: Math.round(it.score.temp) }) : "";
    return `<li class="entry">
      <span class="time">${H(it.hour)}<small>${esc(trv)}</small></span>
      <span class="nm"><button type="button" data-open="${s.id}" aria-label="${esc(t("openFor", { name: name(s) }))}">${nm}</button></span>
      <span class="st ${it.status.code}">${esc(statusText(it.status))}${n ? ` <sup>${n}</sup>` : ""}</span>
      <span class="meta"><span>${esc(env)}</span><span>${esc(temp)}</span><span>${esc(t("typical"))}</span></span>
      <span class="acts">
        <button class="btn small" type="button" data-move="${s.id}" data-d="-0.5" aria-label="${esc(t("earlierFor", { name: name(s) }))}"><span aria-hidden="true">${rtl ? "→" : "←"}</span> ${esc(t("earlier"))}</button>
        <button class="btn small" type="button" data-move="${s.id}" data-d="0.5" aria-label="${esc(t("laterFor", { name: name(s) }))}">${esc(t("later"))} <span aria-hidden="true">${rtl ? "←" : "→"}</span></button>
        <button class="btn small" type="button" data-toggle="${s.id}" aria-label="${esc(t("removeFor", { name: name(s) }))}">${esc(t("remove"))}</button>
      </span></li>`;
  }).join("") : `<li class="empty">${esc(t("emptyPlan"))}</li>`;

  $("#score").innerHTML = `<div><span class="cap">${esc(t("planScore"))}</span><p>${esc(t("scoreHelp"))}</p></div><b aria-label="${esc(t("planScore"))} ${plan.score} / 100">${plan.score}</b>`;

  $("#plan-notes").innerHTML = sugg.length ? sugg.map((s, i) => `<li class="note"><span class="num" aria-hidden="true">${i + 1}</span><div>
      <p><span class="sr-only">${i + 1}. </span>${esc(suggestionText(s))}</p>
      <div class="acts"><button class="btn small primary" type="button" data-apply="${i}">${esc(t("apply"))}</button></div></div></li>`).join("")
    : `<li class="note"><span></span><p>${esc(t("noNotes"))}</p></li>`;

  renderMap();
  renderPlaces();
}

function renderPlaces() {
  const heat = heatFor(state.date).data;
  const inPlan = new Set(state.stops.map((s) => s.id));
  const regions = [["city", "regionCity"], ["central", "regionCentral"], ["east", "regionEast"]];
  $("#places").innerHTML = `<h2>${esc(t("addTitle"))}</h2>` + regions.map(([r, key]) => {
    const list = state.sites.filter((s) => s.region === r);
    return `<div class="region"><h3>${esc(t(key))}</h3>${list.map((s) => {
      const b = E.bestHour(s, state.date, heat, 0, { heatSensitive: state.prefs.heatSensitive });
      const on = inPlan.has(s.id);
      return `<div class="place"><span class="pn"><button type="button" data-open="${s.id}">${esc(name(s))}</button></span>
        <span class="pm">${b != null ? esc(t("bestAt", { h: H(b) })) : esc(t("closed"))}${s.underVisited ? ` · <em>${esc(t("underVisited"))}</em>` : ""}</span>
        <button class="btn small" type="button" data-toggle="${s.id}" aria-pressed="${on}" aria-label="${esc(on ? t("removeFor", { name: name(s) }) : t("addFor", { name: name(s) }))}">${esc(on ? t("added") : t("add"))}</button></div>`;
    }).join("")}</div>`;
  }).join("");
}

function renderMap() {
  // Schematic, not to scale for navigation: the emirate's three regions, with city stops grouped.
  const W = 640, Hh = 300, box = { lng: [55.3, 56.45], lat: [24.98, 25.42] };
  const P = (s) => [20 + ((s.lng - box.lng[0]) / (box.lng[1] - box.lng[0])) * (W - 40), 20 + ((box.lat[1] - s.lat) / (box.lat[1] - box.lat[0])) * (Hh - 40)];
  const pts = plan.items.map((it) => ({ it, p: P(it.site) }));
  const groups = [];
  for (const x of pts) {
    const g = groups.find((g) => Math.hypot(g.p[0] - x.p[0], g.p[1] - x.p[1]) < 16);
    if (g) g.nums.push(plan.items.indexOf(x.it) + 1); else groups.push({ p: x.p, nums: [plan.items.indexOf(x.it) + 1] });
  }
  const route = pts.map((x, i) => `${i ? "L" : "M"}${x.p[0].toFixed(1)} ${x.p[1].toFixed(1)}`).join(" ");
  const towns = [["Sharjah", 55.39, 25.35], ["Mleiha", 55.88, 25.13], ["Khor Fakkan", 56.35, 25.34], ["Kalba", 56.36, 25.03]];
  const allDots = state.sites.map((s) => { const [x, y] = P(s); return `<circle class="site" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`; }).join("");
  $("#map").innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(t("mapLabel"))}">
    <path d="M${P({ lng: 56.22, lat: 25.42 })[0]} 0 L${P({ lng: 56.22, lat: 24.98 })[0]} ${Hh}" stroke="var(--hair)" stroke-dasharray="2 4"/>
    ${towns.map(([n, lng, lat]) => { const [x, y] = P({ lng, lat }); return `<text class="lbl" x="${x + 8}" y="${y - 8}">${n}</text>`; }).join("")}
    ${allDots}<path class="rt" d="${route}"/>
    ${groups.map((g) => `<circle class="site on" cx="${g.p[0]}" cy="${g.p[1]}" r="10"/><text class="n" x="${g.p[0]}" y="${g.p[1] + 3}" text-anchor="middle">${g.nums.length > 2 ? `${g.nums[0]}–${g.nums.at(-1)}` : g.nums.join(",")}</text>`).join("")}
  </svg>`;
}

// ---------- PLATE ----------
const ERAS = ["1823", "1969", "today"];
// Sites with a hand-built scene on the 3D leaf.
const SCENES_3D = new Set(["blue-souk", "al-noor-mosque", "islamic-museum", "heart-of-sharjah"]);
function renderPlate() {
  const s = state.byId[state.selected] || state.sites[0];
  const other = getLang() === "en" ? s.name.ar : s.name.en;
  $("#plate-h").innerHTML = `${esc(name(s))}<span class="ar" lang="${getLang() === "en" ? "ar" : "en"}">${esc(other)}</span>`;
  const n = state.sites.indexOf(s) + 1;
  const cap = `<figcaption class="cap plate-cap">${esc(t("plateCaption", { n, name: name(s) }))}${s.hasModel ? ` · ${esc(t("artist"))}` : ""}</figcaption>`;
  if (s.hasModel) {
    const alt = `${field(s, "describe")} ${t("eraDesc")[state.era]}`;
    $("#plate-figure").innerHTML = `<model-viewer id="mv" src="models/al-hisn-${state.era}.glb" alt="${esc(alt)}" camera-controls touch-action="pan-y"
      ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto" shadow-intensity="1" exposure="0.85" tone-mapping="neutral" camera-orbit="30deg 62deg 2.6m"
      interaction-prompt="none" ${state.prefs.still ? "" : 'auto-rotate auto-rotate-delay="2500" rotation-per-second="8deg"'}>
      <button slot="ar-button" hidden></button></model-viewer>${cap}`;
    $("#era").innerHTML = `<div class="era"><span class="cap" id="era-l">${esc(t("era"))}</span>
      <div class="era-steps" role="radiogroup" aria-labelledby="era-l">${ERAS.map((e) => `<button type="button" role="radio" aria-checked="${state.era === e}" tabindex="${state.era === e ? 0 : -1}" data-era="${e}">${esc(t(e === "today" ? "eraToday" : "era" + e))}</button>`).join("")}</div>
      <p class="era-desc" id="era-desc">${esc(t("eraDesc")[state.era])}</p></div>`;
  } else {
    $("#plate-figure").innerHTML = `<div class="typo-plate" role="img" aria-label="${esc(field(s, "describe"))}"><div><div class="big" lang="ar">${esc(s.name.ar)}</div><p>${esc(t("noPhoto"))}</p></div></div>${cap}`;
    $("#era").innerHTML = "";
  }

  const inPlan = plan.items.find((i) => i.site.id === s.id);
  $("#plate-acts").innerHTML = `
    <button class="btn" type="button" id="describe-btn">${esc(t("describe"))}</button>
    ${s.hasModel ? `<button class="btn primary" type="button" id="ar-btn" hidden>${esc(t("viewAr"))}</button>` : ""}
    ${SCENES_3D.has(s.id) ? `<button class="btn" type="button" data-explore="${s.id}">${esc(t("explore3d"))}</button>` : ""}
    <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" rel="noopener">${esc(t("openMaps"))}</a>
    <button class="btn" type="button" data-toggle="${s.id}" aria-pressed="${!!inPlan}">${esc(inPlan ? t("inPlan", { h: H(inPlan.hour) }) : t("addToPlan"))}</button>
    ${s.hasModel ? `<p class="hint" style="flex-basis:100%">${esc(t("arHelp"))}</p>` : ""}`;
  const mv = $("#mv");
  if (mv) mv.addEventListener("load", () => { if (mv.canActivateAR) $("#ar-btn")?.removeAttribute("hidden"); }, { once: true });

  renderPlateNotes(s);
  if (state.leaf === "plate") document.title = `${name(s)} · Daleel`;
}

function timingSentence(s) {
  const heat = heatFor(state.date).data;
  const b = E.bestHour(s, state.date, heat, 0, { heatSensitive: state.prefs.heatSensitive });
  if (b == null) return t("timingClosed");
  return t("timingNote", { h: H(b), status: statusText(E.status(s, b, state.date)) });
}

function sentences(text) {
  return (text.match(/[^.!?؟。]+[.!?؟。]*\s*/g) || [text]).map((x) => `<span class="sent">${esc(x)}</span>`).join("");
}

function renderPlateNotes(s) {
  const base = [["noteStory", field(s, "story")], ["noteTiming", timingSentence(s)], ["noteFragile", field(s, "fragile")]];
  const guide = state.notes[s.id] || [];
  let i = 0;
  const html = base.map(([k, txt]) => `<li class="note"><span class="num" aria-hidden="true">${++i}</span><div><h3>${esc(t(k))}</h3><p>${sentences(txt)}</p>
      <div class="acts"><button class="btn small" type="button" data-say="${i}">${esc(t("readAloud"))}</button></div></div></li>`).join("")
    + guide.map((g) => `<li class="note guide"><span class="num" aria-hidden="true">${++i}</span><div><h3>${esc(g.q)}</h3>
      <p aria-busy="${!!g.pending}">${g.pending && !g.a ? esc(t("asking")) : sentences(g.a)}</p>
      ${g.offline ? `<p class="src">${esc(t("offline"))}</p>` : ""}${g.error ? `<p class="src">${esc(t("guideError"))}</p>` : ""}
      ${g.pending ? "" : `<div class="acts"><button class="btn small" type="button" data-say="${i}">${esc(t("readAloud"))}</button></div>`}</div></li>`).join("");
  $("#plate-notes").innerHTML = html;
}

async function ask(question) {
  const s = state.byId[state.selected];
  const list = (state.notes[s.id] ??= []);
  const note = { q: question, a: "", pending: true };
  list.push(note);
  renderPlateNotes(s);
  const history = list.slice(0, -1).slice(-3).map(({ q, a }) => ({ q, a }));
  await askGuide({
    question, site: s, sites: state.sites, lang: getLang(), audience: $("#aud").value, history, timing: timingSentence(s),
    onText: (txt) => { note.a = txt; renderPlateNotes(s); },
    onDone: ({ offline, error }) => {
      note.pending = false; note.offline = offline; note.error = error;
      renderPlateNotes(s);
      announce(note.a);
      if (state.prefs.autoRead) speakNote($$("#plate-notes .note").at(-1));
    },
  });
}

// ---------- speech with captions ----------
function speakNote(li) {
  if (!li) return;
  const spans = $$(".sent", li).length ? $$(".sent", li) : $$("p", li);
  Speech.speakSpans(spans, { lang: getLang(), rate: state.prefs.rate });
}

function describePlate() {
  const s = state.byId[state.selected];
  const btn = $("#describe-btn");
  if (Speech.isSpeaking()) { Speech.stop(); btn.textContent = t("describe"); return; }
  const text = [field(s, "describe"), s.hasModel ? t("eraDesc")[state.era] : "", timingSentence(s)].filter(Boolean).join(" ");
  btn.textContent = t("stop");
  Speech.speakText(text, { lang: getLang(), rate: state.prefs.rate, captionEl: $("#era-desc") || null, onEnd: () => (btn.textContent = t("describe")) });
}

// ---------- COLOPHON ----------
function renderColophon() {
  const L = plan.ledger;
  const f1 = (v) => (Math.round(v * 10) / 10).toLocaleString(getLang() === "ar" ? "ar-AE-u-nu-latn" : "en");
  const rows = [
    ["ledStops", L.stops], ["ledWalk", t("km", { v: f1(L.walkKm) })], ["ledDrive", t("km", { v: f1(L.driveKm) })],
    ["ledCo2", t("kg", { v: f1(L.co2) })], ["ledOffPeak", t("ofN", { a: L.offPeak, b: L.stops })], ["ledOutside", t("ofN", { a: L.outsideCity, b: L.stops })],
    ["planScore", `${plan.score}/100`],
  ];
  $("#ledger").innerHTML = rows.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join("");
}

// ---------- chrome: language, settings, routing ----------
function applyPrefs() {
  const p = state.prefs, root = document.documentElement;
  setLang(p.lang);
  root.lang = p.lang; root.dir = p.lang === "ar" ? "rtl" : "ltr";
  root.style.setProperty("--scale", p.scale / 100);
  if (p.theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", p.theme);
  root.classList.toggle("calm", p.calm);
  root.classList.toggle("still", p.still || p.calm);
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  $("#q").placeholder = t("askPlaceholder");
  const lb = $("#lang-btn");
  lb.textContent = p.lang === "en" ? "العربية" : "English"; lb.lang = p.lang === "en" ? "ar" : "en";
  $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === p.lang)));
  $$("[data-theme-opt]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeOpt === p.theme)));
  $("#scale").value = p.scale; $("#scale-out").textContent = p.scale + "%";
  $("#calm").checked = p.calm; $("#still").checked = p.still; $("#auto-read").checked = p.autoRead;
  $("#rate").value = p.rate; $("#heat-sensitive").checked = p.heatSensitive; $("#aud").value = p.audience;
  store.set("prefs", p);
  window.S3?.relabel?.();
}

// ---------- 3D ----------
const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.147.0/";
const SCRIPTS_3D = ["build/three.min.js", "examples/js/controls/OrbitControls.js", "examples/js/objects/Sky.js", "examples/js/objects/Water.js", "examples/js/utils/BufferGeometryUtils.js"].map((f) => THREE_CDN + f)
  .concat(["core", "place-central-souq", "place-souq-inside", "place-al-noor", "place-museum", "place-shanasiyah", "place-suhub"].map((f) => `js/3d/${f}.js`));
let load3d = null;
function ensure3d() {
  return (load3d ||= (async () => {
    for (const src of SCRIPTS_3D) await new Promise((res, rej) => { const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
    window.S3.i18n = { t, getLang };
  })().catch((e) => { load3d = null; throw e; }));
}
function hourFor(s) {
  const it = plan.items.find((i) => i.site.id === s.id);
  return it ? it.hour : (E.bestHour(s, state.date, heatFor(state.date).data, 0, { heatSensitive: state.prefs.heatSensitive }) ?? 16);
}
function openExplore(id) {
  state.explore = id;
  if (location.hash !== "#explore") location.hash = "#explore"; else enter3d();
}
async function enter3d() {
  const asked = state.explore; state.explore = null;
  const id = asked || state.selected, s = state.byId[id];
  const msg = $("#p3-loader p");
  if (!window.S3?.started) { $("#p3-h").textContent = t("explore3d"); msg.textContent = t("loading3d", { name: s && SCENES_3D.has(id) ? name(s) : t("explore3d") }); }
  try { await ensure3d(); } catch { msg.textContent = t("engineFail3d"); return; }
  if (state.leaf !== "explore") return;
  if (window.S3.failed) { msg.textContent = t(window.S3.failed === "webgl" ? "noWebgl3d" : "engineFail3d"); return; }
  if (!window.S3.started) window.S3.start({ id, hour: s ? hourFor(s) : undefined });
  else { window.S3.pause(false); if (asked && s) window.S3.show(id, hourFor(s)); }
}

function render() {
  recompute();
  renderIndex();
  renderPlate();
  renderColophon();
}

function showLeaf(leaf, focus = true) {
  state.leaf = ["index", "plate", "colophon", "explore"].includes(leaf) ? leaf : "index";
  if (state.leaf === "explore") enter3d(); else window.S3?.pause?.(true);
  $$(".leaf").forEach((el) => el.classList.toggle("on", el.id === "leaf-" + state.leaf));
  $$("nav.leaves a").forEach((a) => (a.dataset.leaf === state.leaf ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  const h = $(`#leaf-${state.leaf} h1`);
  const own = [...h.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  document.title = `${own || h.textContent.trim()} · Daleel`;
  if (focus) h.focus({ preventScroll: false });
  Speech.stop();
}

function openPlate(id) {
  state.selected = id; store.set("selected", id);
  if (id !== "al-hisn") state.era = "today";
  renderPlate();
  if (location.hash !== "#plate") location.hash = "#plate"; else showLeaf("plate");
}

function bind() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, a");
    if (!b) return;
    if (b.dataset.open) return openPlate(b.dataset.open);
    if (b.dataset.explore) return openExplore(b.dataset.explore);
    if (b.dataset.move) return moveStop(b.dataset.move, +b.dataset.d);
    if (b.dataset.toggle) return toggleStop(b.dataset.toggle);
    if (b.dataset.apply) return applySuggestion(sugg[+b.dataset.apply]);
    if (b.dataset.say) return speakNote(b.closest(".note"));
    if (b.dataset.era) { state.era = b.dataset.era; renderPlate(); $(`[data-era="${state.era}"]`).focus(); announce(t("eraDesc")[state.era]); return; }
    if (b.id === "describe-btn") return describePlate();
    if (b.id === "ar-btn") return $("#mv")?.activateAR();
    if (b.dataset.lang) { state.prefs.lang = b.dataset.lang; applyPrefs(); render(); return; }
    if (b.dataset.themeOpt) { state.prefs.theme = b.dataset.themeOpt; applyPrefs(); return; }
  });
  // radiogroup arrow keys for the era control
  document.addEventListener("keydown", (e) => {
    const r = e.target.closest?.("[role=radio][data-era]");
    if (!r || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    // Down/Right move forward; in Arabic the horizontal keys follow reading direction.
    let fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    if (document.documentElement.dir === "rtl" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) fwd = e.key === "ArrowLeft";
    const i = ERAS.indexOf(state.era);
    state.era = ERAS[(i + (fwd ? 1 : -1) + ERAS.length) % ERAS.length];
    renderPlate(); $(`[data-era="${state.era}"]`).focus(); announce(t("eraDesc")[state.era]);
  });
  $("#lang-btn").addEventListener("click", () => { state.prefs.lang = state.prefs.lang === "en" ? "ar" : "en"; applyPrefs(); render(); showLeaf(state.leaf, false); });
  $("#settings-btn").addEventListener("click", () => $("#settings").showModal());
  $("#day").addEventListener("change", (e) => { const [y, m, d] = e.target.value.split("-").map(Number); if (y) { state.date = new Date(y, m - 1, d); render(); } });
  $("#start").addEventListener("change", (e) => { state.start = +e.target.value; render(); });
  $("#july-btn").addEventListener("click", () => { state.heat.july = !state.heat.july; render(); announce(heatFor(state.date).src); });
  $("#scale").addEventListener("input", (e) => { state.prefs.scale = +e.target.value; applyPrefs(); });
  $("#rate").addEventListener("input", (e) => { state.prefs.rate = +e.target.value; applyPrefs(); });
  for (const [id, key, rerender] of [["calm", "calm"], ["still", "still", true], ["auto-read", "autoRead"], ["heat-sensitive", "heatSensitive", true]]) {
    $("#" + id).addEventListener("change", (e) => { state.prefs[key] = e.target.checked; applyPrefs(); if (rerender) render(); });
  }
  $("#aud").addEventListener("change", (e) => { state.prefs.audience = e.target.value; applyPrefs(); });
  $("#ask-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#q").value.trim();
    if (!q) return $("#q").focus();
    $("#q").value = "";
    ask(q);
  });
  window.addEventListener("hashchange", () => showLeaf(location.hash.slice(1)));
}

async function boot() {
  const [sites, sample] = await Promise.all([fetch("data/sites.json").then((r) => r.json()), fetch("data/heat-sample.json").then((r) => r.json())]);
  state.sites = sites.sites;
  state.byId = Object.fromEntries(state.sites.map((s) => [s.id, s]));
  state.stops = state.stops.filter((s) => state.byId[s.id]);
  state.heat.sample = sample;
  $("#day").value = isoDate(state.date);
  $("#start").innerHTML = Array.from({ length: 9 }, (_, i) => 6 + i).map((h) => `<option value="${h}" ${h === state.start ? "selected" : ""}>${H(h)}</option>`).join("");
  applyPrefs();
  bind();
  render();
  showLeaf(location.hash.slice(1) || "index", false);
  loadLiveHeat();
}

boot();
