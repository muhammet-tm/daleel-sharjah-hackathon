import * as E from "./engine.js";
import { t, setLang, getLang, name, field } from "./i18n.js";
import { askGuide } from "./guide.js";
import * as Speech from "./speech.js";
import * as Sahm from "./sahm.js";
import * as Wayfinding from "./ar-wayfinding.js";

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
  selected: "blue-souk", // the Plate always opens on the Central Souq; choosing another place still works during the visit
  era: "today",
  heat: { live: null, sample: null, july: false },
  notes: {}, // siteId -> [{ q, a, offline, pending }]
  prefs: Object.assign({ lang: "en", scale: 100, theme: "light", calm: false, still: false, autoRead: false, rate: 1, heatSensitive: false, audience: "adult", voice: false, head: false, wink: false }, store.get("prefs", {})),
  leaf: "index",
  profile: store.get("profile", null), // { name, age, nationality, landing } or { skipped: true }
  offers: [],
  // Recycling rewards: missions done, points spent, vouchers, and step progress per place for today.
  recycle: Object.assign({ log: [], spent: 0, vouchers: [], progress: { date: "", steps: {} } }, store.get("recycle", {})),
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
      <span class="st ${it.status.code}">${esc(statusText(it.status))}${n ? ` <span class="note-ref">${esc(t("seeNote", { n }))}</span>` : ""}</span>
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
        <span class="pm">${b != null ? esc(t("bestAt", { h: H(b) })) : esc(t("closed"))}${s.underVisited ? ` · <em>${esc(t("underVisited"))}</em>` : ""}${recycledMark(s.id)}</span>
        <button class="btn small" type="button" data-toggle="${s.id}" aria-pressed="${on}" aria-label="${esc(on ? t("removeFor", { name: name(s) }) : t("addFor", { name: name(s) }))}">${esc(on ? t("added") : t("add"))}</button></div>`;
    }).join("")}</div>`;
  }).join("");
}

// Real map (Leaflet + OpenStreetMap tiles; darkened with a filter in the dark theme). Falls back to the schematic when Leaflet cannot load.
let lmap = null, ltiles = null, llayers = null;
function mapDark() { const th = document.documentElement.getAttribute("data-theme"); return th === "dark" || (!th && matchMedia("(prefers-color-scheme: dark)").matches); }
function renderMap() {
  if (!window.L) return renderSchematic();
  const css = getComputedStyle(document.documentElement), v = (k) => css.getPropertyValue(k).trim();
  const still = document.documentElement.classList.contains("still");
  if (!lmap) {
    $("#map").innerHTML = "";
    lmap = L.map("map", { scrollWheelZoom: false, zoomAnimation: !still, fadeAnimation: !still, markerZoomAnimation: !still, attributionControl: false });
    L.control.attribution({ prefix: '<a href="https://leafletjs.com">Leaflet</a>' }).addTo(lmap);
    ltiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(lmap);
    llayers = L.layerGroup().addTo(lmap);
  }
  $("#map").classList.toggle("map-dark", mapDark());
  llayers.clearLayers();
  const inPlan = new Set(plan.items.map((i) => i.site.id)), recycled = new Set(state.recycle.log.map((m) => m.siteId));
  // every place: a small dot that opens its plate
  for (const s of state.sites) {
    if (inPlan.has(s.id)) continue;
    L.circleMarker([s.lat, s.lng], { radius: 5, color: v("--ink"), weight: 1.5, fillColor: v("--sheet"), fillOpacity: 1 })
      .bindTooltip(name(s) + (recycled.has(s.id) ? " ✓" : "")).on("click", () => openPlate(s.id)).addTo(llayers);
  }
  // the route and numbered stops, in plan order
  const pts = plan.items.map((it) => [it.site.lat, it.site.lng]);
  if (pts.length > 1) {
    L.polyline(pts, { color: v("--page"), weight: 8, opacity: .9, interactive: false }).addTo(llayers);   // pale casing so the route reads over streets
    L.polyline(pts, { color: v("--route"), weight: 4, dashArray: "9 7", lineCap: "round", interactive: false }).addTo(llayers);
  }
  plan.items.forEach((it, i) => {
    const s = it.site, done = recycled.has(s.id);
    L.marker([s.lat, s.lng], {
      icon: L.divIcon({ className: "map-stop", html: `<span>${i + 1}</span>${done ? '<b aria-hidden="true">✓</b>' : ""}`, iconSize: [30, 30], iconAnchor: [15, 15] }),
      title: `${i + 1}. ${name(s)}, ${H(it.hour)}`, keyboard: true, riseOnHover: true,
    }).bindTooltip(`${i + 1}. ${name(s)} · ${H(it.hour)}`, { direction: "top", offset: [0, -14] }).on("click", () => openPlate(s.id)).addTo(llayers);
  });
  // fit the route only when the map is visible: a hidden map has no size and would zoom out to the whole world
  const all = pts.length ? pts : state.sites.map((s) => [s.lat, s.lng]);
  if ($("#map").clientWidth > 0) { lmap.invalidateSize(); lmap.fitBounds(L.latLngBounds(all).pad(pts.length === 1 ? 2 : 0.25), { maxZoom: 14, animate: false }); }
  const done = state.sites.filter((s) => recycled.has(s.id)).length;
  $("#map").setAttribute("role", "region");
  $("#map").setAttribute("aria-label", t("mapLabel") + (done ? " " + t("mapRecycled", { n: done }) : ""));
}

function renderSchematic() {
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
  const done = state.sites.filter((s) => state.recycle.log.some((m) => m.siteId === s.id));
  // A tick under each recycled place, grouped like the plan markers ("✓ 3" for a cluster), drawn last so nothing covers it.
  const tickGroups = [];
  for (const s of done) {
    const p = P(s), g = tickGroups.find((g) => Math.hypot(g.p[0] - p[0], g.p[1] - p[1]) < 16);
    if (g) g.n++; else tickGroups.push({ p, n: 1 });
  }
  const ticks = tickGroups.map((g) => `<text class="lbl" x="${(g.p[0] + 12).toFixed(1)}" y="${(g.p[1] + 18).toFixed(1)}">✓${g.n > 1 ? " " + g.n : ""}</text>`).join("");
  const mapLabel = t("mapLabel") + (done.length ? " " + t("mapRecycled", { n: done.length }) : "");
  $("#map").innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(mapLabel)}">
    <path d="M${P({ lng: 56.22, lat: 25.42 })[0]} 0 L${P({ lng: 56.22, lat: 24.98 })[0]} ${Hh}" stroke="var(--hair)" stroke-dasharray="2 4"/>
    ${towns.map(([n, lng, lat]) => { const [x, y] = P({ lng, lat }); return `<text class="lbl" x="${x + 8}" y="${y - 8}">${n}</text>`; }).join("")}
    ${allDots}<path class="rt" d="${route}"/>
    ${groups.map((g) => `<circle class="site on" cx="${g.p[0]}" cy="${g.p[1]}" r="10"/><text class="n" x="${g.p[0]}" y="${g.p[1] + 3}" text-anchor="middle">${g.nums.length > 2 ? `${g.nums[0]}–${g.nums.at(-1)}` : g.nums.join(",")}</text>`).join("")}
    ${ticks}
  </svg>`;
}

// ---------- PLATE ----------
const ERAS = ["1823", "1969", "today"];
// Plate pictures: the team's photos where they exist, otherwise a still of the site's 3D scene.
// Files live in public/plates/. A missing file is skipped, so a photo appears as soon as it is saved there.
const PLATES = {
  "blue-souk": [
    { src: "plates/blue-souk-1823.jpg", kind: "illustration", era: "1823", label: "shot1823", alt: { en: "Open desert with camels walking over low dunes at sunset, suggesting the land before the souq.", ar: "صحراء مفتوحة وجمال تمشي فوق كثبان منخفضة عند الغروب، توحي بالأرض قبل السوق." } },
    { src: "plates/blue-souk-1978.jpg", kind: "archive", era: "1978", label: "shot1978", alt: { en: "Black-and-white photo of the newly opened souq in 1978: both wings and their wind towers across an almost empty road.", ar: "صورة بالأبيض والأسود للسوق عند افتتاحه عام 1978: الجناحان وأبراج الهواء عبر طريق شبه خالٍ." } },
    { src: "plates/blue-souk-1.jpg", kind: "photo", era: "today", label: "shotFront", start: true, alt: { en: "The front of the Central Souq: a blue-tiled arch, a glazed vault and tall wind towers above two floors of arches.", ar: "واجهة السوق المركزي: قوس مكسو بالبلاط الأزرق وقبو زجاجي وأبراج هواء عالية فوق طابقين من الأقواس." } },
    { src: "plates/blue-souk-2.jpg", kind: "photo", era: "today", label: "shotAir", alt: { en: "Both wings of the souq from the air, joined by bridges, with Khalid Lagoon and the harbour behind.", ar: "جناحا السوق من الجو تربطهما الجسور، وخلفهما بحيرة خالد والميناء." } },
    { src: "plates/blue-souk-3.jpg", kind: "photo", era: "today", label: "shotInside", alt: { en: "Inside the main hall: shop fronts on two levels, a central escalator and a hanging chandelier under the vault.", ar: "داخل القاعة الرئيسية: واجهات محلات على طابقين، وسلم كهربائي في الوسط، وثريا معلقة تحت القبو." } },
    { src: "plates/blue-souk-3d.jpg", kind: "render", era: "today", label: "shot3d" },
  ],
  "al-noor-mosque": [{ src: "plates/al-noor-mosque-3d.jpg", kind: "render", label: "shot3d" }],
  "islamic-museum": [{ src: "plates/islamic-museum-3d.jpg", kind: "render", label: "shot3d" }],
  "heart-of-sharjah": [{ src: "plates/heart-of-sharjah-3d.jpg", kind: "render", label: "shot3d" }],
};
const missingPics = new Set();
function renderPicture(s, n) {
  const shots = PLATES[s.id].filter((x) => !missingPics.has(x.src));
  if (!shots.length) return false;
  const start = Math.max(0, shots.findIndex((x) => x.start));
  const i = Math.min(state.shot?.[s.id] ?? start, shots.length - 1), sh = shots[i];
  const alt = sh.alt ? sh.alt[getLang()] || sh.alt.en : field(s, "describe");
  const credit = t({ photo: "creditTeam", archive: "creditArchive", illustration: "creditIllustration" }[sh.kind] || "artist3d");
  const img = `<img class="plate-img${sh.kind === "archive" ? " whole" : ""}" src="${sh.src}" alt="${esc(alt)}">`;
  $("#plate-figure").innerHTML = (SCENES_3D.has(s.id) ? `<button type="button" class="plate-pic" data-explore="${s.id}" aria-label="${esc(t("explore3d"))}. ${esc(alt)}">${img}</button>` : img)
    + `<figcaption class="cap plate-cap">${esc(t("plateCaption", { n, name: name(s) }))} · ${esc(t(sh.label))} · ${esc(credit)}</figcaption>`;
  const eras = [...new Set(shots.map((x) => x.era).filter(Boolean))];
  if (eras.length > 1) {
    const inEra = shots.map((x, k) => [x, k]).filter(([x]) => x.era === sh.era);
    const first = (e) => { const k = shots.findIndex((x) => x.era === e && x.start); return k >= 0 ? k : shots.findIndex((x) => x.era === e); };
    $("#era").innerHTML = `<div class="era"><span class="cap" id="pera-l">${esc(t("era"))}</span>
      <div class="era-steps plate-eras" role="group" aria-labelledby="pera-l" style="grid-template-columns:repeat(${eras.length}, 1fr)">${eras.map((e) => `<button type="button" data-shot="${first(e)}" aria-pressed="${sh.era === e}">${esc(e === "today" ? t("eraToday") : e)}</button>`).join("")}</div>
      <p class="era-desc">${esc(t("plateEra_" + s.id + "_" + sh.era))}</p>
      ${inEra.length > 1 ? `<div class="seg plate-shots" role="group" aria-label="${esc(t("shotsLabel"))}">${inEra.map(([x, k]) => `<button type="button" data-shot="${k}" aria-pressed="${k === i}">${esc(t(x.label))}</button>`).join("")}</div>` : ""}</div>`;
  } else {
    $("#era").innerHTML = shots.length > 1 ? `<div class="seg plate-shots" role="group" aria-label="${esc(t("shotsLabel"))}">${shots.map((x, k) => `<button type="button" data-shot="${k}" aria-pressed="${k === i}">${esc(t(x.label))}</button>`).join("")}</div>` : "";
  }
  $("#plate-figure .plate-img").addEventListener("error", () => { missingPics.add(sh.src); renderPlate(); }, { once: true });
  return true;
}

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
  } else if (PLATES[s.id] && renderPicture(s, n)) {
    // picture plate (photos or 3D still)
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
  renderWayfind(s);
  if (state.leaf === "plate") document.title = `${name(s)} · Daleel`;
}

// Find your way inside: for places with a 3D scene, opens the AR guide (js/3d/nav.js) on the 3D leaf.
// Camera AR in the real place is planned (js/ar-wayfinding.js); until then other places show nothing here.
function renderWayfind(s) {
  if (!SCENES_3D.has(s.id) && !Wayfinding.READY) { $("#wayfind").innerHTML = ""; return; }
  $("#wayfind").innerHTML = `<div class="prose" style="margin-top:22px"><h2 id="wf-h">${esc(t("wfTitle"))}</h2>
    <p>${esc(t("wfLede", { name: name(s) }))}</p></div>
    <div class="plate-acts"><button class="btn primary" type="button" data-guide="${s.id}">${esc(t("wfStart"))}</button></div>`;
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

// ---------- recycling rewards (Recycle leaf) ----------
const todayIso = () => isoDate(new Date());
function recSite() {
  const inPlan = plan.items.map((i) => i.site.id);
  if (!state.byId[state.recSite]) state.recSite = inPlan.includes(state.selected) ? state.selected : inPlan[0] || state.selected;
  return state.byId[state.recSite];
}
// GPS location check for the Recycle leaf: is the visitor at (or near) the chosen place?
// Site coordinates are approximate (about 300 m), so "at the place" means within 400 m. Read once, never stored or sent.
const NEAR_M = 400;
function metresBetween(a, b) {
  const R0 = 6371000, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R0 * Math.asin(Math.sqrt(h));
}
const fmtDist = (m) => (m < 1000 ? t("distM", { v: Math.round(m / 10) * 10 }) : t("distKm", { v: (Math.round(m / 100) / 10).toLocaleString(getLang() === "ar" ? "ar-AE-u-nu-latn" : "en") }));
function renderLocation() {
  const L = state.recLoc, s = recSite(), el = $("#rec-loc");
  if (!L || L.status === "idle") { el.textContent = t("recLocHelp"); return; }
  if (L.status === "checking") { el.textContent = t("recLocChecking"); return; }
  if (L.status === "denied") { el.textContent = t("recLocDenied"); return; }
  if (L.status === "none") { el.textContent = t("recLocNone"); return; }
  const d = metresBetween(L.pos, s);
  el.textContent = d <= NEAR_M ? t("recLocHere", { name: name(s), d: fmtDist(d) }) : t("recLocFar", { name: name(s), d: fmtDist(d) });
}
const locatedAt = (id) => state.recLoc?.pos && metresBetween(state.recLoc.pos, state.byId[id]) <= NEAR_M;
function checkLocation() {
  if (!navigator.geolocation) { state.recLoc = { status: "none" }; return renderLocation(); }
  state.recLoc = { status: "checking" }; renderLocation();
  navigator.geolocation.getCurrentPosition((p) => {
    const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    state.recLoc = { status: "done", pos };
    // if the visitor is standing at a different place than the one picked, switch to it
    const nearest = state.sites.map((x) => [x, metresBetween(pos, x)]).sort((a, b) => a[1] - b[1])[0];
    if (nearest && nearest[1] <= NEAR_M && nearest[0].id !== state.recSite) { state.recSite = nearest[0].id; renderRecycleLeaf(); }
    renderLocation(); announce($("#rec-loc").textContent);
  }, (err) => { state.recLoc = { status: err.code === 1 ? "denied" : "none" }; renderLocation(); },
  { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}

function renderRecycleLeaf() {
  const s = recSite(), inPlan = new Set(plan.items.map((i) => i.site.id));
  const opt = (x) => `<option value="${x.id}" ${x.id === s.id ? "selected" : ""}>${esc(name(x))}</option>`;
  $("#rec-site").innerHTML = `<optgroup label="${esc(t("recInPlan"))}">${plan.items.map((i) => opt(i.site)).join("")}</optgroup>
    <optgroup label="${esc(t("recAll"))}">${state.sites.filter((x) => !inPlan.has(x.id)).map(opt).join("")}</optgroup>`;
  renderRecycle(s);
  renderLocation();
  const R = E.recycleTotals(state.recycle.log, state.recycle.spent);
  const f1 = (v) => (Math.round(v * 10) / 10).toLocaleString(getLang() === "ar" ? "ar-AE-u-nu-latn" : "en");
  $("#rec-ledger").innerHTML = [["ledBottles", R.bottles], ["ledPlastic", t("kg", { v: f1(R.plasticKg) })], ["ledCo2Saved", t("kg", { v: f1(R.co2Kg) })], ["ledPoints", t("pts", { v: R.balance })]]
    .map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join("");
  renderOffers(R.balance);
}
const saveRecycle = () => store.set("recycle", state.recycle);

function recycledMark(id) {
  const log = state.recycle.log;
  if (E.recycledOn(log, id, todayIso())) return ` · <em>✓ ${esc(t("recycledToday"))}</em>`;
  return log.some((m) => m.siteId === id) ? ` · <em>✓ ${esc(t("recycled"))}</em>` : "";
}

// Steps finished today at a place (progress resets each day).
function stepsDone(id) {
  const p = state.recycle.progress;
  if (p.date !== todayIso()) { p.date = todayIso(); p.steps = {}; }
  return p.steps[id] || 0;
}

function renderRecycle(s, busy = false) {
  const n = E.RECYCLE.bottles, steps = E.RECYCLE.steps;
  const doneToday = E.recycledOn(state.recycle.log, s.id, todayIso());
  const at = doneToday ? steps.length : stepsDone(s.id);
  const vars = { n, name: name(s) };
  const items = steps.map((k, i) => {
    const finished = i < at, current = i === at && !doneToday;
    const body = finished ? t("recOk_" + k, vars) : current && busy ? t("recChecking") : t("recDo_" + k, vars);
    const action = current && !busy
      ? `<div class="acts"><button class="btn small primary" type="button" data-rec-upload="${s.id}" aria-label="${esc(t("recUploadFor", { i: i + 1, step: t("recStep_" + k) }))}">${esc(t("recUpload"))}</button></div>`
      : !finished && !current ? `<p class="src">${esc(t("recLater", { i }))}</p>` : "";
    // example photo for each step (team demo photos in public/plates/recycle-1..3.jpg)
    const example = `<figure class="rec-example"><img src="plates/recycle-${i + 1}.jpg" alt="${esc(t("recEx_" + k, vars))}" loading="lazy"><figcaption class="cap">${esc(t("recExample"))}</figcaption></figure>`;
    return `<li class="note"><span class="num" aria-hidden="true">${finished ? "✓" : i + 1}</span><div class="rec-step"><div>
      <h3>${esc(t("recStep_" + k))}${finished ? ` · ${esc(t("recDoneMark"))}` : ""}</h3>
      <p aria-busy="${current && busy}">${esc(body)}</p>${action}</div>${example}</div></li>`;
  }).join("");
  const last = doneToday ? state.recycle.log.filter((m) => m.siteId === s.id && m.date === todayIso()).at(-1) : null;
  $("#recycle").innerHTML = `<div class="prose"><h2 id="rec-h" tabindex="-1">${esc(t("recTitle"))}</h2><p>${esc(t("recLede", vars))}</p><p class="hint">${esc(t("recSimNote", vars))}</p></div>
    <ol class="notes" style="margin-top:14px">${items}</ol>
    ${last ? `<div class="prose"><p><b>✓ ${esc(t("recDone", { n: last.bottles, p: last.points }))}</b> ${esc(t("recTomorrow"))}</p>
      <p style="margin-top:12px"><button class="btn" type="button" data-goto-offers>${esc(t("recSpend"))}</button></p></div>` : ""}`;
}

let uploadSite = null;
function startUpload(id) { uploadSite = id; const f = $("#rec-file"); f.value = ""; f.click(); }

// Simulated photo check: any image passes and reports RECYCLE.bottles.
function photoChosen() {
  const s = state.byId[uploadSite];
  if (!s || !$("#rec-file").files.length) return;
  renderRecycle(s, true);
  setTimeout(() => {
    const step = stepsDone(s.id), k = E.RECYCLE.steps[step];
    const vars = { n: E.RECYCLE.bottles, name: name(s) };
    let msg = t("recOk_" + k, vars);
    if (step + 1 >= E.RECYCLE.steps.length) {
      const points = E.missionPoints(state.recycle.log, s.id);
      state.recycle.log.push({ siteId: s.id, date: todayIso(), bottles: E.RECYCLE.bottles, points, located: !!locatedAt(s.id) });
      delete state.recycle.progress.steps[s.id];
      msg += " " + t("recDone", { n: E.RECYCLE.bottles, p: points }) + " " + t(locatedAt(s.id) ? "recLocOk" : "recLocNot");
    } else {
      state.recycle.progress.steps[s.id] = step + 1;
    }
    saveRecycle();
    renderRecycleLeaf(); renderPlaces(); renderMap();
    ($("#recycle [data-rec-upload]") || $("#recycle [data-goto-offers]") || $("#rec-h")).focus?.();
    announce(msg);
  }, state.prefs.still || state.prefs.calm ? 0 : 700);
}

function renderOffers(balance) {
  const offerRow = (o) => {
    const site = state.byId[o.siteId], short = o.cost - balance;
    const btn = short > 0
      ? `<button class="btn small" type="button" disabled>${esc(t("needMore", { n: short }))}</button>`
      : `<button class="btn small" type="button" data-redeem="${o.id}" aria-label="${esc(t("redeemAria", { offer: field(o, "offer"), shop: field(o, "shop"), c: o.cost }))}">${esc(t("redeemFor", { c: o.cost }))}</button>`;
    return `<div class="place"><span class="pn">${esc(field(o, "offer"))}</span><span class="pm">${esc(field(o, "shop"))} · ${esc(name(site))}</span>${btn}</div>`;
  };
  const vRow = (v) => {
    const o = state.offers.find((x) => x.id === v.offerId);
    return `<div class="place"><span class="pn" dir="ltr">${esc(v.code)}</span><span class="pm">${esc(field(o, "offer"))} · ${esc(field(o, "shop"))} · ${esc(v.used ? t("vUsed") : t("vActive"))}</span>
      ${v.used ? "" : `<button class="btn small" type="button" data-used="${v.id}" aria-label="${esc(t("markUsedFor", { code: v.code }))}">${esc(t("markUsed"))}</button>`}</div>`;
  };
  $("#offers").innerHTML = `<h2 id="offers-h" tabindex="-1">${esc(t("offersTitle"))}</h2><p class="hint">${esc(t("offersLede"))}</p>
    <div class="region"><h3>${esc(t("ledPoints"))}: ${esc(t("pts", { v: balance }))}</h3>${state.offers.map(offerRow).join("")}</div>
    <div class="region"><h3>${esc(t("vouchersTitle"))}</h3>${state.recycle.vouchers.length ? state.recycle.vouchers.map(vRow).join("") : `<p class="empty">${esc(t("noVouchers"))}</p>`}</div>`;
}

function askRedeem(id) {
  const o = state.offers.find((x) => x.id === id);
  $("#voucher-body").innerHTML = `<header><h2 id="voucher-h">${esc(t("offersTitle"))}</h2></header>
    <p>${esc(t("confirmRedeem", { c: o.cost, offer: field(o, "offer"), shop: field(o, "shop") }))}</p>
    <div class="plate-acts"><button class="btn" value="cancel">${esc(t("cancel"))}</button>
      <button class="btn primary" type="button" data-confirm-redeem="${o.id}">${esc(t("redeem"))}</button></div>`;
  $("#voucher").showModal();
  $("[data-confirm-redeem]").focus();
}

function redeem(id) {
  const o = state.offers.find((x) => x.id === id);
  if (E.recycleTotals(state.recycle.log, state.recycle.spent).balance < o.cost) return;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const v = { id: String(Date.now()), offerId: o.id, code: `DAL-${part()}-${part()}`, ts: Date.now(), used: false };
  state.recycle.spent += o.cost;
  state.recycle.vouchers.unshift(v);
  saveRecycle();
  renderRecycleLeaf();
  $("#voucher-body").innerHTML = `<header><h2 id="voucher-h">${esc(t("voucherTitle"))}: ${esc(field(o, "offer"))}</h2><button class="btn small" value="close">${esc(t("close"))}</button></header>
    <dl class="ledger" style="margin:0"><div><dt>${esc(t("voucherCode"))}</dt><dd dir="ltr">${esc(v.code)}</dd></div></dl>
    <p>${esc(t("voucherShow", { shop: field(o, "shop") }))}</p>`;
  $("#voucher-body [value=close]").focus();
  announce(`${t("voucherTitle")} ${v.code}`);
}

function markUsed(id) {
  const v = state.recycle.vouchers.find((x) => x.id === id);
  if (!v) return;
  v.used = true; saveRecycle(); renderRecycleLeaf();
  $("#offers-h").focus?.();
  announce(`${v.code}: ${t("vUsed")}`);
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
  $("#hf-voice").checked = p.voice; $("#hf-head").checked = p.head; $("#hf-wink").checked = p.wink;
  store.set("prefs", p);
  window.S3?.relabel?.();
  if (lmap && plan) renderMap();
  if (state.leaf === "welcome") fillWelcome();
  Sahm.configure({ voice: p.voice, head: p.head, wink: p.wink, still: p.still || p.calm });
}

// ---------- WELCOME (first-visit onboarding) ----------
const NATIONALITIES = [
  ["AE", "United Arab Emirates", "الإمارات"], ["SA", "Saudi Arabia", "السعودية"], ["OM", "Oman", "عُمان"], ["KW", "Kuwait", "الكويت"], ["BH", "Bahrain", "البحرين"], ["QA", "Qatar", "قطر"],
  ["EG", "Egypt", "مصر"], ["JO", "Jordan", "الأردن"], ["LB", "Lebanon", "لبنان"], ["SY", "Syria", "سوريا"], ["IQ", "Iraq", "العراق"], ["PS", "Palestine", "فلسطين"], ["YE", "Yemen", "اليمن"],
  ["SD", "Sudan", "السودان"], ["MA", "Morocco", "المغرب"], ["DZ", "Algeria", "الجزائر"], ["TN", "Tunisia", "تونس"], ["IN", "India", "الهند"], ["PK", "Pakistan", "باكستان"], ["BD", "Bangladesh", "بنغلاديش"],
  ["PH", "Philippines", "الفلبين"], ["ID", "Indonesia", "إندونيسيا"], ["MY", "Malaysia", "ماليزيا"], ["CN", "China", "الصين"], ["JP", "Japan", "اليابان"], ["KR", "South Korea", "كوريا الجنوبية"],
  ["KZ", "Kazakhstan", "كازاخستان"], ["UZ", "Uzbekistan", "أوزبكستان"], ["TM", "Turkmenistan", "تركمانستان"], ["TJ", "Tajikistan", "طاجيكستان"], ["RU", "Russia", "روسيا"], ["TR", "Türkiye", "تركيا"], ["IR", "Iran", "إيران"],
  ["GB", "United Kingdom", "المملكة المتحدة"], ["DE", "Germany", "ألمانيا"], ["FR", "France", "فرنسا"], ["IT", "Italy", "إيطاليا"], ["ES", "Spain", "إسبانيا"], ["NL", "Netherlands", "هولندا"],
  ["US", "United States", "الولايات المتحدة"], ["CA", "Canada", "كندا"], ["AU", "Australia", "أستراليا"], ["NG", "Nigeria", "نيجيريا"], ["KE", "Kenya", "كينيا"], ["ZA", "South Africa", "جنوب أفريقيا"],
];
function fillWelcome() {
  const p = state.profile && !state.profile.skipped ? state.profile : {}, ar = getLang() === "ar";
  const keep = $("#ob-nat").value || p.nationality || "";
  const sorted = [...NATIONALITIES].sort((a, b) => (ar ? a[2].localeCompare(b[2], "ar") : a[1].localeCompare(b[1])));
  $("#ob-nat").innerHTML = `<option value="">${esc(t("obChoose"))}</option>` + sorted.map(([c, en, a]) => `<option value="${c}" ${keep === c ? "selected" : ""}>${esc(ar ? a : en)}</option>`).join("")
    + `<option value="other" ${keep === "other" ? "selected" : ""}>${esc(t("obOther"))}</option>`;
  if (!$("#ob-name").value) $("#ob-name").value = p.name || "";
  if (!$("#ob-age").value) $("#ob-age").value = p.age || "";
  if (!$("#ob-land").value) $("#ob-land").value = p.landing || isoDate(new Date());
}
function saveWelcome(e) {
  e.preventDefault();
  const f = { name: $("#ob-name").value.trim(), age: +$("#ob-age").value, nationality: $("#ob-nat").value, landing: $("#ob-land").value };
  const bad = [];
  if (!f.name) bad.push(["#ob-name", "obErrName"]);
  if (!(f.age >= 1 && f.age <= 120)) bad.push(["#ob-age", "obErrAge"]);
  if (!f.nationality) bad.push(["#ob-nat", "obErrNat"]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.landing)) bad.push(["#ob-land", "obErrLand"]);
  $$("#ob-form [aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  if (bad.length) {
    bad.forEach(([sel]) => $(sel).setAttribute("aria-invalid", "true"));
    $("#ob-err").textContent = bad.map(([, k]) => t(k)).join(" ");
    return $(bad[0][0]).focus();
  }
  $("#ob-err").textContent = "";
  state.profile = f; store.set("profile", f);
  // the plan starts on the day of landing when it is today or later; children get explanations for children
  const land = new Date(f.landing + "T00:00"), today = new Date(isoDate(new Date()) + "T00:00");
  if (land >= today) state.date = land;
  if (f.age < 13) state.prefs.audience = "child";
  $("#day").value = isoDate(state.date);
  applyPrefs(); render();
  location.hash = "#index";
  announce(t("obHello", { name: f.name }));
}
function skipWelcome() {
  if (!state.profile) { state.profile = { skipped: true }; store.set("profile", state.profile); }
  location.hash = "#index";
}
function renderGreeting() {
  const p = state.profile, el = $("#greet");
  if (!p || p.skipped || !p.name) { el.hidden = true; return; }
  const when = new Date(p.landing + "T00:00").toLocaleDateString(getLang() === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { day: "numeric", month: "long" });
  el.hidden = false; el.textContent = t("obGreeting", { name: p.name, date: when });
}

// ---------- 3D ----------
const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.147.0/";
const SCRIPTS_3D = ["build/three.min.js", "examples/js/controls/OrbitControls.js", "examples/js/objects/Sky.js", "examples/js/objects/Water.js", "examples/js/utils/BufferGeometryUtils.js"].map((f) => THREE_CDN + f)
  .concat(["core", "place-central-souq", "place-souq-inside", "place-al-noor", "place-museum", "place-shanasiyah", "place-suhub", "routes", "nav"].map((f) => `js/3d/${f}.js`));
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
  if (state.openGuide) {
    state.openGuide = false;
    for (let i = 0; i < 60 && !(document.querySelector("#p3-loader.done") && window.S3.activeId() === window.S3.sceneFor(id)); i++) await new Promise((r) => setTimeout(r, 250));
    const g = $("#p3-guide"); if (g && g.getAttribute("aria-pressed") !== "true") { g.scrollIntoView({ block: "center" }); g.click(); }
  }
}

function render() {
  recompute();
  renderIndex();
  renderGreeting();
  renderPlate();
  renderColophon();
  renderRecycleLeaf();
}

function showLeaf(leaf, focus = true) {
  state.leaf = ["index", "plate", "colophon", "explore", "recycle", "welcome"].includes(leaf) ? leaf : "index";
  document.body.classList.toggle("onboarding", state.leaf === "welcome");
  if (state.leaf === "welcome") fillWelcome();
  if (state.leaf === "explore") enter3d(); else window.S3?.pause?.(true);
  if (state.leaf === "index" && lmap) setTimeout(() => renderMap(), 0);   // re-fit the route now that the map has a size
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
    if (b.dataset.recUpload) return startUpload(b.dataset.recUpload);
    if (b.dataset.redeem) return askRedeem(b.dataset.redeem);
    if (b.dataset.confirmRedeem) return redeem(b.dataset.confirmRedeem);
    if (b.dataset.used) return markUsed(b.dataset.used);
    if (b.dataset.shot) { (state.shot ||= {})[state.selected] = +b.dataset.shot; renderPlate(); return $(`[data-shot="${b.dataset.shot}"]`)?.focus(); }
    if (b.dataset.wayfind) return Wayfinding.start(state.byId[b.dataset.wayfind]).catch((err) => announce(String(err.message)));
    if (b.dataset.guide) { state.openGuide = true; return openExplore(b.dataset.guide); }
    if (b.hasAttribute("data-goto-offers")) { $("#offers-h").focus(); return $("#offers").scrollIntoView({ block: "start", behavior: state.prefs.still ? "auto" : "smooth" }); }
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
  $("#rec-file").addEventListener("change", photoChosen);
  $("#rec-site").addEventListener("change", (e) => { state.recSite = e.target.value; renderRecycle(state.byId[state.recSite]); renderLocation(); });
  $("#rec-locate").addEventListener("click", checkLocation);
  $("#ob-form").addEventListener("submit", saveWelcome);
  $("#ob-skip").addEventListener("click", skipWelcome);
  $("#edit-profile").addEventListener("click", () => { $("#settings").close(); location.hash = "#welcome"; });
  // hands-free control (Sahm): voice commands, head pointer, wink to click
  for (const [id, key] of [["hf-voice", "voice"], ["hf-head", "head"], ["hf-wink", "wink"]]) {
    $("#" + id).addEventListener("change", (e) => { state.prefs[key] = e.target.checked; if (key === "wink" && e.target.checked) state.prefs.head = true; applyPrefs(); });
  }
  $("#sahm-off").addEventListener("click", () => { Object.assign(state.prefs, { voice: false, head: false, wink: false }); applyPrefs(); });
  Sahm.init({
    t, getLang,
    places: () => state.sites.map((s) => ({ id: s.id, names: [s.name.en, s.name.ar] })),
    go: (leaf) => { location.hash = "#" + leaf; },
    openPlace: (id) => openPlate(id),
    readAloud: () => describePlate(),
    stopSpeech: () => Speech.stop(),
    setLang: (l) => { state.prefs.lang = l; applyPrefs(); render(); showLeaf(state.leaf, false); },
    openSettings: () => $("#settings").showModal(),
    announce,
  });
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
  state.offers = sites.offers || [];
  state.byId = Object.fromEntries(state.sites.map((s) => [s.id, s]));
  state.stops = state.stops.filter((s) => state.byId[s.id]);
  state.heat.sample = sample;
  $("#day").value = isoDate(state.date);
  $("#start").innerHTML = Array.from({ length: 9 }, (_, i) => 6 + i).map((h) => `<option value="${h}" ${h === state.start ? "selected" : ""}>${H(h)}</option>`).join("");
  applyPrefs();
  bind();
  render();
  // first visit: the Welcome leaf asks four questions before the plan
  showLeaf(state.profile ? location.hash.slice(1) || "index" : "welcome", !state.profile);
  loadLiveHeat();
}

boot();
