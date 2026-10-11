# Daleel app

The visitor app (Hashiya Folio layout in the team palette) and the authority dashboard. Static files in `public/`, one Cloudflare Pages Function in `functions/` for the guide.

## Run it

```bash
cd app
npm install
npm run dev          # http://localhost:8788  (app at /, dashboard at /dashboard.html)
npm test             # engine tests (Node's built-in test runner)
```

Without an API key the guide answers from the local corpus and marks the answer "offline". To use Claude locally, copy `.dev.vars.example` to `.dev.vars` and put the key in it (the file is gitignored).

Camera, microphone and GPS features need HTTPS or `localhost`. They work on `npm run dev` and on the deployed `*.pages.dev` site.

## Deploy (Cloudflare Pages, HTTPS, needed for the camera and AR)

```bash
cd app
npx wrangler login
npx wrangler pages project create daleel --production-branch main
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name daleel
npm run deploy
```

Open the printed `*.pages.dev` URL on an iPhone and an Android phone and check that "View in your space" appears on the Al Hisn plate.

## The screens

The app is one book. On the first visit it opens on a **Welcome** page; after that, the running head has five leaves, in this order:

| Leaf | What the visitor does there |
|---|---|
| **Welcome** (first visit only) | Answers four questions: name, age, nationality and date of landing in the UAE, or skips. Reopened from Reading settings ("Change your details") |
| **Index** | Plans the day: stops timed against crowds, heat and travel, suggestions in the margin, a real map of the route, and the index of all places |
| **Plate** | Reads about one place: its picture or 3D model, the period control, the guide's margin notes, "Find your way inside", and a question box for the AI guide. Opens on the Central Souq |
| **3D** | Explores hand-built 3D scenes of five places, walks inside the Central Souq, and follows the AR guide |
| **Recycle** | Recycles 3 bottles at a place (with a GPS location check), sees their impact, and spends points on offers |
| **Colophon** | Sees the ledger of the day (walked, driven, car CO₂, off-peak stops, plan score) and how the score is made |

Reading settings (top bar) hold language, text size, theme, calm view, reduced motion, read-aloud options and the hands-free (Sahm) controls.

## Features

| Feature | Where | Real or simulated |
|---|---|---|
| Welcome page (onboarding) on the first visit: name, age, nationality (45 countries plus Other, in English and Arabic) and date of landing, with field-by-field error messages. The name gives a greeting on the Index ("Welcome, Sara · landing 14 October"); the plan's Day starts on the landing date when it is today or later; under 13 sets the AI guide to explain for children. Skippable, and editable later from Reading settings | Welcome leaf (`#welcome`), `saveWelcome()` and `NATIONALITIES` in `js/app.js`, `css/onboard.css` | Real. Answers are stored in the browser's local storage on the device and are not sent anywhere. Nationality is stored but not used yet |
| Timing-aware itinerary: crowd, heat, travel score per stop; best hour; plan score | `js/engine.js`, Index leaf | Real scoring. Crowd = curated typical-hours curves (labelled on screen). Heat = live Open-Meteo forecast, stored sample offline |
| Suggestions in the margin: later hour, or a quieter place outside the city, one tap to apply | `suggestions()` in `js/engine.js` | Real |
| Real map of the plan: OpenStreetMap streets, the route as a dashed line, numbered stops, a dot for every other place (tap to open its plate), ✓ on recycled places | `renderMap()` in `js/app.js`, `css/map.css` | Real map tiles. Site coordinates are approximate (about 300 m). Falls back to the schematic map if the map cannot load |
| AR time travel at Al Hisn Fort: 1823, 1969, today | Plate leaf, `models/*.glb` from `../tools/make_fort_models.py` | Real AR (model-viewer: Quick Look on iPhone, Scene Viewer/WebXR on Android). Models are simplified artist's impressions, labelled |
| Picture plates: the Central Souq plate shows the team's photos in a period control (1823 · 1978 · Today, with The front, From the air, Inside and the 3D model under Today); Al Noor Mosque, the Islamic Museum and Heart of Sharjah show stills of their 3D scenes. Tapping a picture opens the 3D leaf | `PLATES` and `renderPicture()` in `js/app.js`, `public/plates/`, `css/plates.css` | Photos by the team, captioned "Photo: Daleel team". The 1978 picture is an archive photo. The 1823 picture is a modern desert photo used as an illustration, captioned as such. 3D stills are labelled as artist's impressions |
| 3D leaf: hand-built scenes of the Central Souq, Al Noor Mosque, the Islamic Museum (with the zodiac dome you can stand under), Souq Al Shanasiyah and Al Suhub Rest Area, lit for the hour of the visit, with a tour, set views, a day-to-night slider, labels and full screen | `js/3d/core.js`, `js/3d/place-*.js`, `css/3d.css` | Real-time 3D. Scenes are artist's impressions from public facts and photos, not surveyed. three.js loads only when the leaf first opens; rendering pauses on other leaves |
| Walk inside the Central Souq: a two-level gallery of 104 shops (gold, carpets, oud and perfume, textiles, antiques) with bilingual signs, a glazed vault and a domed crossing; drag to look, tap the floor or a doorway to walk, or use W A S D | `js/3d/place-souq-inside.js`, walk mode in `js/3d/core.js` | Real-time 3D, artist's impression of the interior |
| AR guide: pick a spot inside a 3D place, see the route laid over the scene, then walk it at eye level behind animated floor arrows and turn signs, with turn-by-turn directions, optional spoken guidance, pause, 2× and 4× speed, and an arrival view | `js/3d/nav.js`, `js/3d/routes.js`, "AR guide" on the 3D leaf, "Find your way inside" on the Plate | Real route finding over hand-placed waypoints for all five places and the souq interior. The walk happens in the 3D scene, not through the camera |
| AI guide writing numbered notes in the margin, adapts to adults, families or children, English or Arabic | `functions/api/guide.js`, `js/guide.js` | Real (Claude Opus 5.5, grounded only in `data/sites.json`); offline fallback answers from the same corpus |
| Recycling rewards: pick where you are recycling (plan stops first), three photo steps (collect 3 bottles, photo at the place, photo at the bin), each with an example photo from the team. 25 points per bottle plus a 50-point bonus the first time at a place; one mission per place per day. "Your impact" shows bottles, plastic kept out of landfill and CO₂ avoided; points buy vouchers from example partner offers; recycled places get a ✓ in the Index and on the map | Recycle leaf; `RECYCLE`, `missionPoints()`, `recycleTotals()` in `js/engine.js`; `offers` in `data/sites.json` | Photo checks simulated (every photo counts as 3 bottles), labelled on screen. Plastic (0.02 kg) and CO₂ (0.08 kg) per bottle are estimates for a 500 ml PET bottle. Offers are examples, not real partners. Progress stays on the device |
| GPS location check on the Recycle leaf: "Check my location" confirms the visitor is within 400 m of the chosen place, switches the picker to the place they are actually at, and records on each finished mission whether the location was checked | `checkLocation()` in `js/app.js` | Real (browser Geolocation API). The position is read once, kept on the device and never sent. The check is recorded, not required, so the mission can still be demonstrated away from the site |
| Hands-free control from the Sahm project: voice commands in English and Arabic (leaf names, place names, "read aloud", "scroll down", "back", "Arabic"/"English", "click", or the words on any button), a head-tracked pointer, and wink to click; switched on in Reading settings | `js/sahm.js`, `css/sahm.css` | Real. Voice uses the browser's speech recognition (Chrome, Edge, Safari). Head pointer and winks use MediaPipe face landmarks in the browser; video is never recorded or sent |
| Colophon: walked, driven, car CO₂, stops off-peak and outside the city | Colophon leaf | Real arithmetic on the plan |
| Authority dashboard: site by hour, before and after, peak-hour load | `dashboard.html`, `simulate()` | Simulated pilot data, labelled |
| Camera AR wayfinding to facilities inside a building (toilets, prayer room, lift, exit, tickets, first aid) | `js/ar-wayfinding.js` | **Planned, not built.** The file describes the approach (WebXR hit-test for the floor, QR or image anchors indoors, a route graph per site). Until it exists, "Find your way inside" opens the AR guide in the 3D scene |

Note for the pitch: the concept document says gamification (points, badges, treasure hunts) was deliberately left out because last year's winner built it. The recycling rewards use points, so the team should decide how to present this.

## Tools and libraries

| Tool | Version | Used for | Licence |
|---|---|---|---|
| [three.js](https://threejs.org) (with OrbitControls, Sky, Water, BufferGeometryUtils) | 0.147.0, jsDelivr | The 3D leaf, the souq interior and the AR guide | MIT |
| [@google/model-viewer](https://modelviewer.dev) | 4.4.0, jsDelivr | Al Hisn Fort model and "View in your space" AR | Apache-2.0 |
| [Leaflet](https://leafletjs.com) | 1.9.4, jsDelivr | The real map on the Index | BSD-2-Clause |
| [OpenStreetMap](https://www.openstreetmap.org) tiles | — | Map imagery, credited on the map | Data © OpenStreetMap contributors (ODbL). Fine for a demo; a public launch needs its own tile provider |
| [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe) (Face Landmarker, float16 model) | 0.10.14, jsDelivr and Google storage | Head-tracked pointer and wink to click | Apache-2.0 |
| Web Speech API (SpeechRecognition, speechSynthesis) | Browser | Voice commands, read aloud, spoken guidance | — |
| Geolocation API | Browser | The GPS location check on the Recycle leaf | — |
| [Open-Meteo](https://open-meteo.com) | Live API | Feels-like temperature forecast for each region | CC BY 4.0, free for non-commercial use |
| [Claude Opus 5.5](https://www.anthropic.com) via `@anthropic-ai/sdk` | SDK 0.133 | The AI guide in the margin | Anthropic API terms |
| [Cloudflare Pages](https://pages.cloudflare.com) and Wrangler | Wrangler 4 | Local dev server, hosting, the guide function | — |
| Google Fonts: EB Garamond, Amiri, IBM Plex Sans, IBM Plex Sans Arabic, IBM Plex Mono | — | Typography in English and Arabic | SIL Open Font Licence |
| Node.js test runner | Node 22+ | Engine tests (`npm test`) | — |
| `tools/make_fort_models.py` (Python) | — | Builds the Al Hisn GLB models for each period | Team |
| `tools/render_plates.mjs` (Node + headless Chrome) | — | Renders the 3D stills used as plate pictures: start the app, then `node tools/render_plates.mjs` | Team |
| Claude Code (Anthropic) | — | Planning, research, code and copy, as listed in `03_AI_Usage_Disclosure.md` | — |

## Privacy and permissions

| Permission | Asked when | What happens to the data |
|---|---|---|
| Camera (AR) | "View in your space" on the Al Hisn plate | Handled by the phone's own AR viewer |
| Camera (head pointer) | Head pointer or wink to click switched on in Reading settings | Frames are analysed in the browser and discarded; nothing is recorded or sent |
| Microphone | Voice commands switched on | The browser's speech recognition turns speech into text (in Chrome this service is provided by Google); Daleel keeps only the command |
| Location | "Check my location" on the Recycle leaf | Read once, compared with the site, kept on the device, never sent |
| Personal details | The Welcome page on the first visit (name, age, nationality, date of landing) | Kept in local storage on the device, never sent; skippable, and changeable from Reading settings |
| Photos | Recycling steps | Not read or uploaded; choosing a photo counts as a simulated check |

The plan, reading settings, Welcome answers, recycling progress and vouchers are stored in the browser's local storage on the device. Only questions typed for the guide go to the server.

## Accessibility

- English and Arabic with full right-to-left mirroring, Arabic fonts, and Arabic answers from the guide.
- Read aloud for every note and an audio description of each plate; the sentence being spoken is highlighted, so speech always has a caption.
- Reading settings: text size up to 160%, light (default), dark and high-contrast themes, calm view (fewer elements, larger targets, no map, no motion), reduce motion, automatic read-aloud, speech rate, and a heat-sensitive mode that steers away from outdoor heat.
- Hands-free control (Sahm): voice commands in English and Arabic, a head-tracked pointer, and wink to click, for visitors who cannot use their hands.
- Clear labels: "Feels like 35°C", "Crowd: typical hours, not live", "Best time today: 08:00", "see note 1"; recycling steps are numbered and say when they are locked; estimates and simulations are marked on screen.
- 3D labels are large and high-contrast and never overlap; every picture has a written description; reduced motion turns off the 3D tour and the running day.
- Welcome page: every field has a visible label, errors are written out field by field, the invalid fields are marked, and focus moves to the first one.
- Keyboard: skip link, visible focus, arrow keys on the period selector, focus moves to the heading when the leaf changes, plan changes announced to screen readers. In the souq interior, W A S D and the arrow keys walk.
- Status is never colour alone: quiet, moderate, busy and closed each have a shape and words. All colour pairs meet WCAG AA (4.5:1).
- Checked with axe-core 4.10: no violations on the original three leaves in light, dark and high contrast, in English and Arabic, and on the dashboard. The 3D, Recycle and hands-free additions have not yet been re-checked with axe-core.

## Plate pictures

Pictures live in `public/plates/`. The Central Souq slots are `blue-souk-1823.jpg`, `blue-souk-1978.jpg`, `blue-souk-1.jpg` (the front), `blue-souk-2.jpg` (from the air), `blue-souk-3.jpg` (inside) and `blue-souk-3d.jpg`; recycling step examples are `recycle-1.jpg` to `recycle-3.jpg`. A missing file is skipped, so a new photo appears as soon as it is saved with the right name. To add photos for another place, add an entry to `PLATES` in `js/app.js`.

## Data

`public/data/sites.json` is the single source for the app, the guide and the dashboard. It is a v1 seed for Sulaymon: coordinates are approximate, and every field listed under `verify` (mostly opening hours) must be checked on the official pages before the pitch. The `offers` list holds the example partner offers for recycling points.

## Files

| Path | What it is |
|---|---|
| `public/index.html` | The app: running head, the Welcome page, five leaves, settings and dialogs |
| `public/js/app.js` | Rendering, routing, Welcome page, plan, plates, map, recycling, GPS check, 3D loading |
| `public/js/engine.js` | Scoring, crowd curves, suggestions, recycling rules, dashboard simulation (tested) |
| `public/js/i18n.js` | Every UI string in English and Arabic |
| `public/js/guide.js`, `functions/api/guide.js` | The AI guide (browser side and Pages Function) |
| `public/js/speech.js` | Read aloud with highlighted captions |
| `public/js/sahm.js` | Hands-free control: voice, head pointer, wink |
| `public/js/ar-wayfinding.js` | Plan for camera AR wayfinding (not built) |
| `public/js/3d/core.js` | 3D engine: renderer, sky and sun, textures, builders, camera, walking |
| `public/js/3d/place-*.js` | One file per 3D place, plus the souq interior |
| `public/js/3d/nav.js`, `routes.js` | The AR guide and its waypoints |
| `public/css/app.css` | Design tokens and the original layout |
| `public/css/3d.css`, `map.css`, `plates.css`, `sahm.css`, `onboard.css` | Styles for the additions, built from the same tokens |
| `public/plates/` | Plate photos, 3D stills and recycling examples |
| `public/models/` | Al Hisn Fort GLB models |
| `public/data/` | `sites.json` and the stored heat sample |
| `tests/engine.test.mjs` | Engine tests |
