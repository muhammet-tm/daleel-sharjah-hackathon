# Daleel app

The visitor app (Hashiya Folio layout in the team palette) and the authority dashboard. Static files in `public/`, one Cloudflare Pages Function in `functions/` for the guide.

## Run it

```bash
cd app
npm install
npm run dev          # http://localhost:8788  (app at /, dashboard at /dashboard.html)
npm test             # engine tests
```

Without an API key the guide answers from the local corpus and marks the answer "offline". To use Claude locally, copy `.dev.vars.example` to `.dev.vars` and put the key in it (the file is gitignored).

## Deploy (Cloudflare Pages, HTTPS, needed for the camera and AR)

```bash
cd app
npx wrangler login
npx wrangler pages project create daleel --production-branch main
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name daleel
npm run deploy
```

Open the printed `*.pages.dev` URL on an iPhone and an Android phone and check that "View in your space" appears on the Al Hisn plate.

## What is in it

| Feature | Where | Real or simulated |
|---|---|---|
| Timing-aware itinerary: crowd, heat, travel score per stop; best hour; plan score | `js/engine.js`, Index leaf | Real scoring. Crowd = curated typical-hours curves (labelled on screen). Heat = live Open-Meteo forecast, stored sample offline |
| Suggestions in the margin: later hour, or a quieter place outside the city, one tap to apply | `suggestions()` in `js/engine.js` | Real |
| AR time travel at Al Hisn Fort: 1823, 1969, today | Plate leaf, `models/*.glb` from `../tools/make_fort_models.py` | Real AR (model-viewer: Quick Look on iPhone, Scene Viewer/WebXR on Android). Models are simplified artist's impressions, labelled |
| AI guide writing numbered notes in the margin, adapts to adults, families or children, English or Arabic | `functions/api/guide.js`, `js/guide.js` | Real (Claude Opus 5.5, grounded only in `data/sites.json`); offline fallback answers from the same corpus |
| Colophon: walked, driven, car CO₂, stops off-peak and outside the city | Colophon leaf | Real arithmetic on the plan |
| Authority dashboard: site by hour, before and after, peak-hour load | `dashboard.html`, `simulate()` | Simulated pilot data, labelled |

Gamification (points, badges, treasure hunts) is deliberately absent: last year's winner built that.

## Accessibility

- English and Arabic with full right-to-left mirroring, Arabic fonts, and Arabic answers from the guide.
- Read aloud for every note and an audio description of each plate; the sentence being spoken is highlighted, so speech always has a caption.
- Reading settings: text size up to 160%, light, dark and high-contrast themes, calm view (fewer elements, larger targets, no map, no motion), reduce motion, automatic read-aloud, speech rate, and a heat-sensitive mode that steers away from outdoor heat.
- Keyboard: skip link, visible focus, arrow keys on the period selector, focus moves to the heading when the leaf changes, plan changes announced to screen readers.
- Status is never colour alone: quiet, moderate, busy and closed each have a shape and words. All colour pairs meet WCAG AA (4.5:1).
- Checked with axe-core 4.10: no violations on the three leaves in light, dark and high contrast, in English and Arabic, and on the dashboard.

## Data

`public/data/sites.json` is the single source for the app, the guide and the dashboard. It is a v1 seed for Sulaymon: coordinates are approximate, and every field listed under `verify` (mostly opening hours) must be checked on the official pages before the pitch.
