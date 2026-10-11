// Renders the 3D plate pictures (app/public/plates/<site>-3d.jpg) from the running app.
// Usage: start the app (cd app && npm run dev), then:  node tools/render_plates.mjs [http://localhost:8788]
// Needs Google Chrome and Node 22+ (built-in WebSocket). Each still is 1200 x 900 (4:3), JPEG.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = process.argv[2] || "http://localhost:8788";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "public", "plates");
const SHOTS = [                               // site id, 3D view, hour of the light
  { site: "blue-souk", view: "lagoon", hour: 16.6 },
  { site: "al-noor-mosque", view: "lagoon", hour: 16.8 },
  { site: "islamic-museum", view: "creek", hour: 16.4 },
  { site: "heart-of-sharjah", view: "roofs", hour: 16.2 },
];
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE = join(OUT, ".render-profile");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${PROFILE}`, "--enable-unsafe-swiftshader", "--use-angle=swiftshader",
  "--hide-scrollbars", "--window-size=1600,1200", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
let ws, id = 0; const pending = new Map();
for (let i = 0; i < 50 && !ws; i++) {
  await sleep(300);
  try {
    const page = (await (await fetch("http://127.0.0.1:9333/json")).json()).find((t) => t.type === "page");
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); }
  } catch { /* Chrome is still starting */ }
}
if (!ws) { console.error("Could not connect to Chrome."); chrome.kill(); process.exit(1); }
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
};

await send("Page.enable"); await send("Runtime.enable");
for (const s of SHOTS) {
  await send("Page.navigate", { url: APP + "/" }); await sleep(2000);
  await evaluate(`localStorage.setItem('daleel:prefs', JSON.stringify({ lang: 'en', theme: 'light', still: true })); true`);
  await send("Page.navigate", { url: `${APP}/?r=${Date.now()}#explore` });
  let ok = false;
  for (let i = 0; i < 120 && !ok; i++) { await sleep(500); ok = await evaluate(`!!document.querySelector('#p3-loader.done') && !!window.S3 && window.S3.started`).catch(() => false); }
  if (!ok) { console.log("timed out:", s.site); continue; }
  await evaluate(`window.S3.show('${s.site}', ${s.hour}); true`); await sleep(4000);            // let the scene build
  await evaluate(`window.S3.view('${s.view}'); document.querySelector('#p3-full').click(); true`); await sleep(5000);
  const data = await evaluate(`new Promise(res => requestAnimationFrame(() => {
    const c = document.querySelector('#p3-canvas'), W = 1200, H = 900, o = document.createElement('canvas'); o.width = W; o.height = H;
    const k = Math.min(c.width / W, c.height / H), cw = W * k, ch = H * k;
    o.getContext('2d').drawImage(c, (c.width - cw) / 2, (c.height - ch) / 2, cw, ch, 0, 0, W, H);
    res(o.toDataURL('image/jpeg', 0.84));
  }))`);
  writeFileSync(join(OUT, `${s.site}-3d.jpg`), Buffer.from(data.split(",")[1], "base64"));
  console.log("saved", `${s.site}-3d.jpg`);
}
ws.close(); chrome.kill();
await sleep(500); rmSync(PROFILE, { recursive: true, force: true });
