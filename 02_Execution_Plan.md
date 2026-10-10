# Daleel: execution plan for the two hackathon days

Drafted 10 October 2026 at about 14:30 on Day 1. The plan assumes the repositioning described in `01_Project_Concept.md`; the stack, roles, and timeline hold whichever replacement feature the team chooses. Every technical claim below was checked against a cited source during the research run; the sources are listed in `04_Research_Notes.md`.

## 1. The one decision that shapes everything

The hosts asked for one visitor problem and one core feature in a clickable, high-fidelity prototype. The official 2026 judging weights published by the organizing department give startup viability and commercial feasibility 20%, impact and value creation 20%, innovative use of emerging technology 20%, and 10% each to problem clarity, theme relevance, Sharjah and UAE relevance, and presentation. A prototype that shows one sustainability mechanism working end to end on a phone, with a credible buyer, scores on all of these. A prototype that shows seven features at low fidelity scores on none of them.

The core feature to demonstrate is the timing-aware itinerary: Daleel tells a visitor when and how to visit each place, not only what is there, by scoring every stop against crowd level, heat and season, and transport impact, and by steering part of each itinerary toward under-visited sites. The AR time-travel view is the demonstration's emotional moment, shown at one site. Everything else is a roadmap slide.

## 2. Roles

| Member | Owns | Deliverables by Day 2, 11:30 |
|---|---|---|
| Muhammet Yalkapov | Product and build: the web app, the AI guide, deployment, Claude Code workflow | Deployed app on HTTPS; itinerary screen; guide chat; AR view; demo script |
| Rama Saud Abdallah | Identity and interface: name treatment, logo, chosen design direction, screens | Logo and wordmark in Arabic and English; final visual direction applied to the three demo screens; hero image prompts for Higgsfield |
| Khadeja Alkhazraji | Business: model, canvas, buyer, pricing, pilot plan | Business model canvas; one slide on revenue (who pays, how much, why); pilot proposal for SCTDA or Shurooq; competitor table |
| Sulaymon Sadullo | Data: site dataset, crowd and heat signals, the authority dashboard | Curated JSON of 12 to 15 Sharjah sites with opening hours, typical busy windows, shade and indoor flags, and east-coast dispersal candidates; the dispersal dashboard chart; the sustainability score formula |

All four: the AI Usage Disclosure Document is appended by whoever uses a tool, at the moment they use it.

## 3. Timeline

Day 1, Saturday 10 October

| Time | Work | Owner |
|---|---|---|
| 14:30 to 15:00 | Choose the design direction and the replacement feature; freeze the feature list; agree the demo flow | All |
| 14:30 to 15:15 | Deploy an empty HTTPS skeleton to Cloudflare Pages; open it on one iPhone and one Android; confirm the camera prompt and the AR button appear | Muhammet |
| 15:00 to 16:30 | Site dataset v1 (names, coordinates, hours, busy windows, shade and indoor flags, east-coast alternatives) | Sulaymon |
| 15:00 to 16:30 | Logo, wordmark, color and type tokens from the chosen direction | Rama |
| 15:00 to 17:00 | Business model canvas; buyer interviews with mentors Zayneb Houichi and Kareem Tarabichi | Khadeja |
| 15:15 to 17:00 | Itinerary screen with scoring from the dataset; AR view with model-viewer and one heritage model | Muhammet |
| 16:30 to 18:00 | Dispersal dashboard chart; sustainability score formula written as one paragraph for the pitch | Sulaymon |
| 17:00 to 18:30 | Guide chat on the Claude API behind a Pages Function, with the curated corpus in a cached system prompt; Web Speech read-aloud | Muhammet |
| 17:30 to 18:30 | Apply the direction to the three screens; Higgsfield hero image for the chosen direction | Rama |
| 18:00 to 18:30 | Walk one mentor through the demo (Alaa Elkouni for the AI architecture or Afif Zughayer for the product) and record what they push back on | All |
| 18:30 to 19:00 | Wrap-up; list the overnight homework (slides outline, corpus text, dataset gaps) | All |

Day 2, Sunday 11 October

| Time | Work | Owner |
|---|---|---|
| 09:30 to 10:30 | Time-travel slider at one site; map with the route between Heart of Sharjah stops; fix what broke overnight | Muhammet |
| 09:30 to 10:30 | Final dataset; dashboard numbers consistent with the itinerary screen | Sulaymon |
| 09:30 to 11:00 | Pitch deck in the chosen direction; Higgsfield video clip for the opening | Rama |
| 09:30 to 11:00 | Business slide and pilot ask finalized; Q&A answer sheet | Khadeja |
| 10:30 to 11:30 | Rehearse the two-minute mentor walkthrough on a phone, three times | All |
| 11:30 to 12:00 | Buffer; nothing new is added after 11:30 | All |
| 12:00 to 12:30 | Shortlisting | |
| 13:30 to 15:30 | Pitch rehearsal with a timer, five minutes exactly; Q&A drill; upload materials and the disclosure document as soon as the organizers announce the cutoff | All |
| 16:00 to 18:00 | Pitches | |

## 4. Stack, with the reason for each choice and the fallback

| Layer | Choice | Reason | Fallback |
|---|---|---|---|
| App shell | Static site (plain HTML, CSS, and JavaScript, or Vite if a build step helps) deployed on Cloudflare Pages | HTTPS is mandatory for the camera (`getUserMedia` works only in secure contexts); Pages gives free HTTPS previews and Functions for the API call | Vercel Hobby (non-commercial use only) |
| 3D and AR | `<model-viewer>` 4.4.0 from jsDelivr with one GLB per site | One GLB covers Android WebXR, Android Scene Viewer, and iOS AR Quick Look (USDZ generated on the fly). Safari on iOS has no WebXR, so a custom camera overlay is Android-only | Show the 3D model inline without AR on any phone that refuses |
| Time travel | `img-comparison-slider` 8.0.7 between a present-day photo and a reconstruction image generated with Higgsfield and labelled "artist's impression" | Under 12 KB, works on every phone, convincing on a projector | A three.js clipping-plane view if time allows; never required for the demo |
| Guide | Claude API (`claude-opus-5-5`) from a Pages Function; the Sharjah corpus lives in the system prompt with prompt caching, so no vector database | Streams well, cheap after the first call, and the corpus is a curated text file the team controls | Pre-scripted answers for the three demo questions if the network fails |
| Voice | Web Speech API `speechSynthesis` for read-aloud; text input for questions | Speech synthesis works on iOS; speech recognition on iOS is partial and unreliable, so do not demo voice input | ElevenLabs free tier for one pre-rendered clip |
| Map and routing | MapLibre GL with OpenFreeMap tiles; OSRM demo server for one route | No keys, no limits for the tiles; one request per second is enough for a demo | A static route image |
| Data | JSON files in the repo for sites, busy windows, heat flags, and dispersal alternatives; the dashboard reads the same files | One source of truth; the numbers on the itinerary and on the dashboard cannot disagree | |
| Images and video | Higgsfield CLI (`higgsfield generate create nano_banana_2 --prompt ... --wait` for images; `kling3_0 --start-image` for a five-second clip) | Already installed and logged in; every generated asset is listed in the disclosure document | Photographs with credit |
| 3D assets | Sketchfab Creative Commons models: Low Poly Ancient Dhow Ship (CC BY 4.0), Khor Fakkan Portuguese Fort (CC BY-NC, 187,300 triangles), Excavation of the Al Midfa Mosque (CC BY-NC) | Real Sharjah heritage scans exist with licenses that allow a credited hackathon demo | Low-poly mosque or Arabic house models (CC BY) |

Asset preparation: shrink the heavy scans with `gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp` before putting them in the repo. No downloadable falaj, qanat, or wind-tower model exists on Sketchfab or Poly Pizza; if a falaj is needed, generate an image with Higgsfield instead.

What is real in the demo: deployment, AR launch, the itinerary scoring over the dataset, the guide, the slider, the map, the dashboard chart. What is simulated and labelled as such on screen: crowd levels (typical hours from the dataset, labelled "typical"), the reconstruction ("artist's impression"), and the authority dashboard (seeded with the dataset, labelled "pilot data"). Group tours, VR headsets, live translation, and native ARKit or ARCore are roadmap items and are not demonstrated.

## 5. Build order for Muhammet (Claude Code)

1. Repository and deploy first: `daleel/` with `index.html`, `app.css`, `app.js`, `data/sites.json`, `functions/api/guide.js`; push; open the Pages URL on both phones. Nothing else starts before the AR button has been seen on an iPhone.
2. Itinerary screen: read `sites.json`, compute a score per stop from busy window, heat flag, and dispersal bonus, render the plan with "Quiet now", "Busy after 16:00", and "Shade route" labels, and show the plan's sustainability score.
3. AR view: `<model-viewer>` with the fort model, `ar` attribute, and a callout card; test the Quick Look launch on the iPhone and Scene Viewer on the Android.
4. Guide: Pages Function that forwards the question with the cached corpus; streaming response; read-aloud button.
5. Slider and map.
6. Dashboard chart from the same JSON.
7. Polish passes only after step 6: apply the chosen direction's tokens, then the transition recipes.

Claude Code tooling for each stage: `spec` and `writing-plans` for the feature freeze; `design-references`, `design-dna`, and `impeccable` for the direction; `frontend-design`, `threejs-fundamentals`, and `transitions-dev` for the build; `browser-qa` and the built-in browser for checks on each deploy; `higgsfield-generate` for images and video; `writing-humanizer` for every piece of pitch text. The Figma connector is available for the logo if Rama prefers it, within its daily call limit.

## 6. Demo script (two minutes, for the shortlisting walkthrough)

1. Open Daleel on a phone. "A family lands at Sharjah Airport on a Friday in August. Every guide tells them what to see. Daleel tells them when." (10 seconds)
2. Itinerary screen: the plan for today shows Al Hisn Fort at 09:30 with "Quiet now", Al Noor Island after sunset with "Busy 16:00 to 18:00, go at 19:00", and the Kalba mangroves on Saturday morning with "Shade route, 40 minutes by car". The sustainability score updates when a stop is moved. (40 seconds)
3. Tap Al Hisn Fort, open the AR view, place the fort on the table, drag the slider from today to 1823. (30 seconds)
4. Ask the guide one question by text ("Why was the fort demolished in 1969?"), play the answer aloud. (20 seconds)
5. Switch to the authority dashboard: visitors nudged away from the top four sites this week, by hour. "This is what SCTDA buys." (20 seconds)

## 7. Pitch structure (five minutes), mapped to the weights

| Minute | Content | Criterion served |
|---|---|---|
| 0:00 to 0:40 | The problem with numbers: 2.1 million hotel guests in 2025 (up 22%), two-night average stays, summer highs near 42°C, Khorfakkan and the Corniche congested on holidays, four sites carrying most of the footfall | Problem clarity, Sharjah relevance |
| 0:40 to 1:10 | Daleel in one sentence; why existing tools do not do this (SCTDA's own app last updated December 2022; no Gulf destination app shows crowd, heat, or season to visitors) | Theme relevance, innovation |
| 1:10 to 3:10 | Live demo (the script above, compressed) | Innovation, impact, presentation |
| 3:10 to 3:50 | Business model: free for visitors; SCTDA and Shurooq pay for the dispersal dashboard and seasonal campaigns; hotels and east-coast operators pay for placement in off-peak itineraries; pilot proposal for the Heart of Sharjah and Kalba | Commercial feasibility |
| 3:50 to 4:30 | Evidence that dispersal works: the ESA Rural Tourism 5.0 pilot in Cornwall and the Lake District (visitors up 13.31%, private car use down 7.13%); the 2024 TU Munich study on crowd and season indicators changing user choices | Impact, value creation |
| 4:30 to 5:00 | Roadmap (AR at more sites, translation, accessibility modes, group tours) and the ask | Startup viability |

Q&A answer sheet (Khadeja drafts, all review): How is this different from Sharjah Quest? How do you get real crowd data? Why would a visitor follow the nudge? What stops Visit Dubai from copying this? What did AI generate and what did you build?

## 8. Mentor plan

Approach mentors in this order, and never with the whole team at once.

1. Kareem Tarabichi, early afternoon: validate the buyer and the pricing line.
2. Zayneb Houichi, early afternoon: what first-time visitors to Sharjah ask her agency and where they get stuck.
3. Alaa Elkouni, late afternoon: review the guide architecture and the corpus approach.
4. Afif Zughayer and Mahmoud Darwish, before the Day 1 wrap-up: show the working itinerary screen and ask what the 2025 judges rewarded and what they punished. The research found exact name matches between these two mentors and two members of the 2025 winning team; confirm this politely in conversation rather than assuming it. Do not pitch them an AR treasure hunt.
5. Mahira Moen Pathan or Rohan Mitra on Day 2 morning: the scoring formula and the dashboard.

## 9. Risks and the response to each

| Risk | Response |
|---|---|
| AR does not launch on the iPhone in the room | Demo AR on the Android; show the inline 3D model on the iPhone; say so plainly |
| Network fails during the pitch | Pre-scripted guide answers and a screen recording of the full flow on the laptop |
| The team spends the afternoon on the 3D model | Hard stop at 17:00 on Day 1: whatever model renders by then is the model |
| Judges hear "AI guide" and think of the hosts' own example | Lead with the timing and dispersal mechanism, not with the guide |
| A mentor says SCTDA already has a sustainability assistant | Agree; Daleel is visitor-facing and itinerary-level, and the SCTDA assistant (October 2024) advises businesses on energy, waste, and mobility |
| Disclosure document is incomplete at upload time | Appended continuously; Muhammet checks it at every deploy |
