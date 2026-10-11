/* Al Noor Mosque, Buhairah Corniche, Khalid Lagoon — Ottoman plan after the Sultan Ahmed Mosque */
S3.register({
  id: 'noor', title: 'Al Noor Mosque', short: 'Al Noor Mosque', arabic: 'مسجد النور',
  eyebrow: 'Buhairah Corniche · Khalid Lagoon · 2005',
  lede: 'An Ottoman-style mosque modelled on Istanbul’s Sultan Ahmed Mosque. A cascade of 34 domes rises to a central dome over four semi-domes, framed by two pencil minarets.',
  facts: [['Domes', '34'], ['Minarets', '2 × 52 m'], ['Worshippers', '2,000+'], ['Central dome', '≈100 tonnes']],
  map: 'https://maps.app.goo.gl/mK99umFHPATWYeks6',
  ar: {"eyebrow": "كورنيش البحيرة · بحيرة خالد · 2005", "lede": "مسجد على الطراز العثماني مستوحى من جامع السلطان أحمد في إسطنبول. تتدرج 34 قبة صعودًا إلى قبة مركزية فوق أربعة أنصاف قباب، تحيط بها مئذنتان رشيقتان.", "facts": [["القباب", "34"], ["المآذن", "2 × 52 م"], ["المصلّون", "أكثر من 2,000"], ["القبة المركزية", "نحو 100 طن"]], "views": {"lagoon": "من البحيرة", "aerial": "من الجو", "entrance": "المدخل", "domes": "تدرج القباب", "minaret": "المآذن", "plan": "من الأعلى"}, "labels": [["القبة المركزية", "فوق أربعة أنصاف قباب، نحو 100 طن"], ["المآذن", "اثنتان بارتفاع 52 م"], ["الرواق ذو القباب السبع", ""], ["نافورة الوضوء", ""], ["بحيرة خالد", ""], ["كورنيش البحيرة", ""]]},
  env: { center: [10, 0, 0], shadow: 120, ground: 0xb7b09a },
  build(a) {
    const { THREE, V3, M, T, R, cv, tex, box, plane, cyl, dome, extrude, archPts, bayShape, ringShape, merge, mat4, mesh, instanced, flat, water, palms, trees, lamps, city, cars, crowd, pointLights, glow, bayParts, facade, add, rep } = a;
    const stone = new THREE.MeshStandardMaterial({ map: T.ashlar, color: 0xf2ece0, roughness: .7, emissive: 0x8a6a3a, emissiveIntensity: 0 });
    const lead = new THREE.MeshStandardMaterial({ map: T.lead, color: 0xaab3bd, metalness: .65, roughness: .38, envMapIntensity: 1.2, emissive: 0x2a3850, emissiveIntensity: 0 });
    const stainedTex = (() => {
      const [c, g] = cv(64, 128), [e, ge] = cv(64, 128);
      g.fillStyle = '#1d2a3a'; g.fillRect(0, 0, 64, 128); ge.fillStyle = '#000'; ge.fillRect(0, 0, 64, 128);
      for (let y = 0; y < 128; y += 10) for (let x = 0; x < 64; x += 10) {
        const col = a.pick(['#2e6fb5', '#c43b3b', '#e8b545', '#2aa6a0', '#7d4bb0', '#f1e7c8']);
        g.fillStyle = col; ge.fillStyle = col; g.beginPath(); g.moveTo(x + 5, y); g.lineTo(x + 10, y + 5); g.lineTo(x + 5, y + 10); g.lineTo(x, y + 5); g.fill(); ge.beginPath(); ge.moveTo(x + 5, y); ge.lineTo(x + 10, y + 5); ge.lineTo(x + 5, y + 10); ge.lineTo(x, y + 5); ge.fill();
      }
      return [tex(c, 1 / 1.6, 1 / 3.2), tex(e, 1 / 1.6, 1 / 3.2)];
    })();
    const glassM = new THREE.MeshStandardMaterial({ map: stainedTex[0], emissiveMap: stainedTex[1], emissive: 0xffffff, emissiveIntensity: 0, roughness: .2, metalness: .3 });
    const goldM = M.brass;
    glow(stone, .34); glow(lead, .3); glow(glassM, 1.4, .05);

    const B = 1.2;                 // platform height
    const HW = 20, WALL = 15;      // prayer hall half-width & wall height
    const yR = B + WALL;           // roof level
    const S = [], L = [], G = [], Iz = [];

    // platform with steps on the entrance side
    S.push(box(84, B, 78, 9, B / 2, 0));
    for (let i = 0; i < 4; i++) S.push(box(1.1, B * (i + 1) / 4, 30, 51.5 - i * 1.1 + 4.4, B * (i + 1) / 8, 0));
    // prayer hall block, cornice and parapet
    S.push(box(HW * 2, WALL, HW * 2, 0, B + WALL / 2, 0));
    S.push(box(HW * 2 + 1, .7, HW * 2 + 1, 0, yR + .1, 0));
    S.push(box(HW * 2 + .6, .5, HW * 2 + .6, 0, B + 8.6, 0)); // string course between window tiers
    // corner buttress turrets
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * HW, z = sz * HW;
      S.push(cyl(1.9, 2.1, yR + 4 - B, 8, x, B + (yR + 4 - B) / 2, z), cyl(2.2, 2.2, .5, 8, x, yR + 4.2, z));
      L.push(dome(1.9, x, yR + 4.45, z, 16, 1.15));
      G.push(new THREE.CylinderGeometry(.05, .05, 1.2, 4).translate(x, yR + 7.2, z), new THREE.SphereGeometry(.18, 8, 6).translate(x, yR + 7, z));
    }
    // window bays on four walls, two tiers
    const winS = [], winG = [], winT = [];
    const winShape = (aw, sp, ap) => { const s = new THREE.Shape(); s.moveTo(-aw / 2, 0); s.lineTo(aw / 2, 0); archPts(aw, sp, ap).reverse().forEach(p => s.lineTo(p.x, p.y)); s.closePath(); return s; };
    const W1 = { aw: 1.9, sp: 3.4, ap: 4.6 }, W2 = { aw: 1.6, sp: 2.4, ap: 3.4 };
    const winGeo = (w) => ({
      S: merge([extrude(ringShape(w.aw, w.sp, w.ap, .28), .22, 0), box(w.aw + .7, .22, .45, 0, -.1, .1), box(.28, w.sp, .22, -w.aw / 2 - .14, w.sp / 2, .11), box(.28, w.sp, .22, w.aw / 2 + .14, w.sp / 2, .11)]),
      G: (() => { const g = new THREE.ShapeGeometry(winShape(w.aw, w.sp, w.ap)); g.translate(0, 0, -.06); const uv = g.attributes.uv; return g; })(),
      T: box(w.aw + 1, .9, .06, 0, w.ap + .9, .02),
    });
    const WG1 = winGeo(W1), WG2 = winGeo(W2);
    const w1 = [], w2 = [];
    for (const [ry, nx, nz] of [[0, 0, 1], [Math.PI, 0, -1], [Math.PI / 2, 1, 0], [-Math.PI / 2, -1, 0]]) {
      for (const o of [-15, -9, -3, 3, 9, 15]) {
        if (nx === 1 && Math.abs(o) < 6) continue; // main portal
        const ax = Math.cos(ry), az = -Math.sin(ry);
        const x = nx * HW + ax * o, z = nz * HW + az * o;
        if (!(nz !== 0 && Math.abs(o) < 4)) w1.push(mat4(x + nx * .02, B + 2.6, z + nz * .02, ry));
        w2.push(mat4(x + nx * .02, B + 9.8, z + nz * .02, ry));
      }
    }
    instanced(WG1.S, stone, w1); instanced(WG1.G, glassM, w1, { cast: false }); instanced(WG1.T, M.iznik, w1, { cast: false });
    instanced(WG2.S, stone, w2); instanced(WG2.G, glassM, w2, { cast: false });

    // central structure: square base, four semi-domes, weight towers, drum and dome
    const s = 10.5;
    S.push(box(s * 2 + 1, 9.6, s * 2 + 1, 0, yR + 4.8, 0));
    for (const [ry, dx, dz] of [[0, 0, 1], [Math.PI, 0, -1], [Math.PI / 2, 1, 0], [-Math.PI / 2, -1, 0]]) {
      const g = new THREE.SphereGeometry(9.4, 32, 12, 0, Math.PI, 0, Math.PI / 2); g.rotateY(ry); g.translate(dx * (s + .6), yR + .7, dz * (s + .6)); L.push(g);
      // tympanum arch window band on the semi-dome base
      const rim = new THREE.CylinderGeometry(9.5, 9.6, .7, 32, 1, true, 0, Math.PI); rim.rotateY(ry - Math.PI / 2); rim.translate(dx * (s + .6), yR + .55, dz * (s + .6)); S.push(rim);
      // exedrae: two small half domes flanking each semi-dome
      const ax = Math.cos(ry), az = -Math.sin(ry);
      for (const side of [-1, 1]) {
        const ex = dx * 14.6 + ax * side * 8.4, ez = dz * 14.6 + az * side * 8.4;
        const e = new THREE.SphereGeometry(3.8, 20, 8, 0, Math.PI, 0, Math.PI / 2); e.rotateY(ry); e.translate(ex, yR + .7, ez); L.push(e);
        const eb = box(7.8, .7, 1.2, 0, 0, 0); eb.rotateY(ry); eb.translate(ex - dx * .4, yR + .5, ez - dz * .4); S.push(eb);
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (s + .2), z = sz * (s + .2);
      S.push(cyl(1.6, 1.8, 13.5, 8, x, yR + 6.75, z), cyl(1.9, 1.9, .4, 8, x, yR + 13.6, z));
      L.push(dome(1.7, x, yR + 13.8, z, 16, 1.2));
      G.push(new THREE.CylinderGeometry(.05, .05, 1.4, 4).translate(x, yR + 16.4, z), new THREE.SphereGeometry(.2, 8, 6).translate(x, yR + 16.1, z));
      // corner domes on short drums
      const cx = sx * 15.6, cz = sz * 15.6;
      S.push(cyl(3.9, 4, 1.8, 16, cx, yR + 1.1, cz)); L.push(dome(3.7, cx, yR + 2, cz, 22, 1.05));
      G.push(new THREE.CylinderGeometry(.05, .05, 1.2, 4).translate(cx, yR + 6.3, cz));
    }
    const drumY = yR + 9.6, drumH = 4.6, DR = 10.4;
    S.push(cyl(DR, DR, drumH, 48, 0, drumY + drumH / 2, 0), cyl(DR + .4, DR + .4, .5, 48, 0, drumY + drumH + .1, 0));
    const dw = [], db = [];
    for (let i = 0; i < 24; i++) { const ang = i / 24 * Math.PI * 2; dw.push(mat4(Math.sin(ang) * (DR + .02), drumY + .7, Math.cos(ang) * (DR + .02), ang)); const b2 = (i + .5) / 24 * Math.PI * 2; db.push(mat4(Math.sin(b2) * (DR + .35), drumY, Math.cos(b2) * (DR + .35), b2)); }
    const dwin = new THREE.ShapeGeometry(winShape(1.3, 2.1, 3.1)); dwin.translate(0, 0, .02);
    instanced(dwin, glassM, dw, { cast: false });
    instanced(merge([extrude(ringShape(1.3, 2.1, 3.1, .18), .14, 0)]), stone, dw, { cast: false });
    instanced(box(.7, drumH, .7, 0, drumH / 2, 0), stone, db);
    const domeY = drumY + drumH + .3;
    L.push(dome(DR, 0, domeY, 0, 56, 1.0));
    // gold alem (finial) with crescent
    G.push(new THREE.CylinderGeometry(.1, .14, 3, 6).translate(0, domeY + DR + 1.5, 0), new THREE.SphereGeometry(.45, 12, 8).translate(0, domeY + DR + .9, 0), new THREE.SphereGeometry(.3, 12, 8).translate(0, domeY + DR + 2.1, 0));
    const cres = new THREE.TorusGeometry(.75, .12, 6, 20, Math.PI * 1.4); cres.rotateZ(-Math.PI * .2); cres.translate(0, domeY + DR + 3.3, 0); G.push(cres);

    // main portal (pishtaq) on the east wall
    {
      const w = 10, h = 19, aw = 5.6, sp = 9.5, ap = 13.6;
      S.push(extrude(bayShape(w, h, aw, sp, ap), 1.6, -.4).rotateY(Math.PI / 2).translate(HW, B, 0));
      Iz.push(extrude(ringShape(aw, sp, ap, .45), .12, 1.2).rotateY(Math.PI / 2).translate(HW, B, 0));
      const back = plane(aw, ap); back.rotateY(Math.PI / 2); back.translate(HW + .03, B + ap / 2, 0); Iz.push(back);
      const door = box(.2, 5.8, 3.6, HW + .12, B + 2.9, 0); add(new THREE.Mesh(door, M.wood));
      Iz.push(box(.12, 1.6, w - 1.6, HW + 1.22, B + h - 2.2, 0));
      for (let z = -4.2; z <= 4.21; z += 1.4) S.push(box(.3, .7, .6, HW + .9, B + h + .35, z));
    }
    // seven-domed portico in front of the entrance
    const PX = HW + 8.2, porBays = [];
    facade(porBays, PX, 0, Math.PI / 2, 36, B, 5.14);
    const POR = bayParts(5.14, 9.2, 4.0, 5.6, 7.9, false);
    instanced(POR.S, stone, porBays); instanced(POR.T, M.iznik, porBays, { cast: false });
    S.push(box(8.6, 1, 37, HW + 4, B + 9.7, 0));
    for (let i = 0; i < 7; i++) { const z = -18 + 5.14 * (i + .5); S.push(cyl(2.3, 2.4, 1, 16, HW + 4.2, B + 10.6, z)); L.push(dome(2.25, HW + 4.2, B + 11.1, z, 18, 1.05)); G.push(new THREE.CylinderGeometry(.04, .04, .9, 4).translate(HW + 4.2, B + 13.7, z)); }
    for (const sz of [-1, 1]) S.push(box(8.6, 9.2, 1.2, HW + 4, B + 4.6, sz * 18.6));
    flat(8, 36, HW + 4, 0, B + .02, M.marble);
    // side porches (north & south) with small domes
    for (const sz of [-1, 1]) { S.push(box(7, 8, 3.2, 0, B + 4, sz * (HW + 1.6))); S.push(cyl(2.2, 2.3, .8, 16, 0, B + 8.4, sz * (HW + 1.6))); L.push(dome(2.1, 0, B + 8.8, sz * (HW + 1.6), 16, 1.1)); add(new THREE.Mesh(box(2.6, 4.2, .2, 0, B + 2.1, sz * (HW + 3.25)), M.wood)); }

    // minarets: plinth, fluted shaft, two balconies, lead spire, gold alem
    const minS = [], minL = [], minG = [], ring = [];
    for (const sz of [-1, 1]) {
      const x = HW + 9.5, z = sz * 21.5;
      minS.push(box(4.4, 9, 4.4, x, B + 4.5, z), new THREE.CylinderGeometry(1.75, 2.9, 1.6, 16).translate(x, B + 9.8, z));
      minS.push(cyl(1.6, 1.65, 23.5, 16, x, B + 10.6 + 11.75, z));
      for (const [y, r, rr] of [[34.6, 1.6, 2.6], [43.4, 1.42, 2.3]]) {
        minS.push(new THREE.CylinderGeometry(rr, r, 1.4, 16).translate(x, y - .7, z), cyl(rr + .05, rr + .05, .25, 16, x, y + .1, z));
        const par = cyl(rr, rr, .95, 24, x, y + .7, z, true); minS.push(par);
        ring.push(new THREE.TorusGeometry(rr + .04, .07, 6, 32).rotateX(Math.PI / 2).translate(x, y + 1.2, z));
      }
      minS.push(cyl(1.42, 1.45, 8.6, 16, x, 35.8 + 4.3, z), cyl(1.22, 1.25, 3, 16, x, 44.6 + 1.5, z));
      minL.push(new THREE.ConeGeometry(1.55, 5.6, 16).translate(x, 47.6 + 2.8, z));
      minG.push(new THREE.CylinderGeometry(.06, .08, 1.6, 6).translate(x, 53.4, z), new THREE.SphereGeometry(.28, 10, 8).translate(x, 53.1, z));
      const c2 = new THREE.TorusGeometry(.45, .08, 6, 16, Math.PI * 1.4); c2.rotateZ(-Math.PI * .2); c2.translate(x, 54.6, z); minG.push(c2);
    }
    mesh(merge(minS), stone); mesh(merge(minL), lead); mesh(merge(minG), goldM, { receive: false });
    const ringM = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd590, emissiveIntensity: 0 }); glow(ringM, 2.4);
    mesh(merge(ring), ringM, { cast: false });

    mesh(merge(S), stone); mesh(merge(L), lead); mesh(merge(G), goldM, { receive: false }); mesh(merge(Iz), M.iznik, { cast: false });

    // forecourt with ablution fountain
    flat(34, 60, 45, 0, B + .02, M.marble);
    {
      const fx = 46, oct = [];
      oct.push(cyl(4.4, 4.6, .8, 8, fx, B + .4, 0), cyl(.5, .7, 2.2, 8, fx, B + 1.1, 0), cyl(1.4, 1.2, .3, 8, fx, B + 2.2, 0));
      mesh(merge(oct), M.marble);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(4.1, 8).rotateX(-Math.PI / 2).translate(fx, B + .75, 0), new THREE.MeshStandardMaterial({ color: 0x2c7f99, metalness: .2, roughness: .05, envMapIntensity: 1.6 }));
      add(pool);
      const jetM = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, transparent: true, opacity: .55, roughness: .1 });
      const jets = []; for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; jets.push(new THREE.ConeGeometry(.12, 1.2, 6).translate(fx + Math.cos(an) * 1.2, B + 2.6, Math.sin(an) * 1.2)); }
      add(new THREE.Mesh(merge(jets), jetM));
    }
    // gardens, hedges, flower beds
    const lawnBeds = [[-6, -48, 74, 18], [-6, 48, 74, 18], [-45, 0, 14, 70], [70, -30, 20, 30], [70, 30, 20, 30]];
    for (const [x, z, w, d] of lawnBeds) { flat(w, d, x, z, .05, M.lawn); }
    const hedgeM = new THREE.MeshStandardMaterial({ map: T.foliage, color: 0x7fa65a, roughness: .9 });
    const hedges = [];
    for (const [x, z, w, d] of lawnBeds) { hedges.push(box(w, .7, .6, x, .4, z - d / 2), box(w, .7, .6, x, .4, z + d / 2)); }
    mesh(merge(hedges), hedgeM);
    const flowers = [];
    for (let i = 0; i < 220; i++) { const bed = lawnBeds[i % 2]; flowers.push(mat4(bed[0] + (R() - .5) * bed[2] * .9, .2, bed[1] + (R() - .5) * 3, 0, .5 + R() * .4)); }
    instanced(new THREE.IcosahedronGeometry(.35, 0), new THREE.MeshStandardMaterial({ roughness: .8 }), flowers, { cast: false, colors: [0xd94a6a, 0xf1c84a, 0xf4f0ec, 0xc23b3b, 0xe486b0] });
    const ps = [];
    for (let x = -40; x <= 60; x += 10) { ps.push([x, -40]); ps.push([x, 40]); }
    for (let z = -30; z <= 30; z += 10) { ps.push([66, z]); ps.push([-38, z]); }
    for (let x = -600; x <= 600; x += 12) ps.push([x + R() * 3, -62]);
    palms(ps);
    trees([[80, -12], [80, 12], [-52, -30], [-52, 30], [30, -46, 0, 1.2], [30, 46, 0, 1.2]]);

    // lagoon edge, roads and city
    flat(6000, 1100, 0, 520, 0, M.ground); flat(6000, 2200, 0, -2300, 0, M.ground);
    flat(3000, 14, 0, -63, .04, M.paver);
    mesh(box(3000, 1.1, .7, 0, .1, -70.2), M.stone);
    water(6000, 1100, 0, -620, -.5, { color: 0x0f5262 });
    flat(3000, 22, 0, 72, .04, M.asphalt); flat(30, 60, 98, 30, .04, M.asphalt);
    for (const z of [66, 78]) { const g = plane(3000, .22); g.rotateX(-Math.PI / 2); g.translate(0, .08, z); mesh(g, M.paint, { cast: false, receive: false }); }
    mesh(box(3000, .3, 2, 0, .15, 72), M.stone);
    const lm = []; for (let x = -500; x <= 500; x += 24) { lm.push(mat4(x, 0, -58, Math.PI)); lm.push(mat4(x + 12, 0, 60.5, 0)); }
    lamps(lm);
    const lane = (z, dir, n) => ({ pts: dir > 0 ? [new V3(-700, 0, z), new V3(700, 0, z)] : [new V3(700, 0, z), new V3(-700, 0, z)], n });
    const parked = []; for (let z = 4; z <= 56; z += 2.8) { parked.push(mat4(90, 0, z, 0)); parked.push(mat4(106, 0, z, Math.PI)); }
    cars(parked, [lane(64, 1, 9), lane(69, 1, 8), lane(75, -1, 9), lane(80, -1, 8)]);
    const near = [[20, 14, 20], [24, 20, 22], [28, 30, 24], [22, 45, 22], [26, 60, 26]];
    const cells = [];
    for (let x = -1100; x <= 1100; x += 48) for (let z = 100; z <= 1100; z += 48) { if (R() < .25) continue; cells.push({ x: x + (R() - .5) * 14, z: z + (R() - .5) * 14, r: R() < .5 ? 0 : Math.PI / 2, k: (R() * (Math.hypot(x, z) > 380 ? 5 : 3)) | 0 }); }
    for (let x = 140; x <= 1100; x += 48) for (let z = -40; z < 100; z += 48) if (R() > .3) cells.push({ x, z, k: (R() * 3) | 0 });
    city(cells, near);
    const towers = [[30, 90, 30], [34, 130, 32], [28, 170, 28], [40, 210, 36]];
    const tc = []; for (let x = -1400; x <= 1400; x += 70) for (let z = -1250; z >= -1700; z -= 70) if (R() > .35) tc.push({ x: x + (R() - .5) * 20, z, k: (R() * 4) | 0 });
    city(tc, towers, [0xcfd8dc, 0xb9c7cf, 0xe3e6e6, 0xa9b9c4, 0xd9d2c4]);
    crowd([[28, -14, 62, -14, B], [28, 14, 62, 14, B], [26, -24, 26, 24, B], [-300, -64, 300, -64], [-300, -61, 300, -61], [40, -30, 40, 30, B]], 110);
    pointLights([[34, 2, -26], [34, 2, 26], [-26, 2, -26], [-26, 2, 26], [0, 2, -30, 0xffc890, 40, 2.6], [0, 2, 30, 0xffc890, 40, 2.6], [46, 3, 0, 0xfff0d0, 30, 1.6]]);

    return {
      views: {
        lagoon: ['Lagoon view', [-60, 7, -150], [8, 20, 0], [55, 7, -150], [8, 20, 0]],
        aerial: ['Aerial', [150, 110, 165], [8, 14, 0], [70, 125, 205]],
        entrance: ['Entrance', [92, 3.5, 26], [22, 20, 0], [92, 3.5, -26]],
        domes: ['Dome cascade', [40, 36, 40], [0, 30, 0], [-34, 38, 42]],
        minaret: ['Minarets', [48, 52, -48], [29, 44, -21], [56, 42, -6], [29, 44, 0]],
        plan: ['Top down', [8, 230, 30], [8, 0, 0], [40, 215, -30]],
      },
      labels: [
        ['Central dome', 'On four semi-domes, ≈100 t', [0, 44, 0]],
        ['Minarets', 'Two at 52 m', [HW + 9.5, 56, -21.5]],
        ['Seven-domed portico', '', [HW + 6, 17, 18]],
        ['Ablution fountain', '', [46, 5, 0]],
        ['Khalid Lagoon', '', [-120, 4, -260], 'water'],
        ['Buhairah Corniche', '', [-200, 4, -63]],
      ],
    };
  },
});
