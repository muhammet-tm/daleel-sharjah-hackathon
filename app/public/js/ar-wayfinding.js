// PLACEHOLDER — indoor AR wayfinding (to be implemented by the team).
//
// Idea: Daleel already knows where each site is (lat/lng in data/sites.json), but not how to find the
// facilities inside it. The visitor opens the camera, picks a facility, and follows arrows drawn on the floor.
//
// Wiring that already exists:
// - The Plate leaf shows a "Find your way inside" block (renderWayfind() in js/app.js) with a disabled button.
//   When start() works, set READY = true below and the button turns on and calls start(site, facility).
// - Strings live in js/i18n.js under the "wf" keys (English and Arabic).
//
// Suggested approach (notes, not code yet):
// - Floor arrows: WebXR "immersive-ar" with the "hit-test" feature finds the floor on Android Chrome;
//   on iPhone, Safari has no WebXR, so use a camera view with device orientation, or an App Clip / native step.
// - Position indoors: GPS does not work well inside buildings. Use anchors the visitor scans (QR or image markers
//   at the entrance and junctions) and a small route graph per site: nodes = anchors and facilities, edges = walkable paths.
// - Data: add an optional "facilities" list per site in data/sites.json, e.g.
//   { "id": "toilets", "anchor": "entrance-east", "path": ["entrance-east", "corridor-2", "toilets"] }
// - Accessibility: read each turn aloud (js/speech.js), offer a step-by-step text list for visitors who cannot use the camera,
//   prefer step-free routes when "Avoid stairs" is chosen, and work with the hands-free voice commands in js/sahm.js.

export const READY = false;

// Facility types the placeholder lists; keys map to i18n strings "wf_<key>".
export const FACILITIES = ["toilets", "prayer", "lift", "exit", "tickets", "firstAid"];

// True when this device could run camera AR (WebXR immersive-ar). Not used until READY is true.
export async function isSupported() {
  try { return !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar"))); } catch { return false; }
}

// Start guiding the visitor to a facility inside a site. To be implemented.
export async function start(site, facility) {
  throw new Error(`AR wayfinding is not implemented yet (${site?.id} → ${facility}).`);
}
