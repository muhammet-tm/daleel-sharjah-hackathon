# Daleel: revised project concept

Drafted 10 October 2026, Day 1 of the hackathon, from the team's original idea, the organizer documents, the hosts' opening slides, and a verified research run (sources in `04_Research_Notes.md`). The original idea is kept in full in Section 8 so nothing is lost; Sections 1 to 7 are the version to build and pitch.

## 1. Why the original draft has to change

Three findings force a repositioning rather than a one-feature swap.

First, the 2025 winner, Sharjah Quest by team Hayyakum of AUS, was an augmented reality guide with curated itineraries, digital stamps, mascots, badges, and leaderboards, and its team already claimed that its guidance spreads visitor traffic. The overlap with the original draft is therefore not limited to the treasure-hunt feature; it covers the AR guide, the route planning, and the gamification together. Two members of that team, Mahmoud Darwish and Afif Zughayer, appear by name on this year's mentor roster, so the people most able to spot the resemblance are in the room.

Second, "AI tourism assistant" is the organizers' own worked example. The opening slides used "Discover Sharjah AI", an AI companion for families, to illustrate a value proposition, and SCTDA itself launched a Sustainable Tourism AI Assistant in more than 40 languages at GITEX in October 2024. A conversational guide on its own will not read as original to this panel.

Third, the hosts asked for one visitor problem and one core feature in a clickable, high-fidelity prototype, and the official 2026 judging weights give commercial feasibility and impact 40% between them. A prototype of seven features at low fidelity scores poorly on those weights, whereas one mechanism that works end to end for a named buyer scores on all of them.

## 2. The repositioned idea in one paragraph

Daleel (Arabic for "guide") is a web-based tourist guide for Sharjah. Official destination apps in the Gulf tell visitors what there is to see. Daleel also tells them when to go and how to get there, so that each visit costs the site less and gives the visitor more. To do this, Daleel scores every stop in an itinerary against crowd level, heat and season, and transport impact, nudges the visitor toward quieter hours and under-visited sites in the Central Region and on the East Coast, and shows the trade-off of each nudge in one plain sentence. An augmented reality view lets the visitor see a heritage site as it stood in an earlier period, on the spot, in the browser, with the guide explaining what is fragile about it today. Anonymized itinerary intent flows back to the tourism authority as a dispersal dashboard, which is what SCTDA and Shurooq would pay for.

## 3. Value proposition in the hosts' format

| | |
|---|---|
| Who (target customer) | First-time visitors to Sharjah planning one or two days, led by families and by the largest 2025 source markets (Russia 17%, India 11%, UAE residents 9%, Oman 7%, China 5% of 2,055,065 hotel guests). Buyer: SCTDA and Shurooq as destination managers; East Coast and Central Region operators as advertisers. |
| Problem (unmet need) | Visitors funnel to the same four or five sites at the same hours; stays average 1.95 nights; summer afternoons exceed 40°C apparent temperature and tourism activity collapses from June to September; the Khorfakkan entrances and the Corniche jam on holidays. Existing tools say what is there (Visit Sharjah's static itineraries, SCTDA's Shj AI Guide app last updated in December 2022) and say nothing about when. |
| Solution (innovation) | A timing-aware itinerary engine with three signals (crowd, heat, transport), dispersal toward under-visited regions, an AI guide grounded in a curated Sharjah corpus, browser-based AR time travel at heritage sites, and an authority dashboard built on the same data. |
| Value (outcome) | For the visitor: a cooler and quieter day with less planning. For the authority: a measurable share of visits moved off-peak and out of the city, year-round demand, and a channel for the Sustain Sharjah program. For local operators: footfall in places that marketing alone does not fill. |

## 4. Feature list, revised

Demonstrated on Day 2 (built for real unless marked):

1. Timing-aware itinerary. Scores each stop by hour-of-day busyness, heat and shade, and travel time; offers one-tap swaps with a sentence such as "Swapping Al Noor Island at 14:00 for Kalba Corniche Park at 16:30 adds 40 minutes and avoids the daily peak"; shows a sustainability score for the plan. Busyness curves are curated and labelled "typical hours" on screen; heat comes live from Open-Meteo (no key needed) with a stored July sample for the demo contrast. This single feature replaces the original core feature 4 (route planning) and the original advanced feature 4 (gamified treasure hunts).
2. AI guide. A conversational guide on the Claude API, grounded in a curated corpus of 12 to 15 Sharjah sites, with read-aloud. Adapts tone to a family audience on request. It uses no points and no badges.
3. AR time travel at one site. A 3D model placed in the room through the browser (iOS AR Quick Look, Android Scene Viewer or WebXR) and a slider between a present-day photograph and a reconstruction labelled "artist's impression". Demonstrated at Al Hisn Fort (built 1823, demolished 1969, rebuilt and reopened as a museum in 2015) or at the Khorfakkan Portuguese fort, for which a Creative Commons scan exists.
4. Dispersal dashboard for the authority. Site-by-hour load from itinerary intent, visits redirected this week, and a forecast against capacity. Seeded with the demo dataset and labelled "pilot data".

Roadmap (one slide, not demonstrated): personalization from visit history; real-time translation and cultural adaptation of the narration (SCTDA's assistant already covers 40 languages for businesses, so this is integration, not invention); a calm route profile for low-sensory, step-free, and elderly visitors; group tours and shared AR sessions; VR headset mode for remote visitors; conservation mode inside EPAA protected areas; local spend routing to Sharjah-owned small businesses; a connector to the Sustain Sharjah Sustainability Journey badges.

## 5. The replacement for advanced feature 4: three options

The team asked for the gamified treasure hunt to be replaced. The research produced ten candidates; the three below are the strongest, and each is buildable this afternoon.

| Option | What it is | Why it fits the theme | Demo in hours | Main risk |
|---|---|---|---|---|
| A. Quiet Hours Dispersal Routing (recommended) | Scores every stop by hour-of-day busyness and nudges visitors from peak slots at city landmarks toward Central Region and East Coast sites, with the time cost of each swap stated plainly | Overtourism and regional balance are SCTDA's own framing; its Sustainability Map lists eco-friendly spots but has no routing, crowding, or time dimension | About three hours: a JSON of 20 to 25 sites with curated hourly curves, one scoring function, pins that recolor as a time slider moves | Judges will ask for real crowd data; the answer is curated curves with an architecture ready for turnstile, telecom, or popular-times feeds |
| B. Conservation Mode in Protected Areas | When a route enters an EPAA protected area (Al Qurm, Wasit, Al Hefaiyah, Wadi Al Helo, Mleiha), the guide switches to trail-only navigation, species and habitat context, rules on litter, drones, and wildlife distance, and a leave-no-trace check-out | Direct environmental protection where visitor growth does the most damage; gives AR a reason to exist in nature sites | About three hours: approximate GeoJSON polygons, simulated GPS entry, a themed rules card per area | Polygons are approximate; EPAA rather than SCTDA owns the areas; self-declared check-out is weak evidence |
| C. Local Spend Router | Routes food, craft, guide, and transfer spend to Sharjah-owned small businesses and shows the share of the itinerary budget that stays local | Community economic sustainability, which is the CSR and community-based tourism pillar of the Visit Sharjah strategy | About two hours: a curated list of 30 to 40 businesses with a local-ownership flag and a retention percentage | A wrong "local" label on a chain would embarrass the team in front of SCTDA; ownership is hard to verify in hours |

Recommendation: Option A, with the heat-aware scheduling folded into the same scoring function as a second signal. It is the only candidate that is at once SCTDA's stated priority, unambiguous as sustainability, and buildable today, and it produces the impact number the judges will ask for (the share of visits moved off-peak or out of the city). It reuses the route planner the team already wanted and feeds the dashboard at no extra cost. Option B is the best second feature if the build runs ahead of schedule on Day 2; Option C belongs on the roadmap.

## 6. Differentiation, for the question "how is this different?"

| Compared with | What it does | What Daleel does that it does not |
|---|---|---|
| Sharjah Quest (2025 winner) | AR digital passport with stamps, badges, leaderboards, curated itineraries | Changes when and where people go without a reward mechanic, and shows the destination-side benefit on a dashboard |
| Shj AI Guide (SCTDA app, last updated December 2022) | Five-language text and voice chatbot | Itinerary-level timing, AR, map, and sustainability signals; the SCTDA app has none of these |
| SCTDA Sustainable Tourism AI Assistant (October 2024) | Advises businesses on energy, waste, and sustainable mobility in 40 languages | Visitor-facing and itinerary-level; Daleel is the demand side of the same program |
| AthAR+ (UAE-wide, November 2025) | 3D monument reconstructions, AR navigation, point-collecting challenges | Sharjah-specific, no points, and the reconstruction is the explanation layer for a timing decision rather than the product |
| Visit Dubai, Visit Abu Dhabi, Google AI trip planning, Mindtrip, Layla | Recommendations, itineraries, booking, landmark recognition | None exposes crowd, heat, or season to the visitor; Nusuk shows crowd density, but for pilgrim safety |

Evidence that the mechanism works elsewhere: the European Space Agency's Rural Tourism 5.0 pilot in Cornwall and the Lake District in 2024 ran an attract-and-disperse algorithm and reported visitor numbers up 13.31%, private car use down 7.13%, and cycling up 23%; a 2024 Technical University of Munich study found that sustainability labels and crowd and season indicators significantly shift which trips users choose.

## 7. Business model sketch (for the canvas)

Visitors use Daleel free. Revenue comes from three lines: a destination-management license for SCTDA and Shurooq (dashboard, seasonal campaign tooling, Sustain Sharjah evidence export); placement fees from East Coast and Central Region operators and Sustain Sharjah listed hotels for inclusion in off-peak itineraries; and commissions on bookings routed through the itinerary once booking partners exist. The pilot proposal is the Heart of Sharjah plus Kalba for one season, with the Sustain Sharjah Awards at SITTF on 28 October 2026 as the first public milestone, which is also where the hackathon winner presents.

## 8. The original idea, kept for the record

Title: Smart 3D AI-Powered Tourist Guide Using Augmented and Virtual Reality.

Core features as first written: 3D virtual tours with VR mode and historical reconstruction; an AR tourist guide overlaying facts, models, and directions on landmarks; an AI tour assistant that adapts to age, interests, and language; AI route planning with AR arrows and audio. Advanced features as first written: time-travel AR and VR; a personalized recommendation engine; multilingual and cultural adaptation; interactive gamified tourism with AR treasure hunts, points, and badges (removed); social and collaborative group tours; accessibility features; analytics for tourism authorities. Proposed technologies: AI and ML, NLP, ARCore and ARKit, VR, Unity or Unreal, GPS, cloud and edge computing. Target users: tourists, museums and cultural institutions, tourism agencies and city authorities, remote virtual tourists.

Three things changed. Unity, Unreal, and native ARKit or ARCore gave way to a browser stack, because four students cannot ship a native AR build in seven hours and the judges will see a phone rather than an engine. The seven advanced features became four demonstrated features and a roadmap, because the hosts and the judging weights reward one mechanism at high fidelity. Sustainability moved from absent to the headline, because it is the theme, it carries 10% of the score on its own, and the dispersal mechanism is what makes the project commercially legible to the authority in the room.
