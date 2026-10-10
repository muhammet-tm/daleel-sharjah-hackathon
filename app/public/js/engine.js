// Daleel timing engine. Pure functions, no DOM: used by the app, the dashboard and tests/engine.test.mjs.
// Times are decimal hours (9.5 = 09:30). Crowd levels are "typical hours" curves, curated estimates, not live data.

// ---- typical busy curves (0 = empty, 1 = at capacity), one weekday and one weekend curve per profile ----
function curve(base, peaks) {
  return Array.from({ length: 24 }, (_, h) => {
    let v = base;
    for (const [at, height, width] of peaks) v += height * Math.exp(-((h - at) ** 2) / (2 * width * width));
    return Math.round(Math.min(1, v) * 100) / 100;
  });
}

export const BUSY = {
  "museum":          { weekday: curve(0.08, [[11, 0.42, 1.4], [17, 0.30, 1.3]]), weekend: curve(0.10, [[11, 0.55, 1.5], [17.5, 0.62, 1.4]]) },
  "heritage-walk":   { weekday: curve(0.06, [[10, 0.30, 1.6], [19.5, 0.48, 1.6]]), weekend: curve(0.08, [[10.5, 0.40, 1.6], [19.5, 0.72, 1.6]]) },
  "market":          { weekday: curve(0.08, [[11, 0.32, 1.5], [20, 0.52, 1.6]]), weekend: curve(0.10, [[12, 0.45, 1.6], [20, 0.78, 1.6]]) },
  "mosque-tour":     { weekday: curve(0.05, [[10.5, 0.55, 0.6]]), weekend: curve(0.05, [[10.5, 0.7, 0.6]]) },
  "garden-island":   { weekday: curve(0.05, [[17, 0.55, 1.2], [20.5, 0.3, 1.2]]), weekend: curve(0.06, [[17, 0.8, 1.2], [20.5, 0.35, 1.2]]) },
  "evening-leisure": { weekday: curve(0.05, [[19.5, 0.62, 1.8]]), weekend: curve(0.06, [[17, 0.55, 1.3], [20, 0.92, 1.7]]) },
  "family-indoor":   { weekday: curve(0.08, [[11, 0.38, 1.6], [16, 0.42, 1.5]]), weekend: curve(0.10, [[12, 0.62, 1.8], [16, 0.70, 1.6]]) },
  "beach":           { weekday: curve(0.05, [[8, 0.25, 1.4], [17.5, 0.45, 1.6]]), weekend: curve(0.08, [[9, 0.45, 1.6], [17, 0.88, 1.8]]) },
  "remote-site":     { weekday: curve(0.03, [[10, 0.18, 1.6], [17, 0.15, 1.4]]), weekend: curve(0.04, [[10.5, 0.32, 1.8], [17, 0.28, 1.5]]) },
  "nature-remote":   { weekday: curve(0.03, [[8, 0.16, 1.4], [17, 0.14, 1.4]]), weekend: curve(0.04, [[8.5, 0.30, 1.6], [16.5, 0.30, 1.6]]) },
};

export const BUSY_THRESHOLD = 0.6;   // at or above: "busy"
export const QUIET_THRESHOLD = 0.35; // below: "quiet"

// ---- calendar ----
// UAE: Friday has short museum hours; Friday evening to Sunday is the leisure peak.
export function dayInfo(date) {
  const dow = date.getDay(); // 0 Sun .. 6 Sat
  return { dow, isFriday: dow === 5, dayType: dow === 5 || dow === 6 || dow === 0 ? "weekend" : "weekday" };
}

export function openWindow(site, date) {
  const { isFriday } = dayInfo(date);
  const w = isFriday && site.hours.friday ? site.hours.friday : site.hours.weekday;
  return { open: w[0], close: w[1], closed: w[0] === w[1] };
}

export function crowdAt(site, hour, dayType) {
  const c = BUSY[site.busy] || BUSY["museum"];
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  return c[dayType][h];
}

// Contiguous peak window, e.g. [16, 18] means "busy 16:00 to 18:00".
export function busyWindow(site, dayType) {
  const c = (BUSY[site.busy] || BUSY["museum"])[dayType];
  let best = null, start = null;
  for (let h = 0; h <= 24; h++) {
    const on = h < 24 && c[h] >= BUSY_THRESHOLD;
    if (on && start === null) start = h;
    if (!on && start !== null) {
      const peak = Math.max(...c.slice(start, h));
      if (!best || peak > best.peak) best = { from: start, to: h, peak };
      start = null;
    }
  }
  return best;
}

// ---- heat ----
// heat = { city: [24 apparent °C], central: [...], east: [...] } for the chosen day.
export function heatAt(heat, site, hour) {
  const row = heat?.[site.region] || heat?.city;
  if (!row) return null;
  return row[Math.max(0, Math.min(23, Math.floor(hour)))];
}

// 1 = comfortable, 0 = dangerous. Indoor sites only count the walk to the door; shade softens it.
export function heatComfort(site, temp) {
  if (temp == null) return 1;
  const raw = Math.max(0, Math.min(1, (44 - temp) / 14)); // 30°C -> 1, 44°C -> 0
  if (site.indoor) return 0.75 + 0.25 * raw;
  if (site.shade) return 0.3 + 0.7 * raw;
  return raw;
}

// ---- travel ----
export function distanceKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Road distance ~1.35x straight line. Walk under 1.2 km; otherwise drive (city 30 km/h, between regions 75 km/h, +5 min parking).
export const CO2_KG_PER_CAR_KM = 0.17;
export function travel(a, b) {
  if (!a || !b || a.id === b.id) return { mode: "none", km: 0, minutes: 0, co2: 0 };
  const km = distanceKm(a, b) * 1.35;
  if (km < 1.2) return { mode: "walk", km, minutes: Math.round((km / 4.5) * 60), co2: 0 };
  const speed = a.region === b.region ? 30 : 75;
  return { mode: "drive", km, minutes: Math.round((km / speed) * 60 + 5), co2: km * CO2_KG_PER_CAR_KM };
}

// ---- scoring ----
export const WEIGHTS = { crowd: 0.4, heat: 0.35, transport: 0.25, dispersal: 0.1 };

export function scoreStop(site, hour, { dayType, heat, prev, prefs = {} }) {
  const crowd = crowdAt(site, hour, dayType);
  const temp = heatAt(heat, site, hour);
  let comfort = heatComfort(site, temp);
  if (prefs.heatSensitive && !site.indoor) comfort *= 0.7;
  const t = travel(prev, site);
  const transport = 1 - Math.min(t.minutes / 90, 1);
  let total = WEIGHTS.crowd * (1 - crowd) + WEIGHTS.heat * comfort + WEIGHTS.transport * transport;
  if (site.underVisited) total += WEIGHTS.dispersal;
  return { crowd, temp, comfort, transport, travel: t, total: Math.min(1, total) };
}

// Best start hour inside opening hours (leaving time to finish the visit), from `from` onwards.
export function bestHour(site, date, heat, from = 0, prefs = {}) {
  const { dayType } = dayInfo(date);
  const { open, close, closed } = openWindow(site, date);
  if (closed) return null;
  const last = close - site.visitMinutes / 60;
  let best = null;
  for (let h = Math.max(open, Math.ceil(from * 2) / 2); h <= last; h += 0.5) {
    const s = scoreStop(site, h, { dayType, heat, prefs });
    // Small pull towards the start of the day so near-equal hours don't leave long idle gaps.
    const v = WEIGHTS.crowd * (1 - s.crowd) + WEIGHTS.heat * s.comfort - 0.006 * (h - Math.max(open, from));
    if (!best || v > best.v + 1e-9) best = { hour: h, v };
  }
  return best ? best.hour : null;
}

export function status(site, hour, date) {
  const { dayType } = dayInfo(date);
  const { open, close, closed } = openWindow(site, date);
  if (closed) return { code: "closed" };
  if (hour < open || hour + site.visitMinutes / 60 > close) return { code: "outside", open, close };
  const crowd = crowdAt(site, hour, dayType);
  const win = busyWindow(site, dayType);
  if (crowd >= BUSY_THRESHOLD) return { code: "busy", window: win, crowd };
  if (crowd < QUIET_THRESHOLD) return { code: "quiet", crowd, window: win };
  return { code: "moderate", crowd, window: win };
}

// ---- planning ----
// stops: [{ id, pinned?: hour }]. Returns the scheduled day in visiting order.
export function planDay(stops, sites, { date, startHour = 9, heat, prefs = {} }) {
  const byId = Object.fromEntries(sites.map((s) => [s.id, s]));
  const { dayType } = dayInfo(date);
  const wanted = stops.map((st) => {
    const site = byId[st.id];
    const pref = st.pinned ?? bestHour(site, date, heat, startHour, prefs) ?? startHour;
    return { site, pinned: st.pinned, pref };
  }).filter((w) => w.site).sort((a, b) => a.pref - b.pref);

  let cursor = startHour, prev = null;
  const items = wanted.map((w) => {
    const t = travel(prev, w.site);
    const earliest = cursor + t.minutes / 60;
    const hour = w.pinned != null ? Math.max(w.pinned, earliest) : Math.max(w.pref, earliest);
    const at = Math.round(hour * 4) / 4;
    const score = scoreStop(w.site, at, { dayType, heat, prev, prefs });
    const st = status(w.site, at, date);
    cursor = at + w.site.visitMinutes / 60;
    prev = w.site;
    return { site: w.site, hour: at, end: cursor, travel: t, score, status: st, pinned: w.pinned != null };
  });
  return { items, dayType, score: planScore(items), ledger: ledger(items) };
}

export function planScore(items) {
  if (!items.length) return 0;
  const ok = items.map((i) => (i.status.code === "outside" || i.status.code === "closed" ? 0 : i.score.total));
  return Math.round((ok.reduce((a, b) => a + b, 0) / items.length) * 100);
}

export function ledger(items) {
  const L = { walkKm: 0, driveKm: 0, co2: 0, offPeak: 0, outsideCity: 0, stops: items.length };
  for (const i of items) {
    if (i.travel.mode === "walk") L.walkKm += i.travel.km;
    if (i.travel.mode === "drive") L.driveKm += i.travel.km;
    L.co2 += i.travel.co2;
    if (i.status.code === "quiet" || i.status.code === "moderate") L.offPeak++;
    if (i.site.region !== "city") L.outsideCity++;
  }
  L.offPeakShare = items.length ? L.offPeak / items.length : 0;
  L.outsideCityShare = items.length ? L.outsideCity / items.length : 0;
  return L;
}

// ---- nudges ----
// For each busy or hot stop, propose either a better hour for the same place or a quieter place of the same kind.
// Each suggestion carries an `apply` description the UI can execute in one tap.
export function suggestions(plan, sites, { date, heat, prefs = {} }) {
  const { dayType } = dayInfo(date);
  const inPlan = new Set(plan.items.map((i) => i.site.id));
  const out = [];
  plan.items.forEach((item, idx) => {
    const hot = item.score.temp != null && item.score.temp >= 38 && !item.site.indoor;
    const busy = item.status.code === "busy";
    if (!hot && !busy) return;
    const better = nearestGoodHour(item, date, heat, prefs);
    if (better != null && Math.abs(better - item.hour) >= 1) {
      const s2 = scoreStop(item.site, better, { dayType, heat, prefs });
      if (s2.crowd < item.score.crowd - 0.1 || (s2.temp ?? 99) < (item.score.temp ?? 99) - 3) {
        out.push({ type: "shift", siteId: item.site.id, from: item.hour, to: better,
          crowdFrom: item.score.crowd, crowdTo: s2.crowd, tempFrom: item.score.temp, tempTo: s2.temp,
          avoidsPeak: busy && s2.crowd < BUSY_THRESHOLD, apply: { op: "pin", id: item.site.id, hour: better } });
      }
    }
    // Always also offer a quieter place of the same kind outside the busiest area (dispersal).
    const prev = idx > 0 ? plan.items[idx - 1].site : null;
    const alt = sites.filter((s) => s.kind === item.site.kind && s.underVisited && !inPlan.has(s.id))
      .map((s) => ({ s, h: nearestGoodHour({ site: s, hour: item.hour, score: item.score }, date, heat, prefs) }))
      .filter((x) => x.h != null)
      .map((x) => ({ ...x, sc: scoreStop(x.s, x.h, { dayType, heat, prev, prefs }) }))
      .sort((a, b) => b.sc.total - a.sc.total)[0];
    if (alt) {
      const extra = alt.sc.travel.minutes - item.travel.minutes;
      out.push({ type: "swap", siteId: item.site.id, altId: alt.s.id, from: item.hour, to: alt.h,
        extraMinutes: Math.max(0, Math.round(extra / 5) * 5), avoidsPeak: busy,
        apply: { op: "swap", id: item.site.id, alt: alt.s.id, hour: alt.h } });
    }
  });
  return out;
}

// The closest hour to the planned one (later preferred) that is not busy and no hotter than now.
// Visitors accept "come back at 19:00" far more readily than "come at 09:00 instead".
export function nearestGoodHour(item, date, heat, prefs = {}) {
  const { dayType } = dayInfo(date);
  const { open, close, closed } = openWindow(item.site, date);
  if (closed) return null;
  const last = close - item.site.visitMinutes / 60;
  let best = null;
  for (let h = open; h <= last; h += 0.5) {
    const s = scoreStop(item.site, h, { dayType, heat, prefs });
    if (s.crowd >= BUSY_THRESHOLD) continue;
    if (s.temp != null && item.score.temp != null && s.temp > item.score.temp) continue;
    const dist = Math.abs(h - item.hour) - (h > item.hour ? 0.25 : 0);
    if (!best || dist < best.dist) best = { h, dist };
  }
  return best ? best.h : null;
}

export function fmtHour(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${String(hh % 24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ---- dashboard simulation (pilot data) ----
// Deterministic synthetic visitors: each picks 3 stops by popularity. "Without Daleel" visits at the popular hour;
// "with Daleel" a share of visitors (the follow rate) take the engine's suggestions.
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulate(sites, { date, heat, visitors = 600, followRate = 0.35, seed = 2026 }) {
  const rnd = mulberry32(seed);
  const { dayType } = dayInfo(date);
  const popular = sites.filter((s) => !s.underVisited && !openWindow(s, date).closed);
  const peakHour = (s) => { const c = BUSY[s.busy][dayType]; return c.indexOf(Math.max(...c)); };
  const grid = (fill) => Object.fromEntries(sites.map((s) => [s.id, Array(24).fill(fill)]));
  const before = grid(0), after = grid(0);
  let moved = 0, offPeakBefore = 0, offPeakAfter = 0, outsideBefore = 0, outsideAfter = 0, total = 0;
  for (let v = 0; v < visitors; v++) {
    const picks = [...popular].sort(() => rnd() - 0.5).slice(0, 3);
    const follows = rnd() < followRate;
    let plan = planDay(picks.map((s) => ({ id: s.id, pinned: peakHour(s) })), sites, { date, startHour: 8, heat });
    for (const it of plan.items) { before[it.site.id][Math.floor(it.hour) % 24]++; total++; if (it.status.code !== "busy") offPeakBefore++; if (it.site.region !== "city") outsideBefore++; }
    if (follows) {
      let stops = picks.map((s) => ({ id: s.id, pinned: peakHour(s) }));
      const handled = new Set();
      for (const sg of suggestions(plan, sites, { date, heat })) {
        if (handled.has(sg.siteId)) continue;
        // A follower takes the later hour most of the time and the quieter place otherwise.
        const takeSwap = sg.type === "swap" && rnd() < 0.3;
        if (sg.type === "shift" && rnd() < 0.7) stops = stops.map((s) => (s.id === sg.apply.id ? { id: s.id, pinned: sg.apply.hour } : s));
        else if (takeSwap) stops = stops.map((s) => (s.id === sg.apply.id ? { id: sg.apply.alt, pinned: sg.apply.hour } : s));
        else continue;
        handled.add(sg.siteId); moved++;
      }
      plan = planDay(stops, sites, { date, startHour: 8, heat });
    }
    for (const it of plan.items) { after[it.site.id][Math.floor(it.hour) % 24]++; if (it.status.code !== "busy") offPeakAfter++; if (it.site.region !== "city") outsideAfter++; }
  }
  return { before, after, visits: total, nudgesTaken: moved,
    offPeakBefore: offPeakBefore / total, offPeakAfter: offPeakAfter / total,
    outsideBefore: outsideBefore / total, outsideAfter: outsideAfter / total };
}
