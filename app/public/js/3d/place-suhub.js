/* Al Suhub Rest Area, Khor Fakkan — a 30 m saucer-shaped viewpoint 583 m up in the Hajar Mountains */
S3.register({
  id: 'suhub', title: 'Al Suhub Rest Area', short: 'Al Suhub, Khor Fakkan', arabic: 'استراحة السحب',
  eyebrow: 'Khor Fakkan · Hajar Mountains · 2021',
  lede: 'A saucer-shaped glass viewpoint on a peak 583 m above Khor Fakkan, reached by a 5.6 km mountain road of hairpins. Its name means “the clouds”.',
  facts: [['Altitude', '583 m'], ['Diameter', '30 m'], ['Road', '5.63 km'], ['Parking', '90 cars']],
  map: 'https://maps.app.goo.gl/pie1bB7J3Ser7nCT9',
  ar: {"eyebrow": "خورفكان · جبال الحجر · 2021", "lede": "منصة مشاهدة زجاجية على شكل صحن فوق قمة ترتفع 583 مترًا عن خورفكان، يُصعد إليها عبر طريق جبلي طوله 5.6 كم كثير المنعطفات. واسمها يعني «السحب».", "facts": [["الارتفاع", "583 م"], ["القطر", "30 م"], ["الطريق", "5.63 كم"], ["المواقف", "90 سيارة"]], "views": {"deck": "منصة المشاهدة", "saucer": "الصحن", "road": "طريق المنعطفات", "bay": "خليج خورفكان", "aerial": "الجبال", "top": "القمة من الأعلى"}, "labels": [["استراحة السحب", "583 م فوق سطح البحر"], ["منصة المشاهدة", "ممتدة فوق المنحدر"], ["الطريق الجبلي", "5.6 كم من المنعطفات"], ["نقطة إطلالة · 375 م", ""], ["خورفكان", ""], ["ميناء خورفكان", ""], ["جزيرة القرش", ""], ["خليج عُمان", ""]]},
  env: { center: [35, 583, 0], shadow: 190, sunDist: 900, fog: .000055, near: 1.5, far: 42000, minDist: 4, maxDist: 9000, fogColor: 0xc4d3dd, ground: 0x8a7a66 },
  build(a) {
    const { THREE, V3, M, T, R, pick, smooth, cv, tex, box, plane, cyl, dome, merge, mat4, mesh, instanced, add, water, palms, trees, lamps, city, cars, crowd, pointLights, glow, onUpdate } = a;

    /* ---- noise & height field ---- */
    const hash = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };
    function vn(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); const p = hash(xi, zi), q = hash(xi + 1, zi), r = hash(xi, zi + 1), s = hash(xi + 1, zi + 1); return p + (q - p) * u + (r - p) * v + (p - q - r + s) * u * v; }
    function fbm(x, z, o = 5) { let s = 0, amp = .5, f = 1; for (let i = 0; i < o; i++) { s += amp * vn(x * f, z * f); f *= 2.03; amp *= .5; } return s; }
    function ridged(x, z, o = 6) { let s = 0, amp = .55, f = 1, w = 1; for (let i = 0; i < o; i++) { let n = 1 - Math.abs(vn(x * f, z * f) * 2 - 1); n *= n * w; w = Math.min(1, Math.max(0, n * 1.6)); s += n * amp; f *= 2.1; amp *= .5; } return s; }
    const coastX = z => 2250 + 260 * Math.sin(z / 1400 + .6) - 520 * Math.exp(-(((z - 150) / 800) ** 2));
    const ISL = { x: coastX(320) + 720, z: 320 };
    function baseH(x, z) {
      const dc = coastX(z) - x, north = smooth(-600, -1300, z);
      const mask = smooth(380 - north * 300, 1300 - north * 700, dc);
      const mount = 560 * ridged(x * .00052 + 3.1, z * .00052 + 7.7) + 160 * fbm(x * .0015 + 9, z * .0015 + 2, 4) - 70;
      const plain = 3 + 9 * fbm(x * .004, z * .004, 3);
      let h = plain + Math.max(0, mount - plain) * mask;
      const d = Math.hypot(x, z), bump = Math.exp(-((d / 760) ** 2));
      const peak = 576 - .0012 * d * d + 30 * (fbm(x * .01, z * .01, 3) - .5);
      h += (Math.max(h, peak) - h) * bump;
      const sea = -4 - 30 * smooth(0, 500, -dc);
      h = sea + (h - sea) * smooth(-40, 60, dc);
      const di = Math.hypot(x - ISL.x, z - ISL.z);
      return Math.max(h, 72 * Math.exp(-((di / 115) ** 2)) - 8 + 12 * fbm(x * .02, z * .02, 2));
    }
    const PLAT = { x: 0, z: 0, r: 70, y: 583 };

    /* ---- mountain road (switchbacks) ---- */
    const ctrl = [[1520, 250], [1300, 230], [1120, 170], [980, 235], [860, 120], [985, 15], [820, -45], [700, 80], [785, 205], [620, 245], [520, 110], [605, -10], [460, -65], [360, 60], [430, 185], [290, 205], [215, 80], [285, -40], [200, -150], [100, -172], [22, -64]];
    const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new V3(x, 0, z)), false, 'centripetal');
    const RL = curve.getLength(), RN = Math.round(RL / 5);
    const road = curve.getSpacedPoints(RN);
    const y0 = baseH(1520, 250) + .5;
    road.forEach((p, i) => { const t = i / RN; p.y = y0 + (PLAT.y - y0) * (t < .06 ? t * t / .12 : t - .03) / .97; });
    road[road.length - 1].y = PLAT.y;
    const cellS = 60, grid = new Map();
    for (let i = 0; i < road.length - 1; i++) {
      const p = road[i], q = road[i + 1];
      for (const [x, z] of [[p.x, p.z], [q.x, q.z]]) { const k = Math.floor(x / cellS) + ',' + Math.floor(z / cellS); if (!grid.has(k)) grid.set(k, new Set()); grid.get(k).add(i); }
    }
    function roadInfo(x, z) {
      const cx = Math.floor(x / cellS), cz = Math.floor(z / cellS); let best = 1e9, by = 0;
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        const set = grid.get((cx + dx) + ',' + (cz + dz)); if (!set) continue;
        for (const i of set) {
          const p = road[i], q = road[i + 1], vx = q.x - p.x, vz = q.z - p.z, l2 = vx * vx + vz * vz;
          const t = Math.max(0, Math.min(1, ((x - p.x) * vx + (z - p.z) * vz) / l2)), px = p.x + vx * t, pz = p.z + vz * t, d = Math.hypot(x - px, z - pz);
          if (d < best) { best = d; by = p.y + (q.y - p.y) * t; }
        }
      }
      return { d: best, y: by };
    }
    function finalH(x, z) {
      let h = baseH(x, z);
      const dp = Math.hypot(x - PLAT.x, z - PLAT.z);
      h = PLAT.y + (h - PLAT.y) * smooth(PLAT.r, PLAT.r + 26, dp);
      const ri = roadInfo(x, z);
      if (ri.d < 90) h = ri.y - .4 + (h - ri.y + .4) * smooth(14, 85, ri.d);
      return h;
    }

    /* ---- terrain: detailed core + coarse outer ring ---- */
    const rockCols = [new THREE.Color(0x6b5444), new THREE.Color(0x4f4943), new THREE.Color(0x8a7560), new THREE.Color(0x5d4b3c)];
    const sandC = new THREE.Color(0xd8c49c), plainC = new THREE.Color(0xb7a585), greenC = new THREE.Color(0x6a7647), tmpC = new THREE.Color();
    const rockDetail = a.rep(T.rock, 1 / 30, 1 / 30); rockDetail.encoding = THREE.LinearEncoding;
    const terrainM = new THREE.MeshStandardMaterial({ vertexColors: true, map: rockDetail, color: new THREE.Color(1.9, 1.9, 1.9), roughness: 1 });
    function terrain(size, seg, cx, cz, hf, lower) {
      const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
      const pos = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); let h = hf(x, z); if (lower && lower(x, z)) h -= 60; pos.setY(i, h); uv.setXY(i, x, z); }
      g.computeVertexNormals();
      const nrm = g.attributes.normal, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i), slope = 1 - nrm.getY(i), dc = coastX(z) - x;
        const n = fbm(x * .006, z * .006, 3);
        const ct = Math.min(2.999, Math.max(0, (n - .2) * 5)), ci = ct | 0;
        tmpC.copy(rockCols[ci]).lerp(rockCols[ci + 1], ct - ci).lerp(rockCols[1], Math.min(1, slope * 1.2));
        tmpC.lerp(plainC, 1 - smooth(25, 90, h));
        if (h < 4 && dc < 90) tmpC.copy(sandC);
        if (slope < .12 && h > 15 && h < 300 && fbm(x * .02, z * .02, 2) > .58) tmpC.lerp(greenC, .6);
        if (h < -1) tmpC.copy(sandC).multiplyScalar(.7);
        tmpC.convertSRGBToLinear();
        col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    }
    const CORE = { size: 6000, seg: 400, cx: 900, cz: 0 };
    const coreG = terrain(CORE.size, CORE.seg, CORE.cx, CORE.cz, finalH);
    const core = mesh(coreG, terrainM); core.castShadow = true;
    const inCore = (x, z) => Math.abs(x - CORE.cx) < CORE.size / 2 - 40 && Math.abs(z - CORE.cz) < CORE.size / 2 - 40;
    mesh(terrain(32000, 128, 900, 0, baseH, inCore), terrainM, { cast: false });
    water(40000, 40000, 6000, 0, 0, { size: .9, color: 0x0b5c6e, distortion: 3.2, res: 512 });

    /* ---- road ribbon, barriers, retaining walls, lamps ---- */
    const roadTex = (() => {
      const [c, g] = cv(128, 256); g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, 128, 256); a.speck(g, 128, 256, 6000, .4, ['#2a2a2b', '#57575a']);
      g.fillStyle = '#efece2'; g.fillRect(6, 0, 4, 256); g.fillRect(118, 0, 4, 256); g.fillStyle = '#e8c44a'; g.fillRect(61, 0, 6, 140);
      const t = tex(c, 1, 1); t.wrapS = THREE.ClampToEdgeWrapping; return t;
    })();
    const rp = [], ruv = [], ridx = [], bp = [], bidx = [], wp = [], widx = [];
    let dist = 0;
    const norms = road.map((p, i) => { const q = road[Math.min(i + 1, road.length - 1)], o = road[Math.max(i - 1, 0)]; const t = new V3(q.x - o.x, 0, q.z - o.z).normalize(); return new V3(-t.z, 0, t.x); });
    road.forEach((p, i) => {
      if (i) dist += p.distanceTo(road[i - 1]);
      const n = norms[i], y = p.y + .3;
      rp.push(p.x - n.x * 5, y, p.z - n.z * 5, p.x + n.x * 5, y, p.z + n.z * 5); ruv.push(0, dist / 20, 1, dist / 20);
      for (const s of [-1, 1]) { bp.push(p.x + n.x * s * 5.3, y, p.z + n.z * s * 5.3, p.x + n.x * s * 5.3, y + .85, p.z + n.z * s * 5.3); wp.push(p.x + n.x * s * 5.6, y + .1, p.z + n.z * s * 5.6, p.x + n.x * s * 7.5, y - 14, p.z + n.z * s * 7.5); }
      if (i < road.length - 1) {
        const k = i * 2; ridx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        for (const o of [0, 2]) { const b = i * 4 + o; bidx.push(b, b + 4, b + 1, b + 1, b + 4, b + 5); widx.push(b, b + 4, b + 1, b + 1, b + 4, b + 5); }
      }
    });
    const ribbon = (p, idx, uvs) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs || new Array(p.length / 3 * 2).fill(0), 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    mesh(ribbon(rp, ridx, ruv), new THREE.MeshStandardMaterial({ map: roadTex, roughness: .9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), { cast: false });
    mesh(ribbon(bp, bidx), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: .8, side: THREE.DoubleSide }), { cast: false });
    mesh(ribbon(wp, widx), new THREE.MeshStandardMaterial({ map: a.rep(T.coral, 1 / 6, 1 / 6), color: 0x9a8670, roughness: 1, side: THREE.DoubleSide }), { cast: false });
    const lampM = [];
    for (let i = 4; i < road.length; i += 10) { const p = road[i], n = norms[i], s = (i / 10) % 2 ? 1 : -1; lampM.push(mat4(p.x + n.x * s * 6, p.y, p.z + n.z * s * 6, Math.atan2(-n.x * s, -n.z * s))); }
    lamps(lampM);
    // traffic up and down the mountain
    const lanePts = side => road.filter((_, i) => i % 3 === 0).map((p, j) => { const i = j * 3, n = norms[i]; return new V3(p.x + n.x * side * 2.4, p.y + .3, p.z + n.z * side * 2.4); });
    const up = lanePts(1), down = lanePts(-1).reverse();
    // parking on the summit (90 spaces)
    const parked = [];
    for (let r = 0; r < 6; r++) for (let i = 0; i < 15; i++) if (R() < .7) parked.push(mat4(-57 + i * 2.7, PLAT.y, -25 + r * 10 + (r % 2 ? -2.4 : 2.4), r % 2 ? Math.PI / 2 : -Math.PI / 2));
    cars(parked, [{ pts: up, n: 9, speed: [9, 14] }, { pts: down, n: 9, speed: [9, 14] }]);

    /* ---- summit: plaza, saucer building, deck, fountains ---- */
    const Y = PLAT.y, BX = 10;
    const plaza = new THREE.CircleGeometry(PLAT.r - 6, 64); plaza.rotateX(-Math.PI / 2);
    const pu = plaza.attributes.uv, pp = plaza.attributes.position; for (let i = 0; i < pu.count; i++) pu.setXY(i, pp.getX(i), pp.getZ(i));
    plaza.translate(PLAT.x, Y + .05, PLAT.z); mesh(plaza, M.paver, { cast: false });
    a.flat(42, 58, -38, 0, Y + .08, M.asphalt); a.flat(40, 56, -38, 0, Y + .1, new THREE.MeshStandardMaterial({ map: a.rep(T.stall, 1 / 2.9, 1 / 11), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const stoneB = new THREE.MeshStandardMaterial({ map: T.coral, color: 0xb9a68a, roughness: .95 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: .25, metalness: .1, envMapIntensity: 1.2 });
    const glassB = new THREE.MeshStandardMaterial({ color: 0x23404d, metalness: .6, roughness: .08, envMapIntensity: 1.5, emissive: 0xffc27a, emissiveIntensity: 0, side: THREE.DoubleSide });
    glow(glassB, 1.3, .02);
    const clearGlass = new THREE.MeshStandardMaterial({ color: 0xbfe3ee, transparent: true, opacity: .28, roughness: .05, metalness: .2, side: THREE.DoubleSide, depthWrite: false });
    const steel = new THREE.MeshStandardMaterial({ color: 0xd8dadc, metalness: .8, roughness: .3 });
    mesh(cyl(19.5, 20.5, 1.2, 64, BX, Y + .6, 0), stoneB);
    mesh(cyl(16.8, 16.8, 4.6, 64, BX, Y + 3.5, 0, true), glassB, { cast: false });
    mesh(cyl(16.6, 16.6, 4.6, 64, BX, Y + 3.5, 0), new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: .9 }));
    mesh(cyl(20.2, 20, .7, 64, BX, Y + 6.15, 0), white);
    mesh(cyl(19.9, 19.9, 1.1, 64, BX, Y + 7.05, 0, true), clearGlass, { cast: false, receive: false });
    mesh(cyl(13.8, 13.8, 4.4, 64, BX, Y + 8.7, 0, true), glassB, { cast: false });
    mesh(cyl(13.6, 13.6, 4.4, 64, BX, Y + 8.7, 0), new THREE.MeshStandardMaterial({ color: 0x40362c, roughness: .9 }));
    const mull = [], mull2 = [];
    for (let i = 0; i < 40; i++) { const an = i / 40 * Math.PI * 2; mull.push(mat4(BX + Math.sin(an) * 16.9, Y + 3.5, Math.cos(an) * 16.9, an)); }
    for (let i = 0; i < 32; i++) { const an = i / 32 * Math.PI * 2 + .05; mull2.push(mat4(BX + Math.sin(an) * 13.9, Y + 8.7, Math.cos(an) * 13.9, an)); }
    instanced(box(.18, 4.6, .3), steel, mull, { cast: false }); instanced(box(.16, 4.4, .28), steel, mull2, { cast: false });
    // the "flying saucer" GRP roof
    const saucer = new THREE.SphereGeometry(18.5, 72, 24); saucer.scale(1, .2, 1); saucer.translate(BX, Y + 11.6, 0); mesh(saucer, white);
    const rim = new THREE.TorusGeometry(18.3, .22, 8, 96); rim.rotateX(Math.PI / 2); rim.translate(BX, Y + 11.4, 0);
    const ledM = new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x7fdcff, emissiveIntensity: 0 }); glow(ledM, 3, .2);
    mesh(rim, ledM, { cast: false });
    mesh(merge([cyl(2.4, 2.8, 1.4, 24, BX, Y + 15.2, 0), dome(2.4, BX, Y + 15.9, 0, 24, .5), new THREE.CylinderGeometry(.08, .1, 4, 6).translate(BX, Y + 18.5, 0)]), white);
    // cantilevered viewing deck towards the city
    const DX0 = BX + 20, DL = 46, DE = DX0 + DL + 4;
    const deck = merge([box(DL, .7, 14, DX0 + DL / 2, Y + .1, 0), cyl(9, 9, .7, 48, DE, Y + .1, 0)]);
    mesh(deck, new THREE.MeshStandardMaterial({ map: T.marble, color: 0x8f8a82, roughness: .5 }));
    const balG = merge([box(DL - 6, 1.1, .05, DX0 + (DL - 6) / 2, Y + 1, -7), box(DL - 6, 1.1, .05, DX0 + (DL - 6) / 2, Y + 1, 7), cyl(9, 9, 1.1, 48, DE, Y + 1, 0, true)]);
    mesh(balG, clearGlass, { cast: false, receive: false });
    mesh(merge([new THREE.TorusGeometry(9, .05, 4, 64).rotateX(Math.PI / 2).translate(DE, Y + 1.55, 0), box(DL - 6, .06, .06, DX0 + (DL - 6) / 2, Y + 1.55, -7), box(DL - 6, .06, .06, DX0 + (DL - 6) / 2, Y + 1.55, 7)]), steel, { cast: false });
    const struts = []; for (const z of [-6, 6]) for (const x of [DX0 + 26, DX0 + 40]) struts.push(box(1, 30, 1, 0, 0, 0).rotateZ(.6).translate(x - 8, Y - 12, z));
    mesh(merge(struts), steel);
    // fountains, benches, flag, lamps
    const poolM = new THREE.MeshStandardMaterial({ color: 0x2b86a0, roughness: .04, metalness: .2, envMapIntensity: 1.7 });
    const jetM = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, transparent: true, opacity: .55, roughness: .1 });
    for (const z of [-34, 34]) {
      mesh(cyl(6, 6.2, .8, 32, 5, Y + .4, z), M.marble);
      add(new THREE.Mesh(new THREE.CircleGeometry(5.6, 32).rotateX(-Math.PI / 2).translate(5, Y + .82, z), poolM));
      const jets = []; for (let i = 0; i < 10; i++) { const an = i / 10 * Math.PI * 2; jets.push(new THREE.ConeGeometry(.1, 1.6, 6).translate(5 + Math.cos(an) * 2.4, Y + 1.6, z + Math.sin(an) * 2.4)); }
      jets.push(new THREE.ConeGeometry(.25, 3.2, 8).translate(5, Y + 2.4, z)); add(new THREE.Mesh(merge(jets), jetM));
    }
    const flagTex = (() => { const [c, g] = cv(240, 120); g.fillStyle = '#00843d'; g.fillRect(60, 0, 180, 40); g.fillStyle = '#ffffff'; g.fillRect(60, 40, 180, 40); g.fillStyle = '#000000'; g.fillRect(60, 80, 180, 40); g.fillStyle = '#ef3340'; g.fillRect(0, 0, 60, 120); return tex(c); })();
    mesh(new THREE.CylinderGeometry(.12, .16, 22, 8).translate(-14, Y + 11, 30), steel);
    const flagG = new THREE.PlaneGeometry(8, 4, 16, 4); flagG.translate(-14 + 4, Y + 19.6, 30);
    const flag = mesh(flagG, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: .8 }), { receive: false });
    const fBase = flagG.attributes.position.array.slice();
    onUpdate((dt, t) => { const p = flagG.attributes.position; for (let i = 0; i < p.count; i++) { const x = fBase[i * 3] - (-14); p.setZ(i, fBase[i * 3 + 2] + Math.sin(x * 1.1 - t * 4) * .25 * (x / 8)); } p.needsUpdate = true; });
    const pl = []; for (let i = 0; i < 18; i++) { const an = i / 18 * Math.PI * 2; if (Math.cos(an) > .85) continue; pl.push(mat4(PLAT.x + Math.cos(an) * (PLAT.r - 9), Y, PLAT.z + Math.sin(an) * (PLAT.r - 9), Math.atan2(-Math.cos(an), -Math.sin(an)))); }
    lamps(pl);
    const benches = []; for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 1.2 - .6; benches.push(mat4(BX + Math.cos(an) * 26, Y, Math.sin(an) * 26, -an + Math.PI / 2)); }
    instanced(merge([box(2.4, .12, .6, 0, .48, 0), box(.12, .45, .5, -1, .22, 0), box(.12, .45, .5, 1, .22, 0)]), M.wood, benches);
    crowd([[DX0 + 2, -4, DE - 14, -5, Y + .45], [DX0 + 2, 4, DE - 14, 4, Y + .45], [BX - 22, -20, BX - 22, 20, Y], [-20, -36, 20, -36, Y], [-20, 36, 20, 36, Y], [BX + 18, -24, BX + 18, 24, Y + 6.5]], 48);
    pointLights([[DX0 + 30, Y + 3, 0, 0xffe0b0, 30, 1.4], [BX - 24, Y + 3, 0, 0xffd29a, 35, 1.6], [5, Y + 3, -34, 0xbfe8ff, 18, 1.2], [5, Y + 3, 34, 0xbfe8ff, 18, 1.2]]);

    /* ---- lower lookouts on the way up ---- */
    const lookouts = [];
    for (const target of [110, 200, 240, 375, 470]) {
      let bi = 0, bd = 1e9; road.forEach((p, i) => { const d = Math.abs(p.y - target); if (d < bd) { bd = d; bi = i; } });
      const p = road[bi], n = norms[bi];
      const s = baseH(p.x + n.x * 30, p.z + n.z * 30) < baseH(p.x - n.x * 30, p.z - n.z * 30) ? 1 : -1;
      const x = p.x + n.x * s * 16, z = p.z + n.z * s * 16, y = p.y;
      lookouts.push([x, y, z, target]);
      mesh(merge([cyl(9, 9, .8, 32, x, y, z), cyl(1.4, 1.8, 40, 12, x, y - 20.3, z), box(10, .6, 4, p.x + n.x * s * 9, y, p.z + n.z * s * 9)]), M.stone);
      mesh(cyl(9, 9, 1.1, 32, x, y + .95, z, true), clearGlass, { cast: false, receive: false });
      mesh(merge([new THREE.CylinderGeometry(.12, .12, 3.4, 6).translate(x, y + 2.1, z), new THREE.ConeGeometry(4.2, 1.2, 6).translate(x, y + 4.2, z)]), white);
    }

    /* ---- Khor Fakkan: city, corniche, port, island ---- */
    const cells = [];
    for (let x = 1100; x <= 2700; x += 36) for (let z = -1300; z <= 1700; z += 36) {
      const px = x + (R() - .5) * 10, pz = z + (R() - .5) * 10, dc = coastX(pz) - px;
      if (dc < 80 || dc > 900 || R() < .2) continue;
      if (pz < -560 && pz > -1250 && dc < 400) continue;
      const h = baseH(px, pz); if (h < 1 || h > 34) continue;
      if (roadInfo(px, pz).d < 26) continue;
      cells.push({ x: px, z: pz, y: h - .5, r: R() < .5 ? 0 : 1.57, k: (R() * (dc < 300 ? 6 : 4)) | 0 });
    }
    city(cells, [[14, 8, 14], [18, 11, 16], [20, 14, 18], [16, 17, 16], [22, 24, 20], [24, 34, 22]], [0xf2eee6, 0xe8dfcf, 0xdcd1bd, 0xf6f4ef, 0xe5d8c0]);
    const cp = [], cl = [];
    for (let z = -540; z <= 1500; z += 16) { const x = coastX(z) - 38; cp.push([x, z, Math.max(1, baseH(x, z))]); if (z % 48 === 0) cl.push(mat4(x - 6, Math.max(1, baseH(x - 6, z)), z, -Math.PI / 2)); }
    palms(cp); lamps(cl);
    const vt = []; for (let i = 0; i < 900; i++) { const x = 400 + R() * 2400, z = -1600 + R() * 3600, h = baseH(x, z), dc = coastX(z) - x; if (h > 6 && h < 260 && dc > 120 && roadInfo(x, z).d > 20) vt.push([x, z, h - .3, .45 + R() * .4]); }
    trees(vt);
    // port with quay, containers, gantry cranes and ships
    const qz = -900, qx0 = coastX(qz) - 70;
    mesh(box(330, 9, 560, qx0 + 165, -1.5, qz), M.stone);
    const ctn = [];
    for (let i = 0; i < 520; i++) { const row = i % 13, col = (i / 13) | 0, lvl = (R() * 4) | 0; ctn.push(mat4(qx0 + 60 + row * 15, 3 + 1.3 + lvl * 2.6, qz - 250 + col * 12.5, Math.PI / 2)); }
    instanced(box(12.2, 2.6, 2.5), new THREE.MeshStandardMaterial({ roughness: .7, metalness: .2 }), ctn, { colors: [0xb5462e, 0x2e5e8c, 0x3f7a4a, 0xd9a441, 0xe6e1d4, 0x7a3b6a, 0x1f8a8a] });
    const crane = merge([box(2, 40, 2, -10, 20, -8), box(2, 40, 2, -10, 20, 8), box(2, 40, 2, 10, 20, -8), box(2, 40, 2, 10, 20, 8), box(24, 3, 20, 0, 41, 0), box(110, 3.5, 4, 30, 46, 0), box(8, 6, 6, 0, 46, 0)]);
    const cm = []; for (let i = 0; i < 6; i++) cm.push(mat4(qx0 + 300, 3, qz - 220 + i * 85, 0));
    instanced(crane, new THREE.MeshStandardMaterial({ color: 0x2f74b5, roughness: .6, metalness: .4 }), cm);
    const ship = merge([box(230, 16, 34, 0, 4, 0), box(26, 22, 30, -95, 23, 0), box(8, 12, 6, -100, 38, 0)]);
    const shipStack = []; for (let i = 0; i < 160; i++) shipStack.push(mat4(-80 + (i % 16) * 11.5, 13.3 + ((i / 48) | 0) * 2.6, -13 + ((i / 16 | 0) % 3) * 13, Math.PI / 2));
    for (const [z, flip] of [[qz - 150, 1], [qz + 130, -1]]) {
      const sx = qx0 + 360, m = mat4(sx, -4, z, 0);
      instanced(ship, new THREE.MeshStandardMaterial({ color: flip > 0 ? 0x2a3a4a : 0x6a2420, roughness: .6 }), [m]);
      instanced(box(11, 2.5, 12), new THREE.MeshStandardMaterial({ roughness: .7 }), shipStack.map(s => m.clone().multiply(s)), { colors: [0xb5462e, 0x2e5e8c, 0x3f7a4a, 0xd9a441, 0xe6e1d4] });
    }
    const boats = []; for (let i = 0; i < 26; i++) { const z = 200 + R() * 900, x = coastX(z) + 60 + R() * 600; boats.push(mat4(x, 0, z, R() * 6.28, 1.2 + R())); }
    instanced(merge([box(8, 1.2, 2.6, 0, .3, 0), box(2.4, 1.2, 1.8, -1, 1.3, 0)]), white, boats);

    /* ---- clouds drifting around the peaks ---- */
    const cloudM = new THREE.SpriteMaterial({ map: T.cloud, transparent: true, opacity: .75, depthWrite: false, fog: true });
    const clouds = [];
    for (let i = 0; clouds.length < 40 && i < 400; i++) { const x = -2600 + R() * 4000, z = -2400 + R() * 4800; if (Math.hypot(x, z) < 650 || (x > -100 && Math.abs(z) < 1100)) continue; const s = new THREE.Sprite(cloudM); const sc = 260 + R() * 420; s.scale.set(sc, sc * .5, 1); s.position.set(x, 430 + R() * 380, z); add(s); clouds.push(s); }
    onUpdate(dt => { for (const c of clouds) { c.position.z += dt * 6; if (c.position.z > 2400) c.position.z = -2400; } });

    /* ---- night: the snake of road lights and the city glow below ---- */
    const glowPts = (pts, color, size) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const m = new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
      add(new THREE.Points(g, m)); return m;
    };
    const rl = []; for (let i = 0; i < road.length; i += 5) { const p = road[i], n = norms[i], sd = (i / 5) % 2 ? 1 : -1; rl.push(p.x + n.x * sd * 5.5, p.y + 7.6, p.z + n.z * sd * 5.5); }
    const cl2 = []; for (const c of cells) { cl2.push(c.x + (R() - .5) * 16, c.y + 4 + R() * 10, c.z + (R() - .5) * 16); if (R() < .5) cl2.push(c.x + 18, c.y + 6, c.z + (R() - .5) * 30); }
    for (let z = -540; z <= 1500; z += 12) { const x = coastX(z) - 44; cl2.push(x, Math.max(1, baseH(x, z)) + 7, z); }
    const roadGlow = glowPts(rl, 0xffc36e, 3.2), cityGlow = glowPts(cl2, 0xffd9a0, 2.2);
    return {
      onTime(night, day) { cloudM.color.setScalar(.22 + .78 * day); cloudM.opacity = .45 + .3 * day; roadGlow.opacity = night; cityGlow.opacity = night * .9; },
      views: {
        deck: ['Viewing deck', [DE + 6, Y + 5, 4], [1700, 0, 330], [DE + 6, Y + 5, -4], [1700, 0, -150]],
        saucer: ['The saucer', [BX + 70, Y + 22, 62], [BX, Y + 8, 0], [BX + 30, Y + 30, -80], [BX, Y + 8, 0]],
        road: ['Hairpin road', [1050, 860, 900], [520, 330, 80], [1250, 760, 520], [480, 330, 40]],
        bay: ['Khor Fakkan bay', [3300, 160, 950], [900, 260, 0], [3400, 190, -300], [900, 260, 0]],
        aerial: ['Mountains', [-1600, 1500, -2400], [700, 250, 0], [-2300, 1300, -900], [700, 250, 0]],
        top: ['Summit from above', [120, 900, 260], [30, Y, 0], [-160, 860, 220], [30, Y, 0]],
      },
      labels: [
        ['Al Suhub Rest Area', '583 m above sea level', [BX, Y + 26, 0]],
        ['Viewing deck', 'Cantilevered over the drop', [DE, Y + 6, 0]],
        ['Mountain road', '5.6 km of hairpins', road[Math.round(road.length * .55)].clone().add(new V3(0, 30, 0)).toArray()],
        ['Lookout · 375 m', '', [lookouts[3][0], lookouts[3][1] + 12, lookouts[3][2]]],
        ['Khor Fakkan', '', [coastX(300) - 350, 60, 300]],
        ['Khor Fakkan Port', '', [qx0 + 160, 60, qz]],
        ['Shark Island', '', [ISL.x, 90, ISL.z], 'water'],
        ['Gulf of Oman', '', [coastX(0) + 2400, 20, 0], 'water'],
      ],
    };
  },
});
