/* Daleel 3D — hand-built scenes of Sharjah sites, drawn with three.js inside the plate frame of 3d.html.
   Shared engine: renderer, sky & sun, procedural textures, builders, camera, walking, and the screen's controls. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const PLACES = [];
window.S3 = { register: p => PLACES.push(p), start: o => start(o) };
if (!window.THREE) { window.S3.failed = 'engine'; return; }

/* ---------- renderer / scene ---------- */
const canvas = $('#p3-canvas');
const isMobile = matchMedia('(max-width: 720px)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true }); }
catch (e) { window.S3.failed = 'webgl'; return; }
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
const stageSize = () => { const r = canvas.getBoundingClientRect(); return [Math.max(1, r.width), Math.max(1, r.height)]; };
renderer.setSize(...stageSize(), false);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .46;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xd6d4cc, .00042);
const camera = new THREE.PerspectiveCamera(42, stageSize()[0] / stageSize()[1], .5, 14000);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .07;
controls.maxPolarAngle = Math.PI * .492; controls.enabled = false;

const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
let seed = 7;
const R = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[(R() * a.length) | 0];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- procedural textures ---------- */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = ANISO; return t; }
function rep(t, rx, ry) { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; }
function speck(g, w, h, n, a, cols) { for (let i = 0; i < n; i++) { g.globalAlpha = R() * a; g.fillStyle = pick(cols); const s = R() * 2.2 + .5; g.fillRect(R() * w, R() * h, s, s); } g.globalAlpha = 1; }
function star(g, cx, cy, r1, r2, n, rot = 0) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
const T = {};

// Islamic eight-point star glazed tile (canvas = 1.6 m)
T.tile = (() => {
  const [c, g] = cv(256, 256);
  g.fillStyle = '#164a8e'; g.fillRect(0, 0, 256, 256);
  for (const [x, y] of [[64, 64], [192, 64], [64, 192], [192, 192]]) {
    g.fillStyle = '#efe8d6'; star(g, x, y, 56, 41, 8, Math.PI / 8); g.fill();
    g.fillStyle = '#1d66b0'; star(g, x, y, 46, 32, 8, Math.PI / 8); g.fill();
    g.fillStyle = '#3cb2c6'; star(g, x, y, 28, 19, 8, 0); g.fill();
    g.fillStyle = '#efe8d6'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
  }
  for (const x of [0, 128, 256]) for (const y of [0, 128, 256]) {
    g.fillStyle = '#efe8d6'; star(g, x, y, 22, 10, 4, Math.PI / 4); g.fill();
    g.fillStyle = '#3cb2c6'; star(g, x, y, 14, 6, 4, Math.PI / 4); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  speck(g, 256, 256, 1500, .12, ['#ffffff', '#0b2a55']);
  return tex(c, 1 / 1.6, 1 / 1.6);
})();
// Iznik-style tile: turquoise, coral red, cobalt on white (canvas = 1.2 m)
T.iznik = (() => {
  const [c, g] = cv(256, 256);
  g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, 256, 256);
  for (const [x, y] of [[0, 0], [256, 0], [0, 256], [256, 256], [128, 128]]) {
    g.fillStyle = '#1f4f9c'; star(g, x, y, 70, 30, 6, 0); g.fill();
    g.fillStyle = '#2aa6a0'; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill();
    g.fillStyle = '#c8402f'; star(g, x, y, 16, 7, 6, Math.PI / 6); g.fill();
  }
  for (const [x, y] of [[128, 0], [0, 128], [256, 128], [128, 256]]) {
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.fillStyle = '#2aa6a0'; g.beginPath(); g.ellipse(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 18, 8, a, 0, 7); g.fill(); }
    g.fillStyle = '#c8402f'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
  }
  speck(g, 256, 256, 1200, .1, ['#ffffff', '#16306b']);
  return tex(c, 1 / 1.2, 1 / 1.2);
})();
T.stucco = (() => {
  const [c, g] = cv(512, 512);
  g.fillStyle = '#efe4cc'; g.fillRect(0, 0, 512, 512);
  speck(g, 512, 512, 14000, .35, ['#d6c6a4', '#fffaee', '#c8b690']);
  for (let i = 0; i < 40; i++) { g.globalAlpha = .035; g.fillStyle = '#7a6545'; g.fillRect(R() * 512, R() * 512, 2 + R() * 5, 40 + R() * 160); }
  g.globalAlpha = 1; return tex(c, 1 / 4, 1 / 4);
})();
// coral stone + gypsum plaster, partly worn to show the coral blocks
T.coral = (() => {
  const [c, g] = cv(512, 512);
  g.fillStyle = '#d2b98f'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    const cx = R() * 512, cy = R() * 512, rr = 20 + R() * 50;
    for (let k = 0; k < 14; k++) {
      g.fillStyle = pick(['#b59b72', '#a88e66', '#c2a87e', '#9c8460']); g.globalAlpha = .55;
      g.beginPath(); g.ellipse(cx + (R() - .5) * rr * 1.6, cy + (R() - .5) * rr, 6 + R() * 12, 4 + R() * 8, R() * 3, 0, 7); g.fill();
    }
  }
  g.globalAlpha = 1;
  speck(g, 512, 512, 22000, .4, ['#bfa57a', '#e6d3ad', '#8f7754', '#f0e2c4']);
  return tex(c, 1 / 3, 1 / 3);
})();
// cut limestone ashlar courses (mosque)
T.ashlar = (() => {
  const [c, g] = cv(512, 512);
  g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) { let x = -(R() * 60); while (x < 512) { const w = 50 + R() * 70; g.fillStyle = pick(['#efe9dd', '#ebe4d6', '#f3eee4', '#e6dfd0']); g.fillRect(x + 1, y + 1, w - 2, 30); x += w; } }
  speck(g, 512, 512, 9000, .2, ['#cfc6b4', '#ffffff']);
  return tex(c, 1 / 8, 1 / 8);
})();
T.marble = (() => {
  const [c, g] = cv(512, 512);
  g.fillStyle = '#efece6'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(120,118,112,.18)'; g.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) { g.beginPath(); let x = R() * 512, y = R() * 512; g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (R() - .3) * 60; y += (R() - .5) * 50; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  return tex(c, 1 / 4, 1 / 4);
})();
T.paver = (() => {
  const [c, g] = cv(512, 512);
  g.fillStyle = '#a8946e'; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.fillStyle = pick(['#dac8a3', '#d3c09a', '#dfcfac', '#cdb992', '#e3d5b5']); g.fillRect(x * 64 + 1.5, y * 64 + 1.5, 61, 61); }
  speck(g, 512, 512, 9000, .25, ['#8f7c58', '#f6ecd6']);
  return tex(c, 1 / 8, 1 / 8);
})();
T.asphalt = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#3b3b3d'; g.fillRect(0, 0, 256, 256); speck(g, 256, 256, 9000, .4, ['#2a2a2b', '#57575a', '#4a4743']); return tex(c, 1 / 10, 1 / 10); })();
T.ground = (() => { const [c, g] = cv(512, 512); g.fillStyle = '#b9a886'; g.fillRect(0, 0, 512, 512); speck(g, 512, 512, 16000, .3, ['#a29170', '#cdbf9f', '#968665']); return tex(c, 1 / 24, 1 / 24); })();
T.sand = (() => { const [c, g] = cv(512, 512); g.fillStyle = '#dccaa2'; g.fillRect(0, 0, 512, 512); speck(g, 512, 512, 20000, .3, ['#c9b48a', '#efe0bd', '#b9a37a']); return tex(c, 1 / 12, 1 / 12); })();
T.lawn = (() => {
  const [c, g] = cv(256, 256); g.fillStyle = '#5f8a3a'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 64) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 32, 256); }
  speck(g, 256, 256, 14000, .35, ['#4b7430', '#76a04a', '#3f6428']); return tex(c, 1 / 16, 1 / 16);
})();
T.wood = (() => {
  const [c, g] = cv(256, 256); g.fillStyle = '#7a5434'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(${40 + R() * 30},${25 + R() * 20},10,${R() * .25})`; g.fillRect(0, y, 256, 1 + R() * 2); }
  for (let y = 0; y < 256; y += 32) { g.fillStyle = 'rgba(30,18,8,.5)'; g.fillRect(0, y, 256, 2); }
  return tex(c, 1 / 2, 1 / 2);
})();
// palm-frond (areesh) shade mat: sticks with gaps that let light through
T.areesh = (() => {
  const [c, g] = cv(256, 256);
  for (let x = 0; x < 256; x += 8) { g.fillStyle = pick(['#a88a55', '#9a7c48', '#b39663', '#8e7140']); g.fillRect(x + (R() - .5), 0, 5 + R() * 1.5, 256); }
  for (let y = 0; y < 256; y += 64) { g.fillStyle = '#6e5531'; g.fillRect(0, y + 30, 256, 4); }
  for (let i = 0; i < 70; i++) g.clearRect(R() * 256, R() * 256, 3 + R() * 6, 2 + R() * 10);
  const t = tex(c, 1 / 2.4, 1 / 2.4); return t;
})();
T.lead = (() => {
  const [c, g] = cv(256, 256); g.fillStyle = '#8f98a2'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(40,46,54,.45)'; g.fillRect(x, 0, 1.5, 256); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 2, 0, 1, 256); }
  speck(g, 256, 256, 3000, .15, ['#6f7781', '#c3cad1']); return tex(c, 1, 1);
})();
T.gold = (() => {
  const [c, g] = cv(256, 256);
  for (let x = 0; x < 32; x++) for (let y = 0; y < 32; y++) { g.fillStyle = pick(['#e7b54a', '#f2c862', '#d9a23c', '#f7d77c', '#cf9631']); g.fillRect(x * 8, y * 8, 7.4, 7.4); }
  return tex(c, 4, 2);
})();
T.rug = (() => {
  const [c, g] = cv(128, 192); g.fillStyle = '#8c1f22'; g.fillRect(0, 0, 128, 192);
  g.strokeStyle = '#e4c58a'; g.lineWidth = 6; g.strokeRect(8, 8, 112, 176); g.strokeStyle = '#1d3a63'; g.lineWidth = 4; g.strokeRect(18, 18, 92, 156);
  g.fillStyle = '#1d3a63'; star(g, 64, 96, 34, 18, 8); g.fill(); g.fillStyle = '#e4c58a'; star(g, 64, 96, 16, 8, 8); g.fill();
  speck(g, 128, 192, 1500, .3, ['#5d1416', '#c9a46a']); const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
})();
T.dash = (() => { const [c, g] = cv(64, 8); g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 34, 8); return tex(c, 1 / 7, 1); })();
T.stall = (() => { const [c, g] = cv(32, 256); g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 2, 56); g.fillRect(0, 200, 2, 56); return tex(c, 1 / 2.8, 1 / 26); })();
T.bark = (() => {
  const [c, g] = cv(64, 256); g.fillStyle = '#8b7556'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 9) { g.fillStyle = 'rgba(60,45,28,.5)'; g.fillRect(0, y, 64, 3); }
  speck(g, 64, 256, 1500, .3, ['#5d4a33', '#b39d7a']); return tex(c, 1, 3);
})();
T.leaf = (() => {
  const [c, g] = cv(64, 256); g.lineCap = 'round';
  for (let y = 250; y > 6; y -= 5) {
    const t = y / 256, len = 30 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.15 + .05));
    g.strokeStyle = pick(['#3f6b2a', '#4c7a31', '#5b8a37', '#36602a']); g.lineWidth = 3;
    g.beginPath(); g.moveTo(32, y); g.lineTo(32 - len, y - 13); g.moveTo(32, y); g.lineTo(32 + len, y - 13); g.stroke();
  }
  g.strokeStyle = '#6d6a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 256); g.lineTo(32, 0); g.stroke();
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
})();
T.foliage = (() => {
  const [c, g] = cv(128, 128);
  for (let i = 0; i < 260; i++) { g.fillStyle = pick(['#3d6a2c', '#4f7d33', '#2f5a24', '#5d8c3b']); g.beginPath(); g.ellipse(R() * 128, R() * 128, 3 + R() * 5, 2 + R() * 3, R() * 3, 0, 7); g.fill(); }
  const t = tex(c); return t;
})();
function shopTextures(hPx) {
  const W = 1024, H = 256, [c, g] = cv(W, H), [e, ge] = cv(W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H); g.fillStyle = '#e6d8bc'; g.fillRect(0, 0, W, H);
  for (let b = 0; b < 4; b++) {
    const x0 = b * 256;
    g.fillStyle = pick(['#7a1d1d', '#0f3b5c', '#1d4d33', '#5a3a10', '#3b2357']); g.fillRect(x0 + 34, 22, 188, 34);
    g.fillStyle = '#e8c068'; for (let i = 0; i < 5; i++) g.fillRect(x0 + 52 + i * 32 + R() * 6, 34, 18 + R() * 8, 8);
    ge.fillStyle = '#ffd890'; ge.globalAlpha = .55; ge.fillRect(x0 + 34, 22, 188, 34); ge.globalAlpha = 1;
    g.fillStyle = '#2a2118'; g.fillRect(x0 + 24, 70, 208, 186); g.fillStyle = '#1b2a31'; g.fillRect(x0 + 32, 78, 192, 178);
    ge.fillStyle = '#ffb35e'; ge.fillRect(x0 + 32, 78, 192, 178);
    const goods = b % 2 ? ['#d9a441', '#f0cf6e', '#b9862c', '#fff0b5'] : ['#a2302a', '#2b5c8a', '#c97b2e', '#6b2a5a', '#d8c39a'];
    for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) { const col = pick(goods), x = x0 + 38 + i * 20.5, y = 90 + row * 32; g.fillStyle = col; g.fillRect(x, y, 15, 20); ge.fillStyle = col; ge.fillRect(x, y, 15, 20); }
    g.fillStyle = '#3a3026'; g.fillRect(x0 + 126, 78, 6, 178); ge.fillStyle = '#000'; ge.fillRect(x0 + 126, 78, 6, 178);
  }
  return [tex(c, 1 / 20, 1 / hPx), tex(e, 1 / 20, 1 / hPx)];
}
[T.shopG, T.shopGEm] = shopTextures(7); [T.shopU, T.shopUEm] = shopTextures(6);
[T.city, T.cityEm] = (() => {
  const [c, g] = cv(512, 512), [e, ge] = cv(512, 512);
  g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, 512, 512); ge.fillStyle = '#000'; ge.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) {
    g.fillStyle = pick(['#41535f', '#3a4a55', '#4b5d68', '#58676d']); g.fillRect(x * 32 + 6, y * 32 + 8, 20, 17);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x * 32 + 4, y * 32 + 25, 24, 3);
    if (R() < .32) { ge.fillStyle = pick(['#ffcf8a', '#ffd9a0', '#e3ecff', '#ffbf70']); ge.fillRect(x * 32 + 6, y * 32 + 8, 20, 17); }
  }
  speck(g, 512, 512, 5000, .15, ['#cfc6b4', '#ffffff']);
  return [tex(c, 1 / 64, 1 / 56), tex(e, 1 / 64, 1 / 56)];
})();
T.waterNormals = (() => {
  const N = 256, [c, g] = cv(N, N), img = g.createImageData(N, N), waves = [];
  for (let i = 0; i < 22; i++) waves.push({ kx: (R() * 14 | 0) - 7, ky: (R() * 14 | 0) - 7 || 3, a: .6 / (1 + i * .25), p: R() * 6.28 });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let dx = 0, dy = 0;
    for (const w of waves) { const ph = 2 * Math.PI * (w.kx * x + w.ky * y) / N + w.p, cs = Math.cos(ph) * w.a; dx += cs * w.kx; dy += cs * w.ky; }
    const s = .05, nx = -dx * s, ny = -dy * s, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
    img.data[i] = (nx / l * .5 + .5) * 255; img.data[i + 1] = (ny / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return tex(c, 1, 1, false);
})();
T.cloud = (() => {
  const [c, g] = cv(256, 256);
  for (let i = 0; i < 26; i++) {
    const x = 60 + R() * 136, y = 90 + R() * 70, r = 30 + R() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
})();
T.rock = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); speck(g, 256, 256, 30000, .5, ['#5a5a5a', '#a8a8a8', '#6e6e6e', '#c2c2c2']); return tex(c, 1 / 40, 1 / 40); })();

/* ---------- materials ---------- */
const M = {
  stucco: new THREE.MeshStandardMaterial({ map: T.stucco, color: 0xdcc59e, roughness: .86, emissive: 0x6b4a22, emissiveIntensity: 0 }),
  stone: new THREE.MeshStandardMaterial({ map: T.stucco, color: 0xd9c9a8, roughness: .9 }),
  tile: new THREE.MeshStandardMaterial({ map: T.tile, roughness: .22, envMapIntensity: 1.3 }),
  iznik: new THREE.MeshStandardMaterial({ map: T.iznik, roughness: .2, envMapIntensity: 1.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1d1813, roughness: .95 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x23343c, metalness: .55, roughness: .18, emissive: 0xffb060, emissiveIntensity: 0 }),
  paver: new THREE.MeshStandardMaterial({ map: T.paver, roughness: .92 }),
  asphalt: new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: .95 }),
  ground: new THREE.MeshStandardMaterial({ map: T.ground, roughness: 1 }),
  sand: new THREE.MeshStandardMaterial({ map: T.sand, roughness: 1 }),
  lawn: new THREE.MeshStandardMaterial({ map: T.lawn, roughness: .95 }),
  marble: new THREE.MeshStandardMaterial({ map: T.marble, roughness: .35 }),
  wood: new THREE.MeshStandardMaterial({ map: T.wood, roughness: .8 }),
  paint: new THREE.MeshStandardMaterial({ map: T.dash, transparent: true, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  stalls: new THREE.MeshStandardMaterial({ map: T.stall, transparent: true, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  bark: new THREE.MeshStandardMaterial({ map: T.bark, roughness: .95 }),
  leaf: new THREE.MeshStandardMaterial({ map: T.leaf, alphaTest: .45, side: THREE.DoubleSide, roughness: .75 }),
  city: new THREE.MeshStandardMaterial({ map: T.city, emissiveMap: T.cityEm, emissive: 0xffffff, emissiveIntensity: 0, roughness: .8 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xbdb2a0, roughness: .95 }),
  carBody: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .55, roughness: .32, envMapIntensity: 1.2 }),
  carGlass: new THREE.MeshStandardMaterial({ color: 0x151b20, metalness: .7, roughness: .12 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0x3a3631, metalness: .6, roughness: .5 }),
  bulb: new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc878, emissiveIntensity: 0 }),
  people: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }),
  gold: new THREE.MeshStandardMaterial({ map: T.gold, color: 0xffd98a, metalness: 1, roughness: .26, envMapIntensity: 1.4 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xd9a845, metalness: 1, roughness: .3 }),
  shopG: new THREE.MeshStandardMaterial({ map: T.shopG, emissiveMap: T.shopGEm, emissive: 0xffffff, emissiveIntensity: 0, roughness: .6 }),
  shopU: new THREE.MeshStandardMaterial({ map: T.shopU, emissiveMap: T.shopUEm, emissive: 0xffffff, emissiveIntensity: 0, roughness: .6 }),
};
M.leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: T.leaf, alphaTest: .45 });
const SHARED_GLOWS = [[M.shopG, 1.25, .15], [M.shopU, 1.25, .15], [M.glass, 1.1, 0], [M.city, 1.1, 0], [M.bulb, 3, 0], [M.stucco, .28, 0]];

/* ---------- geometry helpers ---------- */
const merge = gs => THREE.BufferGeometryUtils.mergeBufferGeometries(gs.map(g => g.index ? g.toNonIndexed() : g));
function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
  g.translate(x, y, z); return g;
}
function plane(w, h) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); return g; }
function cyl(rt, rb, h, seg, x = 0, y = 0, z = 0, open = false) { // cylinder with world-scaled UVs
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), uv = g.attributes.uv, circ = 2 * Math.PI * Math.max(rt, rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
  g.translate(x, y, z); return g;
}
function dome(r, x = 0, y = 0, z = 0, seg = 28, sy = 1, thetaLen = Math.PI / 2) { const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2 | 0), 0, Math.PI * 2, 0, thetaLen); g.scale(1, sy, 1); g.translate(x, y, z); return g; }
function archPts(aw, sp, ap, n = 10) {
  const h = ap - sp, V2 = THREE.Vector2;
  const a = new THREE.CubicBezierCurve(new V2(-aw / 2, sp), new V2(-aw / 2, sp + h * .62), new V2(-aw * .14, ap - h * .08), new V2(0, ap));
  const b = new THREE.CubicBezierCurve(new V2(0, ap), new V2(aw * .14, ap - h * .08), new V2(aw / 2, sp + h * .62), new V2(aw / 2, sp));
  return a.getPoints(n).concat(b.getPoints(n).slice(1));
}
function roundPts(aw, sp, n = 12) { const p = []; for (let i = 0; i <= n; i++) { const a = Math.PI - i / n * Math.PI; p.push(new THREE.Vector2(Math.cos(a) * aw / 2, sp + Math.sin(a) * aw / 2)); } return p; }
function bayShape(w, h, aw, sp, ap, round) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-aw / 2, 0);
  (round ? roundPts(aw, sp) : archPts(aw, sp, ap)).forEach(p => s.lineTo(p.x, p.y));
  s.lineTo(aw / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath(); return s;
}
function ringShape(aw, sp, ap, t, round) {
  const s = new THREE.Shape();
  const o = round ? roundPts(aw + 2 * t, sp) : archPts(aw + 2 * t, sp, ap + t * 1.1), i = (round ? roundPts(aw, sp) : archPts(aw, sp, ap)).reverse();
  s.moveTo(o[0].x, o[0].y); o.slice(1).forEach(p => s.lineTo(p.x, p.y)); i.forEach(p => s.lineTo(p.x, p.y)); s.closePath(); return s;
}
function archHole(aw, sp, ap, cx = 0, y0 = 0, round) { const h = new THREE.Path(), pts = round ? roundPts(aw, sp) : archPts(aw, sp, ap, 6); h.moveTo(cx - aw / 2, y0); pts.forEach(p => h.lineTo(p.x + cx, p.y)); h.lineTo(cx + aw / 2, y0); h.closePath(); return h; }
function extrude(shape, depth, z0) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, z0); return g; }
function mat4(x, y, z, ry = 0, sx = 1, sy = sx, sz = sx) { return new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new V3(sx, sy, sz)); }
function bayParts(w, h, aw, sp, ap, balustrade, round) {
  const S = [extrude(bayShape(w, h, aw, sp, ap, round), .8, -.8)];
  if (balustrade) S.push(box(aw + .1, 1.05, .22, 0, .52, -.45));
  const Tl = [extrude(ringShape(aw, sp, ap, .26, round), .12, 0)];
  const ms = .66;
  for (const sx of [-1, 1]) { const p = plane(ms, ms); p.translate(sx * (w / 2 - .62), (round ? sp + aw / 2 : ap) - .3, .03); const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / ms * .8, uv.getY(i) / ms * .8); Tl.push(p); }
  return { S: merge(S), T: merge(Tl) };
}
function facade(list, cx, cz, ry, len, y, bw0 = 5, skip = [], skipW = 4.9) {
  const n = Math.max(1, Math.round(len / bw0)), bw = len / n, ax = Math.cos(ry), az = -Math.sin(ry);
  for (let i = 0; i < n; i++) { const o = (i + .5) * bw - len / 2; if (skip.some(s => Math.abs(o - s) < skipW)) continue; list.push(mat4(cx + ax * o, y, cz + az * o, ry, bw / bw0, 1, 1)); }
}

/* ---------- builders (add into the place being built) ---------- */
let cur = null;
const add = o => (cur.group.add(o), o);
function mesh(geo, mat, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; return add(m); }
function instanced(geo, mat, mats, { cast = true, receive = true, colors } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((mm, i) => { m.setMatrixAt(i, mm); if (colors) m.setColorAt(i, new THREE.Color(colors[i] ?? pick(colors))); });
  m.castShadow = cast; m.receiveShadow = receive; return add(m);
}
function flat(w, d, x, z, y, mat, receive = true) { const g = plane(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return mesh(g, mat, { cast: false, receive }); }
const onUpdate = fn => cur.updaters.push(fn);
const glow = (mat, max, base = 0) => cur.glows.push([mat, max, base]);
function water(w, d, x, z, y = -.5, { size = 6, color = 0x0c4a5a, distortion = 2.2, res } = {}) {
  const wm = new THREE.Water(new THREE.PlaneGeometry(w, d), {
    textureWidth: res || (isMobile ? 256 : 512), textureHeight: res || (isMobile ? 256 : 512), waterNormals: T.waterNormals,
    sunDirection: new V3(), sunColor: 0xffffff, waterColor: color, distortionScale: distortion, fog: true,
  });
  wm.rotation.x = -Math.PI / 2; wm.position.set(x, y, z); wm.material.uniforms.size.value = size; wm.userData.color = new THREE.Color(color);
  cur.waters.push(wm); return add(wm);
}
let palmGeo = null;
function palmGeometry() {
  if (palmGeo) return palmGeo;
  function frond(len, wd, droop, lift) {
    const seg = 10, pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, x = t * len, y = lift * t - droop * t * t, hw = wd * .5 * Math.sin(Math.PI * Math.min(1, t * 1.1 + .06));
      pos.push(x, y, -hw, x, y - hw * .25, hw); uv.push(0, t, 1, t);
      if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const fr = [];
  for (let i = 0; i < 13; i++) { const f = frond(4.4 + R(), 1.5, 2.6 + R() * .8, .9); f.rotateZ(.1); f.rotateY(i / 13 * Math.PI * 2 + R() * .2); fr.push(f); }
  for (let i = 0; i < 6; i++) { const f = frond(3.4, 1.2, .9, 2.1); f.rotateY(i / 6 * Math.PI * 2 + .3); fr.push(f); }
  const crown = merge(fr); crown.translate(0, 9.4, 0);
  const trunk = new THREE.CylinderGeometry(.24, .38, 9.6, 8, 4); trunk.translate(0, 4.8, 0);
  return (palmGeo = { crown, trunk });
}
function palms(spots, scale = 1) {
  const g = palmGeometry();
  const mats = spots.map(([x, z, y = 0]) => { const s = (.85 + R() * .35) * scale; return mat4(x, y, z, R() * 6.28, s); });
  instanced(g.trunk, M.bark, mats); const c = instanced(g.crown, M.leaf, mats); c.customDepthMaterial = M.leafDepth; return mats;
}
function trees(spots) { // rounded shade trees (neem / ghaf)
  const crown = merge([new THREE.IcosahedronGeometry(3.2, 1).translate(0, 6.2, 0), new THREE.IcosahedronGeometry(2.4, 1).translate(1.8, 5.2, .8), new THREE.IcosahedronGeometry(2.3, 1).translate(-1.6, 5.4, -1)]);
  const trunk = merge([new THREE.CylinderGeometry(.28, .45, 5, 7).translate(0, 2.5, 0), new THREE.CylinderGeometry(.12, .2, 2.6, 5).rotateZ(.8).translate(.9, 4.4, 0)]);
  const fm = new THREE.MeshStandardMaterial({ map: T.foliage, color: 0x9bc27a, roughness: .9, flatShading: true });
  const mats = spots.map(([x, z, y = 0, s = 1]) => mat4(x, y, z, R() * 6.28, s * (.85 + R() * .3)));
  instanced(trunk, M.bark, mats); instanced(crown, fm, mats);
}
function lamps(mats) {
  const pole = merge([new THREE.CylinderGeometry(.09, .14, 8, 6).translate(0, 4, 0), box(.1, .1, 1.6, 0, 7.9, .7)]);
  instanced(pole, M.lamp, mats, { receive: false }); instanced(box(.5, .18, .3, 0, 7.8, 1.4), M.bulb, mats, { cast: false, receive: false });
}
const TINTS = [0xe4d7bf, 0xd8c7a6, 0xcdb894, 0xe9e2d6, 0xbcc8cc, 0xdacbb0, 0xc9b28c, 0xd6d0c6];
function city(cells, classes, tints = TINTS) {
  const buckets = classes.map(() => []);
  for (const c of cells) buckets[c.k].push(c);
  buckets.forEach((list, k) => {
    if (!list.length) return;
    const [w, h, d] = classes[k];
    const m = new THREE.InstancedMesh(box(w, h, d, 0, h / 2, 0), [M.city, M.city, M.roof, M.roof, M.city, M.city], list.length);
    list.forEach((c, i) => { m.setMatrixAt(i, mat4(c.x, c.y || 0, c.z, c.r || 0)); m.setColorAt(i, new THREE.Color(pick(tints))); });
    m.castShadow = true; m.receiveShadow = true; add(m);
  });
}
const CAR_COLORS = [0xf5f5f2, 0xf5f5f2, 0xe9e9e6, 0x1b1d20, 0x8a8f96, 0xb8bcc2, 0x7a1f1f, 0x1f3e66, 0xc9b58f, 0xffffff];
const carBodyGeo = merge([box(4.5, .8, 1.85, 0, .65, 0), box(4.3, .3, 1.8, 0, 1.2, 0)]), carCabGeo = box(2.5, .72, 1.68, -.25, 1.7, 0);
// lanes: [{pts:[V3..], n, speed:[min,max]}] — cars follow the polyline and loop
function cars(parked = [], lanes = []) {
  const traffic = [];
  for (const ln of lanes) {
    const pts = ln.pts, cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const L = cum[cum.length - 1];
    for (let i = 0; i < ln.n; i++) traffic.push({ ln: { pts, cum, L }, d: R() * L, v: (ln.speed || [9, 16])[0] + R() * ((ln.speed || [9, 16])[1] - (ln.speed || [9, 16])[0]), seg: 0 });
  }
  const n = parked.length + traffic.length; if (!n) return;
  const body = new THREE.InstancedMesh(carBodyGeo, M.carBody, n), cab = new THREE.InstancedMesh(carCabGeo, M.carGlass, n);
  for (let i = 0; i < n; i++) body.setColorAt(i, new THREE.Color(pick(CAR_COLORS)));
  parked.forEach((m, i) => { body.setMatrixAt(i, m); cab.setMatrixAt(i, m); });
  body.castShadow = cab.castShadow = true; body.receiveShadow = true;
  body.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cab.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  add(body); add(cab);
  if (!traffic.length) return;
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new V3(), s = new V3(1, 1, 1);
  onUpdate(dt => {
    for (let i = 0; i < traffic.length; i++) {
      const c = traffic[i], { pts, cum, L } = c.ln;
      c.d += c.v * dt; if (c.d >= L) { c.d -= L; c.seg = 0; }
      while (c.seg < cum.length - 2 && cum[c.seg + 1] < c.d) c.seg++;
      if (cum[c.seg] > c.d) c.seg = 0;
      const a = pts[c.seg], b = pts[c.seg + 1], k = (c.d - cum[c.seg]) / (cum[c.seg + 1] - cum[c.seg] || 1);
      p.lerpVectors(a, b, k); q.setFromAxisAngle(UP, Math.atan2(-(b.z - a.z), b.x - a.x)); tm.compose(p, q, s);
      body.setMatrixAt(parked.length + i, tm); cab.setMatrixAt(parked.length + i, tm);
    }
    body.instanceMatrix.needsUpdate = cab.instanceMatrix.needsUpdate = true;
  });
}
const PCOL = [0xf6f4ee, 0xf6f4ee, 0xf6f4ee, 0x16161a, 0x16161a, 0x2b3f5c, 0x8c3b2e, 0xc9b38a, 0x4a6b4f];
const personGeo = new THREE.CapsuleGeometry(.24, 1.1, 3, 8); personGeo.translate(0, .8, 0);
// paths: [x0,z0,x1,z1,y?]; people walk back and forth with a slight sway
function crowd(paths, n) {
  const ppl = [];
  for (let i = 0; i < n; i++) { const p = paths[i % paths.length]; ppl.push({ p, u: R(), v: (.9 + R() * .7) * (R() < .5 ? -1 : 1), off: (R() - .5) * 1.4, ph: R() * 6 }); }
  const m = new THREE.InstancedMesh(personGeo, M.people, n);
  ppl.forEach((_, i) => m.setColorAt(i, new THREE.Color(pick(PCOL))));
  m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); add(m);
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new V3(), sv = new V3(1, 1, 1);
  onUpdate((dt, t) => {
    for (let i = 0; i < n; i++) {
      const p = ppl[i], [x0, z0, x1, z1, y = 0] = p.p, len = Math.hypot(x1 - x0, z1 - z0) || 1;
      p.u += p.v * dt / len; if (p.u > 1) { p.u = 1; p.v *= -1; } if (p.u < 0) { p.u = 0; p.v *= -1; }
      const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
      pv.set(x0 + (x1 - x0) * p.u + nx * p.off, y + Math.abs(Math.sin(t * 5 + p.ph)) * .05, z0 + (z1 - z0) * p.u + nz * p.off);
      tm.compose(pv, q, sv); m.setMatrixAt(i, tm);
    }
    m.instanceMatrix.needsUpdate = true;
  });
}
function pointLights(list) { // [[x,y,z,color,dist,max]]
  for (const [x, y, z, c = 0xffb36a, d = 45, max = 2.2] of list) { const l = new THREE.PointLight(c, 0, d, 2); l.position.set(x, y, z); add(l); cur.lights.push([l, max]); }
}
const api = {
  THREE, V3, UP, M, T, R, pick, smooth, rep, cv, tex, speck, star, isMobile,
  merge, box, plane, cyl, dome, archPts, roundPts, bayShape, ringShape, archHole, extrude, mat4, bayParts, facade,
  add, mesh, instanced, flat, onUpdate, glow, water, palms, trees, lamps, city, cars, crowd, pointLights,
};

/* ---------- sky, sun, stars ---------- */
const sky = new THREE.Sky(); sky.scale.setScalar(45000); scene.add(sky);
const su = sky.material.uniforms; su.turbidity.value = 7; su.rayleigh.value = 1.5; su.mieCoefficient.value = .006; su.mieDirectionalG.value = .86;
const hemi = new THREE.HemisphereLight(0xbcd3e8, 0xc8b58f, .45); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(isMobile ? 2048 : 4096, isMobile ? 2048 : 4096);
sun.shadow.bias = -.0003; sun.shadow.normalBias = .05; scene.add(sun); scene.add(sun.target);
const stars = (() => {
  const g = new THREE.BufferGeometry(), p = [];
  for (let i = 0; i < 1800; i++) { const y = R(), a = R() * 6.283, s = Math.sqrt(1 - y * y), r = 20000; p.push(Math.cos(a) * s * r, y * r + 500, Math.sin(a) * s * r); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts); return pts;
})();
const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene();
let envRT = null, lastEnvHour = -99, lastEnvTime = 0;
function rebuildEnv() { envScene.add(sky); if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene); scene.add(sky); scene.environment = envRT.texture; }
const C = h => new THREE.Color(h), sunDir = new V3();
let hour = 16, active = null;
function phaseName(h) { return tr(h < 5 ? 'phNight' : h < 6.6 ? 'phDawn' : h < 11 ? 'phMorning' : h < 15 ? 'phMidday' : h < 17.6 ? 'phAfternoon' : h < 19 ? 'phSunset' : h < 20.2 ? 'phDusk' : 'phNight'); }
function setHour(h, forceEnv) {
  hour = h;
  const e = active.env;
  const el = 74 * Math.sin(Math.PI * (h - 6.2) / 12.4), az = 90 + (h - 6.2) / 12.4 * 180;
  const er = THREE.MathUtils.degToRad(el), ar = THREE.MathUtils.degToRad(az);
  sunDir.set(Math.sin(ar) * Math.cos(er), Math.sin(er), -Math.cos(ar) * Math.cos(er)).normalize();
  su.sunPosition.value.copy(sunDir);
  const day = smooth(-3, 10, el), night = 1 - smooth(-6, 4, el), golden = 1 - smooth(4, 30, el);
  const c = e.center;
  if (el > -2) {
    sun.position.copy(sunDir).multiplyScalar(e.sunDist).add(c);
    sun.color.copy(C(0xfff4e4)).lerp(C(0xff9f5a), golden * .85); sun.intensity = 2.9 * smooth(-2, 9, el) + .05;
  } else { sun.position.set(-.5, .72, .3).normalize().multiplyScalar(e.sunDist).add(c); sun.color.set(0x9fb6ff); sun.intensity = .32; }
  sun.target.position.copy(c);
  hemi.color.copy(C(0x22365e)).lerp(C(0xbcd3e8), day); hemi.groundColor.copy(C(0x1a1610)).lerp(C(e.ground || 0xc8b58f), day);
  hemi.intensity = .26 + .16 * day;
  scene.fog.color.copy(C(0x0b1424).lerp(C(0xe2b48c), smooth(-6, 2, el)).lerp(C(e.fogColor || 0xd8d6ce), smooth(5, 28, el)));
  scene.fog.density = e.fog * (1 + night * .25);
  renderer.toneMappingExposure = e.exposure + .05 * golden + .32 * night;
  for (const w of active.waters) {
    const u = w.material.uniforms;
    u.sunDirection.value.copy(sun.position).sub(c).normalize();
    u.sunColor.value.copy(sun.color).multiplyScalar(Math.max(.15, day));
    u.waterColor.value.copy(C(0x031018)).lerp(w.userData.color, day);
  }
  for (const [m, max, base] of SHARED_GLOWS) m.emissiveIntensity = base + night * max;
  for (const [m, max, base] of active.glows) m.emissiveIntensity = base + night * max;
  for (const [l, max] of active.lights) l.intensity = night * max;
  stars.material.opacity = night * .85;
  if (active.onTime) active.onTime(night, day);
  document.dispatchEvent(new CustomEvent('s3:hour', { detail: { hour: h, night, day } }));
  const H = Math.floor(h) % 24, m = Math.floor((h % 1) * 60);
  $('#p3-clock').textContent = String(H).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  $('#p3-phase').textContent = phaseName(h);
  const now = performance.now();
  if (forceEnv || (Math.abs(h - lastEnvHour) > .2 && now - lastEnvTime > 250)) { rebuildEnv(); lastEnvHour = h; lastEnvTime = now; }
}

/* ---------- places ---------- */
const runtimes = {};
function build(p) {
  const rt = { p, group: new THREE.Group(), updaters: [], glows: [], waters: [], lights: [] };
  cur = rt; scene.add(rt.group);
  const out = p.build(api) || {};
  Object.assign(rt, out);
  rt.env = Object.assign({ center: new V3(), shadow: 150, sunDist: 500, fog: .00042, near: .5, far: 14000, minDist: 6, maxDist: 1500, exposure: .46 }, p.env || {}, out.env || {});
  rt.env.center = new V3(...(Array.isArray(rt.env.center) ? rt.env.center : [rt.env.center.x, rt.env.center.y, rt.env.center.z]));
  rt.views = {}; for (const [k, v] of Object.entries(out.views)) rt.views[k] = v.link ? { name: v.name, link: v.link } : { name: v[0], a: new V3(...v[1]), ta: new V3(...v[2]), b: new V3(...(v[3] || v[1])), tb: new V3(...(v[4] || v[2])) };
  rt.tour = out.tour || Object.keys(rt.views).filter(k => !rt.views[k].link);
  cur = null; return rt;
}
function applyEnv(rt) {
  const e = rt.env;
  camera.near = e.near; camera.far = e.far; camera.updateProjectionMatrix();
  controls.minDistance = e.minDist; controls.maxDistance = e.maxDist;
  Object.assign(sun.shadow.camera, { left: -e.shadow, right: e.shadow, top: e.shadow, bottom: -e.shadow, near: 10, far: e.sunDist * 2 + 200 });
  sun.shadow.camera.updateProjectionMatrix();
}

/* ---------- UI (Daleel classes: .place rows, .btn, .ledger, .cap) ---------- */
const I18N = () => window.S3.i18n || { t: k => k, getLang: () => 'en' };
const tr = (k, v) => I18N().t(k, v);
const isAr = () => I18N().getLang() === 'ar';
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loc = (p, key) => (isAr() && p.ar && p.ar[key] != null ? p.ar[key] : p[key]);
const pname = p => (isAr() ? p.arabic : p.title);
// Daleel site ids that have a 3D scene, and back again for the "Back to the plate" link
const SITE_TO_SCENE = { 'blue-souk': 'souq', 'al-noor-mosque': 'noor', 'islamic-museum': 'museum', 'heart-of-sharjah': 'shanasiyah', 'al-suhub': 'suhub' };
const SCENE_TO_SITE = { souq: 'blue-souk', souqin: 'blue-souk', noor: 'al-noor-mosque', museum: 'islamic-museum', shanasiyah: 'heart-of-sharjah' };
function buildPlaceButtons() {
  const cur = active && active.p.id;
  $('#p3-places').innerHTML = PLACES.map(p => `<div class="place"><span class="pn"><button type="button" data-place="${p.id}"${p.id === cur ? ' aria-current="true"' : ''}>${esc(pname(p))}</button></span>
    <span class="pm">${esc(loc(p, 'eyebrow'))}${p.id === cur ? ` · <em>${esc(tr('showing3d'))}</em>` : ''}</span></div>`).join('');
}
function fillInfo(p) {
  const other = isAr() ? p.title : p.arabic;
  $('#p3-eyebrow').textContent = loc(p, 'eyebrow');
  $('#p3-h').innerHTML = `${esc(pname(p))}<span class="ar" lang="${isAr() ? 'en' : 'ar'}">${esc(other)}</span>`;
  $('#p3-lede').textContent = loc(p, 'lede');
  $('#p3-facts').innerHTML = loc(p, 'facts').map(([k, v, small]) => `<div><dt>${esc(k)}</dt><dd${small ? ' class="small"' : ''}>${esc(v)}</dd></div>`).join('');
  $('#p3-map').href = p.map;
  const site = SCENE_TO_SITE[p.id]; $('#p3-back').hidden = !site; if (site) $('#p3-back').dataset.open = site;
  $('#p3-canvas').setAttribute('aria-label', tr('canvas3d', { name: pname(p) }));
  buildPlaceButtons();
}
function fillViews(rt) {
  const dock = $('#p3-views'), names = (isAr() && rt.p.ar && rt.p.ar.views) || {};
  dock.innerHTML = '';
  for (const [k, v] of Object.entries(rt.views)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.dataset.view = k; b.textContent = names[k] || v.name;
    if (v.link) b.addEventListener('click', () => activate(v.link)); else { b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => flyTo(k)); }
    dock.appendChild(b);
  }
  $('#p3-help').textContent = tr(rt.walk ? 'walkHelp3d' : 'orbitHelp3d');
}
const labelsEl = $('#p3-labels'); let LABELS = [];
function fillLabels(rt) {
  labelsEl.innerHTML = '';
  const ar = (isAr() && rt.p.ar && rt.p.ar.labels) || [];
  LABELS = (rt.labels || []).map(([t, s, p, cls], i) => {
    const [ta, sa] = ar[i] || [t, s];
    const el = document.createElement('div'); el.className = 'lbl' + (cls ? ' ' + cls : '');
    el.innerHTML = `<b>${esc(ta)}${sa ? `<small>${esc(sa)}</small>` : ''}</b>`; labelsEl.appendChild(el);
    return { el, p: new V3(...p) };
  });
}
$('#p3-places').addEventListener('click', e => { const b = e.target.closest('[data-place]'); if (b) activate(b.dataset.place); });

/* ---------- camera views & tour ---------- */
let mode = 'tour', shotI = 0, shotT = 0, flyT = 0, flyShot = null;
const fromPos = new V3(), fromTgt = new V3();
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function arcLerp(out, a, b, k) { out.lerpVectors(a, b, k); out.y += Math.sin(Math.PI * k) * a.distanceTo(b) * .22; return out; }
function markView(name) { document.querySelectorAll('#p3-views [data-view]').forEach(b => b.hasAttribute('aria-pressed') && b.setAttribute('aria-pressed', b.dataset.view === name)); }
function startShot(i) { const t = active.tour; shotI = (i + t.length) % t.length; shotT = 0; fromPos.copy(camera.position); fromTgt.copy(controls.target); markView(t[shotI]); }
function setMode(m) { mode = m; controls.enabled = m === 'explore' && !active.walk; if (m === 'explore' && active.walk) walkSync(); if (m === 'explore' && active) { const v = active.views[active.tour[shotI]]; if (v) polarFor({ a: camera.position, ta: controls.target }); } $('#p3-tour').setAttribute('aria-pressed', m === 'tour'); if (m === 'tour') startShot(shotI + 1); }
function flyTo(k) { flyShot = active.views[k]; flyT = 0; fromPos.copy(camera.position); fromTgt.copy(controls.target); mode = 'fly'; controls.enabled = false; $('#p3-tour').setAttribute('aria-pressed', 'false'); markView(k); setHash(active.p.id + '.' + k); }
function polarFor(v) { const up = v.a.y < v.ta.y - 2; controls.maxPolarAngle = up ? Math.PI * .98 : Math.PI * .492; controls.minPolarAngle = 0; }
function jumpTo(k) { const v = active.views[k]; camera.position.copy(v.a); controls.target.copy(v.ta); camera.lookAt(v.ta); polarFor(v); markView(k); if (active.walk) walkSync(); }
function setHash() { /* the Daleel app owns the URL hash */ }
$('#p3-tour').addEventListener('click', () => { if (window.S3.real) return; setMode(mode === 'tour' ? 'explore' : 'tour'); });
const toExplore = () => { if (mode !== 'explore') { setMode('explore'); markView(''); } };
canvas.addEventListener('pointerdown', toExplore);
canvas.addEventListener('wheel', toExplore, { passive: true });

const hourInput = $('#p3-hour');
let playDay = false;
hourInput.addEventListener('input', () => { playDay = false; $('#p3-play').setAttribute('aria-pressed', 'false'); setHour(parseFloat(hourInput.value)); });
hourInput.addEventListener('change', () => setHour(parseFloat(hourInput.value), true));
$('#p3-play').addEventListener('click', e => { playDay = !playDay && !still(); e.currentTarget.setAttribute('aria-pressed', playDay); });
$('#p3-labels-btn').addEventListener('click', e => { const off = document.body.classList.toggle('nolabels'); e.currentTarget.setAttribute('aria-pressed', !off); });
$('#p3-full').addEventListener('click', e => { const on = $('#p3-frame').classList.toggle('full'); e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = tr(on ? 'exitFull3d' : 'full3d'); document.body.classList.toggle('full3d', on); });
addEventListener('keydown', e => { if (!paused && e.key === 'Escape' && $('#p3-frame').classList.contains('full')) $('#p3-full').click(); });
const still = () => document.documentElement.classList.contains('still');

function activate(id, view, explore) {
  const p = PLACES.find(x => x.id === id) || PLACES[0];
  if (active && active.p === p && !view) return;
  const loader = $('#p3-loader');
  const go = () => {
    if (!runtimes[p.id]) runtimes[p.id] = build(p);
    for (const rt of Object.values(runtimes)) rt.group.visible = rt.p === p;
    active = runtimes[p.id];
    applyEnv(active); fillInfo(p); fillViews(active); fillLabels(active);
    setHour(hour, true);
    const first = view && active.views[view] ? view : active.tour[0];
    document.body.classList.toggle('walking', !!active.walk);
    if (explore || view || still()) { jumpTo(first); mode = 'explore'; controls.enabled = !active.walk; $('#p3-tour').setAttribute('aria-pressed', 'false'); }
    else { const v = active.views[first]; camera.position.copy(v.a).lerp(v.ta, active.walk ? 0 : -.25); controls.target.copy(v.ta); shotI = -1; mode = 'tour'; controls.enabled = false; $('#p3-tour').setAttribute('aria-pressed', 'true'); startShot(0); }
    setHash(p.id + (view ? '.' + view : ''));
    loader.classList.add('done');
    const ann = $('#announce'); if (ann) { ann.textContent = ''; setTimeout(() => (ann.textContent = pname(p)), 30); }
    document.dispatchEvent(new CustomEvent('s3:place', { detail: { id: p.id } }));
  };
  if (!runtimes[p.id]) { $('#p3-loader p').textContent = tr('loading3d', { name: pname(p) }); loader.classList.remove('done'); setTimeout(go, 40); }
  else go();
}


/* ---------- first-person walking (interior places) ---------- */
const walk = { yaw: 0, pitch: 0, keys: {}, drag: null, target: null, level: 0, hop: null, bob: 0 };
const rc = new THREE.Raycaster(), fwd = new V3(), rgt = new V3();
const inRect = (r, x, z) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
const walkOk = (x, z, lvl) => active.walk.rects.some(r => r[4] === lvl && inRect(r, x, z));
function walkSync() {
  const W = active.walk; camera.getWorldDirection(fwd);
  walk.yaw = Math.atan2(-fwd.x, -fwd.z); walk.pitch = Math.asin(Math.max(-1, Math.min(1, fwd.y)));
  let best = 1e9;
  W.levels.forEach((y, i) => { const d = Math.abs(camera.position.y - W.eye - y); if (d < best && W.rects.some(r => r[4] === i && inRect(r, camera.position.x, camera.position.z))) { best = d; walk.level = i; } });
  walk.target = null; walk.hop = null;
}
function walkUpdate(dt, t) {
  const W = active.walk, p = camera.position, k = walk.keys;
  fwd.set(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw)); rgt.set(Math.cos(walk.yaw), 0, -Math.sin(walk.yaw));
  let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
  if (k.ArrowLeft) walk.yaw += dt * 1.8; if (k.ArrowRight) walk.yaw -= dt * 1.8;
  const speed = (k.ShiftLeft || k.ShiftRight ? 5.5 : 2.6) * dt;
  let dx = (fwd.x * f + rgt.x * s) * speed, dz = (fwd.z * f + rgt.z * s) * speed;
  if (f || s) { walk.target = null; walk.hop = null; }
  if (walk.hop) {
    const h = walk.hop; h.t = Math.min(1, h.t + dt / 1.6); const e = ease(h.t);
    p.lerpVectors(h.from, h.to, e); p.y += Math.sin(Math.PI * e) * 1.2;
    if (h.t >= 1) { walk.level = h.level; walk.hop = null; }
  } else {
    if (walk.target) { const tx = walk.target.x - p.x, tz = walk.target.z - p.z, d = Math.hypot(tx, tz); if (d < .12) walk.target = null; else { const st = Math.min(d, 2.8 * dt); dx = tx / d * st; dz = tz / d * st; } }
    if (dx || dz) {
      if (walkOk(p.x + dx, p.z + dz, walk.level)) { p.x += dx; p.z += dz; }
      else if (walkOk(p.x + dx, p.z, walk.level)) p.x += dx;
      else if (walkOk(p.x, p.z + dz, walk.level)) p.z += dz;
      else walk.target = null;
      walk.bob += Math.hypot(dx, dz) * 2.2;
    }
    p.y = W.levels[walk.level] + W.eye + Math.sin(walk.bob) * .025;
  }
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  camera.getWorldDirection(fwd); controls.target.copy(p).addScaledVector(fwd, 4);
}
const walking = () => active && active.walk && mode === 'explore';
canvas.addEventListener('pointerdown', e => { if (active && active.walk) walk.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; });
addEventListener('pointermove', e => {
  const d = walk.drag; if (!d || !walking()) return;
  walk.yaw -= (e.clientX - d.x) * .0038; walk.pitch = Math.max(-1.35, Math.min(1.35, walk.pitch - (e.clientY - d.y) * .0038));
  d.x = e.clientX; d.y = e.clientY; if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.moved = true;
});
addEventListener('pointerup', e => {
  const d = walk.drag; walk.drag = null; if (!d || d.moved || !walking()) return;
  const W = active.walk;
  const cr = canvas.getBoundingClientRect();
  rc.setFromCamera({ x: (e.clientX - cr.left) / cr.width * 2 - 1, y: -((e.clientY - cr.top) / cr.height) * 2 + 1 }, camera);
  const hit = rc.intersectObjects(W.floors, false)[0]; if (!hit) return;
  const q = hit.point, lvl = W.levels.findIndex(y => Math.abs(y - q.y) < .3);
  if (lvl < 0 || !walkOk(q.x, q.z, lvl)) return;
  if (lvl === walk.level) walk.target = { x: q.x, z: q.z };
  else walk.hop = { from: camera.position.clone(), to: new V3(q.x, W.levels[lvl] + W.eye, q.z), t: 0, level: lvl };
});
canvas.addEventListener('wheel', e => { if (!walking()) return; const st = -Math.sign(e.deltaY) * .9; const x = camera.position.x - Math.sin(walk.yaw) * st, z = camera.position.z - Math.cos(walk.yaw) * st; if (walkOk(x, z, walk.level)) { camera.position.x = x; camera.position.z = z; } }, { passive: true });
addEventListener('keydown', e => { if (paused || !active || !active.walk || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; walk.keys[e.code] = true; if (mode !== 'explore' && /Key[WASD]|Arrow/.test(e.code)) toExplore(); if (/Arrow/.test(e.code)) e.preventDefault(); });
addEventListener('keyup', e => { walk.keys[e.code] = false; });
addEventListener('blur', () => { walk.keys = {}; });

/* ---------- loop ---------- */
const clock = new THREE.Clock(), tmpV = new V3();
function updateLabels() {
  for (const l of LABELS) {
    tmpV.copy(l.p).project(camera);
    const d = camera.position.distanceTo(l.p);
    if (tmpV.z > 1 || tmpV.z < -1 || Math.abs(tmpV.x) > 1.1 || Math.abs(tmpV.y) > 1.1 || d > active.env.maxDist * .95 || d < 10) { l.el.style.display = 'none'; continue; }
    l.el.style.display = '';
    const [w, h] = stageSize();
    l.el.style.transform = `translate(${(tmpV.x * .5 + .5) * w}px, ${(-tmpV.y * .5 + .5) * h}px) translate(-50%, -100%)`;
  }
}
let paused = false;
Object.assign(window.S3, { activeId: () => active && active.p.id, sceneFor: id => SITE_TO_SCENE[id] || (PLACES.some(p => p.id === id) ? id : null), started: false,
  pause: b => { paused = b; if (!b) clock.getDelta(); },
  show: (id, h) => { if (h >= 0 && h <= 24) { hourInput.value = h; setHour(h, true); } const sc = window.S3.sceneFor(id); if (sc) activate(sc); },
  relabel: () => { if (!active) return; fillInfo(active.p); fillViews(active); fillLabels(active); setHour(hour); $('#p3-full').textContent = tr($('#p3-frame').classList.contains('full') ? 'exitFull3d' : 'full3d'); }, real: false });
function frame() {
  requestAnimationFrame(frame);
  if (!active || paused) return;
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  if (playDay) { let h = hour + dt * .4; if (h >= 24) h -= 24; hourInput.value = h; setHour(h); }
  if (mode === 'tour') {
    shotT += dt; const s = active.views[active.tour[shotI]], TR = 4, HOLD = 7;
    if (shotT < TR) { const k = ease(shotT / TR); arcLerp(camera.position, fromPos, s.a, k); controls.target.lerpVectors(fromTgt, s.ta, k); }
    else { const k = smooth(0, 1, (shotT - TR) / HOLD) * .6 + (shotT - TR) / HOLD * .4; camera.position.lerpVectors(s.a, s.b, k); controls.target.lerpVectors(s.ta, s.tb, k); }
    camera.lookAt(controls.target);
    if (shotT > TR + HOLD) startShot(shotI + 1);
  } else if (mode === 'fly') {
    flyT += dt / 2.6; const k = ease(Math.min(1, flyT));
    arcLerp(camera.position, fromPos, flyShot.a, k); controls.target.lerpVectors(fromTgt, flyShot.ta, k); camera.lookAt(controls.target);
    if (flyT >= 1) { mode = 'explore'; controls.enabled = !active.walk; polarFor(flyShot); if (active.walk) walkSync(); }
  } else if (active.walk) walkUpdate(dt, t); else controls.update();
  for (const fn of active.updaters) fn(dt, t);
  for (const w of active.waters) w.material.uniforms.time.value += dt * .5;
  updateLabels();
  $('#p3-needle').style.transform = `rotate(${Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z)}rad)`;
  renderer.render(scene, camera);
}
new ResizeObserver(() => { const [w, h] = stageSize(); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); }).observe(canvas);

function start(opts = {}) {
  window.S3.started = true;
  buildPlaceButtons();
  const h = opts.hour;
  if (h >= 0 && h <= 24) { hour = h; hourInput.value = h; }
  activate(window.S3.sceneFor(opts.id) || PLACES[0].id);
  requestAnimationFrame(frame);
}
})();
