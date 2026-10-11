/* Souq Al Shanasiyah, Heart of Sharjah — rebuilt on the foundations of the old souq */
S3.register({
  id: 'shanasiyah', title: 'Souq Al Shanasiyah', short: 'Souq Al Shanasiyah', arabic: 'سوق الشناصية',
  eyebrow: 'Heart of Sharjah · rebuilt on the 1950s souq',
  lede: 'Coral-stone lanes under palm-frond shade, rebuilt on the foundations of one of the region’s oldest souqs. It takes its name from the traders of Shinas who once filled it.',
  facts: [['Area', '5,872 m²'], ['Era recreated', '1950s'], ['Walls', 'Coral stone, gypsum', 1], ['Project', 'Heart of Sharjah', 1]],
  map: 'https://maps.app.goo.gl/6bs1UTDNBATR9o2U6',
  ar: {"eyebrow": "قلب الشارقة · أعيد بناؤه على سوق الخمسينيات", "lede": "أزقة من الحجر المرجاني تحت ظلال سعف النخيل، أعيد بناؤها على أساسات أحد أقدم أسواق المنطقة. يحمل اسم تجار شناص الذين كانوا يملؤونه.", "facts": [["المساحة", "5,872 م²"], ["الحقبة", "الخمسينيات"], ["الجدران", "حجر مرجاني وجص", 1], ["المشروع", "قلب الشارقة", 1]], "views": {"lane": "الزقاق المسقوف", "court": "الساحة", "alley": "زقاق جانبي", "roofs": "الأسطح والبراجيل", "aerial": "من الجو", "plan": "من الأعلى"}, "labels": [["الزقاق المسقوف", "ظل من العريش"], ["الساحة", "شجرة ظليلة وبئر"], ["البرجيل", "برج هواء تقليدي"], ["مسجد الحي", ""]]},
  env: { shadow: 75, sunDist: 300, fog: .0006, minDist: 3, maxDist: 1000, ground: 0xc9b48c },
  build(a) {
    const { THREE, V3, M, T, R, pick, box, plane, cyl, extrude, ringShape, merge, mat4, mesh, instanced, flat, palms, trees, city, crowd, pointLights, glow, add, rep } = a;
    const coral = new THREE.MeshStandardMaterial({ map: T.coral, color: 0xf0dfc0, roughness: .95, emissive: 0x6a4a22, emissiveIntensity: 0 });
    const coralDark = new THREE.MeshStandardMaterial({ map: T.coral, color: 0xc7ad85, roughness: 1 });
    glow(coral, .22);
    const wood = new THREE.MeshStandardMaterial({ map: T.wood, color: 0x9b7650, roughness: .85 });
    const chandal = new THREE.MeshStandardMaterial({ map: T.bark, color: 0x7d6346, roughness: .9 });
    const paints = [0x2f6f7a, 0x2b4f86, 0x6d4529, 0x3f7a5a, 0x8a3b2b].map(c => new THREE.MeshStandardMaterial({ map: T.wood, color: c, roughness: .75 }));
    const shopInt = new THREE.MeshStandardMaterial({ color: 0x2a1d12, roughness: .9, emissive: 0xff9e48, emissiveIntensity: 0 });
    glow(shopInt, .9, .04);
    const rugM = new THREE.MeshStandardMaterial({ map: T.rug, roughness: .9, side: THREE.DoubleSide });

    const S = [], SD = [], W = [], P = paints.map(() => []), DK = [], beams = [], spouts = [], merl = [], rugs = [], sacks = [], cones = [], jars = [], bolts = [];
    const lanternM = [];
    const tmp = new THREE.Matrix4();
    const put = (list, geo, m) => { geo.applyMatrix4(m); list.push(geo); };
    let barjeels = 0; const bjPos = [];

    function unit(m, w, h, depth, kind, frontOpen = true) {
      put(S, box(w, h, depth, 0, h / 2, -depth / 2), m);
      put(S, box(w + .1, .5, .32, 0, h + .25, -.16), m);
      for (let x = -w / 2 + .45; x <= w / 2 - .4; x += .9) merl.push(m.clone().multiply(mat4(x, h + .5, -.14)));
      for (let x = -w / 2 + .3; x <= w / 2 - .25; x += .55) beams.push(m.clone().multiply(mat4(x, h - .38, .1)));
      if (R() < .5) spouts.push(m.clone().multiply(mat4((R() - .5) * (w - 1), h - .05, .35)));
      if (!frontOpen) return;
      if (kind === 'shop') {
        const ow = Math.min(w - 1.2, 3.6);
        put(DK, box(ow, 2.7, .05, 0, 1.35, .02), m);
        put(W, box(ow + .5, .28, .3, 0, 2.85, .1), m);
        for (const sx of [-1, 1]) put(P[(R() * P.length) | 0], box(Math.min(1, (w - ow) / 2 - .05), 2.5, .07, sx * (ow / 2 + Math.min(1, (w - ow) / 2 - .05) / 2 + .02), 1.25, .06), m);
        put(W, box(ow, .4, .55, 0, .2, .3), m);
        for (let i = 0; i < 4; i++) {
          const x = -ow / 2 + .4 + i * (ow - .8) / 3, sm = m.clone().multiply(mat4(x, .4, .3, 0, .8));
          sacks.push(sm); cones.push(sm.clone().multiply(mat4(0, .35, 0)));
        }
        if (R() < .6) rugs.push(m.clone().multiply(mat4(-(ow / 2 + .9) * (R() < .5 ? 1 : -1), 1.6, .03)));
        if (R() < .5) for (let i = 0; i < 3; i++) jars.push(m.clone().multiply(mat4(ow / 2 + .2 + i * .1, 0, .7 + i * .55)));
        if (R() < .4) for (let i = 0; i < 6; i++) bolts.push(m.clone().multiply(mat4(-ow / 2 + .3 + (i % 3) * .5, .5 + ((i / 3) | 0) * .22, .25)));
      } else if (kind === 'door') {
        const dw = 1.6 + R() * .4, pi = (R() * P.length) | 0;
        put(P[pi], box(dw, 2.4, .12, 0, 1.2, .03), m);
        put(W, box(dw + .5, .3, .3, 0, 2.55, .12), m);
        put(SD, box(dw + .3, .18, .5, 0, .09, .25), m);
        for (const sx of [-1, 1]) for (let y = .5; y < 2.3; y += .45) put(W, box(.06, .06, .05, sx * dw / 4, y, .1), m);
      } else {
        for (const sx of (w > 5 ? [-1, 1] : [0])) {
          const g = extrude(ringShape(1.1, 1.6, 2.4, .18), .12, 0); g.translate(sx * w / 4, .8, 0); put(S, g, m);
          put(SD, plane(1.1, 2.4).translate(sx * w / 4, .8 + 1.2, -.02), m);
        }
      }
      if (h > 6) {
        for (const sx of (w > 5 ? [-1, 1] : [0])) { put(P[(R() * P.length) | 0], box(.9, 1.1, .1, sx * w / 4, h - 2.4, .04), m); put(W, box(1.2, .14, .25, sx * w / 4, h - 1.78, .1), m); }
        if (barjeels < 9 && R() < .55 && depth >= 6) { barjeels++; barjeel(m, w, h, depth); }
      }
    }
    function barjeel(m, w, h, depth) {
      const bx = (R() - .5) * Math.max(0, w - 3.6), bz = -depth / 2, H = 6.2;
      bjPos.push(new V3(bx, h + H + 2, bz).applyMatrix4(m));
      put(S, box(3.3, 2.6, 3.3, bx, h + 1.3, bz), m);
      for (const [px, pz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) put(S, box(.32, H - 2.6, .32, bx + px, h + 2.6 + (H - 2.6) / 2, bz + pz), m);
      for (let k = 0; k < 4; k++) {
        const ry = k * Math.PI / 2, rm = m.clone().multiply(mat4(bx, 0, bz, ry));
        for (const o of [-.75, 0, .75]) put(S, box(.12, H - 2.6, .2, o + .37, h + 2.6 + (H - 2.6) / 2, 1.55), rm);
        put(DK, plane(3, H - 2.8).translate(0, h + 2.7 + (H - 2.8) / 2, 1.3), rm);
      }
      put(S, box(3.6, .45, 3.6, bx, h + H + .2, bz), m);
      for (const ax of [0, 1]) { const c = new THREE.CylinderGeometry(.06, .06, 4.2, 5); c.rotateZ(Math.PI / 2); if (ax) c.rotateY(Math.PI / 2); c.translate(bx, h + H - .5, bz); put(W, c, m); }
      for (let k = 0; k < 4; k++) for (const o of [-1.2, -.4, .4, 1.2]) merl.push(m.clone().multiply(mat4(bx, 0, bz, k * Math.PI / 2)).multiply(mat4(o, h + H + .42, 1.66)));
    }
    // frontage generator along a block edge; normal points to the lane
    function frontage(x0, z0, x1, z1, depth, opts = {}) {
      const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, nx = uz, nz = -ux;
      const ry = Math.atan2(nx, nz);
      let s = 0;
      while (s < len - 2) {
        let w = 4.4 + R() * 2.4; if (s + w > len - 2) w = len - s;
        const cx = x0 + ux * (s + w / 2), cz = z0 + uz * (s + w / 2);
        const tall = R() < (opts.tall ?? .32), h = tall ? 7.2 + R() * .8 : 4.3 + R() * .7;
        const kind = opts.kind || (R() < .55 ? 'shop' : R() < .6 ? 'door' : 'niche');
        unit(mat4(cx, 0, cz, ry), w - .02, h, depth, kind, opts.open !== false);
        s += w;
      }
    }
    // block: frontages on the given sides plus a lower interior mass
    function block(x0, z0, x1, z1, sides = 'nsew', opts = {}) {
      const d = 7;
      if (sides.includes('s')) frontage(x0, z0, x1, z0, d, opts);   // faces -z
      if (sides.includes('n')) frontage(x1, z1, x0, z1, d, opts);   // faces +z
      if (sides.includes('e')) frontage(x1, z0, x1, z1, d, opts);   // faces +x
      if (sides.includes('w')) frontage(x0, z1, x0, z0, d, opts);   // faces -x
      const ix0 = x0 + d, ix1 = x1 - d, iz0 = z0 + d, iz1 = z1 - d;
      if (ix1 - ix0 > 1 && iz1 - iz0 > 1) S.push(box(ix1 - ix0 + .2, 3.6, iz1 - iz0 + .2, (ix0 + ix1) / 2, 1.8, (iz0 + iz1) / 2));
    }
    // souq layout: main covered lane along x, two cross lanes, a courtyard north of the main lane
    block(-40, -38, -22, -2.5); block(-18, -38, 18, -2.5); block(22, -38, 40, -2.5);
    block(-40, 2.5, -22, 38); block(-18, 2.5, -8, 38); block(8, 2.5, 18, 38); block(22, 2.5, 40, 38);
    block(-8, 22, 8, 38, 'new');
    frontage(-8, 22, 8, 22, 6, { kind: 'shop', tall: .5 });
    // heritage blocks around the souq (simpler, fewer openings)
    const ring = [];
    for (let x = -105; x <= 105; x += 30) for (let z = -105; z <= 105; z += 30) {
      if (Math.max(Math.abs(x), Math.abs(z)) <= 45 || (Math.abs(x - 62) < 24 && Math.abs(z - 62) < 24)) continue;
      if (R() < .15) continue;
      ring.push([x - 11, z - 11, x + 11, z + 11]);
    }
    for (const [x0, z0, x1, z1] of ring) block(x0, z0, x1, z1, 'nsew', { tall: .25, kind: R() < .5 ? 'door' : 'niche' });

    mesh(merge(S), coral); mesh(merge(SD), coralDark, { cast: false }); mesh(merge(W), wood);
    P.forEach((list, i) => list.length && mesh(merge(list), paints[i]));
    mesh(merge(DK), shopInt, { cast: false });
    instanced(merge([box(.42, .34, .26, 0, .17, 0), box(.22, .26, .26, 0, .47, 0)]), coral, merl);
    instanced(new THREE.CylinderGeometry(.075, .085, .42, 6).rotateX(Math.PI / 2), chandal, beams, { receive: false });
    instanced(new THREE.CylinderGeometry(.1, .12, .9, 6).rotateX(Math.PI / 2 - .2), wood, spouts, { receive: false });
    instanced(new THREE.PlaneGeometry(1.3, 2), rugM, rugs, { cast: false });
    instanced(cyl(.3, .34, .45, 10, 0, .22, 0), new THREE.MeshStandardMaterial({ color: 0xcdb58c, roughness: 1 }), sacks);
    instanced(new THREE.ConeGeometry(.28, .32, 12).translate(0, .16, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), cones, { colors: [0xb5361f, 0xe0a422, 0x6f7a2a, 0x7a4a2a, 0xc96d1e, 0xd9c7a0] });
    const jarG = new THREE.LatheGeometry([[0, 0], [.18, .02], [.3, .25], [.28, .55], [.14, .72], [.16, .8], [0, .8]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    instanced(jarG, new THREE.MeshStandardMaterial({ color: 0xb06b3e, roughness: .9 }), jars);
    instanced(box(.45, .2, .9), new THREE.MeshStandardMaterial({ roughness: .9 }), bolts, { colors: [0x8c1f22, 0x1d3a63, 0xd8b04a, 0x2f6f5a, 0xe9e2d0, 0x6b2a5a] });

    // palm-frond (areesh) shade on chandal beams over the lanes
    const areesh = new THREE.MeshStandardMaterial({ map: T.areesh, alphaTest: .5, side: THREE.DoubleSide, roughness: .95 });
    const areeshDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: T.areesh, alphaTest: .5 });
    const roofs = [[0, 0, 80, 5.8, 'x'], [-20, -20, 4.6, 34, 'z'], [-20, 20, 4.6, 34, 'z'], [20, -20, 4.6, 34, 'z'], [20, 20, 4.6, 34, 'z']];
    const bm = [];
    for (const [cx, cz, w, d, dir] of roofs) {
      const g = plane(w, d); g.rotateX(-Math.PI / 2); g.translate(cx, 4.45, cz);
      const m = mesh(g, areesh, { cast: true, receive: true }); m.customDepthMaterial = areeshDepth;
      if (dir === 'x') for (let x = cx - w / 2 + .6; x < cx + w / 2; x += 1.2) bm.push(mat4(x, 4.3, cz, 0));
      else for (let z = cz - d / 2 + .6; z < cz + d / 2; z += 1.2) bm.push(mat4(cx, 4.3, z, Math.PI / 2));
    }
    instanced(new THREE.CylinderGeometry(.08, .1, 6.2, 6).rotateX(Math.PI / 2), chandal, bm);
    // hanging lanterns
    for (let x = -36; x <= 36; x += 6) lanternM.push(mat4(x, 3.3, 0));
    for (const lx of [-20, 20]) for (let z = -34; z <= 34; z += 8) if (Math.abs(z) > 5) lanternM.push(mat4(lx, 3.3, z));
    const lanGlass = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffa24a, emissiveIntensity: 0, roughness: .3 });
    glow(lanGlass, 2.6, .1);
    instanced(merge([new THREE.CylinderGeometry(.18, .22, .5, 6), new THREE.CylinderGeometry(.015, .015, 1, 3).translate(0, .8, 0)]), lanGlass, lanternM, { cast: false });
    instanced(merge([new THREE.ConeGeometry(.26, .28, 6).translate(0, .38, 0), cyl(.24, .24, .06, 6, 0, -.27, 0)]), M.brass, lanternM, { cast: false });
    pointLights([[-30, 3, 0, 0xffa95a, 18, 1.6], [-10, 3, 0, 0xffa95a, 18, 1.6], [10, 3, 0, 0xffa95a, 18, 1.6], [30, 3, 0, 0xffa95a, 18, 1.6], [0, 3, 14, 0xffb36a, 22, 1.8], [-20, 3, -20, 0xffa95a, 16, 1.4], [20, 3, 20, 0xffa95a, 16, 1.4]]);

    // courtyard: shade tree, well, benches
    flat(16, 19.5, 0, 12.25, .03, M.sand);
    trees([[0, 13, 0, 1.25]]);
    mesh(merge([cyl(1.1, 1.2, .9, 16, 4.5, .45, 16), cyl(.9, .9, .92, 16, 4.5, .46, 16, true)]), coral);
    mesh(merge([box(.1, 2, .1, 3.7, 1, 16), box(.1, 2, .1, 5.3, 1, 16), box(1.8, .1, .1, 4.5, 2, 16)]), wood);
    const benches = []; for (const [x, z, ry] of [[-6, 8, Math.PI / 2], [-6, 14, Math.PI / 2], [6, 8, -Math.PI / 2], [-2, 20, 0], [2.5, 20, 0]]) benches.push(mat4(x, 0, z, ry));
    instanced(merge([box(2.6, .45, .9, 0, .23, 0), box(2.6, .5, .12, 0, .7, -.4)]), coral, benches);
    // ground: stone-paved lanes, sand elsewhere
    flat(80, 76, 0, 0, .02, new THREE.MeshStandardMaterial({ map: rep(T.paver, 1 / 4, 1 / 4), color: 0xe6d6b8, roughness: .95 }));
    flat(4000, 4000, 0, 0, 0, M.sand);
    // a neighbourhood mosque with a square minaret
    {
      const mx = 62, mz = 62, ms = [];
      ms.push(box(16, 5.4, 14, mx, 2.7, mz), box(16.4, .5, 14.4, mx, 5.6, mz), box(3.4, 15, 3.4, mx + 9.6, 7.5, mz - 6.6), box(4, .5, 4, mx + 9.6, 15.2, mz - 6.6), box(2.6, 2.8, 2.6, mx + 9.6, 16.8, mz - 6.6), box(3, .4, 3, mx + 9.6, 18.4, mz - 6.6));
      mesh(merge(ms), coral);
      const mm = []; for (let x = -7.5; x <= 7.5; x += .9) { mm.push(mat4(mx + x, 5.85, mz - 7.1)); mm.push(mat4(mx + x, 5.85, mz + 7.1)); }
      instanced(merge([box(.42, .34, .26, 0, .17, 0), box(.22, .26, .26, 0, .47, 0)]), coral, mm);
      const dk = []; for (let k = 0; k < 4; k++) dk.push(plane(1, 2).translate(0, 16.7, 1.32).rotateY(k * Math.PI / 2).translate(mx + 9.6, 0, mz - 6.6));
      mesh(merge(dk), M.dark, { cast: false });
      mesh(new THREE.ConeGeometry(.4, 1.2, 4).translate(mx + 9.6, 19.2, mz - 6.6), M.brass);
    }
    // modern Sharjah beyond the heritage quarter
    const cells = [];
    for (let x = -1200; x <= 1200; x += 50) for (let z = -1200; z <= 1200; z += 50) {
      const d = Math.max(Math.abs(x), Math.abs(z)); if (d < 190 || R() < .25) continue;
      cells.push({ x: x + (R() - .5) * 14, z: z + (R() - .5) * 14, r: R() < .5 ? 0 : 1.57, k: (R() * (d > 450 ? 6 : 3)) | 0 });
    }
    city(cells, [[20, 12, 20], [24, 18, 22], [26, 26, 24], [24, 40, 24], [28, 70, 26], [30, 110, 28]]);
    palms([[-50, 0], [50, 0], [0, -50], [0, 50], [-48, 48], [48, -48], [-48, -48]]);
    crowd([[-39, -1, 39, -1], [-39, 1.2, 39, 1.2], [-20, -37, -20, 37], [20, -37, 20, 37], [-6, 6, 6, 20], [6, 6, -6, 20], [-39, 0, 39, 0]], 72);

    return {
      views: {
        lane: ['Covered lane', [-36, 1.7, .3], [10, 2.4, 0], [-6, 1.7, .5], [36, 2.4, 0]],
        court: ['Courtyard', [-6.5, 2, 21], [5, 3, 6], [6.5, 2, 21], [-4, 3, 6]],
        alley: ['Side alley', [20.2, 1.7, -37], [20, 2.6, 4], [19.8, 1.7, -12], [20, 2.6, 30]],
        roofs: ['Rooftops & barjeel', [-46, 20, -40], [0, 5, 0], [40, 20, -46], [0, 5, 0]],
        aerial: ['Aerial', [110, 85, 120], [0, 2, 0], [40, 95, 150]],
        plan: ['Top down', [0, 150, 10], [0, 0, 0], [20, 140, -10]],
      },
      labels: [
        ['Covered lane', 'Palm-frond areesh shade', [-14, 6.5, 0]],
        ['Courtyard', 'Shade tree and well', [0, 10, 13]],
        ['Barjeel', 'Traditional wind tower', bjPos[0] ? bjPos[0].toArray() : [-30, 16, -24]],
        ['Neighbourhood mosque', '', [62, 21, 55]],
      ],
    };
  },
});
