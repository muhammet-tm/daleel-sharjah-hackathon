/* Central Souq (Blue Souq), Al Majaz, on Khalid Lagoon */
S3.register({
  id: 'souq', title: 'Central Souq', short: 'Central Souq', arabic: 'السوق المركزي',
  eyebrow: 'Al Majaz · Khalid Lagoon · 1978',
  lede: 'Two arcaded wings joined by covered bridges, crowned by twenty blue-tiled wind towers on the edge of Khalid Lagoon. Locals call it the Blue Souq.',
  facts: [['Shops', '600+'], ['Floor area', '80,000 m²'], ['Wind towers', '20'], ['Architect', 'Michael Lyell Associates', 1]],
  map: 'https://maps.app.goo.gl/rQ7WC8AAZZ2j6azF9',
  ar: {"eyebrow": "المجاز · بحيرة خالد · 1978", "lede": "جناحان بأروقة مقوسة تربطهما جسور مسقوفة، يعلوهما عشرون برجًا للهواء مكسوًا بالبلاط الأزرق على ضفة بحيرة خالد. يسميه أهل الشارقة السوق الأزرق.", "facts": [["المحلات", "أكثر من 600"], ["المساحة", "80,000 م²"], ["أبراج الهواء", "20"], ["المعماري", "مايكل لايل وشركاه", 1]], "views": {"aerial": "من الجو", "lagoon": "واجهة البحيرة", "towers": "أبراج الهواء", "bridges": "الجسور", "street": "شارع الملك فيصل", "plan": "من الأعلى", "inside": "ادخل السوق"}, "labels": [["جناح البحيرة", "الذهب والمجوهرات والعطور"], ["جناح شارع الملك فيصل", "السجاد والمنسوجات والتحف"], ["الجسور المسقوفة", "ممرات مكيفة في الطابق العلوي"], ["أبراج الهواء", "20 برجًا للتبريد الطبيعي"], ["بحيرة خالد", ""], ["شارع الملك فيصل", ""], ["ممشى الكورنيش", ""]]},
  build(a) {
    const { THREE, V3, M, R, box, plane, extrude, archPts, bayShape, ringShape, merge, mat4, mesh, instanced, flat, water, palms, lamps, city, cars, crowd, pointLights, bayParts, facade, add } = a;
    const BAY_G = bayParts(5, 7, 3.6, 4.4, 6.3, false), BAY_U = bayParts(5, 6, 3.0, 3.4, 5.1, true);
    const groundBays = [], upperBays = [], portals = [], towers = [], merlons = [];
    function merlonRow(x0, z0, x1, z1, y, step = 1.5) {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / step), ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      for (let i = 0; i <= n; i++) { const t = (i + .5 * (len / step - n)) / (len / step); merlons.push(mat4(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, ry)); }
    }
    const L = 150, W = 36, Y0 = .3, GH = 7, FH = .9, UH = 6, REC = 2.6;
    const yF = Y0 + GH, yU = yF + FH, yR = yU + UH, yTop = yR + .8;
    const BRIDGES = [-40, 0, 40], TOWER_X = [-62, -31, 0, 31, 62];
    const WINGS = [{ cz: -31, outer: -1 }, { cz: 31, outer: 1 }];
    const wingS = [], wingT = [];
    const frieze = (w, h, d, x, y, z) => { const m = new THREE.Mesh(box(w, h, d, x, y, z), [M.tile, M.tile, M.stucco, M.stucco, M.tile, M.tile]); m.castShadow = m.receiveShadow = true; add(m); };

    for (const wg of WINGS) {
      const cz = wg.cz;
      wingS.push(box(L + 1.4, Y0, W + 1.4, 0, Y0 / 2, cz));
      frieze(L + .5, FH, W + .5, 0, yF + FH / 2, cz);
      wingS.push(box(L + .6, .8, W + .6, 0, yR + .4, cz));
      wingT.push(box(L + .7, .28, W + .7, 0, yR + .1, cz));
      for (const [x0, z0, x1, z1] of [[-L / 2, cz - W / 2, L / 2, cz - W / 2], [-L / 2, cz + W / 2, L / 2, cz + W / 2], [-L / 2, cz - W / 2, -L / 2, cz + W / 2], [L / 2, cz - W / 2, L / 2, cz + W / 2]]) {
        wingS.push(box(Math.abs(x1 - x0) + .4, .6, Math.abs(z1 - z0) + .4, (x0 + x1) / 2, yTop + .3, (z0 + z1) / 2));
        merlonRow(x0, z0, x1, z1, yTop + .6);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) wingS.push(box(1.3, yR - Y0, 1.3, sx * L / 2, Y0 + (yR - Y0) / 2, cz + sz * W / 2));
      const sides = [{ ry: 0, cx: 0, z: cz + W / 2, len: L }, { ry: Math.PI, cx: 0, z: cz - W / 2, len: L }, { ry: Math.PI / 2, cx: L / 2, z: cz, len: W }, { ry: -Math.PI / 2, cx: -L / 2, z: cz, len: W }];
      for (const sd of sides) {
        const long = sd.len === L, nz = Math.round(Math.cos(sd.ry));
        const outerLong = long && nz === wg.outer, innerLong = long && !outerLong, portal = outerLong || !long;
        const along = Math.cos(sd.ry) >= 0 ? 1 : -1;
        facade(groundBays, sd.cx, sd.z, sd.ry, sd.len, Y0, 5, portal ? [0] : []);
        facade(upperBays, sd.cx, sd.z, sd.ry, sd.len, yU, 5, portal ? [0] : innerLong ? BRIDGES.map(b => b * along) : []);
        if (portal) portals.push(mat4(sd.cx, Y0, sd.z, sd.ry));
        const n = new V3(Math.sin(sd.ry), 0, Math.cos(sd.ry)), il = sd.len - 2 * REC;
        for (const [h, y, m] of [[GH, Y0, M.shopG], [UH, yU, M.shopU]]) {
          const p = new THREE.Mesh(plane(il, h), m); p.rotation.y = sd.ry;
          p.position.set(sd.cx - n.x * REC, y + h / 2, sd.z - n.z * REC); p.receiveShadow = true; add(p);
        }
      }
      const vlen = L - 22;
      wingS.push(box(vlen + 2, 1.1, 13.4, 0, yTop + .55, cz));
      const vault = new THREE.CylinderGeometry(6, 6, vlen, 40, 1, true, 0, Math.PI); vault.rotateZ(Math.PI / 2); vault.translate(0, yTop + 1.1, cz);
      mesh(vault, new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: .55, metalness: .05, side: THREE.DoubleSide }));
      for (let x = -vlen / 2; x <= vlen / 2 + .01; x += vlen / 16) { const t = new THREE.TorusGeometry(6.05, .2, 6, 28, Math.PI); t.rotateY(Math.PI / 2); t.translate(x, yTop + 1.1, cz); wingT.push(t); }
      for (const sx of [-1, 1]) { const cap = new THREE.CircleGeometry(6, 28, 0, Math.PI); cap.rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2); cap.translate(sx * vlen / 2, yTop + 1.1, cz); wingT.push(cap); }
      for (const x of TOWER_X) for (const sz of [-1, 1]) towers.push(mat4(x, yTop, cz + sz * 14.2, 0));
    }
    for (const bx of BRIDGES) {
      frieze(10.2, FH, 26, bx, yF + FH / 2, 0);
      facade(upperBays, bx + 5, 0, Math.PI / 2, 26, yU);
      facade(upperBays, bx - 5, 0, -Math.PI / 2, 26, yU);
      add(new THREE.Mesh(box(7.6, UH, 26, bx, yU + UH / 2, 0), M.glass));
      wingS.push(box(10.6, .8, 26.2, bx, yR + .4, 0)); wingT.push(box(10.7, .28, 26.2, bx, yR + .1, 0));
      for (const sx of [-1, 1]) { wingS.push(box(.4, .6, 26, bx + sx * 5.1, yTop + .3, 0)); merlonRow(bx + sx * 5.1, -13, bx + sx * 5.1, 13, yTop + .6); }
    }
    mesh(merge(wingS), M.stucco); mesh(merge(wingT), M.tile);
    instanced(BAY_G.S, M.stucco, groundBays); instanced(BAY_G.T, M.tile, groundBays, { cast: false });
    instanced(BAY_U.S, M.stucco, upperBays); instanced(BAY_U.T, M.tile, upperBays, { cast: false });
    instanced(merge([box(.62, .55, .28, 0, .27, 0), box(.36, .4, .28, 0, .75, 0), box(.14, .2, .28, 0, 1.05, 0)]), M.stucco, merlons);

    // wind tower (barjeel)
    {
      const S = [], T = [], D = [];
      S.push(box(3.4, 7.2, 3.4, 0, 3.6, 0)); T.push(box(3.62, .7, 3.62, 0, 7.55, 0)); D.push(box(3.0, 3.7, 3.0, 0, 9.75, 0));
      const fs = new THREE.Shape(); fs.moveTo(-1.8, 0); fs.lineTo(1.8, 0); fs.lineTo(1.8, 3.7); fs.lineTo(-1.8, 3.7); fs.closePath();
      for (const cx of [-.78, .78]) fs.holes.push(a.archHole(1.0, 2.35, 3.15, cx, .35));
      const face = extrude(fs, .22, 1.5); face.translate(0, 7.9, 0);
      for (let k = 0; k < 4; k++) { const f = face.clone(); f.rotateY(k * Math.PI / 2); S.push(f); }
      for (let k = 0; k < 4; k++) { const p = plane(.32, 2.6); p.translate(0, 9.4, 1.73); p.rotateY(k * Math.PI / 2); T.push(p); }
      S.push(box(3.95, .35, 3.95, 0, 11.78, 0)); T.push(box(3.72, .6, 3.72, 0, 12.25, 0)); S.push(box(4.0, .3, 4.0, 0, 12.7, 0));
      for (let k = 0; k < 4; k++) for (const t of [-1.3, -.43, .43, 1.3]) { const x = box(.52, .5, .24, t, 13.1, 1.86), y = box(.3, .34, .24, t, 13.52, 1.86); x.rotateY(k * Math.PI / 2); y.rotateY(k * Math.PI / 2); S.push(x, y); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { S.push(box(.42, 1.2, .42, sx * 1.85, 13.4, sz * 1.85)); T.push(box(.3, .3, .3, sx * 1.85, 14.15, sz * 1.85)); }
      instanced(merge(S), M.stucco, towers); instanced(merge(T), M.tile, towers); instanced(merge(D), M.dark, towers, { cast: false });
    }
    // grand entrance portals
    {
      const w = 10, h = 16.6, aw = 6.4, sp = 9.6, ap = 13.8, S = [], T = [], G = [];
      S.push(extrude(bayShape(w, h, aw, sp, ap), 2.4, -1.4)); T.push(extrude(ringShape(aw, sp, ap, .45), .15, 1.0));
      const back = plane(aw, ap); back.translate(0, ap / 2, -1.3); T.push(back);
      T.push(box(w - 1.4, 1.3, .12, 0, ap + 1.55, 1.02));
      const door = plane(4.2, 5); door.translate(0, 2.5, -1.24); G.push(door);
      S.push(box(10.6, .7, 2.8, 0, h + .35, -.2));
      for (let x = -4.5; x <= 4.51; x += 1.5) S.push(box(.62, .6, .3, x, h + 1.0, .95), box(.36, .42, .3, x, h + 1.5, .95));
      for (const sx of [-1, 1]) {
        const px = sx * 5.75;
        S.push(box(1.4, 19, 1.4, px, 9.5, .3)); T.push(box(1.56, .6, 1.56, px, 15.4, .3), box(1.56, .6, 1.56, px, 18.3, .3));
        T.push(a.dome(.85, px, 19, .3, 18)); const f = new THREE.ConeGeometry(.12, .9, 8); f.translate(px, 20.2, .3); S.push(f);
      }
      instanced(merge(S), M.stucco, portals); instanced(merge(T), M.tile, portals); instanced(merge(G), M.glass, portals, { cast: false });
    }

    // surroundings
    flat(6000, 1400, 0, 602, 0, M.ground); flat(6000, 2400, 0, -2300, 0, M.ground);
    flat(240, 124, 0, 0, .02, M.paver);
    flat(176, 26, 0, 0, .05, M.asphalt); flat(160, 26, 0, 0, .07, M.stalls);
    flat(3000, 24, 0, 74, .04, M.asphalt); flat(3000, 16, 0, -72, .04, M.asphalt); flat(3000, 18, 0, -89, .06, M.paver);
    for (const z of [68, 80, -72]) { const g = plane(3000, .22); g.rotateX(-Math.PI / 2); g.translate(0, .08, z); mesh(g, M.paint, { cast: false, receive: false }); }
    mesh(box(3000, .3, 2.4, 0, .15, 74), M.stone); mesh(box(3000, 1.1, .7, 0, .1, -98.2), M.stone);
    mesh(box(3000, .25, .5, 0, .17, -62.3), M.stone); mesh(box(3000, .25, .5, 0, .17, 62.2), M.stone);
    water(6000, 1000, 0, -598);
    const spots = [];
    for (let x = -600; x <= 600; x += 13) spots.push([x + R() * 2, -88 + (R() - .5) * 3]);
    for (let x = -600; x <= 600; x += 17) spots.push([x, 74]);
    for (const sx of [-1, 1]) for (let z = -54; z <= 54; z += 12) spots.push([sx * (88 + R() * 4), z]);
    for (let x = -110; x <= 110; x += 15) { spots.push([x, -56]); spots.push([x, 57]); }
    palms(spots);
    const lm = [];
    for (let x = -600; x <= 600; x += 26) { lm.push(mat4(x, 0, -81, Math.PI)); lm.push(mat4(x + 13, 0, 62.6, 0)); lm.push(mat4(x, 0, 85.5, Math.PI)); }
    for (const sx of [-1, 1]) for (let x = -70; x <= 70; x += 28) lm.push(mat4(x, 0, sx * 12.4, sx > 0 ? Math.PI : 0));
    lamps(lm);
    const near = [[18, 12, 18], [22, 16, 20], [24, 22, 22], [30, 28, 26], [20, 36, 20], [26, 46, 24]];
    const far = [[24, 60, 24], [28, 90, 26], [30, 125, 28], [34, 165, 32], [26, 200, 26]];
    const nc = [];
    for (let x = -1000; x <= 1000; x += 46) for (let z = -40; z <= 1250; z += 46) {
      if (R() < .22) continue;
      const px = x + (R() - .5) * 14, pz = z + (R() - .5) * 14;
      if ((Math.abs(px) < 150 && pz < 64) || (pz > 52 && pz < 100)) continue;
      let k = (R() * 4) | 0; if (Math.hypot(px, pz) > 400 && R() < .4) k = 4 + ((R() * 2) | 0);
      nc.push({ x: px, z: pz, r: R() < .5 ? 0 : Math.PI / 2, k });
    }
    city(nc, near);
    const fc = [];
    for (let x = -1500; x <= 1500; x += 60) for (let z = -1140; z >= -1700; z -= 60) { if (R() < .35) continue; fc.push({ x: x + (R() - .5) * 20, z: z + (R() - .5) * 20, k: z > -1260 ? ((R() * 3) | 0) : ((R() * 5) | 0) }); }
    city(fc, far);
    const parked = [];
    for (const sz of [-1, 1]) for (let x = -76; x <= 76; x += 2.8) if (R() < .82) parked.push(mat4(x, 0, sz * 9.6, Math.PI / 2 + (sz > 0 ? Math.PI : 0)));
    for (const sx of [-1, 1]) for (let row = 0; row < 4; row++) for (let z = -48; z <= 48; z += 2.8) if (R() < .7) parked.push(mat4(sx * (100 + row * 8), 0, z, row % 2 ? 0 : Math.PI));
    const lane = (z, dir, n) => ({ pts: dir > 0 ? [new V3(-700, 0, z), new V3(700, 0, z)] : [new V3(700, 0, z), new V3(-700, 0, z)], n });
    cars(parked, [lane(66, 1, 10), lane(71, 1, 9), lane(77, -1, 10), lane(82, -1, 9), lane(-69, 1, 7), lane(-75, -1, 7)]);
    const paths = [];
    for (const wg of WINGS) for (const sz of [-1, 1]) paths.push([-73, wg.cz + sz * (W / 2 - 1.3), 73, wg.cz + sz * (W / 2 - 1.3), Y0]);
    paths.push([-300, -86, 300, -86], [-300, -91, 300, -91], [-80, 13.5, 80, 13.5], [-80, -13.5, 80, -13.5], [-76, -45, -76, 45], [76, -45, 76, 45]);
    crowd(paths, 260);
    const pl = [];
    for (const wg of WINGS) for (const x of [-50, 0, 50]) pl.push([x, 5, wg.cz + wg.outer * (W / 2 + 6)]);
    for (const x of [-60, -20, 20, 60]) pl.push([x, 6, 0, 0xffc58a, 40]);
    pointLights(pl);

    return {
      views: {
        aerial: ['Aerial', [235, 150, 255], [0, 6, 0], [140, 120, 300]],
        lagoon: ['Lagoon front', [-125, 5, -93], [0, 13, -38], [-30, 5, -95], [20, 13, -38]],
        towers: ['Wind towers', [-92, 34, -58], [-40, 21, -31], [-20, 32, -62], [20, 21, -31]],
        bridges: ['Bridges', [-112, 5, 1], [0, 11, 0], [-62, 6, 3], [10, 11, 0]],
        street: ['King Faisal St', [118, 3.2, 69], [10, 10, 38], [55, 3.2, 70], [-20, 10, 38]],
        plan: ['Top down', [0, 300, 40], [0, 0, 0], [45, 280, -30]],
        inside: { name: 'Walk inside', link: 'souqin' },
      },
      labels: [
        ['Lagoon wing', 'Gold, jewellery, perfume', [0, 33, -31]],
        ['King Faisal St wing', 'Carpets, textiles, antiques', [0, 33, 31]],
        ['Covered bridges', 'Air-conditioned links, upper level', [40, 19, 0]],
        ['Wind towers', '20 barjeel, natural cooling', [-62, 32, -45.2]],
        ['Khalid Lagoon', '', [-170, 4, -340], 'water'],
        ['King Faisal Street', '', [-190, 4, 74]],
        ['Corniche promenade', '', [210, 4, -89]],
      ],
    };
  },
});
