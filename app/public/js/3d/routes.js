/* Daleel 3D — walking routes for the AR guide (nav.js).
   Each place lists waypoints in scene metres [x, z], the links a visitor can walk between them,
   and the named spots offered in the guide. Heights come from the scene when the route is drawn.
   links: "a-b" pairs; a trailing ":cross" marks a road crossing, ":door" a doorway.
   spots: id = waypoint, kind = list icon, go = a scene the visitor can step into on arrival. */
window.S3_ROUTES = {
  noor: {
    from: 'park',
    nodes: {
      park: [98, 40], pexit: [98, 0], e1: [80, 3], gate: [63.5, 5], fc: [56, 5.5], fountain: [51, 4.5], fcw: [38, 7],
      portal: [30.5, 0], entrance: [22.2, 0], minaret: [36.5, 21.5], nc: [36.5, 28], ncw: [0, 28], sideDoor: [0, 25],
      se1: [86, -4], se2: [86, -52], seC: [80, -59.5], promenade: [30, -59.5],
    },
    links: 'park-pexit pexit-e1 e1-gate gate-fc fc-fountain fountain-fcw fcw-portal portal-entrance:door fcw-minaret minaret-nc nc-ncw ncw-sideDoor pexit-se1 se1-se2 se2-seC seC-promenade',
    spots: [
      { id: 'park', kind: 'park', en: 'Car park', ar: 'موقف السيارات' },
      { id: 'entrance', kind: 'door', en: 'Main entrance', ar: 'المدخل الرئيسي' },
      { id: 'fountain', kind: 'water', en: 'Ablution fountain', ar: 'نافورة الوضوء', look: [46, 2, 0] },
      { id: 'minaret', kind: 'tower', en: 'North minaret', ar: 'المئذنة الشمالية', look: [29.5, 30, 21.5] },
      { id: 'sideDoor', kind: 'door', en: 'North side door', ar: 'الباب الجانبي الشمالي' },
      { id: 'promenade', kind: 'view', en: 'Lagoon promenade', ar: 'ممشى البحيرة', look: [10, 1, -200] },
    ],
  },
  souq: {
    from: 'park',
    nodes: {
      park: [104, 30], pn: [104, 51], ne: [80, 51], kfe: [60, 53], kfDoor: [0, 52.5],
      e31: [80, 31], e0: [80, 0], bridges: [0, 0], w0: [-80, 0], westGate: [-80, -31],
      eastGate: [80, -31], se: [80, -53], lagoonDoor: [0, -53],
    },
    links: 'park-pn pn-ne ne-kfe kfe-kfDoor ne-e31 e31-e0 e0-bridges bridges-w0 w0-westGate e0-eastGate eastGate-se se-lagoonDoor',
    spots: [
      { id: 'park', kind: 'park', en: 'Car park (east)', ar: 'موقف السيارات (الشرقي)' },
      { id: 'lagoonDoor', kind: 'door', en: 'Lagoon entrance', ar: 'مدخل البحيرة', go: 'souqin', at: 'crossing', look: [0, 3.5, -47] },
      { id: 'kfDoor', kind: 'door', en: 'King Faisal Street entrance', ar: 'مدخل شارع الملك فيصل', go: 'souqin', at: 'crossing', look: [0, 3.5, 47] },
      { id: 'bridges', kind: 'bridge', en: 'Under the covered bridges', ar: 'تحت الجسور المسقوفة', look: [-40, 11, 0] },
      { id: 'westGate', kind: 'door', en: 'West gate, lagoon wing', ar: 'البوابة الغربية لجناح البحيرة', go: 'souqin', at: 'west', look: [-75, 3, -31] },
      { id: 'eastGate', kind: 'door', en: 'East gate, lagoon wing', ar: 'البوابة الشرقية لجناح البحيرة', go: 'souqin', at: 'east', look: [75, 3, -31] },
    ],
  },
  souqin: {
    from: 'west', beam: 6,
    nodes: {
      west: [-56, -2.4], wN: [-56, 2.4], cS: [0, -2.4], cN: [0, 2.4], crossing: [0, 0], east: [56, -2.4], eN: [56, 2.4],
    },
    // shops are placed at random when the scene is built, so their doorways come from its camera views
    more(rt) {
      const out = {};
      for (const [key, id] of [['goldshop', 'gold'], ['carpets', 'carpet'], ['oud', 'oud']]) {
        const v = rt.views[key]; if (!v || !v.a) continue;
        const x = v.a.x - .4, sd = v.a.z < 0 ? -1 : 1;
        out[id + 'L'] = { at: [x, sd * 2.4], attach: true };
        out[id] = { at: [x, sd * 4.9], link: id + 'L' };
      }
      return out;
    },
    links: 'west-cS cS-east west-wN wN-cN cN-eN east-eN cS-crossing crossing-cN',
    spots: [
      { id: 'west', kind: 'door', en: 'West doors', ar: 'الأبواب الغربية' },
      { id: 'gold', kind: 'shop', en: 'Gold shop', ar: 'محل الذهب' },
      { id: 'carpet', kind: 'shop', en: 'Carpet shop', ar: 'محل السجاد' },
      { id: 'oud', kind: 'shop', en: 'Oud & perfume', ar: 'العود والعطور' },
      { id: 'crossing', kind: 'dome', en: 'Domed crossing', ar: 'التقاطع المقبب', look: [0, 13, 1] },
      { id: 'east', kind: 'door', en: 'East doors', ar: 'الأبواب الشرقية', go: 'souq', at: 'eastGate' },
    ],
  },
  museum: {
    from: 'corniche',
    nodes: {
      corniche: [-6, -46], entrance: [0, -31], zodiac: [0, -3.5], back: [0, 31], carpark: [10, 47],
      aw: [-20, -30], archOut: [-31.5, -26], archIn: [-31.5, -20.4], arcade: [-46, -20.4],
      pools: [40, -31], f60: [67, -45], c60: [67, -72], wharf: [67, -84],
    },
    links: 'corniche-entrance entrance-zodiac:door zodiac-back:door back-carpark entrance-aw aw-archOut archOut-archIn archIn-arcade entrance-pools corniche-f60 f60-c60:cross c60-wharf',
    spots: [
      { id: 'corniche', kind: 'park', en: 'Corniche Street', ar: 'شارع الكورنيش' },
      { id: 'entrance', kind: 'door', en: 'Main entrance', ar: 'المدخل الرئيسي' },
      { id: 'zodiac', kind: 'dome', en: 'Zodiac dome', ar: 'قبة الأبراج', look: [0, 34, 4] },
      { id: 'arcade', kind: 'arch', en: 'Ninety arches', ar: 'تسعون قوسًا' },
      { id: 'pools', kind: 'water', en: 'Reflecting pools', ar: 'الأحواض العاكسة', look: [40, 0, -36] },
      { id: 'wharf', kind: 'view', en: 'Dhow wharf', ar: 'مرسى المراكب', look: [67, 1, -100] },
      { id: 'carpark', kind: 'park', en: 'North car park', ar: 'الموقف الشمالي' },
    ],
  },
  shanasiyah: {
    from: 'west',
    nodes: {
      west: [-46, 0], cw: [-20, 0], lane: [0, 0], ce: [20, 0], east: [46, 0], court: [0, 6], well: [2.4, 14.8],
      ceS: [20, -41], alley: [20, -30], ceN: [20, 41], mq: [46, 52], mosque: [51.5, 61.5],
    },
    links: 'west-cw cw-lane lane-ce ce-east lane-court court-well ce-alley alley-ceS ce-ceN ceN-mq mq-mosque',
    spots: [
      { id: 'west', kind: 'door', en: 'West entrance', ar: 'المدخل الغربي' },
      { id: 'lane', kind: 'path', en: 'Covered lane', ar: 'الزقاق المسقوف' },
      { id: 'well', kind: 'water', en: 'Courtyard well', ar: 'بئر الساحة', look: [4.5, .6, 16] },
      { id: 'alley', kind: 'path', en: 'Side alley', ar: 'الزقاق الجانبي' },
      { id: 'mosque', kind: 'tower', en: 'Neighbourhood mosque', ar: 'مسجد الحي', look: [64, 9, 60] },
      { id: 'east', kind: 'door', en: 'East entrance', ar: 'المدخل الشرقي' },
    ],
  },
  suhub: {
    from: 'park', y: 583,
    nodes: {
      park: [-40, -10], pe: [-14, -9], r225: [-6.6, -16.6], r270: [10, -23.5], fountain: [5, -27.2], r315: [26.6, -16.6],
      r340: [32.1, -8], deckIn: [34, 0], deckMid: [52, 0], deck: [68, 0],
      r160: [-12.1, 8], r150: [-10.4, 11.8], fo: [-16, 15], flag: [-12, 27],
    },
    links: 'park-pe pe-r225 r225-r270 r270-fountain r270-r315 r315-r340 r340-deckIn deckIn-deckMid deckMid-deck pe-r160 r160-r150 r150-fo fo-flag',
    spots: [
      { id: 'park', kind: 'park', en: 'Summit car park', ar: 'موقف القمة' },
      { id: 'deck', kind: 'view', en: 'Viewing deck', ar: 'منصة المشاهدة', look: [1600, 260, 300] },
      { id: 'fountain', kind: 'water', en: 'Fountain', ar: 'النافورة', look: [5, 584, -34] },
      { id: 'flag', kind: 'flag', en: 'UAE flag', ar: 'علم الإمارات', look: [-12, 601, 30] },
    ],
  },
};
