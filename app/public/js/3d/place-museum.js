/* Sharjah Museum of Islamic Civilization, Corniche Street, Al Majarrah — facing Sharjah Creek */
S3.register({
  id: 'museum', title: 'Museum of Islamic Civilization', short: 'Islamic Museum', arabic: 'متحف الشارقة للحضارة الإسلامية',
  eyebrow: 'Al Majarrah · Corniche Street · 1987 / 2008',
  lede: 'Built in 1987 as Souq Al Majarrah, this 200 m arcade became a museum in 2008. Its golden dome hides a celestial mosaic of the twelve zodiac constellations, set in 24-carat gold.',
  facts: [['Length', '200 m'], ['Arches', '90'], ['Opened as souq', '1987'], ['Museum since', '2008']],
  map: 'https://maps.app.goo.gl/aKy7W7AAkBjNwEYH6',
  ar: {"eyebrow": "المجرة · شارع الكورنيش · 1987 / 2008", "lede": "بُني عام 1987 سوقًا باسم سوق المجرة، وتحول هذا الرواق البالغ طوله 200 متر إلى متحف عام 2008. تخفي قبته الذهبية فسيفساء سماوية للأبراج الاثني عشر مرصعة بذهب عيار 24.", "facts": [["الطول", "200 م"], ["الأقواس", "90"], ["افتُتح سوقًا", "1987"], ["متحف منذ", "2008"]], "views": {"creek": "من الخور", "dome": "القبة الذهبية", "zodiac": "سقف الأبراج", "arcade": "تسعون قوسًا", "dhows": "مرسى المراكب", "aerial": "من الجو"}, "labels": [["القبة الذهبية", "فسيفساء الأبراج في الداخل"], ["تسعون قوسًا", "طابقان من الأروقة"], ["شارع الكورنيش", ""], ["خور الشارقة", ""], ["مرسى المراكب", "مراكب خشبية تقليدية"]]},
  env: { center: [0, 0, -20], shadow: 160 },
  build(a) {
    const { THREE, V3, M, T, R, pick, cv, tex, speck, star, box, plane, cyl, dome, extrude, bayShape, ringShape, merge, mat4, mesh, instanced, flat, water, palms, lamps, city, cars, crowd, pointLights, glow, bayParts, facade, add, onUpdate } = a;
    const sandStone = new THREE.MeshStandardMaterial({ map: T.stucco, color: 0xe2c79a, roughness: .85, emissive: 0x7a5426, emissiveIntensity: 0 });
    const trim = new THREE.MeshStandardMaterial({ map: T.stucco, color: 0xfff6e6, roughness: .7, emissive: 0x7a5a30, emissiveIntensity: 0 });
    glow(sandStone, .3); glow(trim, .35);
    // carved wooden mashrabiya screens behind the arcade, glowing warm at night
    const [msh, mshE] = (() => {
      const [c, g] = cv(128, 128), [e, ge] = cv(128, 128);
      g.fillStyle = '#3b2616'; g.fillRect(0, 0, 128, 128); ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 128; x += 16) for (let y = 0; y < 128; y += 16) {
        g.fillStyle = '#1a120b'; g.beginPath(); g.arc(x + 8, y + 8, 5, 0, 7); g.fill();
        ge.fillStyle = '#ffb565'; ge.beginPath(); ge.arc(x + 8, y + 8, 4, 0, 7); ge.fill();
        g.fillStyle = '#6b4526'; g.fillRect(x + 7, y, 2, 16); g.fillRect(x, y + 7, 16, 2);
      }
      return [tex(c, 1 / 1.6, 1 / 1.6), tex(e, 1 / 1.6, 1 / 1.6)];
    })();
    const screenM = new THREE.MeshStandardMaterial({ map: msh, emissiveMap: mshE, emissive: 0xffffff, emissiveIntensity: 0, roughness: .8 });
    glow(screenM, 1.3, .05);

    const L = 200, D = 44, Y0 = .4, GH = 7, FH = .9, UH = 6, REC = 2.4;
    const yF = Y0 + GH, yU = yF + FH, yR = yU + UH, yTop = yR + .8;
    const S = [], Tr = [], merl = [];
    const merlonRow = (x0, z0, x1, z1, y) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 1.6), ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2; for (let i = 0; i <= n; i++) { const t = n ? i / n : .5; merl.push(mat4(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, ry)); } };

    // main two-storey arcaded range (skipping the central pavilion)
    const gB = [], uB = [];
    S.push(box(L + 2, Y0, D + 2, 0, Y0 / 2, 0));
    for (const sx of [-1, 1]) {
      const w = L / 2 - 16, cx = sx * (16 + w / 2);
      const fr = new THREE.Mesh(box(w + .25, FH, D + .5, cx + sx * .125, yF + FH / 2, 0), trim); fr.castShadow = fr.receiveShadow = true; add(fr);
      S.push(box(w + .3, .8, D + .6, cx + sx * .15, yR + .4, 0)); Tr.push(box(w + .35, .3, D + .7, cx + sx * .175, yR + .12, 0));
      S.push(box(w - REC, yR - Y0, D - 2 * REC, cx - sx * REC / 2, Y0 + (yR - Y0) / 2, 0));
    }
    for (const [z, ry] of [[-D / 2, Math.PI], [D / 2, 0]]) {
      for (const half of [-1, 1]) {
        const len = (L / 2 - 16), cx = half * (16 + len / 2);
        facade(gB, cx, z, ry, len, Y0, 4.44); facade(uB, cx, z, ry, len, yU, 4.44);
        S.push(box(len, .6, .4, cx, yTop + .3, z)); merlonRow(cx - len / 2, z, cx + len / 2, z, yTop + .6);
      }
    }
    for (const sx of [-1, 1]) { facade(gB, sx * L / 2, 0, sx * Math.PI / 2, D, Y0, 4.44); facade(uB, sx * L / 2, 0, sx * Math.PI / 2, D, yU, 4.44); S.push(box(.4, .6, D, sx * L / 2, yTop + .3, 0)); merlonRow(sx * L / 2, -D / 2, sx * L / 2, D / 2, yTop + .6); }
    const BG = bayParts(4.44, 7, 3.0, 4.3, 6.0, false, false), BU = bayParts(4.44, 6, 2.6, 3.4, 4.9, true, false);
    instanced(BG.S, sandStone, gB); instanced(BG.T, trim, gB, { cast: false });
    instanced(BU.S, sandStone, uB); instanced(BU.T, trim, uB, { cast: false });
    // recessed mashrabiya walls
    for (const [z, ry] of [[-D / 2 + REC, Math.PI], [D / 2 - REC, 0]]) for (const half of [-1, 1]) {
      const len = L / 2 - 16 - REC, cx = half * (16 + len / 2);
      for (const [h, y] of [[GH, Y0], [UH, yU]]) { const p = new THREE.Mesh(plane(len, h), screenM); p.rotation.y = ry; p.position.set(cx, y + h / 2, z); p.receiveShadow = true; add(p); }
    }
    for (const sx of [-1, 1]) for (const [h, y] of [[GH, Y0], [UH, yU]]) { const p = new THREE.Mesh(plane(D - 2 * REC, h), screenM); p.rotation.y = sx * Math.PI / 2; p.position.set(sx * (L / 2 - REC), y + h / 2, 0); add(p); }
    // end towers with wind-catcher crowns
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (L / 2 - 1), z = sz * (D / 2 - 1);
      S.push(box(5, yTop + 6, 5, x, (yTop + 6) / 2, z));
      S.push(box(5.6, .5, 5.6, x, yTop + 6.25, z));
      const slots = []; for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) for (const o of [-1.2, 0, 1.2]) { const s2 = plane(.6, 2.6); s2.translate(o, yTop + 3.9, 2.52); s2.rotateY(r); s2.translate(x, 0, z); slots.push(s2); }
      mesh(merge(slots), M.dark, { cast: false });
      for (const o of [-1.9, -.65, .65, 1.9]) { S.push(box(.6, .6, .3, x + o, yTop + 6.8, z + 2.65), box(.6, .6, .3, x + o, yTop + 6.8, z - 2.65)); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.push(box(1.2, yR - Y0, 1.2, sx * 16.6, Y0 + (yR - Y0) / 2, sz * D / 2));

    // central pavilion around the domed atrium (hollow so the zodiac ceiling can be visited)
    const PH = 19, AH = 12, AO = 13.2; // pavilion height, atrium half-size (arcade line), outer wall of atrium
    for (const [w, d, x, z] of [[34, 27 - AO, 0, -(AO + 27) / 2], [34, 27 - AO, 0, (AO + 27) / 2], [17 - AO, 2 * AO, -(AO + 17) / 2, 0], [17 - AO, 2 * AO, (AO + 17) / 2, 0]]) S.push(box(w, PH, d, x, PH / 2, z));
    for (const [w, d, x, z] of [[35.4, 2, 0, -26.5], [35.4, 2, 0, 26.5], [2, 54.6, -17.2, 0], [2, 54.6, 17.2, 0]]) S.push(box(w, .5, d, x, PH + .25, z));
    for (const [w, d, x, z] of [[2 * AO, AO - AH + .1, 0, -(AO + AH) / 2], [2 * AO, AO - AH + .1, 0, (AO + AH) / 2], [AO - AH + .1, 2 * AO, -(AO + AH) / 2, 0], [AO - AH + .1, 2 * AO, (AO + AH) / 2, 0]]) S.push(box(w, PH - 16.2, d, x, 16.2 + (PH - 16.2) / 2, z));
    for (const [x0, z0, x1, z1] of [[-17, -27, 17, -27], [-17, 27, 17, 27], [-17, -27, -17, 27], [17, -27, 17, 27]]) merlonRow(x0, z0, x1, z1, PH + .5);
    // grand arched entrances front & back
    const portalS = [], portalT = [];
    for (const [z, ry] of [[-27, Math.PI], [27, 0]]) {
      const g = extrude(bayShape(14, PH - 1, 8, 9.5, 14.5), 1.6, -.4); g.rotateY(ry); g.translate(0, Y0, z); portalS.push(g);
      const r2 = extrude(ringShape(8, 9.5, 14.5, .55), .2, 1.2); r2.rotateY(ry); r2.translate(0, Y0, z); portalT.push(r2);
      const gp = box(13, 1.6, .2, 0, PH - 2.2, 0); gp.translate(0, 0, 1.3); gp.rotateY(ry); gp.translate(0, 0, z); portalT.push(gp);
      const door = plane(5.6, 6.5); door.translate(0, 3.25 + Y0, .02); door.rotateY(ry); door.translate(0, 0, z); add(new THREE.Mesh(door, M.glass));
    }
    mesh(merge(portalS), sandStone); mesh(merge(portalT), M.gold);
    // gold-mosaic band under the pavilion cornice
    for (const [w, d, x, z] of [[34.4, .1, 0, -27.05], [34.4, .1, 0, 27.05]]) mesh(box(w, .9, d, x, PH - 1.6, z), M.gold, { cast: false });
    // roof ring with circular opening for the drum
    const ringShp = new THREE.Shape(); ringShp.moveTo(-AO - .1, -AO - .1); ringShp.lineTo(AO + .1, -AO - .1); ringShp.lineTo(AO + .1, AO + .1); ringShp.lineTo(-AO - .1, AO + .1); ringShp.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, 11, 0, Math.PI * 2, true); ringShp.holes.push(hole);
    const pend = new THREE.ExtrudeGeometry(ringShp, { depth: 1.2, bevelEnabled: false, curveSegments: 48 }); pend.rotateX(-Math.PI / 2); pend.translate(0, PH - 1.2, 0);
    mesh(pend, new THREE.MeshStandardMaterial({ map: T.stucco, color: 0xf3e6cf, roughness: .8, side: THREE.DoubleSide }));
    // drum with windows
    const DRUM = 5.2, DR = 11.4, dY = PH;
    mesh(cyl(DR, DR, DRUM, 64, 0, dY + DRUM / 2, 0, true), new THREE.MeshStandardMaterial({ map: T.stucco, color: 0xe9d3ad, roughness: .8, side: THREE.DoubleSide, emissive: 0x7a5426, emissiveIntensity: 0 }));
    const dwin = [], dwinIn = [];
    for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; dwin.push(mat4(Math.sin(an) * (DR + .03), dY + .9, Math.cos(an) * (DR + .03), an)); dwinIn.push(mat4(Math.sin(an) * (DR - .03), dY + .9, Math.cos(an) * (DR - .03), an + Math.PI)); }
    const wShape = new THREE.Shape(); wShape.moveTo(-.8, 0); wShape.lineTo(.8, 0); a.archPts(1.6, 2.2, 3.2).reverse().forEach(p => wShape.lineTo(p.x, p.y)); wShape.closePath();
    const wGeo = new THREE.ShapeGeometry(wShape);
    instanced(wGeo, M.glass, dwin, { cast: false }); instanced(wGeo, M.glass, dwinIn, { cast: false });
    instanced(extrude(ringShape(1.6, 2.2, 3.2, .2, false), .15, 0), M.gold, dwin, { cast: false });
    mesh(cyl(DR + .5, DR + .5, .5, 64, 0, dY + DRUM + .1, 0, true), trim); mesh(new THREE.RingGeometry(DR - .05, DR + .5, 64).rotateX(-Math.PI / 2).translate(0, dY + DRUM + .35, 0), trim, { cast: false });
    // golden dome (outside) + zodiac mosaic (inside)
    const domeY = dY + DRUM + .3;
    const outer = dome(DR + .2, 0, 0, 0, 64, 1.18); outer.translate(0, domeY, 0);
    mesh(outer, M.gold);
    const ribs = []; for (let i = 0; i < 24; i++) { const r = new THREE.TorusGeometry(DR + .25, .09, 4, 40, Math.PI / 2); r.scale(1, 1.18, 1); r.rotateY(i / 24 * Math.PI * 2); r.translate(0, domeY, 0); ribs.push(r); }
    mesh(merge(ribs), M.brass, { cast: false });
    const zod = (() => {
      const W = 2048, H = 1024, [c, g] = cv(W, H);
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#0d1d4a'); grd.addColorStop(1, '#13306e'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
      speck(g, W, H, 9000, .9, ['#e9c46a', '#ffffff', '#9fb6e8']);
      g.fillStyle = '#e2b24b'; for (const y of [150, 170, 300, 318, 742, 760, 900]) g.fillRect(0, y, W, 6);
      for (let i = 0; i < 32; i++) { const x = i * W / 32; g.fillStyle = i % 2 ? '#c99a3a' : '#f0cc6a'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + W / 64, 150); g.lineTo(x + W / 32, 0); g.fill(); }
      const signs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
      for (let i = 0; i < 12; i++) {
        const x0 = i * W / 12, cx = x0 + W / 24, cy = 530;
        g.strokeStyle = '#e2b24b'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 150, 0, 7); g.stroke();
        g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 136, 0, 7); g.stroke();
        const pts = []; for (let k = 0; k < 7; k++) pts.push([cx + (R() - .5) * 200, cy + (R() - .5) * 200]);
        g.strokeStyle = 'rgba(240,210,130,.75)'; g.lineWidth = 2; g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
        g.fillStyle = '#fff3c8'; for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
        g.fillStyle = '#f2cf72'; g.font = 'bold 90px "Apple Symbols","Segoe UI Symbol","Noto Sans Symbols",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(signs[i] + '︎', cx, cy + 4);
        g.fillStyle = '#e2b24b'; star(g, x0, 530, 26, 12, 8); g.fill();
      }
      for (let x = 0; x < W; x += 64) { g.fillStyle = '#e2b24b'; star(g, x + 32, 830, 22, 10, 8); g.fill(); }
      const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t;
    })();
    const inner = dome(DR - .2, 0, 0, 0, 64, 1.16); inner.translate(0, domeY, 0);
    const zodM = new THREE.MeshStandardMaterial({ map: zod, emissiveMap: zod, emissive: 0xffffff, emissiveIntensity: .35, roughness: .45, metalness: .2, side: THREE.BackSide });
    mesh(inner, zodM, { cast: false });
    // finial
    mesh(merge([new THREE.CylinderGeometry(.12, .2, 3.4, 8).translate(0, domeY + (DR + .2) * 1.18 + 1.6, 0), new THREE.SphereGeometry(.55, 14, 10).translate(0, domeY + (DR + .2) * 1.18 + 1, 0), new THREE.SphereGeometry(.35, 14, 10).translate(0, domeY + (DR + .2) * 1.18 + 2.4, 0)]), M.brass, { receive: false });
    // atrium interior: arcaded walls, marble floor with a star inlay, warm lamps
    const inB = [];
    for (const [x, z, ry] of [[0, -AH, 0], [0, AH, Math.PI], [-AH, 0, Math.PI / 2], [AH, 0, -Math.PI / 2]]) { facade(inB, x, z, ry, 2 * AH, Y0, 4.8); facade(inB, x, z, ry, 2 * AH, yU + 1, 4.8); }
    const AB = bayParts(4.8, 7, 3.2, 4.4, 6.2, false, true);
    instanced(AB.S, trim, inB, { cast: false }); instanced(AB.T, M.gold, inB, { cast: false });
    const atriumWall = new THREE.MeshStandardMaterial({ map: msh, emissiveMap: mshE, emissive: 0xffffff, emissiveIntensity: .5, roughness: .8 });
    for (const [x, z, ry] of [[0, -AO + .05, 0], [0, AO - .05, Math.PI], [-AO + .05, 0, Math.PI / 2], [AO - .05, 0, -Math.PI / 2]]) { const p = new THREE.Mesh(plane(2 * AO, 16), atriumWall); p.rotation.y = ry; p.position.set(x, 8 + Y0, z); add(p); }
    flat(2 * AO, 2 * AO, 0, 0, Y0 + .01, M.marble);
    const inlay = new THREE.Shape(); for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8, r = i % 2 ? 3.2 : 7; inlay.lineTo(Math.cos(an) * r, Math.sin(an) * r); } inlay.closePath();
    const inl = new THREE.ShapeGeometry(inlay); inl.rotateX(-Math.PI / 2); inl.translate(0, Y0 + .03, 0);
    add(new THREE.Mesh(inl, new THREE.MeshStandardMaterial({ color: 0x1f4f7a, roughness: .3 })));
    const inl2 = new THREE.CircleGeometry(2.4, 32); inl2.rotateX(-Math.PI / 2); inl2.translate(0, Y0 + .04, 0); add(new THREE.Mesh(inl2, M.brass));
    const atriumLight = new THREE.PointLight(0xffd6a0, 1.6, 44, 1.6); atriumLight.position.set(0, 12, 0); add(atriumLight);
    const atriumLight2 = new THREE.PointLight(0xffe2b8, .9, 40, 1.6); atriumLight2.position.set(0, 26, 0); add(atriumLight2);
    // hanging lanterns
    const lan = []; for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; lan.push(mat4(Math.cos(an) * 8, 9, Math.sin(an) * 8)); }
    const lanM = new THREE.MeshStandardMaterial({ color: 0xffe9b8, emissive: 0xffb760, emissiveIntensity: 1.4 });
    instanced(merge([new THREE.CylinderGeometry(.35, .5, 1.1, 8), new THREE.ConeGeometry(.45, .5, 8).translate(0, .8, 0), new THREE.CylinderGeometry(.015, .015, 8, 3).translate(0, 4.8, 0)]), lanM, lan, { cast: false });

    mesh(merge(S), sandStone); mesh(merge(Tr), trim, { cast: false });
    instanced(merge([box(.7, .6, .3, 0, .3, 0), box(.4, .45, .3, 0, .82, 0), box(.16, .22, .3, 0, 1.15, 0)]), sandStone, merl);

    // forecourt with pools, palms, Corniche Street, quay and creek
    flat(240, 30, 0, -38, .03, M.paver); flat(240, 26, 0, 37, .03, M.paver);
    const poolM = new THREE.MeshStandardMaterial({ color: 0x2a7c95, roughness: .05, metalness: .2, envMapIntensity: 1.6 });
    for (const x of [-70, -40, 40, 70]) { mesh(box(18, .5, 5, x, .25, -36), M.marble); add(new THREE.Mesh(plane(17, 4).rotateX(-Math.PI / 2).translate(x, .52, -36), poolM)); }
    flat(4000, 20, 0, -60, .04, M.asphalt); flat(4000, 14, 0, -80, .05, M.paver);
    mesh(box(4000, .3, 1.8, 0, .15, -60), M.stone);
    for (const z of [-55, -65]) { const g = plane(4000, .22); g.rotateX(-Math.PI / 2); g.translate(0, .08, z); mesh(g, M.paint, { cast: false, receive: false }); }
    mesh(box(4000, 1.6, 1.2, 0, -.2, -87.4), M.stone);
    flat(6000, 1600, 0, 712, 0, M.ground); flat(6000, 2400, 0, -1550, 0, M.ground);
    water(6000, 270, 0, -223, -.6, { color: 0x0d5560, size: 5 });
    flat(4000, 30, 0, -373, .05, M.paver); mesh(box(4000, 1.6, 1.2, 0, -.2, -358.4), M.stone);
    // dhows moored two-deep along the quay
    const dhow = (() => {
      const n = 16, Lh = 20, Bh = 6.2, sec = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), x = -Lh / 2 + t * Lh;
        const half = Bh / 2 * (t < .14 ? .78 + t / .14 * .22 : Math.pow(Math.cos((t - .14) / .86 * Math.PI / 2), .75)) + .02;
        const deck = 2.4 + 1.8 * Math.pow(1 - t, 3) + 1.4 * Math.pow(t, 4), bot = -1.3 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + .02)), .4);
        sec.push({ x, half, deck, bot });
      }
      const pos = [], uv = [], idx = [], ring = 13;
      sec.forEach((s, i) => { for (let k = 0; k < ring; k++) { const u = k / (ring - 1) * 2 - 1, au = Math.abs(u), y = s.bot + (s.deck - s.bot) * au, z = Math.sign(u) * s.half * Math.pow(Math.sin(au * Math.PI / 2), .55); pos.push(s.x, y, z); uv.push(s.x / 2, y / 2); } });
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < ring - 1; k++) { const p0 = i * ring + k, p1 = p0 + ring; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
      const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hull.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hull.setIndex(idx); hull.computeVertexNormals();
      const dp = [], di = []; sec.forEach(s => { dp.push(s.x, s.deck - .15, -s.half * .96, s.x, s.deck - .15, s.half * .96); });
      for (let i = 0; i < n - 1; i++) { const a0 = i * 2; di.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
      const deck = new THREE.BufferGeometry(); deck.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); deck.setIndex(di); deck.computeVertexNormals();
      deck.setAttribute('uv', new THREE.Float32BufferAttribute(dp.filter((_, i) => i % 3 !== 1).map(v => v / 2), 2));
      const gp = [], gi = []; sec.forEach(s => { for (const sd of [-1, 1]) gp.push(s.x, s.deck - .05, sd * s.half * 1.01, s.x, s.deck + .45, sd * s.half * 1.01); });
      for (let i = 0; i < n - 1; i++) for (const o of [0, 2]) { const a0 = i * 4 + o; gi.push(a0, a0 + 4, a0 + 1, a0 + 4, a0 + 5, a0 + 1); }
      const gun = new THREE.BufferGeometry(); gun.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gun.setIndex(gi); gun.computeVertexNormals();
      gun.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(gp.length / 3 * 2).fill(0), 2));
      const st = sec[2];
      const cabin = merge([box(4.6, 2.2, st.half * 1.7, -6.6, st.deck + 1.1, 0), box(5.2, .25, st.half * 1.9, -6.6, st.deck + 2.3, 0)]);
      const spars = merge([new THREE.CylinderGeometry(.16, .22, 11, 6).rotateZ(-.12).translate(2.4, sec[9].deck + 5.4, 0), new THREE.CylinderGeometry(.08, .12, 14, 5).rotateZ(1.15).translate(2.6, sec[9].deck + 8.4, 0), box(.3, 2.6, .3, -9.3, sec[0].deck + 1.2, 0)]);
      const tires = []; for (let x = -6; x <= 6; x += 3) for (const sd of [-1, 1]) { const s2 = sec[Math.round((x + 10) / 20 * 15)]; tires.push(new THREE.TorusGeometry(.45, .16, 6, 12).translate(x, s2.deck - 1, sd * (s2.half + .12))); }
      const cargo = []; for (let i = 0; i < 6; i++) cargo.push(box(1.2 + R(), .9 + R() * .6, 1.2 + R(), -1 + R() * 6, sec[8].deck + .4, (R() - .5) * 3));
      return { hull: merge([hull, deck]), gun, cabin, spars, tires: merge(tires), cargo: merge(cargo) };
    })();
    const dm = [], base = [];
    for (let i = 0; i < 18; i++) { const row = i % 2, x = -240 + i * 27 + (R() - .5) * 6, z = -94.5 - row * 7.2, ry = R() < .5 ? 0 : Math.PI, s = .85 + R() * .3; base.push({ x, z, ry, s, ph: R() * 6 }); dm.push(mat4(x, -.6, z, ry, s)); }
    const hullM = new THREE.MeshStandardMaterial({ map: T.wood, color: 0xc49a68, roughness: .7 });
    const gunM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 });
    const dhowMeshes = [
      instanced(dhow.hull, hullM, dm), instanced(dhow.gun, gunM, dm, { colors: [0x1f6f78, 0xf2efe6, 0x2b4d7a, 0xa33a2a] }),
      instanced(dhow.cabin, new THREE.MeshStandardMaterial({ map: T.wood, color: 0xe8dcc6, roughness: .7 }), dm),
      instanced(dhow.spars, new THREE.MeshStandardMaterial({ map: T.wood, color: 0x8a6440, roughness: .8 }), dm),
      instanced(dhow.tires, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .9 }), dm, { cast: false }),
      instanced(dhow.cargo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }), dm, { colors: [0x2e5e8c, 0xb5462e, 0xd8c39a, 0x4f7a3b, 0xe6e1d4] }),
    ];
    dhowMeshes.forEach(m => m.instanceMatrix.setUsage(THREE.DynamicDrawUsage));
    const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new V3(), sv = new V3();
    onUpdate((dt, t) => {
      base.forEach((b, i) => {
        e.set(Math.sin(t * .9 + b.ph) * .025, b.ry, Math.sin(t * .7 + b.ph) * .015); q.setFromEuler(e);
        pv.set(b.x, -.6 + Math.sin(t * 1.1 + b.ph) * .12, b.z); sv.setScalar(b.s); tm.compose(pv, q, sv);
        for (const m of dhowMeshes) m.setMatrixAt(i, tm);
      });
      for (const m of dhowMeshes) m.instanceMatrix.needsUpdate = true;
    });
    // wharf cargo on the far bank, cranes and warehouses
    const crates = []; for (let i = 0; i < 160; i++) crates.push(mat4(-300 + R() * 600, .6, -380 - R() * 18, (R() < .5 ? 0 : 1.57), .9 + R() * .6));
    instanced(box(1.4, 1.2, 1.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }), crates, { colors: [0xd8c39a, 0x8a6a45, 0x2e5e8c, 0xb5462e, 0xe6e1d4] });
    city(Array.from({ length: 40 }, (_, i) => ({ x: -500 + i * 25 + R() * 6, z: -420 - R() * 40, k: (R() * 2) | 0 })), [[20, 9, 30], [26, 12, 40]], [0xd6d0c6, 0xbfc7c9, 0xe0d6c3]);
    const pal = [];
    for (let x = -110; x <= 110; x += 11) { pal.push([x, -48]); pal.push([x + 5, 50]); }
    for (let x = -500; x <= 500; x += 14) pal.push([x, -80 + (R() - .5) * 2]);
    palms(pal);
    const lm = []; for (let x = -500; x <= 500; x += 25) { lm.push(mat4(x, 0, -73.5, Math.PI)); lm.push(mat4(x + 12, 0, -48.6, 0)); } lamps(lm);
    const lane = (z, dir, n) => ({ pts: dir > 0 ? [new V3(-900, 0, z), new V3(900, 0, z)] : [new V3(900, 0, z), new V3(-900, 0, z)], n });
    const parked = []; for (let x = -100; x <= 100; x += 2.8) if (R() < .8) parked.push(mat4(x, 0, 56, Math.PI / 2));
    cars(parked, [lane(-52, 1, 10), lane(-56.5, 1, 8), lane(-63.5, -1, 8), lane(-68, -1, 10)]);
    const cells = [];
    for (let x = -1100; x <= 1100; x += 46) for (let z = 80; z <= 1300; z += 46) { if (R() < .22) continue; cells.push({ x: x + (R() - .5) * 12, z: z + (R() - .5) * 12, r: R() < .5 ? 0 : 1.57, k: (R() * (z > 400 ? 5 : 3)) | 0 }); }
    for (const sx of [-1, 1]) for (let x = 140; x <= 1100; x += 46) for (let z = -30; z < 80; z += 46) if (R() > .3) cells.push({ x: sx * x, z, k: (R() * 3) | 0 });
    city(cells, [[18, 12, 18], [22, 16, 20], [24, 22, 22], [22, 34, 22], [26, 48, 24]]);
    const far = []; for (let x = -1500; x <= 1500; x += 60) for (let z = -480; z >= -1100; z -= 60) if (R() > .3) far.push({ x: x + (R() - .5) * 20, z, k: (R() * (z < -700 ? 4 : 2)) | 0 });
    city(far, [[24, 20, 24], [28, 40, 26], [30, 80, 28], [34, 130, 30]]);
    crowd([[-95, -24.4, 95, -24.4, Y0], [-95, 24.4, 95, 24.4, Y0], [-110, -40, 110, -40], [-400, -78, 400, -78], [-400, -83, 400, -83], [-9, -9, 9, 9, Y0], [-9, 9, 9, -9, Y0], [0, -30, 0, -11, Y0]], 170);
    pointLights([[-60, 5, -30], [0, 6, -34, 0xffd090, 50, 3], [60, 5, -30], [-60, 5, 30], [60, 5, 30]]);

    return {
      views: {
        creek: ['From the creek', [-70, 8, -175], [0, 15, 0], [70, 8, -175]],
        dome: ['Golden dome', [42, 36, -54], [0, 28, 0], [-42, 36, -54]],
        zodiac: ['Zodiac ceiling', [7.5, 2.4, -7.5], [0, 34, 0], [-7.5, 2.4, -7.5], [0, 34, 0]],
        arcade: ['Ninety arches', [-82, 3.2, -36], [-30, 7, -22], [-48, 3.2, -36], [10, 7, -22]],
        dhows: ['Dhow wharf', [140, 9, -125], [60, 2, -96], [40, 9, -130], [-40, 2, -96]],
        aerial: ['Aerial', [230, 150, -230], [0, 8, 0], [120, 130, -280]],
      },
      labels: [
        ['Golden dome', 'Zodiac mosaic inside', [0, 49, 0]],
        ['Ninety arches', 'Two storeys of arcades', [-60, 18, -22]],
        ['Corniche Street', '', [-180, 3, -60]],
        ['Sharjah Creek', '', [-150, 3, -200], 'water'],
        ['Dhow wharf', 'Traditional wooden dhows', [100, 12, -96]],
      ],
    };
  },
});
