// Run: node --test app/tests
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as E from "../public/js/engine.js";

const data = JSON.parse(readFileSync(new URL("../public/data/sites.json", import.meta.url)));
const heat = JSON.parse(readFileSync(new URL("../public/data/heat-sample.json", import.meta.url)));
const sites = data.sites;
const byId = Object.fromEntries(sites.map((s) => [s.id, s]));
const saturday = new Date(2026, 9, 10);  // Sat 10 Oct 2026
const tuesday = new Date(2026, 9, 13);
const friday = new Date(2026, 9, 9);

test("every site has the fields the engine needs", () => {
  for (const s of sites) {
    for (const k of ["id", "region", "lat", "lng", "kind", "busy", "visitMinutes", "hours"]) assert.ok(s[k] !== undefined, `${s.id} missing ${k}`);
    assert.ok(E.BUSY[s.busy], `${s.id} unknown busy profile ${s.busy}`);
    assert.ok(s.name.ar && s.story.ar, `${s.id} missing Arabic`);
  }
});

test("Al Noor Island is busy on a weekend evening peak and quiet in the morning", () => {
  const win = E.busyWindow(byId["al-noor-island"], "weekend");
  assert.ok(win.from >= 16 && win.to <= 23, JSON.stringify(win));
  assert.equal(E.status(byId["al-noor-island"], 17, saturday).code, "busy");
  assert.equal(E.status(byId["al-noor-island"], 9, saturday).code, "quiet");
});

test("outdoor stops avoid the hottest hours in July", () => {
  const h = E.bestHour(byId["al-noor-island"], saturday, heat.july, 9);
  assert.ok(h < 11 || h >= 18, `best hour ${h}`);
});

test("museums respect Friday afternoon opening", () => {
  assert.equal(E.openWindow(byId["al-hisn"], friday).open, 16);
  assert.ok(E.bestHour(byId["al-hisn"], friday, heat.october, 9) >= 16);
});

test("Al Noor Mosque tours are closed on Friday", () => {
  assert.equal(E.status(byId["al-noor-mosque"], 10, friday).code, "closed");
  assert.equal(E.bestHour(byId["al-noor-mosque"], friday, heat.october), null);
});

test("planDay orders stops, adds travel, and never overlaps", () => {
  const plan = E.planDay([{ id: "al-noor-island" }, { id: "al-hisn" }, { id: "blue-souk" }], sites, { date: tuesday, startHour: 9, heat: heat.october });
  assert.equal(plan.items.length, 3);
  for (let i = 1; i < plan.items.length; i++) assert.ok(plan.items[i].hour >= plan.items[i - 1].end, "overlap");
  assert.ok(plan.score > 0 && plan.score <= 100);
});

test("a pinned peak-hour visit gets a shift suggestion that avoids the peak", () => {
  const plan = E.planDay([{ id: "al-noor-island", pinned: 17 }], sites, { date: saturday, startHour: 9, heat: heat.october });
  const sg = E.suggestions(plan, sites, { date: saturday, heat: heat.october });
  assert.ok(sg.length >= 1);
  assert.equal(sg[0].type, "shift");
  assert.ok(sg[0].to >= 19, `suggests ${sg[0].to}, expected the evening after the peak`);
  const pinned = E.planDay([{ id: "al-noor-island", pinned: sg[0].apply.hour }], sites, { date: saturday, startHour: 9, heat: heat.october });
  assert.ok(pinned.score > plan.score, `${pinned.score} should beat ${plan.score}`);
});

test("travel: walk within the heritage area, drive to the East Coast", () => {
  assert.equal(E.travel(byId["al-hisn"], byId["heart-of-sharjah"]).mode, "walk");
  const t = E.travel(byId["al-hisn"], byId["kalba-mangroves"]);
  assert.equal(t.mode, "drive");
  assert.ok(t.minutes > 50 && t.minutes < 150, `${t.minutes} min`);
});

test("simulation is deterministic and moves visits off-peak", () => {
  const a = E.simulate(sites, { date: saturday, heat: heat.october, visitors: 200 });
  const b = E.simulate(sites, { date: saturday, heat: heat.october, visitors: 200 });
  assert.deepEqual(a.offPeakAfter, b.offPeakAfter);
  assert.ok(a.offPeakAfter > a.offPeakBefore, `${a.offPeakBefore} -> ${a.offPeakAfter}`);
});

test("fmtHour", () => {
  assert.equal(E.fmtHour(9.5), "09:30");
  assert.equal(E.fmtHour(19), "19:00");
});

test("recycling: a first mission at a place earns enough for the cheapest offer", () => {
  const pts = E.missionPoints([], "blue-souk");
  assert.equal(pts, E.RECYCLE.bottles * E.RECYCLE.perBottle + E.RECYCLE.newPlaceBonus);
  const cheapest = Math.min(...data.offers.map((o) => o.cost));
  assert.ok(pts >= cheapest, `${pts} points should buy an offer costing ${cheapest}`);
  assert.ok(data.offers.every((o) => byId[o.siteId]), "every offer belongs to a known place");
});

test("recycling: repeat visits drop the new-place bonus, totals and once-a-day hold", () => {
  const log = [{ siteId: "blue-souk", date: "2026-10-11", bottles: 3, points: E.missionPoints([], "blue-souk") }];
  assert.equal(E.missionPoints(log, "blue-souk"), 3 * E.RECYCLE.perBottle);
  assert.ok(E.recycledOn(log, "blue-souk", "2026-10-11"));
  assert.ok(!E.recycledOn(log, "blue-souk", "2026-10-12"));
  const T = E.recycleTotals(log, 50);
  assert.equal(T.bottles, 3);
  assert.equal(T.balance, log[0].points - 50);
  assert.equal(T.places, 1);
});
