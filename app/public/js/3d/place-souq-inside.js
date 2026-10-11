/* Inside the Central Souq — the lagoon wing's two-level gallery of shops under a glazed vault */
S3.register({
  id: 'souqin', title: 'Inside the Central Souq', short: 'Souq interior · walk in', arabic: 'داخل السوق المركزي',
  eyebrow: 'Walk in · two levels · 104 shops',
  lede: 'Walk the main gallery under its glazed vault: gold and diamond counters, carpet stacks, oud and perfume shelves, pashmina walls and antique brass, on two levels around a domed crossing.',
  facts: [['Shops here', '104'], ['Levels', '2'], ['Move', 'Drag · tap floor · WASD', 1], ['Shop types', 'Gold, carpets, oud, textiles, antiques', 1]],
  map: 'https://maps.app.goo.gl/rQ7WC8AAZZ2j6azF9',
  ar: {"eyebrow": "ادخل · طابقان · 104 محلات", "lede": "تجوّل في الرواق الرئيسي تحت قبوه الزجاجي: واجهات الذهب والألماس، وأكوام السجاد، ورفوف العود والعطور، وجدران الباشمينا، والتحف النحاسية، على طابقين حول تقاطع مقبب.", "facts": [["المحلات هنا", "104"], ["الطوابق", "2"], ["التنقل", "اسحب · انقر الأرض · WASD", 1], ["أنواع المحلات", "ذهب، سجاد، عود، أقمشة، تحف", 1]], "views": {"gallery": "الرواق الرئيسي", "goldshop": "محل ذهب", "carpets": "محل سجاد", "oud": "عود وعطور", "crossing": "التقاطع المقبب", "upper": "الطابق العلوي", "outside": "الواجهة الخارجية"}, "labels": []},
  env: { center: [0, 0, 0], shadow: 70, sunDist: 220, fog: .0012, near: .08, far: 3000, minDist: .1, maxDist: 80, exposure: .44, fogColor: 0xe9dcc4 },
  build(a) {
    const { THREE, V3, M, T, R, pick, cv, tex, star, speck, box, plane, cyl, dome, extrude, archPts, ringShape, merge, mat4, mesh, instanced, flat, palms, crowd, glow, add } = a;
    const L = 120, HX = 60;               // gallery length / half
    const CW = 4;                         // corridor half-width at ground shopfronts
    const GH = 4.4, GD = 5.6;             // ground shop height / depth
    const UY = 5.0, UH = 3.8, UD = 4.6;   // upper level floor, shop height, depth
    const UF = 5.0;                       // upper shopfront line (|z|)
    const SPR = 10.7, VR = 5.15;          // vault spring height / radius
    const lights = [];

    /* ---- materials ---- */
    const wallIn = new THREE.MeshStandardMaterial({ map: T.stucco, color: 0xf3e6cf, roughness: .8, emissive: 0x6a4a28, emissiveIntensity: .05 });
    const panel = new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xfff1d8, emissiveIntensity: 1.3 });
    const clearGlass = new THREE.MeshStandardMaterial({ color: 0xd9eef2, transparent: true, opacity: .14, roughness: .04, metalness: .3, depthWrite: false, side: THREE.DoubleSide });
    const vaultGlass = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .55, roughness: .3, emissive: 0xdfefff, emissiveIntensity: .6, side: THREE.DoubleSide, depthWrite: false });
    const daylight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 1.4 });
    const shopFloor = new THREE.MeshStandardMaterial({ map: a.rep(T.marble, 1 / 1.5, 1 / 1.5), color: 0xf2ece2, roughness: .3 });
    const backM = {
      gold: new THREE.MeshStandardMaterial({ color: 0x3a0a0e, roughness: .9, emissive: 0x2a0508, emissiveIntensity: .4 }),
      carpet: new THREE.MeshStandardMaterial({ map: T.wood, color: 0xb08860, roughness: .8, emissive: 0x3a2412, emissiveIntensity: .35 }),
      perfume: new THREE.MeshStandardMaterial({ map: T.wood, color: 0x6b4630, roughness: .6, emissive: 0x2a160c, emissiveIntensity: .4 }),
      textile: new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: .9, emissive: 0x4a3c2c, emissiveIntensity: .3 }),
      antique: new THREE.MeshStandardMaterial({ map: T.wood, color: 0x8a6440, roughness: .8, emissive: 0x30200f, emissiveIntensity: .35 }),
    };
    // velvet board with gold necklaces for jewellery back walls
    const necklaceTex = (() => {
      const [c, g] = cv(256, 256); g.fillStyle = '#5a0f16'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
        const cx = 32 + i * 64, cy = 30 + j * 120;
        g.strokeStyle = '#f2c55a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 24, cy); g.quadraticCurveTo(cx, cy + 80, cx + 24, cy); g.stroke();
        g.lineWidth = 1.5; for (let k = 0; k < 9; k++) { const t = k / 8, x = cx - 24 + 48 * t, y = cy + 80 * 2 * t * (1 - t); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8 + (k % 2) * 6); g.stroke(); }
        g.fillStyle = '#ffd77a'; star(g, cx, cy + 50, 9, 4, 6); g.fill(); g.fillStyle = '#c8e6ff'; g.beginPath(); g.arc(cx, cy + 50, 3, 0, 7); g.fill();
      }
      const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    })();
    const necklaceM = new THREE.MeshStandardMaterial({ map: necklaceTex, roughness: .5, metalness: .3, emissive: 0xffffff, emissiveMap: necklaceTex, emissiveIntensity: .35 });
    const rugTex = (() => {
      const [c, g] = cv(128, 192); g.fillStyle = '#d9d0c4'; g.fillRect(0, 0, 128, 192);
      g.strokeStyle = '#7a6a5a'; g.lineWidth = 7; g.strokeRect(7, 7, 114, 178); g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(17, 17, 94, 158);
      g.fillStyle = '#5e5248'; star(g, 64, 96, 36, 18, 8); g.fill(); g.fillStyle = '#efe6da'; star(g, 64, 96, 16, 8, 8); g.fill();
      for (let i = 0; i < 6; i++) { g.fillStyle = '#8f8070'; g.beginPath(); g.arc(30 + (i % 2) * 68, 40 + ((i / 2) | 0) * 56, 7, 0, 7); g.fill(); }
      speck(g, 128, 192, 1600, .25, ['#6a5a4a', '#ffffff']); const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    })();
    const rugM = new THREE.MeshStandardMaterial({ map: rugTex, roughness: .95, side: THREE.DoubleSide });
    const RUGC = [0x9a2328, 0x8c1f22, 0x2b4a7a, 0x9b6a2c, 0x3f6a4a, 0x6a2a4a, 0xb5552e, 0x2a3a5a];

    /* ---- shop signs (one atlas, merged into a single mesh) ---- */
    const NAMES = {
      gold: [['Al Majaz Gold & Diamonds', 'المجاز للذهب والألماس'], ['Noor Jewellers', 'مجوهرات النور'], ['Khalid Gold', 'ذهب خالد'], ['Blue Souq Jewellery', 'مجوهرات السوق الأزرق'], ['Al Qasba Diamonds', 'ألماس القصباء'], ['Lulu Pearls', 'لؤلؤ لولو'], ['Sharjah Gold House', 'دار الذهب الشارقة'], ['Al Fanar Jewellers', 'مجوهرات الفنار']],
      carpet: [['Persian Carpet Palace', 'قصر السجاد الفارسي'], ['Kashan Rugs', 'سجاد كاشان'], ['Silk Road Carpets', 'سجاد طريق الحرير'], ['Tabriz House', 'دار تبريز'], ['Afghan Kilims', 'كليم أفغاني']],
      perfume: [['Oud Al Sharq', 'عود الشرق'], ['Musk & Amber', 'مسك وعنبر'], ['Bakhoor House', 'دار البخور'], ['Arabian Oud', 'العود العربي'], ['Attar Gallery', 'معرض العطور']],
      textile: [['Kashmir Pashmina', 'باشمينا كشمير'], ['Silk & Cotton', 'حرير وقطن'], ['Al Khaleej Textiles', 'أقمشة الخليج'], ['Abaya Boutique', 'بوتيك العبايات'], ['Sari Palace', 'قصر الساري']],
      antique: [['Antique Treasures', 'كنوز التحف'], ['Dallah & Brass', 'دلة ونحاس'], ['Old Sharjah Gifts', 'هدايا الشارقة القديمة'], ['Lantern House', 'بيت الفوانيس'], ['Bedouin Crafts', 'حرف بدوية'], ['Dhow Models', 'نماذج السفن'], ['Spice Route Curios', 'تحف طريق التوابل']],
    };
    const SIGNBG = { gold: ['#2a0b0e', '#e9bd55'], carpet: ['#16362a', '#e7d6a8'], perfume: ['#2c1838', '#e9c9f0'], textile: ['#13284a', '#f0e6d0'], antique: ['#3a2414', '#f0d39a'] };
    const atlasList = []; for (const [type, list] of Object.entries(NAMES)) list.forEach(n => atlasList.push([type, n]));
    const COLS = 2, ROWS = Math.ceil(atlasList.length / COLS), CWp = 512, CHp = 128;
    const signTex = (() => {
      const [c, g] = cv(CWp * COLS, CHp * ROWS);
      atlasList.forEach(([type, [en, ar]], i) => {
        const x = (i % COLS) * CWp, y = ((i / COLS) | 0) * CHp, [bg, fg] = SIGNBG[type];
        g.fillStyle = bg; g.fillRect(x, y, CWp, CHp); g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(x + 6, y + 6, CWp - 12, CHp - 12);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '600 36px Georgia, "Times New Roman", serif'; g.fillText(en, x + CWp / 2, y + 44, CWp - 40);
        g.font = '500 32px "Geeza Pro", "Noto Naskh Arabic", "IBM Plex Sans Arabic", Tahoma, sans-serif'; g.fillText(ar, x + CWp / 2, y + 92, CWp - 40);
      });
      const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    })();
    const signM = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: .55, roughness: .5 });
    const signGeos = [];
    const typeIdx = {}; atlasList.forEach(([type], i) => (typeIdx[type] = typeIdx[type] || []).push(i));

    /* ---- per-shop instance lists ---- */
    const L0 = { shellG: [], frontG: [], pil: [], floor: [], panel: [], back: {}, glass: [] };
    ['gold', 'carpet', 'perfume', 'textile', 'antique'].forEach(t => (L0.back[t] = []));
    const G = { counter: [], cGlass: [], velvet: [], bangle: [], ring: [], neck: [], rugStack: [], rugHang: [], rugRoll: [], shelf: [], bottle: [], burner: [], cloth: [], scarf: [], dallah: [], lantern: [], chest: [], keeper: [] };
    const rects = [];
    const shops = [];
    const TYPES = ['gold', 'gold', 'gold', 'carpet', 'carpet', 'perfume', 'perfume', 'textile', 'textile', 'antique', 'antique'];
    const at = (m, x, y, z, ry = 0, sx = 1, sy = sx, sz = sx) => m.clone().multiply(mat4(x, y, z, ry, sx, sy, sz));

    // shopfront pieces (local: opening at z=0 facing +z, interior toward -z)
    function frontGeo(H) {
      const sp = H - 1.35, ap = H - .22, s = new THREE.Shape();
      s.moveTo(-1.75, sp); s.lineTo(-1.6, sp); archPts(3.2, sp, ap).forEach(p => s.lineTo(p.x, p.y)); s.lineTo(1.75, sp); s.lineTo(1.75, H); s.lineTo(-1.75, H); s.closePath();
      const S = merge([extrude(s, .22, 0), box(3.5, .35, .3, 0, .17, .05)]);
      const Tl = extrude(ringShape(3.2, sp, ap, .13), .06, .22);
      const glassG = merge([plane(1, sp - .4).translate(-1.1, .4 + (sp - .4) / 2, .1), plane(1, sp - .4).translate(1.1, .4 + (sp - .4) / 2, .1)]);
      const frame = merge([box(.06, sp, .08, -1.6, sp / 2, .1), box(.06, sp, .08, -.6, sp / 2, .1), box(.06, sp, .08, .6, sp / 2, .1), box(.06, sp, .08, 1.6, sp / 2, .1), box(3.2, .07, .08, 0, sp, .1), box(2.2, .07, .08, 0, .38, .1)]);
      return { S, T: Tl, glass: glassG, frame, sp };
    }
    function shellGeo(H, D) {
      return merge([box(.14, H, D, -2, H / 2, -D / 2), box(.14, H, D, 2, H / 2, -D / 2), box(4.1, .12, D, 0, H - .06, -D / 2)]);
    }
    const FG = frontGeo(GH), FU = frontGeo(UH);

    function addShop(x, side, level) {
      const H = level ? UH : GH, D = level ? UD : GD, y = level ? UY : 0, zf = (level ? UF : CW) * side;
      const ry = side > 0 ? Math.PI : 0, m = mat4(x, y, zf, ry);
      const type = pick(TYPES), lst = level ? 'U' : 'G';
      shops.push({ x, side, level, type, m, H, D });
      (level ? (L0.frontU = L0.frontU || []) : L0.frontG).push(m);
      (level ? (L0.shellU = L0.shellU || []) : L0.shellG).push(m);
      L0.pil.push(at(m, -2, 0, .12, 0, 1, H / GH, 1));
      L0.floor.push(at(m, 0, .012, -D / 2, 0, 1, 1, D / GD));
      L0.panel.push(at(m, 0, H - .14, -D / 2, 0, 1, 1, D / GD));
      L0.back[type].push(at(m, 0, 0, -D + .02, 0, 1, H / GH, 1));
      // sign: merged plane with atlas UVs
      const ai = pick(typeIdx[type]), u0 = (ai % COLS) / COLS, v1 = 1 - ((ai / COLS) | 0) / ROWS, v0 = v1 - 1 / ROWS;
      const sg = new THREE.PlaneGeometry(2.7, .62); const uv = sg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) / COLS, v0 + uv.getY(i) / ROWS);
      sg.translate(0, (level ? FU.sp : FG.sp) + .42, .12); sg.applyMatrix4(m); signGeos.push(sg);
      // walkable rects: doorway and interior
      const toW = (lx0, lx1, lz0, lz1) => { const xs = [x + lx0, x + lx1], zs = side > 0 ? [zf - lz1, zf - lz0] : [zf + lz0, zf + lz1]; rects.push([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), level]); };
      toW(-.5, .5, -.7, .6); toW(-1.55, 1.55, -D + .55, -.35);
      goods(type, m, H, D, level);
    }
    function goods(type, m, H, D, level) {
      const keeperZ = -D + 1.2;
      if (type === 'gold') {
        for (const [cx, cz, w, ry] of [[0, -D + .75, 3.0, 0], [-1.45, -D / 2 + .3, 2.0, Math.PI / 2], [1.45, -D / 2 + .3, 2.0, -Math.PI / 2]]) {
          const cm = at(m, cx, 0, cz, ry, 1);
          G.counter.push(at(cm, 0, 0, 0, 0, w / 2, 1, 1)); G.cGlass.push(at(cm, 0, 0, 0, 0, w / 2, 1, 1)); G.velvet.push(at(cm, 0, 0, 0, 0, w / 2, 1, 1));
          for (let i = 0; i < Math.floor(w / .22); i++) for (let j = 0; j < 2; j++) G[(i + j) % 3 ? 'bangle' : 'ring'].push(at(cm, -w / 2 + .14 + i * .22, .99, -.12 + j * .24));
        }
        for (const ox of [-1.1, 0, 1.1]) G.neck.push(at(m, ox, 2.05, -D + .05));
        if (R() < .75) G.keeper.push(at(m, R() < .5 ? -.9 : .9, 0, keeperZ));
      } else if (type === 'carpet') {
        for (const [ox, oz, n] of [[-.8, -D + 1.3, 12 + (R() * 6 | 0)], [.85, -D + 1.6, 8 + (R() * 8 | 0)]]) for (let i = 0; i < n; i++) G.rugStack.push(at(m, ox + (R() - .5) * .08, .05 + i * .075, oz, (R() - .5) * .1));
        for (const ox of [-1.25, 0, 1.25]) G.rugHang.push(at(m, ox, H * .55, -D + .04, 0, .85 * (H / GH)));
        for (const sd of [-1, 1]) G.rugHang.push(at(m, sd * 1.92, H * .5, -D * .45, sd * -Math.PI / 2, .9 * (H / GH)));
        for (let i = 0; i < 4; i++) G.rugRoll.push(at(m, 1.4 - i * .22, .9, -.9 - (i % 2) * .2, 0).multiply(new THREE.Matrix4().makeRotationZ(.18 - i * .02)));
        if (R() < .6) G.keeper.push(at(m, .2, 0, -1.8));
      } else if (type === 'perfume') {
        for (const sy of [.9, 1.42, 1.94, 2.46].filter(v => v < H - .6)) {
          G.shelf.push(at(m, 0, sy, -D + .22));
          for (let i = 0; i < 13; i++) G.bottle.push(at(m, -1.6 + i * .265, sy + .02, -D + .2 + (R() - .5) * .06, R() * 6, .85 + R() * .4));
        }
        G.counter.push(at(m, 0, 0, -D + 1.6, 0, 1.2, 1, 1)); G.cGlass.push(at(m, 0, 0, -D + 1.6, 0, 1.2, 1, 1));
        for (let i = 0; i < 5; i++) G.burner.push(at(m, -.9 + i * .45, .98, -D + 1.6));
        for (let i = 0; i < 10; i++) G.bottle.push(at(m, -1 + i * .22, .99, -D + 1.45, 0, 1.2));
        if (R() < .7) G.keeper.push(at(m, -.3, 0, -D + .9));
      } else if (type === 'textile') {
        for (const sd of [-1, 1]) for (let r = 0; r < 9; r++) for (let c2 = 0; c2 < Math.floor((D - 1) / .45); c2++) if (r * .3 + .3 < H - .4) G.cloth.push(at(m, sd * 1.75, .3 + r * .3, -D + .5 + c2 * .45, Math.PI / 2));
        for (let i = 0; i < 9; i++) G.scarf.push(at(m, -1.2 + i * .3, H - .9, -1.1));
        for (let r = 0; r < 6; r++) for (let c2 = 0; c2 < 7; c2++) G.cloth.push(at(m, -1.25 + c2 * .42, .3 + r * .3, -D + .3, 0));
        if (R() < .6) G.keeper.push(at(m, 0, 0, -2.2));
      } else {
        for (const sy of [.8, 1.5, 2.2].filter(v => v < H - .7)) { G.shelf.push(at(m, 0, sy, -D + .22)); for (let i = 0; i < 6; i++) G[i % 2 ? 'dallah' : 'lantern'].push(at(m, -1.4 + i * .56, sy + .02, -D + .24, R() * 6, .9 + R() * .3)); }
        for (let i = 0; i < 3; i++) G.chest.push(at(m, -1 + i * 1, 0, -1.4 - (i % 2) * .6, (R() - .5) * .4));
        for (let i = 0; i < 5; i++) G.lantern.push(at(m, -1.2 + i * .6, H - 1.2, -1.6 - (i % 2) * .8, 0, 1.4));
        if (R() < .6) G.keeper.push(at(m, .6, 0, -D + 1.2));
      }
    }
    // place shops: two sides, two levels, skipping the domed crossing
    for (const level of [0, 1]) for (const side of [-1, 1]) for (let x = -HX + 4; x <= HX - 4; x += 4) { if (Math.abs(x) < 6.1) continue; addShop(x, side, level); }

    /* ---- build instanced shop meshes ---- */
    instanced(FG.S, M.stucco, L0.frontG); instanced(FU.S, M.stucco, L0.frontU);
    instanced(FG.T, M.tile, L0.frontG, { cast: false }); instanced(FU.T, M.tile, L0.frontU, { cast: false });
    instanced(FG.glass, clearGlass, L0.frontG, { cast: false, receive: false }); instanced(FU.glass, clearGlass, L0.frontU, { cast: false, receive: false });
    instanced(FG.frame, M.brass, L0.frontG, { cast: false }); instanced(FU.frame, M.brass, L0.frontU, { cast: false });
    instanced(shellGeo(GH, GD), wallIn, L0.shellG); instanced(shellGeo(UH, UD), wallIn, L0.shellU);
    instanced(box(.5, GH, .5, 0, GH / 2, 0), M.stucco, L0.pil);
    const pilTile = new THREE.PlaneGeometry(.36, 1.6); pilTile.translate(0, 1.2, .26); instanced(pilTile, M.iznik, L0.pil, { cast: false });
    const floorI = instanced(plane(3.86, GD).rotateX(-Math.PI / 2), shopFloor, L0.floor, { cast: false });
    instanced(plane(2.6, GD * .7).rotateX(Math.PI / 2), panel, L0.panel, { cast: false, receive: false });
    for (const [type, list] of Object.entries(L0.back)) if (list.length) instanced(plane(4, GH).translate(0, GH / 2, 0), backM[type], list, { cast: false });
    mesh(merge(signGeos), signM, { cast: false });
    // goods
    const glassTop = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: .22, roughness: .02, metalness: .4, depthWrite: false });
    const counterM = new THREE.MeshStandardMaterial({ map: T.wood, color: 0x5b3a22, roughness: .5 });
    const velvetM = new THREE.MeshStandardMaterial({ color: 0x2a0508, roughness: 1 });
    const goldShine = new THREE.MeshStandardMaterial({ color: 0xffc24a, metalness: 1, roughness: .22, emissive: 0x8a5a08, emissiveIntensity: .5, envMapIntensity: 1.4 });
    const I = (g, m2, list, o) => list.length && instanced(g, m2, list, o || { cast: false });
    I(merge([box(2, .9, .55, 0, .45, 0), box(2.04, .04, .6, 0, .92, 0)]), counterM, G.counter);
    I(box(1.96, .16, .52, 0, 1.04, 0), glassTop, G.cGlass);
    I(box(1.9, .02, .46, 0, .955, 0), velvetM, G.velvet);
    I(new THREE.TorusGeometry(.045, .01, 6, 14).rotateX(Math.PI / 2.4), goldShine, G.bangle);
    I(merge([new THREE.TorusGeometry(.02, .006, 6, 10).rotateX(Math.PI / 2), new THREE.OctahedronGeometry(.012).translate(0, .02, 0)]), goldShine, G.ring);
    I(new THREE.PlaneGeometry(1, 1.3), necklaceM, G.neck);
    I(new THREE.BoxGeometry(1.3, .07, .95), new THREE.MeshStandardMaterial({ map: rugTex, roughness: .95 }), G.rugStack, { cast: false, colors: RUGC });
    I(new THREE.PlaneGeometry(1.25, 2), rugM, G.rugHang, { cast: false, colors: RUGC });
    I(new THREE.CylinderGeometry(.14, .14, 1.9, 10), new THREE.MeshStandardMaterial({ map: rugTex, roughness: .95 }), G.rugRoll, { cast: false, colors: RUGC });
    I(box(3.5, .04, .34, 0, 0, 0), new THREE.MeshStandardMaterial({ color: 0xf6efe6, roughness: .2, metalness: .1, transparent: true, opacity: .7 }), G.shelf);
    I(merge([new THREE.CylinderGeometry(.045, .055, .18, 10).translate(0, .09, 0), new THREE.CylinderGeometry(.015, .02, .05, 6).translate(0, .2, 0), new THREE.SphereGeometry(.03, 8, 6).translate(0, .25, 0)]), new THREE.MeshStandardMaterial({ roughness: .08, metalness: .25, emissive: 0x222222, envMapIntensity: 1.6 }), G.bottle, { cast: false, colors: [0x7a1f3d, 0x1f4f7a, 0xd9a441, 0x2f7a5a, 0x5a2a7a, 0xc0c8d0, 0x9a5a1f, 0xe05a7a] });
    I(merge([cyl(.06, .08, .1, 8, 0, .05, 0), cyl(.08, .05, .08, 8, 0, .14, 0), new THREE.ConeGeometry(.06, .1, 8).translate(0, .23, 0)]), M.brass, G.burner);
    I(box(.38, .11, .32), new THREE.MeshStandardMaterial({ roughness: .9 }), G.cloth, { cast: false, colors: [0xb5462e, 0x2e5e8c, 0xd8c39a, 0x4f7a3b, 0xe6e1d4, 0x7a3b6a, 0xd9a441, 0x1f8a8a, 0xc23b5a, 0x2a2a2a] });
    I(plane(.26, 1.1).translate(0, -.55, 0), new THREE.MeshStandardMaterial({ roughness: .9, side: THREE.DoubleSide }), G.scarf, { cast: false, colors: [0xc23b5a, 0x2e5e8c, 0xd9a441, 0x7a3b6a, 0x1f8a8a, 0xf0e6d0] });
    const dallahG = new THREE.LatheGeometry([[0, 0], [.09, .01], [.1, .08], [.06, .16], [.04, .2], [.07, .23], [.03, .3], [0, .31]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    dallahG.translate(0, 0, 0); I(merge([dallahG, new THREE.CylinderGeometry(.012, .02, .16, 5).rotateZ(-1).translate(.12, .2, 0)]), M.brass, G.dallah);
    const lanternG = merge([cyl(.08, .1, .2, 6, 0, .1, 0), new THREE.ConeGeometry(.1, .1, 6).translate(0, .25, 0), new THREE.TorusGeometry(.03, .006, 4, 8).translate(0, .33, 0)]);
    I(lanternG, new THREE.MeshStandardMaterial({ color: 0xc89a48, metalness: .8, roughness: .35, emissive: 0xffa040, emissiveIntensity: .5 }), G.lantern);
    I(merge([box(.9, .5, .5, 0, .25, 0), box(.92, .05, .52, 0, .52, 0), box(.1, .12, .02, 0, .4, .26)]), new THREE.MeshStandardMaterial({ map: T.wood, color: 0x7a4a26, roughness: .7 }), G.chest, { cast: true });
    const keeperGeo = new THREE.CapsuleGeometry(.24, 1.1, 3, 8); keeperGeo.translate(0, .8, 0);
    I(keeperGeo, M.people, G.keeper, { cast: true, colors: [0xf6f4ee, 0xf6f4ee, 0x16161a, 0x2b3f5c] });

    /* ---- the gallery structure ---- */
    const S = [], Tl = [], Iz = [];
    // corridor floor with a tiled centre strip
    const floorG = plane(L, 2 * CW); floorG.rotateX(-Math.PI / 2);
    const floorMesh = mesh(floorG, new THREE.MeshStandardMaterial({ map: a.rep(T.marble, 1 / 2, 1 / 2), color: 0xf4efe6, roughness: .25 }), { cast: false });
    flat(L, 1.2, 0, 0, .006, M.iznik); flat(L, .12, 0, .66, .007, M.brass); flat(L, .12, 0, -.66, .007, M.brass);
    // upper slabs with tiled edges, balustrades and handrails
    const slabs = [];
    for (const sd of [-1, 1]) {
      const sl = new THREE.Mesh(box(L, .6, 7.4, 0, GH + .3, sd * 6.3), [M.stucco, M.stucco, M.stucco, M.stucco, M.tile, M.tile]); sl.castShadow = sl.receiveShadow = true; add(sl);
      const top = plane(L, 2.6); top.rotateX(-Math.PI / 2); top.translate(0, UY + .005, sd * 3.9);
      slabs.push(mesh(top, new THREE.MeshStandardMaterial({ map: a.rep(T.marble, 1 / 2, 1 / 2), color: 0xefe8dc, roughness: .3 }), { cast: false }));
      const bal = new THREE.Mesh(box(L, 1.0, .16, 0, UY + .5, sd * 2.68), [M.stucco, M.stucco, M.wood, M.stucco, M.iznik, M.iznik]); bal.castShadow = true; add(bal);
      S.push(box(L, .08, .24, 0, UY + 1.04, sd * 2.68));
      // clerestory wall above the upper shops, outer walls, roof over the shops
      S.push(box(L, SPR - (UY + UH), .4, 0, (UY + UH + SPR) / 2, sd * (UF + .2)));
      S.push(box(L, SPR + .6, .4, 0, (SPR + .6) / 2, sd * 9.9), box(L, .5, 5, 0, SPR + .25, sd * 7.6));
      S.push(box(L, .14, .5, 0, UY + UH + .07, sd * (UF + .1)));
    }
    for (const sx of [-1, 1]) S.push(box(.4, SPR + .6, 20.2, sx * (HX + .2), (SPR + .6) / 2, 0));
    // blind tiled arches along the clerestory
    const blind = [];
    for (const sd of [-1, 1]) for (let x = -HX + 4; x <= HX - 4; x += 4) if (Math.abs(x) > 6) blind.push(mat4(x, UY + UH + .25, sd * UF, sd > 0 ? Math.PI : 0));
    instanced(merge([extrude(ringShape(2.2, .5, 1.45, .12), .05, 0)]), M.stucco, blind, { cast: false });
    const bp = new THREE.Shape(); bp.moveTo(-1.1, 0); bp.lineTo(1.1, 0); archPts(2.2, .5, 1.45).reverse().forEach(p => bp.lineTo(p.x, p.y)); bp.closePath();
    const bpg = new THREE.ShapeGeometry(bp); const bu = bpg.attributes.uv; for (let i = 0; i < bu.count; i++) bu.setXY(i, bu.getX(i) * .8, bu.getY(i) * .8);
    instanced(bpg.translate(0, 0, .02), M.iznik, blind, { cast: false });
    // crossing: exits to the outside on both sides at ground level, walls beside them
    for (const sd of [-1, 1]) {
      for (const sx of [-1, 1]) S.push(box(.3, GH, 5.8, sx * 4.15, GH / 2, sd * 6.8), box(1.9, GH, .3, sx * 5.1, GH / 2, sd * 4.1));
      const door = plane(5, 3.8); door.translate(0, 1.9, 0); if (sd > 0) door.rotateY(Math.PI); door.translate(0, 0, sd * 9.68); add(new THREE.Mesh(door, daylight));
      const fr = extrude(ringShape(5, 3, 3.95, .3), .2, 0); if (sd > 0) fr.rotateY(Math.PI); fr.translate(0, 0, sd * 9.66); Tl.push(fr);
      // upper level wall over the crossing (between shop rows)
      S.push(box(12.2, UH + .2, .3, 0, UY + UH / 2, sd * (UF + .15)));
      const win = plane(3, 2.2); win.translate(0, UY + 1.9, 0); if (sd > 0) win.rotateY(Math.PI); win.translate(0, 0, sd * (UF - .02)); add(new THREE.Mesh(win, daylight));
    }
    // gallery ends: tall arched doors to daylight
    for (const sx of [-1, 1]) {
      const d = plane(6, 4.2); d.translate(0, 2.1, 0); d.rotateY(-sx * Math.PI / 2); d.translate(sx * (HX - .02), 0, 0); add(new THREE.Mesh(d, daylight));
      const f = extrude(ringShape(6, 3.2, 4.4, .35), .2, 0); f.rotateY(-sx * Math.PI / 2); f.translate(sx * (HX - .04), 0, 0); Tl.push(f);
      const w = plane(4, 3); w.translate(0, 7.6, 0); w.rotateY(-sx * Math.PI / 2); w.translate(sx * (HX - .02), 0, 0); add(new THREE.Mesh(w, daylight));
    }
    // glazed barrel vault with tiled ribs (two halves), and the domed crossing
    for (const sx of [-1, 1]) {
      const len = HX - VR, cx = sx * (VR + len / 2);
      const v = new THREE.CylinderGeometry(VR, VR, len, 40, 1, true, 0, Math.PI); v.rotateZ(Math.PI / 2); v.translate(cx, SPR, 0);
      add(new THREE.Mesh(v, vaultGlass));
      for (let x = VR; x <= HX; x += 4) { const r = new THREE.TorusGeometry(VR, .16, 6, 32, Math.PI); r.rotateY(Math.PI / 2); r.translate(sx * x, SPR, 0); Tl.push(r); }
      Tl.push(box(len, .2, .2, cx, SPR + VR, 0));
      for (const sd of [-1, 1]) for (const ang of [.5, 1]) { const y = SPR + Math.sin(ang * Math.PI / 2) * VR * .98, z = sd * Math.cos(ang * Math.PI / 2) * VR * .98; S.push(box(len, .1, .1, cx, y, z)); }
    }
    const ring = new THREE.Shape(); ring.moveTo(-VR, -VR); ring.lineTo(VR, -VR); ring.lineTo(VR, VR); ring.lineTo(-VR, VR); ring.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, VR - .05, 0, Math.PI * 2, true); ring.holes.push(hole);
    const pend = new THREE.ExtrudeGeometry(ring, { depth: .5, bevelEnabled: false, curveSegments: 40 }); pend.rotateX(-Math.PI / 2); pend.translate(0, SPR, 0); Iz.push(pend);
    S.push(cyl(VR, VR, 1.6, 48, 0, SPR + 1.3, 0, true));
    const dm = dome(VR, 0, SPR + 2.1, 0, 48, 1.1); const du = dm.attributes.uv; for (let i = 0; i < du.count; i++) du.setXY(i, du.getX(i) * 14, du.getY(i) * 5); Iz.push(dm);
    const dw = []; for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; dw.push(mat4(Math.sin(an) * (VR - .04), SPR + .9, Math.cos(an) * (VR - .04), an + Math.PI)); }
    instanced(plane(.7, 1).translate(0, .5, 0), daylight, dw, { cast: false });
    mesh(merge(S), wallIn); mesh(merge(Tl), M.tile); mesh(merge(Iz), new THREE.MeshStandardMaterial({ map: T.iznik, roughness: .3, side: THREE.DoubleSide, emissive: 0x30302a, emissiveIntensity: .3 }), { cast: true });
    // chandelier under the dome
    const chM = new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffc870, emissiveIntensity: 2.2 });
    mesh(merge([new THREE.TorusGeometry(1.7, .05, 6, 48).rotateX(Math.PI / 2).translate(0, 7.4, 0), new THREE.TorusGeometry(1.05, .05, 6, 36).rotateX(Math.PI / 2).translate(0, 8.1, 0), new THREE.CylinderGeometry(.03, .03, SPR + 4 - 8.1, 4).translate(0, 8.1 + (SPR + 4 - 8.1) / 2, 0), new THREE.SphereGeometry(.28, 12, 10).translate(0, 7.1, 0)]), M.brass, { cast: false });
    const bulbs = []; for (let i = 0; i < 24; i++) { const an = i / 24 * Math.PI * 2; bulbs.push(mat4(Math.cos(an) * 1.7, 7.55, Math.sin(an) * 1.7)); } for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2; bulbs.push(mat4(Math.cos(an) * 1.05, 8.25, Math.sin(an) * 1.05)); }
    instanced(new THREE.SphereGeometry(.07, 8, 6), chM, bulbs, { cast: false, receive: false });
    // hanging lanterns down the vault, planters with palms, benches
    const hl = []; for (let x = -HX + 8; x <= HX - 8; x += 8) if (Math.abs(x) > 6) hl.push(mat4(x, 7.2, 0));
    instanced(merge([cyl(.22, .28, .55, 8, 0, 0, 0), new THREE.ConeGeometry(.3, .3, 8).translate(0, .42, 0), new THREE.CylinderGeometry(.012, .012, 3.6, 3).translate(0, 2.3, 0)]), new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffaa50, emissiveIntensity: 1.5, metalness: .4, roughness: .4 }), hl, { cast: false });
    const pl = []; for (let x = -HX + 12; x <= HX - 12; x += 16) if (Math.abs(x) > 8) pl.push([x, 0]);
    instanced(merge([cyl(.6, .45, .75, 16, 0, .375, 0), cyl(.62, .62, .06, 16, 0, .76, 0)]), M.iznik, pl.map(([x, z]) => mat4(x, 0, z)));
    palms(pl.map(([x, z]) => [x, z, .7]), .32);
    instanced(merge([box(1.8, .1, .5, 0, .45, 0), box(.1, .45, .45, -.8, .22, 0), box(.1, .45, .45, .8, .22, 0)]), M.wood, pl.flatMap(([x]) => [mat4(x - 2.2, 0, 0), mat4(x + 2.2, 0, 0)]));

    /* ---- lights: constant interior lighting (not tied to night) ---- */
    for (let x = -HX + 7; x <= HX - 7; x += 14) { const l = new THREE.PointLight(0xffe0b4, 1.15, 17, 1.6); l.position.set(x, 3.8, 0); add(l); }
    for (const sd of [-1, 1]) for (const x of [-36, 0, 36]) { const l = new THREE.PointLight(0xffe0b4, .8, 15, 1.6); l.position.set(x, UY + 3, sd * 3.6); add(l); }
    const cl = new THREE.PointLight(0xffd090, 1.6, 22, 1.4); cl.position.set(0, 7, 0); add(cl);
    glow(vaultGlass, -.55, .65); glow(daylight, -1.2, 1.5); glow(panel, .4, 1.5); glow(signM, .5, .55); glow(wallIn, .1, .05);

    /* ---- people ---- */
    crowd([[-58, -1.5, 58, -1.5], [-58, 1.5, 58, 1.5], [-58, -3, 58, -3], [-58, 3, 58, 3], [-58, 0, 58, 0], [-2, -9, -2, 9], [-58, -3.8, 58, -3.8, UY], [-58, 3.8, 58, 3.8, UY]], 150);

    /* ---- walkable areas ---- */
    rects.push([-HX + .6, HX - .6, -CW + .45, CW - .45, 0], [-3.6, 3.6, -9.2, 9.2, 0]);
    for (const sd of [-1, 1]) rects.push([-HX + .6, HX - .6, sd > 0 ? 3.0 : -UF + .35, sd > 0 ? UF - .35 : -3.0, 1]);
    const inside = shops.filter(s => !s.level && s.side < 0);
    const gold = inside.find(s => s.type === 'gold' && s.x < -20) || inside[0], carpet = inside.find(s => s.type === 'carpet') || inside[1], perf = shops.find(s => !s.level && s.side > 0 && s.type === 'perfume') || inside[2];
    const shopView = (s, name) => { const zf = CW * s.side; return [name, [s.x + .4, 1.65, zf - s.side * .8], [s.x - .3, 1.3, zf + s.side * (s.D - .6)]]; };
    return {
      walk: { eye: 1.65, levels: [0, UY], rects, floors: [floorMesh, ...slabs, floorI] },
      views: {
        gallery: ['Main gallery', [-55, 1.65, -2.3], [10, 3.2, -.6], [-32, 1.65, -2.3], [30, 3.2, -.6]],
        goldshop: shopView(gold, 'Gold shop'),
        carpets: shopView(carpet, 'Carpet shop'),
        oud: shopView(perf, 'Oud & perfume'),
        crossing: ['Domed crossing', [-7.5, 1.65, -2.5], [0, 9, 0], [-6, 1.65, 2.5], [0, 9, 0]],
        upper: ['Upper gallery', [-40, UY + 1.65, -3.7], [10, UY + 1, -3.4], [-20, UY + 1.65, -3.7], [30, UY + 1, -3.4]],
        outside: { name: 'Exterior', link: 'souq' },
      },
      labels: [],
    };
  },
});
