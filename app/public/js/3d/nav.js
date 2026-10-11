/* Daleel 3D — AR guide. Pick a spot in the place on screen, see the route laid on the scene,
   then walk it at eye level behind animated arrows with turn-by-turn directions.
   Waypoints live in routes.js; the engine hands over the camera through S3.k.startGuide / stopGuide. */
(() => {
'use strict';
const S3 = window.S3, K = S3 && S3.k;
if (!K) return;
const { THREE, V3, scene, camera, controls, canvas } = K;
const ROUTES = window.S3_ROUTES || {};
const $ = s => document.querySelector(s);
const tr = (k, v) => K.tr(k, v), esc = K.esc, isAr = () => K.isAr();
const stage = canvas.parentElement, launch = $('#p3-guide');
const PACE = 1.3;          // real walking pace (m/s), for the time shown to visitors
const SIM = 1.4;           // on-screen walking pace at 1×
const SPEEDS = [1, 2, 4];
const EYE = 1.65, FOV_AR = 60;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

/* ---------- route graph ---------- */
function closest(a, b, p) {
  const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / l2)), x = a.x + vx * t, z = a.z + vz * t;
  return { x, z, d: Math.hypot(p.x - x, p.z - z) };
}
function graphFor(rt) {
  if ('nav' in rt) return rt.nav;
  const R = ROUTES[rt.p.id];
  if (!R) return (rt.nav = null);
  const N = {}, adj = {};
  const node = (id, x, z) => { N[id] = { id, x, z }; adj[id] = adj[id] || {}; return N[id]; };
  const link = (a, b, tag) => { adj[a][b] = adj[b][a] = { d: Math.hypot(N[a].x - N[b].x, N[a].z - N[b].z), tag }; };
  const unlink = (a, b) => { delete adj[a][b]; delete adj[b][a]; };
  for (const [id, [x, z]] of Object.entries(R.nodes)) node(id, x, z);
  for (const pair of R.links.trim().split(/\s+/)) {
    const [ab, tag] = pair.split(':'), [a, b] = ab.split('-');
    if (N[a] && N[b]) link(a, b, tag); else console.warn('[nav] unknown waypoint in', pair);
  }
  const more = R.more ? R.more(rt) : {};
  for (const [id, m] of Object.entries(more)) node(id, m.at[0], m.at[1]);
  for (const [id, m] of Object.entries(more)) {
    if (m.link) link(id, m.link);
    if (!m.attach) continue;
    let best = null;   // join the nearest walkway, splitting it where the spot meets it
    for (const a in adj) for (const b in adj[a]) {
      if (a > b || a === id || b === id) continue;
      const p = closest(N[a], N[b], N[id]); if (!best || p.d < best.d) best = { a, b, ...p };
    }
    if (!best) continue;
    const tag = adj[best.a][best.b].tag; unlink(best.a, best.b);
    const j = best.d < .3 ? id : node(id + '~', best.x, best.z).id;
    link(best.a, j, tag); link(j, best.b, tag); if (j !== id) link(j, id);
  }
  return (rt.nav = { R, N, adj, spots: R.spots.filter(s => N[s.id]), paths: {} });
}
function shortest(g, from, to) {
  const dist = { [from]: 0 }, prev = {}, open = new Set([from]), done = new Set();
  while (open.size) {
    let u = null; for (const k of open) if (u === null || dist[k] < dist[u]) u = k;
    open.delete(u); done.add(u); if (u === to) break;
    for (const [v, e] of Object.entries(g.adj[u])) {
      if (done.has(v)) continue;
      const d = dist[u] + e.d; if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = u; open.add(v); }
    }
  }
  if (dist[to] === undefined) return null;
  const ids = [to]; while (ids[0] !== from) ids.unshift(prev[ids[0]]);
  return { ids, d: dist[to] };
}

/* ---------- reading the walking surface from the scene ----------
   The upward-facing triangles of a place's fixed meshes go into a 4 m grid once; the height under a point
   is then a flat point-in-triangle test over a handful of them. Props (instanced), glass and water are left out. */
const CELL = 4;
function floorsOf(rt) {
  if (rt.navFloor) return rt.navFloor;
  const grid = new Map(), big = [], T = [];
  const a = new V3(), b = new V3(), c = new V3(), e1 = new V3(), e2 = new V3(), n = new V3();
  rt.group.updateMatrixWorld(true);
  rt.group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isWater) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.transparent && m.opacity < .5) return;
    const g = o.geometry, pos = g.attributes.position; if (!pos) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (pos.count > 30000 && g.boundingSphere.radius > 1500) return;      // mountain terrain: the summit has its own plaza
    const idx = g.index, cnt = idx ? idx.count : pos.count, mw = o.matrixWorld;
    for (let i = 0; i + 2 < cnt; i += 3) {
      a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(mw);
      b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(mw);
      c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(mw);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); const l = n.length();
      if (l < 1e-9 || n.y / l < .6) continue;
      const t = T.length / 9; T.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      const i0 = Math.floor(Math.min(a.x, b.x, c.x) / CELL), i1 = Math.floor(Math.max(a.x, b.x, c.x) / CELL);
      const k0 = Math.floor(Math.min(a.z, b.z, c.z) / CELL), k1 = Math.floor(Math.max(a.z, b.z, c.z) / CELL);
      if ((i1 - i0 + 1) * (k1 - k0 + 1) > 400) { big.push(t); continue; }
      for (let gi = i0; gi <= i1; gi++) for (let gk = k0; gk <= k1; gk++) { const key = gi + ',' + gk; let cl = grid.get(key); if (!cl) grid.set(key, (cl = [])); cl.push(t); }
    }
  });
  return (rt.navFloor = { grid, big, T: new Float32Array(T) });
}
function groundAt(F, x, z, y) {
  const cell = F.grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)), T = F.T;
  let best = -Infinity;
  const test = t => {
    const o = t * 9, ax = T[o], ay = T[o + 1], az = T[o + 2], bx = T[o + 3], by = T[o + 4], bz = T[o + 5], cx = T[o + 6], cy = T[o + 7], cz = T[o + 8];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) return;
    const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w3 = 1 - w1 - w2;
    if (w1 < -1e-5 || w2 < -1e-5 || w3 < -1e-5) return;
    const h = w1 * ay + w2 * by + w3 * cy;
    if (h <= y + 1.7 && h >= y - 3 && h > best) best = h;
  };
  if (cell) cell.forEach(test);
  F.big.forEach(test);
  return best > -Infinity ? best : null;
}
// for S3.navCheck: the meshes a walker could bump into
function solidsOf(rt) {
  if (rt.navSolids) return rt.navSolids;
  const list = [];
  rt.group.traverse(o => {
    if (!o.isMesh || o.isWater) return;
    if (o.isInstancedMesh && o.instanceMatrix.usage === THREE.DynamicDrawUsage) return;   // people, cars, boats
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.transparent && m.opacity < .5) return;
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    if (g.attributes.position.count > 30000 && g.boundingSphere.radius > 1500) return;
    list.push(o);
  });
  return (rt.navSolids = list);
}

/* ---------- a walkable path: rounded corners, even samples, heights, directions ---------- */
function buildPath(rt, g, from, to) {
  const key = from + '>' + to; if (g.paths[key]) return g.paths[key];
  const sp = shortest(g, from, to); if (!sp) return null;
  const P = sp.ids.map(id => g.N[id]), poly = [], mark = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    if (i === 0 || i === P.length - 1) { mark[i] = poly.length; poly.push([p.x, p.z]); continue; }
    const a = P[i - 1], b = P[i + 1], la = Math.hypot(p.x - a.x, p.z - a.z) || 1, lb = Math.hypot(b.x - p.x, b.z - p.z) || 1;
    const r = Math.min(2.2, la * .4, lb * .4);
    const ax = p.x + (a.x - p.x) / la * r, az = p.z + (a.z - p.z) / la * r, bx = p.x + (b.x - p.x) / lb * r, bz = p.z + (b.z - p.z) / lb * r;
    for (let k = 0; k <= 6; k++) { const t = k / 6, u = 1 - t; poly.push([u * u * ax + 2 * u * t * p.x + t * t * bx, u * u * az + 2 * u * t * p.z + t * t * bz]); if (k === 3) mark[i] = poly.length - 1; }
  }
  const cum = [0]; for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(2, Math.min(2000, Math.ceil(L / .4) + 1)), step = L / (n - 1);
  const xs = new Float32Array(n), ys = new Float32Array(n), zs = new Float32Array(n), ds = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++) {
    const s = Math.min(L, i * step); while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const k = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    xs[i] = poly[j][0] + (poly[j + 1][0] - poly[j][0]) * k; zs[i] = poly[j][1] + (poly[j + 1][1] - poly[j][1]) * k; ds[i] = s;
  }
  const F = floorsOf(rt); let y = g.R.y || 0;
  for (let i = 0; i < n; i++) { const h = groundAt(F, xs[i], zs[i], y); if (h !== null) y = h; ys[i] = y; }
  const slope = .75 * step;   // a step or kerb becomes a short ramp in the overlay instead of a cliff
  for (let i = n - 2; i >= 0; i--) ys[i] = Math.max(ys[i], ys[i + 1] - slope);
  for (let i = 1; i < n; i++) ys[i] = Math.max(ys[i], ys[i - 1] - slope);
  const path = { from, to, ids: sp.ids, P, n, xs, ys, zs, ds, L, nodeS: mark.map(m => cum[m]) };
  path.moves = moves(g, path);
  return (g.paths[key] = path);
}
function moves(g, path) {
  const out = [], { P, ids } = path;
  for (let i = 0; i < P.length - 1; i++) {
    const tag = g.adj[ids[i]][ids[i + 1]].tag;
    let act = null, ang = 0;
    if (i > 0) {
      const a = P[i - 1], p = P[i], b = P[i + 1], d1x = p.x - a.x, d1z = p.z - a.z, d2x = b.x - p.x, d2z = b.z - p.z;
      ang = Math.atan2(d1x * d2z - d1z * d2x, d1x * d2x + d1z * d2z);   // + is a right turn
      const A = Math.abs(ang) * 180 / Math.PI;
      if (A > 125) act = ang > 0 ? 'navHR' : 'navHL'; else if (A > 50) act = ang > 0 ? 'navR' : 'navL'; else if (A > 22) act = ang > 0 ? 'navSR' : 'navSL';
    }
    if (tag === 'cross') act = 'navCross'; else if (tag === 'door' && !act) act = 'navDoor';
    if (act) out.push({ s: path.nodeS[i], act, ang, turn: /nav[HS]?[LR]$/.test(act), i });
  }
  // steps: the surface climbs or drops by half a metre within three metres
  const { n, ys, ds } = path;
  for (let i = 0, j = 0; i < n; i++) {
    while (j < n - 1 && ds[j] - ds[i] < 3) j++;
    const dy = ys[j] - ys[i];
    if (Math.abs(dy) > .5) {
      if (!out.some(m => Math.abs(m.s - ds[i]) < 5)) out.push({ s: ds[i], act: dy > 0 ? 'navUp' : 'navDown', ang: 0 });
      while (i < n - 1 && ds[i] < ds[j]) i++;
    }
  }
  return out.sort((a, b) => a.s - b.s);
}
function sampleAt(path, s, out) {
  const { n, xs, ys, zs, L } = path, f = Math.max(0, Math.min(L, s)) / L * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i;
  return out.set(xs[i] + (xs[i + 1] - xs[i]) * k, ys[i] + (ys[i + 1] - ys[i]) * k, zs[i] + (zs[i + 1] - zs[i]) * k);
}

/* ---------- overlay: route ribbon, turn arrows, destination ---------- */
const LOGV = '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}';
// the ribbon widens with distance so the route still reads from the overview, and is path-sized underfoot
const RIBBON_V = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aOff;
uniform float uHalf;
varying vec2 vUv;
varying float vS;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vS = max(1.0, distance(cameraPosition, wp.xyz) / 24.0);
  wp.xyz += aOff * uHalf * vS;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`;
const RIBBON_F = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime, uDone, uAlpha;
varying vec2 vUv;
varying float vS;
void main() {
  #include <logdepthbuf_fragment>
  float a = abs(vUv.y);
  float body = 1.0 - smoothstep(0.8, 1.0, a);
  float rim = smoothstep(0.66, 0.84, a) * body;
  float p = fract((vUv.x / vS + a * 0.6) / 1.8 - uTime * 0.85);
  float chev = smoothstep(0.0, 0.06, p) * (1.0 - smoothstep(0.28, 0.36, p)) * (1.0 - smoothstep(0.56, 0.7, a));
  vec3 col = mix(vec3(0.08, 0.42, 1.0), vec3(0.88, 0.96, 1.0), chev);
  col = mix(col, vec3(0.6, 0.85, 1.0), rim);
  float alpha = body * (0.38 + 0.55 * chev + 0.35 * rim);
  alpha *= mix(0.15, 1.0, smoothstep(uDone - 0.6, uDone + 0.6, vUv.x));
  gl_FragColor = vec4(col, alpha * uAlpha);
}`;
const BEAM_F = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime, uNear;
varying vec2 vUv;
void main() {
  #include <logdepthbuf_fragment>
  float fade = pow(1.0 - vUv.y, 1.6) * uNear;
  float shimmer = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 3.0);
  gl_FragColor = vec4(1.0, 0.82, 0.42, fade * shimmer * 0.55);
}`;
const U = { uTime: { value: 0 }, uDone: { value: -10 }, uAlpha: { value: 1 }, uHalf: { value: .48 } };
const ribbonMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: RIBBON_V, fragmentShader: RIBBON_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const xrayMat = new THREE.ShaderMaterial({ uniforms: { ...U, uAlpha: { value: .2 } }, vertexShader: RIBBON_V, fragmentShader: RIBBON_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, depthFunc: THREE.GreaterDepth });
const beamMat = new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime, uNear: { value: 1 } }, vertexShader: LOGV, fragmentShader: BEAM_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
const arrowGeo = (() => {
  const s = new THREE.Shape(); s.moveTo(0, .95); s.lineTo(.85, .05); s.lineTo(.34, .05); s.lineTo(.34, -.9); s.lineTo(-.34, -.9); s.lineTo(-.34, .05); s.lineTo(-.85, .05); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2 }); g.center(); return g;
})();
const arrowMats = [new THREE.MeshBasicMaterial({ color: 0x2f8bff, transparent: true, opacity: .94, toneMapped: false, fog: false }), new THREE.MeshBasicMaterial({ color: 0xeaf4ff, toneMapped: false, fog: false })];
const pinMat = new THREE.MeshBasicMaterial({ color: 0xf0c25a, toneMapped: false, fog: false });
const ringMat = () => new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: .8, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
const pinGeo = (() => { const c = new THREE.ConeGeometry(.42, 1.1, 24); c.rotateX(Math.PI); c.translate(0, -.55, 0); const s = new THREE.SphereGeometry(.42, 24, 12); return [c, s]; })();
const ringGeo = new THREE.RingGeometry(.55, .72, 48).rotateX(-Math.PI / 2);

function ribbonGeo(path) {   // the centre line twice over; the shader pushes each copy sideways along aOff
  const { n, xs, ys, zs, ds } = path, pos = new Float32Array(n * 6), off = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let tx = xs[b] - xs[a], tz = zs[b] - zs[a]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const y = ys[i] + .06;
    pos.set([xs[i], y, zs[i], xs[i], y, zs[i]], i * 6); off.set([-tz, 0, tx, tz, 0, -tx], i * 6); uv.set([ds[i], 1, ds[i], -1], i * 4);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aOff', new THREE.BufferAttribute(off, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
let fx = null;   // the overlay currently drawn: { group, arrows, pin, rings, beam, path }
function drawRoute(rt, path, beamH) {
  clearRoute();
  const group = new THREE.Group(), geo = ribbonGeo(path);
  const rib = new THREE.Mesh(geo, ribbonMat); rib.renderOrder = 6; rib.frustumCulled = false;
  const xr = new THREE.Mesh(geo, xrayMat); xr.renderOrder = 5; xr.frustumCulled = false;
  group.add(xr, rib);
  const arrows = [], tmp = new V3();
  for (const m of path.moves) {
    if (!m.turn) continue;
    const a = path.P[m.i - 1], p = path.P[m.i];
    sampleAt(path, m.s, tmp);
    const holder = new THREE.Group(); holder.position.set(p.x, tmp.y + 2.3, p.z); holder.rotation.y = Math.atan2(-(p.x - a.x), -(p.z - a.z));
    const arrow = new THREE.Mesh(arrowGeo, arrowMats); arrow.rotation.z = -Math.max(-2.3, Math.min(2.3, m.ang)); arrow.scale.setScalar(.9); arrow.renderOrder = 7;
    holder.add(arrow); group.add(holder); arrows.push({ holder, y: holder.position.y });
  }
  const end = sampleAt(path, path.L, new V3());
  const pin = new THREE.Group(); pin.position.set(end.x, end.y + 2.9, end.z);
  pinGeo.forEach(g2 => pin.add(new THREE.Mesh(g2, pinMat)));
  const rings = [0, .5].map(ph => { const r = new THREE.Mesh(ringGeo, ringMat()); r.position.set(end.x, end.y + .08, end.z); r.renderOrder = 7; r.userData.ph = ph; group.add(r); return r; });
  const bh = beamH || 40, beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, bh, 24, 1, true).translate(0, bh / 2, 0), beamMat);
  beam.position.copy(end); beam.renderOrder = 4; group.add(pin, beam);
  const start = new THREE.Mesh(new THREE.RingGeometry(.35, .5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }));
  start.position.set(path.xs[0], path.ys[0] + .08, path.zs[0]); group.add(start);
  scene.add(group);
  fx = { rt, group, arrows, pin, pinY: pin.position.y, rings, beam, path, end };
  rt.updaters.push(animate);
}
function clearRoute() {
  if (!fx) return;
  const i = fx.rt.updaters.indexOf(animate); if (i >= 0) fx.rt.updaters.splice(i, 1);
  scene.remove(fx.group);
  fx.group.traverse(o => { if (o.geometry && o.geometry !== arrowGeo && o.geometry !== ringGeo && !pinGeo.includes(o.geometry)) o.geometry.dispose(); if (o.material && o.material.isMeshBasicMaterial && !arrowMats.includes(o.material) && o.material !== pinMat) o.material.dispose(); });
  fx = null; pinLabel.hidden = true;
}
const pv = new V3();
function animate(dt, t) {
  if (!fx) return;
  const calm = K.still();
  U.uTime.value = calm ? 0 : t;
  U.uDone.value = W.on ? W.s - 1.5 : -10;
  fx.arrows.forEach((a, i) => {
    const d = camera.position.distanceTo(a.holder.position);   // turn signs belong to the walk; the overview has the ribbon
    a.holder.position.y = a.y + (calm ? 0 : Math.sin(t * 2.2 + i) * .14); a.holder.visible = W.on && d > 2.5;
  });
  const pd = camera.position.distanceTo(fx.pin.position), pk = Math.max(1, pd / 30), near = THREE.MathUtils.smoothstep(pd, 4, 12);
  beamMat.uniforms.uNear.value = near; fx.pin.visible = near > .05; fx.rings.forEach(r => (r.visible = near > .05));
  fx.pin.scale.setScalar(pk); fx.pin.position.y = fx.pinY + (pk - 1) * 1.4 + (calm ? 0 : Math.sin(t * 2.6) * .18); fx.pin.rotation.y = calm ? 0 : t * 1.4;
  for (const r of fx.rings) { const k = calm ? .4 : (t * .6 + r.userData.ph) % 1; r.scale.setScalar(1 + k * 3.2); r.material.opacity = .85 * (1 - k); }
  // the destination's name floats over the pin
  pv.copy(fx.pin.position); pv.y += 1.2; pv.project(camera);
  const [w, h] = K.stageSize(), dist = camera.position.distanceTo(fx.pin.position);
  if (pv.z > 1 || Math.abs(pv.x) > 1.05 || Math.abs(pv.y) > 1.05 || dist < 3) pinLabel.hidden = true;
  else { pinLabel.hidden = false; pinLabel.style.transform = `translate(${(pv.x * .5 + .5) * w}px, ${(-pv.y * .5 + .5) * h}px) translate(-50%, -100%)`; }
}

/* ---------- DOM: picker, route bar, live HUD, arrival card ---------- */
const ICON = {
  park: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3"/>',
  door: '<path d="M6 21V10a6 6 0 0 1 12 0v11"/><path d="M4 21h16"/>',
  water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  tower: '<path d="M10 21V8l2-5 2 5v13"/><path d="M8 21h8M9.5 12h5"/>',
  view: '<circle cx="7" cy="15" r="3.5"/><circle cx="17" cy="15" r="3.5"/><path d="M10.5 15h3M6 11l2-6h2l1 6M18 11l-2-6h-2l-1 6"/>',
  shop: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  dome: '<path d="M4 20h16M6 20v-6a6 6 0 0 1 12 0v6"/><path d="M12 8V4"/>',
  flag: '<path d="M6 21V4"/><path d="M6 5h11l-2 4 2 4H6"/>',
  bridge: '<path d="M3 9h18M3 9v11M21 9v11M7 20a5 5 0 0 1 10 0"/>',
  arch: '<path d="M3 20V11a3 3 0 0 1 6 0v9M9 20v-9a3 3 0 0 1 6 0v9M15 20v-9a3 3 0 0 1 6 0v9"/>',
  path: '<path d="M8 21c0-3 2-4 2-7s-2-4-2-7M16 21c0-3-2-4-2-7s2-4 2-7"/>',
};
const svg = (d, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  arrow: '<path d="M12 3l7 8h-4.5v10h-5V11H5z" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="2.4" fill="#0d1628" stroke="none"/>',
  pause: '<path d="M9 5v14M15 5v14" stroke-width="2.6"/>', play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
  voice: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.4"/>', close: '<path d="M6 6l12 12M18 6L6 18" stroke-width="2"/>',
  ar: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M12 7l4 2.3v4.6L12 16l-4-2.1V9.3z"/>',
};
const ui = document.createElement('div');
ui.className = 'nav-ui';
ui.innerHTML = `
  <section class="nav-sheet" id="p3-nav-sheet" role="dialog" aria-labelledby="p3-nav-h" hidden>
    <div class="nav-head">${svg(I.ar, 'nav-head-ico')}<h2 id="p3-nav-h"></h2><button type="button" class="nav-x" data-nav="close">${svg(I.close)}</button></div>
    <p class="hint nav-pickhint"></p>
    <div class="field nav-from"><label for="p3-nav-from"></label><select id="p3-nav-from"></select></div>
    <ul class="nav-list"></ul>
    <p class="hint nav-none" hidden></p>
  </section>
  <div class="nav-bar" hidden>
    <span class="nav-bar-ico"></span>
    <div class="nav-bar-t"><span class="cap nav-bar-cap"></span><b class="nav-bar-name"></b><span class="nav-bar-meta"></span></div>
    <div class="nav-bar-acts"><button type="button" class="btn small" data-nav="change"></button><button type="button" class="btn primary" data-nav="start"></button><button type="button" class="nav-x" data-nav="close">${svg(I.close)}</button></div>
  </div>
  <div class="nav-hud" hidden>
    <div class="nav-card"><span class="nav-turn">${svg(I.arrow)}</span><div class="nav-card-t"><p class="nav-do"></p><p class="nav-sub"></p></div></div>
    <div class="nav-prog" aria-hidden="true"><span></span></div>
  </div>
  <div class="nav-ctl" hidden>
    <button type="button" class="nav-b" data-nav="pause"></button>
    <button type="button" class="nav-b nav-speed" data-nav="speed"></button>
    <button type="button" class="nav-b" data-nav="voice" aria-pressed="false"></button>
    <button type="button" class="nav-b nav-end" data-nav="end"></button>
  </div>
  <div class="nav-done" hidden>
    <span class="nav-done-ico">${svg(I.check)}</span>
    <div class="nav-done-t"><b class="nav-done-h"></b><span class="nav-done-name"></span></div>
    <div class="nav-done-acts"><button type="button" class="btn small nav-go-in" data-nav="go" hidden></button><button type="button" class="btn small" data-nav="again"></button><button type="button" class="btn primary small" data-nav="look"></button></div>
  </div>
  <div class="nav-ar" aria-hidden="true"><i></i><i></i><i></i><i></i><span class="nav-badge">${svg(I.ar)}<b>AR</b><span class="nav-badge-t"></span></span></div>
  <button type="button" class="nav-launch" data-nav="open">${svg(I.ar)}<span></span></button>`;
stage.append(ui);
const pinLabel = document.createElement('div'); pinLabel.className = 'nav-pin'; pinLabel.hidden = true; pinLabel.setAttribute('aria-hidden', 'true'); stage.append(pinLabel);
const q = s => ui.querySelector(s);
const sheet = q('.nav-sheet'), fromSel = q('#p3-nav-from'), list = q('.nav-list'), bar = q('.nav-bar'), hud = q('.nav-hud'), ctl = q('.nav-ctl'), done = q('.nav-done');

/* ---------- state ---------- */
const S = { open: false, from: null, to: null, path: null, reopen: false };
const W = { on: false, s: 0, paused: false, speedI: 1, voice: false, yaw: 0, pitch: -.15, face: null, y: 0, offY: 0, offP: 0, drag: null, lastDrag: 0, spoken: new Set(), arrived: false };
const F = { on: false, t: 0, dur: 2, a: new V3(), b: new V3(), la: new V3(), lb: new V3(), fov0: 42, fov1: 42, then: null, up: 0 };
let fovSaved = null;
const rtNow = () => K.active();
const spotName = s => (s ? (isAr() ? s.ar : s.en) : '');
const fmtD = d => tr('navM', { n: d < 10 ? Math.max(1, Math.round(d)) : d < 100 ? Math.round(d / 5) * 5 : Math.round(d / 10) * 10 });
const fmtT = d => tr('navMin', { n: Math.max(1, Math.round(d / PACE / 60)) });
const announce = msg => { const a = $('#announce'); if (a) { a.textContent = ''; setTimeout(() => (a.textContent = msg), 30); } };
function say(text) {
  if (!W.voice || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text); u.lang = isAr() ? 'ar-AE' : 'en-GB';
  const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(isAr() ? 'ar' : 'en')); if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const cap = s => (isAr() ? s : s.charAt(0).toUpperCase() + s.slice(1));

function graph() { const rt = rtNow(); return rt ? graphFor(rt) : null; }
function spot(id) { const g = graph(); return g && g.spots.find(s => s.id === id); }

/* ---------- picker ---------- */
function renderSheet() {
  const g = graph();
  q('#p3-nav-h').textContent = tr('navTitle');
  q('.nav-pickhint').textContent = tr('navPick');
  q('.nav-from label').textContent = tr('navFrom');
  sheet.querySelectorAll('[data-nav="close"]').forEach(b => b.setAttribute('aria-label', tr('navClose')));
  bar.querySelector('[data-nav="close"]').setAttribute('aria-label', tr('navClose'));
  const none = q('.nav-none'); none.textContent = tr('navNone'); none.hidden = !!g;
  q('.nav-from').hidden = !g; q('.nav-pickhint').hidden = !g;
  if (!g) { list.innerHTML = ''; return; }
  if (!g.N[S.from] || !g.spots.some(s => s.id === S.from)) S.from = g.R.from;
  fromSel.innerHTML = g.spots.map(s => `<option value="${s.id}"${s.id === S.from ? ' selected' : ''}>${esc(spotName(s))}</option>`).join('');
  list.innerHTML = g.spots.filter(s => s.id !== S.from).map(s => {
    const r = shortest(g, S.from, s.id); if (!r) return '';
    return `<li><button type="button" class="nav-item" data-spot="${s.id}"${s.id === S.to ? ' aria-current="true"' : ''}>
      <span class="nav-ico">${svg(ICON[s.kind] || ICON.path)}</span><span class="nav-item-t"><b>${esc(spotName(s))}</b><span>${esc(tr('navMeta', { d: fmtD(r.d), t: fmtT(r.d) }))}</span></span><span class="nav-chev" aria-hidden="true">›</span></button></li>`;
  }).join('');
}
function renderBar() {
  const s = spot(S.to); if (!s || !S.path) return;
  q('.nav-bar-ico').innerHTML = svg(ICON[s.kind] || ICON.path);
  q('.nav-bar-cap').textContent = tr('navPreview');
  q('.nav-bar-name').textContent = spotName(s);
  q('.nav-bar-meta').textContent = `${tr('navFrom')} ${spotName(spot(S.from))} · ${tr('navMeta', { d: fmtD(S.path.L), t: fmtT(S.path.L) })}`;
  bar.querySelector('[data-nav="change"]').textContent = tr('navChange');
  bar.querySelector('[data-nav="start"]').textContent = tr('navStart');
}
function open() {
  if (!rtNow()) return;
  K.explore(); S.open = true; S.to = null; S.path = null; clearRoute();
  launch.setAttribute('aria-pressed', 'true'); stage.classList.add('nav-on');
  renderSheet(); showPanel('sheet'); standAtStart();
  const first = list.querySelector('button') || fromSel; if (first) first.focus({ preventScroll: true });
}
// indoors the visitor stands where the route begins, at eye level, facing the way out of that spot
function standAtStart() {
  const rt = rtNow(), g = graph(); if (!rt || !rt.walk || !g || !g.N[S.from]) return;
  const n = g.N[S.from], nb = g.N[Object.keys(g.adj[S.from])[0]], y = (g.R.y || 0) + EYE;
  camera.position.set(n.x, y, n.z); controls.target.set(nb.x, y - .3, nb.z); camera.lookAt(controls.target);
  K.explore(true);
}
function close(fromEngine) {
  if (!S.open && !fx) return;
  stopWalk(); S.open = false; S.to = null; S.path = null; clearRoute(); restoreFov();
  launch.setAttribute('aria-pressed', 'false'); stage.classList.remove('nav-on', 'nav-live');
  showPanel(null); if (window.speechSynthesis) speechSynthesis.cancel();
  if (!fromEngine && K.mode() === 'guide') K.stopGuide();
}
function showPanel(which) {
  sheet.hidden = which !== 'sheet'; bar.hidden = which !== 'bar';
  hud.hidden = ctl.hidden = which !== 'walk'; done.hidden = which !== 'done';
}
function choose(id) {
  const rt = rtNow(), g = graph(); if (!g) return;
  S.to = id; S.path = buildPath(rt, g, S.from, id);
  if (!S.path) return;
  drawRoute(rt, S.path, g.R.beam);
  renderBar(); showPanel('bar');
  bar.querySelector('[data-nav="start"]').focus({ preventScroll: true });
  preview();
}

/* ---------- camera: preview, fly, walk ---------- */
const handle = { update: guideUpdate, end: () => close(true) };
function fly(pos, look, dur, fov, then) {
  if (fovSaved === null) fovSaved = camera.fov;
  F.a.copy(camera.position); F.b.copy(pos); F.la.copy(controls.target); F.lb.copy(look);
  F.fov0 = camera.fov; F.fov1 = fov; F.t = 0; F.dur = K.still() ? .001 : dur; F.then = then; F.on = true;
  F.up = Math.min(30, F.a.distanceTo(F.b) * .18);
  K.startGuide(handle);
}
function preview() {
  const rt = rtNow(), p = S.path;
  if (rt.walk) {   // indoors: stand at the start and look down the route
    const a = sampleAt(p, 0, new V3()), b = sampleAt(p, Math.min(p.L, 6), new V3());
    fly(new V3(a.x, a.y + EYE, a.z), new V3(b.x, a.y + EYE - .5, b.z), 1.6, FOV_AR, () => { F.on = false; W.yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z)); W.y = a.y + EYE; holdLook(); });
    return;
  }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9;
  for (let i = 0; i < p.n; i++) { x0 = Math.min(x0, p.xs[i]); x1 = Math.max(x1, p.xs[i]); z0 = Math.min(z0, p.zs[i]); z1 = Math.max(z1, p.zs[i]); y0 = Math.min(y0, p.ys[i]); }
  const c = new V3((x0 + x1) / 2, y0, (z0 + z1) / 2), ext = Math.max(x1 - x0, z1 - z0, 26);
  const fov = THREE.MathUtils.degToRad(42), env = rt.env;
  let dist = (ext * .62 + 6) / Math.tan(fov / 2) / Math.min(1, camera.aspect);
  dist = Math.max(env.minDist * 1.2, Math.min(env.maxDist * .9, dist));
  let ax = p.xs[0] - c.x, az = p.zs[0] - c.z; if (Math.hypot(ax, az) < 2) { ax = camera.position.x - c.x; az = camera.position.z - c.z; }
  const yaw = Math.atan2(ax, az) + .5, el = .92, al = Math.hypot(ax, az) || 1;
  c.x += ax / al * ext * .16; c.z += az / al * ext * .16; dist *= 1.08;   // leave room for the route bar
  const pos = new V3(c.x + Math.sin(yaw) * Math.cos(el) * dist, c.y + Math.sin(el) * dist, c.z + Math.cos(yaw) * Math.cos(el) * dist);
  fly(pos, c, 1.9, 42, () => { F.on = false; K.stopGuide(); });
}
function holdLook() { W.on = false; W.offY = W.offP = 0; W.face = null; W.pitch = -.15; }
function startWalk() {
  const p = S.path; if (!p) return;
  const a = sampleAt(p, 0, new V3()), b = sampleAt(p, Math.min(p.L, 6), new V3());
  W.s = 0; W.paused = false; W.arrived = false; W.spoken.clear(); W.offY = W.offP = 0; W.face = null; W.pitch = -.15;
  W.yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z)); W.y = a.y + EYE;
  stage.classList.add('nav-live'); showPanel('walk'); renderCtl(); renderHud(true);
  const look = new V3(b.x, a.y + EYE - .9, b.z);
  fly(new V3(a.x, a.y + EYE, a.z), look, 2.2, FOV_AR, () => { F.on = false; W.on = true; });
  const name = spotName(spot(S.to)), msg = tr('navStarted', { name, d: fmtD(p.L) });
  announce(msg); say(msg);
  canvas.focus({ preventScroll: true });
}
function stopWalk() { W.on = false; F.on = false; W.drag = null; }
function restoreFov() { if (fovSaved !== null) { camera.fov = fovSaved; camera.updateProjectionMatrix(); fovSaved = null; } }
const fwd = new V3(), here = new V3(), ahead = new V3();
function guideUpdate(dt) {
  if (F.on) {
    F.t = Math.min(1, F.t + dt / F.dur); const e = ease(F.t);
    camera.position.lerpVectors(F.a, F.b, e); camera.position.y += Math.sin(Math.PI * e) * F.up;
    controls.target.lerpVectors(F.la, F.lb, e); camera.lookAt(controls.target);
    camera.fov = F.fov0 + (F.fov1 - F.fov0) * e; camera.updateProjectionMatrix();
    if (F.t >= 1 && F.then) { const f = F.then; F.then = null; f(); }
    return;
  }
  const p = S.path; if (!p) return;
  if (W.on && !W.paused && !W.arrived) W.s = Math.min(p.L, W.s + SIM * SPEEDS[W.speedI] * dt);
  sampleAt(p, W.s, here);
  if (W.on) {
    sampleAt(p, Math.min(p.L, W.s + 5), ahead);
    if (Math.hypot(ahead.x - here.x, ahead.z - here.z) > .4) W.yaw = angLerp(W.yaw, Math.atan2(-(ahead.x - here.x), -(ahead.z - here.z)), damp(3.2, dt));
    W.y += (here.y + EYE - W.y) * damp(5, dt);
    camera.position.set(here.x, W.y, here.z);
    if (!W.arrived && W.s >= p.L - 1e-3) arrive();
  }
  if (!W.drag && performance.now() - W.lastDrag > 1600 && !W.arrived) { W.offY *= Math.exp(-dt * 2.2); W.offP *= Math.exp(-dt * 2.2); }
  if (W.face) { W.yaw = angLerp(W.yaw, W.face.yaw, damp(2.2, dt)); W.pitch += (W.face.pitch - W.pitch) * damp(2.2, dt); }
  camera.rotation.set(W.pitch + W.offP, W.yaw + W.offY, 0, 'YXZ');
  camera.getWorldDirection(fwd); controls.target.copy(camera.position).addScaledVector(fwd, 4);
  if (W.on) renderHud();
}
/* look around while walking: drag turns the head, it eases back when let go */
canvas.addEventListener('pointerdown', e => { if (K.mode() !== 'guide' || F.on) return; W.drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointermove', e => {
  const d = W.drag; if (!d) return;
  W.offY -= (e.clientX - d.x) * .004; W.offP = Math.max(-.9, Math.min(.9, W.offP - (e.clientY - d.y) * .004));
  d.x = e.clientX; d.y = e.clientY; W.lastDrag = performance.now();
});
addEventListener('pointerup', () => { if (W.drag) { W.drag = null; W.lastDrag = performance.now(); } });
canvas.addEventListener('keydown', e => { if (W.on && e.code === 'Space') { e.preventDefault(); togglePause(); } });

/* ---------- live directions ---------- */
let hudKey = '';
function nextMove(p, s) { return p.moves.find(m => m.s > s - .5); }
function renderHud(force) {
  const p = S.path; if (!p) return;
  const s = W.s, left = p.L - s, m = nextMove(p, s), name = spotName(spot(S.to));
  let main, rot = 0, kind = 'arrow';
  if (m && m.s - s < left - 3) {
    const d = m.s - s, act = tr(m.act);
    main = d < 9 ? cap(act) : d > 60 && !m.turn ? tr('navGoFor', { d: fmtD(d) }) : tr('navIn', { d: fmtD(d), act });
    if (m.turn && d < 45) rot = Math.max(-135, Math.min(135, m.ang * 180 / Math.PI));
    if (m.act === 'navDown') rot = 180;
    const key = m.s + m.act;
    if (d < 16 && !W.spoken.has(key)) { W.spoken.add(key); say(d < 9 ? cap(act) : tr('navIn', { d: fmtD(d), act })); }
  } else if (left > 12) main = tr('navGoFor', { d: fmtD(left) });
  else { main = tr('navAhead', { name }); kind = 'pin'; }
  const sub = `${name} · ${tr('navLeft', { d: fmtD(left) })}`;
  const k = main + '|' + sub + '|' + rot + kind;
  if (k !== hudKey || force) {
    hudKey = k;
    q('.nav-do').textContent = main; q('.nav-sub').textContent = sub;
    const ico = q('.nav-turn'); ico.innerHTML = svg(kind === 'pin' ? I.pin : I.arrow); ico.style.setProperty('--rot', rot + 'deg');
  }
  q('.nav-prog span').style.transform = `scaleX(${Math.min(1, s / p.L)})`;
}
function renderCtl() {
  const b = n => ctl.querySelector(`[data-nav="${n}"]`);
  b('pause').innerHTML = svg(W.paused ? I.play : I.pause); b('pause').setAttribute('aria-label', tr(W.paused ? 'navResume' : 'navPause')); b('pause').title = tr(W.paused ? 'navResume' : 'navPause');
  b('speed').textContent = SPEEDS[W.speedI] + '×'; b('speed').setAttribute('aria-label', tr('navSpeed', { n: SPEEDS[W.speedI] })); b('speed').title = tr('navSpeed', { n: SPEEDS[W.speedI] });
  b('voice').innerHTML = svg(W.voice ? I.voice : I.mute); b('voice').setAttribute('aria-label', tr('navVoice')); b('voice').title = tr('navVoice'); b('voice').setAttribute('aria-pressed', String(W.voice));
  b('end').textContent = tr('navEnd');
  q('.nav-badge-t').textContent = tr('navLive');
}
function togglePause() { W.paused = !W.paused; renderCtl(); }
function renderDone() {
  const s = spot(S.to); if (!s) return;
  q('.nav-done-h').textContent = tr('navArrived'); q('.nav-done-name').textContent = spotName(s);
  const go = q('[data-nav="go"]'); go.hidden = !s.go; if (s.go) go.textContent = tr(s.go === 'souqin' ? 'navInside' : 'navOutside');
  q('[data-nav="again"]').textContent = tr('navAgain'); q('[data-nav="look"]').textContent = tr('navLook');
}
function arrive() {
  W.arrived = true;
  const s = spot(S.to), name = spotName(s);
  renderDone(); hud.hidden = ctl.hidden = true; done.hidden = false;
  if (s.look) {   // turn to what the visitor came to see
    const [lx, ly, lz] = s.look, c = camera.position, dx = lx - c.x, dz = lz - c.z;
    W.face = { yaw: Math.atan2(-dx, -dz), pitch: Math.max(-.6, Math.min(1.1, Math.atan2(ly - c.y, Math.hypot(dx, dz)))) };
  }
  const msg = tr('navArrivedAt', { name }); announce(msg); say(msg);
  q('[data-nav="look"]').focus({ preventScroll: true });
}

/* ---------- buttons ---------- */
ui.addEventListener('click', e => {
  const b = e.target.closest('[data-nav], [data-spot]'); if (!b) return;
  if (b.dataset.spot) return choose(b.dataset.spot);
  switch (b.dataset.nav) {
    case 'open': return S.open ? close() : open();
    case 'close': return close();
    case 'change': S.to = null; clearRoute(); restoreFov(); renderSheet(); showPanel('sheet'); if (K.mode() === 'guide') K.stopGuide(); return;
    case 'start': return startWalk();
    case 'pause': return togglePause();
    case 'speed': W.speedI = (W.speedI + 1) % SPEEDS.length; return renderCtl();
    case 'voice': W.voice = !W.voice; if (!W.voice && window.speechSynthesis) speechSynthesis.cancel(); return renderCtl();
    case 'end': return close();
    case 'again': { const at = S.to; stopWalk(); restoreFov(); stage.classList.remove('nav-live'); S.from = at; S.to = null; clearRoute(); renderSheet(); showPanel('sheet'); if (K.mode() === 'guide') K.stopGuide(); return; }
    case 'look': return close();
    case 'go': { const s = spot(S.to); close(); S.reopen = s.at || true; S3.show(s.go); return; }
  }
});
fromSel.addEventListener('change', () => { S.from = fromSel.value; S.to = null; clearRoute(); renderSheet(); standAtStart(); });
launch.addEventListener('click', () => (S.open ? close() : open()));
// the tour and the view buttons take the camera back: put the guide away
for (const sel of ['#p3-tour', '#p3-views']) $(sel).addEventListener('click', () => { if (S.open) close(true); });
// a new place: label the launcher once the translator is in, and carry an open guide over to the new place
document.addEventListener('s3:place', () => {
  q('.nav-launch span').textContent = tr('guide3d'); renderCtl();
  const again = S.reopen; S.reopen = false;
  if (typeof again === 'string') S.from = again;
  if (again || S.open) open();
});
document.addEventListener('s3:relabel', () => {
  q('.nav-launch span').textContent = tr('guide3d'); renderCtl();
  if (!sheet.hidden) renderSheet(); if (!bar.hidden) renderBar(); if (!hud.hidden) renderHud(true);
  if (!done.hidden) renderDone();
});
addEventListener('keydown', e => { if (e.key === 'Escape' && S.open && !document.querySelector('#p3-frame.full')) close(); });

/* ---------- route checks for authors ---------- */
// S3.navPaths(): every route from the default start in this place, with length, heights and directions
S3.navPaths = () => {
  const rt = rtNow(), g = rt && graphFor(rt); if (!g) return null;
  const t0 = performance.now(), out = g.spots.filter(s => s.id !== g.R.from).map(s => {
    const p = buildPath(rt, g, g.R.from, s.id); if (!p) return { to: s.id, path: null };
    return { to: s.id, L: +p.L.toFixed(1), y: [+Math.min(...p.ys).toFixed(2), +Math.max(...p.ys).toFixed(2)], moves: p.moves.map(m => m.act + '@' + m.s.toFixed(0)) };
  });
  return { ms: Math.round(performance.now() - t0), out };
};
// S3.navCheck(): lists links that run into scenery, and draws the network in red
S3.navCheck = (show = true) => {
  const rt = rtNow(), g = rt && graphFor(rt); if (!g) return 'no routes for this place';
  const solids = solidsOf(rt), F = floorsOf(rt), hits = [], lines = [], ray = new THREE.Raycaster(), o = new V3(), d = new V3();
  const done2 = new Set();
  for (const a in g.adj) for (const b in g.adj[a]) {
    const key = [a, b].sort().join('-'); if (done2.has(key)) continue; done2.add(key);
    const tag = g.adj[a][b].tag, A = g.N[a], B = g.N[b], len = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(2, Math.ceil(len / .5));
    let y = g.R.y || 0; const pts = [];
    for (let i = 0; i <= n; i++) { const x = A.x + (B.x - A.x) * i / n, z = A.z + (B.z - A.z) * i / n, h = groundAt(F, x, z, y); if (h !== null) y = h; pts.push(new V3(x, y, z)); }
    for (let i = 0; i < n && tag !== 'door'; i++) for (const hh of [.45, 1.2, 1.9]) {
      o.copy(pts[i]); o.y += hh; d.copy(pts[i + 1]).sub(pts[i]); const l = d.length(); d.normalize();
      ray.set(o, d); ray.far = l;
      const h = ray.intersectObjects(solids, false)[0];
      if (h) { hits.push({ link: key, at: h.point.toArray().map(v => +v.toFixed(1)), h: hh, what: (h.object.isInstancedMesh ? 'instanced ' : '') + h.object.geometry.type + ' #' + (h.object.material.color ? h.object.material.color.getHexString() : '') }); break; }
    }
    if (show) for (let i = 0; i < n; i++) lines.push(pts[i].clone().setY(pts[i].y + .3), pts[i + 1].clone().setY(pts[i + 1].y + .3));
  }
  if (show) {
    if (S3._navDebug) scene.remove(S3._navDebug);
    const gl = new THREE.BufferGeometry().setFromPoints(lines);
    S3._navDebug = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0xff2a2a, depthTest: false })); S3._navDebug.renderOrder = 99; scene.add(S3._navDebug);
  }
  return hits;
};
})();
