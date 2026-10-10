import * as E from "./engine.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = (v) => `${Math.round(v * 100)}%`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

let sites, heat, date = new Date(), follow = 0.35, view = "after";

function run() {
  const m = date.getMonth();
  const r = E.simulate(sites, { date, heat: heat[m >= 4 && m <= 8 ? "july" : "october"], followRate: follow });
  const grid = r[view];
  const max = Math.max(1, ...sites.flatMap((s) => r.before[s.id]));

  $("#kpis").innerHTML = [
    ["Planned visits", r.visits.toLocaleString("en")],
    ["Visits outside the peak", `${pct(r.offPeakAfter)}<small>was ${pct(r.offPeakBefore)}</small>`],
    ["Visits outside the city", `${pct(r.outsideAfter)}<small>was ${pct(r.outsideBefore)}</small>`],
    ["Suggestions taken", r.nudgesTaken.toLocaleString("en")],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  const shown = sites.filter((s) => r.before[s.id].some(Boolean) || r.after[s.id].some(Boolean));
  const hours = Array.from({ length: 17 }, (_, i) => i + 7);
  $("#grid-cap").textContent = `${view === "after" ? "With Daleel" : "Without Daleel"}: each cell is the number of planned arrivals in that hour. Darker is busier; the same scale is used for both views.`;
  $("#grid").innerHTML = `<table class="heat"><caption class="sr-only">Planned arrivals by site and hour, ${view === "after" ? "with" : "without"} Daleel</caption>
    <thead><tr><th scope="col">Site</th>${hours.map((h) => `<th scope="col">${String(h).padStart(2, "0")}</th>`).join("")}</tr></thead>
    <tbody>${shown.map((s) => `<tr><th scope="row">${esc(s.name.en)}</th>${hours.map((h) => {
      // Shade skips the 35-60% band where neither ink nor page text would reach 4.5:1.
      const v = grid[s.id][h], a = v / max, dark = a >= 0.4;
      const mix = dark ? 60 + ((a - 0.4) / 0.6) * 35 : 8 + (a / 0.4) * 27;
      const bg = v ? `color-mix(in srgb, var(--ink) ${Math.round(mix)}%, var(--sheet))` : "transparent";
      const fg = dark ? "var(--page)" : "var(--ink)";
      return `<td style="background:${bg};color:${fg}" aria-label="${esc(s.name.en)} ${h}:00, ${v} visits">${v || ""}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table>`;
  $("#legend").innerHTML = `<span><i style="background:color-mix(in srgb, var(--ink) 15%, var(--sheet))"></i>few</span><span><i style="background:var(--ink)"></i>${max} arrivals in one hour</span>`;

  const peak = (g, id) => Math.max(...g[id]);
  const top = [...shown].sort((a, b) => peak(r.before, b.id) - peak(r.before, a.id)).slice(0, 6);
  const bmax = Math.max(1, ...top.map((s) => peak(r.before, s.id)));
  $("#bars").innerHTML = top.map((s) => {
    const b = peak(r.before, s.id), a = peak(r.after, s.id);
    return `<li><span>${esc(s.name.en)}</span><span class="track" role="img" aria-label="${esc(s.name.en)}: ${b} at peak without Daleel, ${a} with Daleel"><span class="b" style="width:${(b / bmax) * 100}%"></span><span class="a" style="width:${(a / bmax) * 100}%"></span></span><span class="v">${b} → ${a}</span></li>`;
  }).join("");
  $("#announce").textContent = `Visits outside the peak ${pct(r.offPeakAfter)}, was ${pct(r.offPeakBefore)}.`;
}

async function boot() {
  [sites, heat] = await Promise.all([fetch("data/sites.json").then((r) => r.json()).then((d) => d.sites), fetch("data/heat-sample.json").then((r) => r.json())]);
  $("#d-day").value = iso(date);
  $("#d-follow-out").textContent = pct(follow);
  $("#d-day").addEventListener("change", (e) => { const [y, m, d] = e.target.value.split("-").map(Number); if (y) { date = new Date(y, m - 1, d); run(); } });
  $("#d-follow").addEventListener("input", (e) => { follow = +e.target.value; $("#d-follow-out").textContent = pct(follow); run(); });
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    view = b.dataset.view;
    document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    run();
  }));
  run();
}
boot();
