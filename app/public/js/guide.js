// Guide client: streams an answer from /api/guide (Claude, grounded in data/sites.json).
// If the function is unreachable (offline, static preview, no API key) it answers from the local corpus instead,
// so the demo never shows an empty margin.

export async function askGuide({ question, site, sites, lang, audience, history, timing, onText, onDone }) {
  try {
    const res = await fetch("api/guide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, siteId: site.id, lang, audience, history, timing }),
    });
    if (!res.ok || !res.body) throw new Error("guide unavailable " + res.status);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      onText(text);
    }
    if (!text.trim()) throw new Error("empty answer");
    onDone({ offline: false });
  } catch {
    onText(offlineAnswer(question, site, sites, lang, timing));
    onDone({ offline: true });
  }
}

// Rule-based fallback over the same corpus: pick the place the question names (or the open plate) and answer from its entry.
export function offlineAnswer(question, site, sites, lang, timing) {
  const q = question.toLowerCase();
  const named = sites.find((s) => q.includes(s.name.en.toLowerCase().split(" (")[0]) || question.includes(s.name.ar.split(" (")[0])) || site;
  const story = named.story[lang] || named.story.en;
  const fragile = named.fragile[lang] || named.fragile.en;
  const sentences = story.match(/[^.!?؟]+[.!?؟]*/g) || [story];
  const wantsWhy = /1969|demolish|pull|why|هدم|لماذا/.test(q);
  const wantsWhen = /when|time|hour|crowd|busy|hot|متى|وقت|زحام|حر/.test(q);
  const wantsCare = /protect|fragile|careful|touch|حماية|هش/.test(q);
  if (wantsWhen) return `${timing} ${sentences[0].trim()}`;
  if (wantsCare) return fragile;
  if (wantsWhy) {
    const hit = sentences.filter((s) => /1969|هُدم|pulled down/.test(s));
    if (hit.length) return sentences.slice(sentences.indexOf(hit[0])).join(" ").trim();
  }
  return `${sentences.slice(0, 2).join(" ").trim()} ${fragile}`;
}
