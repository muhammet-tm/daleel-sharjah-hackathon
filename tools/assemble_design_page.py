"""Assemble the five direction panels and the judge scorecard into one comparison page.

Usage: python assemble_design_page.py <journal.jsonl> <design_dir> <out_html>
Reads direction:N, judge:N and mockup:idx:name results from the workflow journal,
splices design_dir/dir-<idx>.html panels in the chosen order, and writes out_html.
"""
import json, re, sys, os, html

journal, design_dir, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

labels, results = {}, {}
for line in open(journal, encoding="utf-8"):
    try:
        e = json.loads(line)
    except Exception:
        continue
    if e.get("type") == "started":
        labels[e["agentId"]] = e.get("label")
    elif e.get("type") == "result":
        lab = e.get("label") or labels.get(e.get("agentId"))
        results.setdefault(lab, []).append(e.get("result"))

directions = [r[0] for k, r in results.items() if k and k.startswith("direction:") and r and r[0]]
judges = [r[0] for k, r in results.items() if k and k.startswith("judge:") and r and r[0]]
mockups = sorted(
    [(int(k.split(":")[1]), k.split(":", 2)[2], r[0]) for k, r in results.items() if k and k.startswith("mockup:") and r and r[0]],
    key=lambda t: t[0],
)

# scores
totals, notes, similar = {}, {}, {}
for j in judges:
    for s in j.get("scores", []):
        totals.setdefault(s["name"], []).append(s)
        notes.setdefault(s["name"], []).append(s.get("note", ""))
    for p in j.get("similar_pairs", []) or []:
        if len(p) == 2:
            key = tuple(sorted(p))
            similar[key] = similar.get(key, 0) + 1

def avg(name, field):
    arr = [s.get(field, 0) for s in totals.get(name, [])]
    return sum(arr) / len(arr) if arr else 0

by_name = {d["name"]: d for d in directions}
chosen_names = [name for _, name, _ in mockups]
ranked = sorted(directions, key=lambda d: -avg(d["name"], "total"))

FIELDS = [("distinctiveness", "Distinct"), ("fit_sharjah", "Sharjah"), ("fit_theme", "Theme"), ("anti_slop", "Anti-slop"), ("pitch_impact", "Projector"), ("buildable_in_hours", "Buildable")]

def esc(s):
    return html.escape(str(s or ""))

# panels
links, styles_and_sections = [], []
for idx, name, res in mockups:
    p = os.path.join(design_dir, f"dir-{idx}.html")
    if not os.path.exists(p):
        continue
    src = open(p, encoding="utf-8").read()
    for m in re.findall(r"<link[^>]*>", src, flags=re.I):
        if m not in links:
            links.append(m)
    src = re.sub(r"<link[^>]*>", "", src, flags=re.I)
    styles_and_sections.append((idx, name, src.strip()))

rows = []
for d in ranked:
    n = d["name"]
    pick = n in chosen_names
    idx = next((i for i, nm, _ in mockups if nm == n), None)
    sim = [other for (a, b), c in similar.items() if c >= 2 and n in (a, b) for other in (a, b) if other != n]
    cells = "".join(f"<td class='num'>{avg(n, f):.1f}</td>" for f, _ in FIELDS)
    label = f"<a href='#dir-{idx}'>{esc(n)}</a>" if pick else esc(n)
    tag = f"<span class='pick'>0{idx}</span>" if pick else "<span class='nopick'>not shown</span>"
    rows.append(
        f"<tr class='{'is-pick' if pick else 'is-out'}'><td>{tag}</td><td class='name'>{label}<div class='fam'>{esc(d.get('family'))}</div></td>"
        f"{cells}<td class='num total'>{avg(n, 'total'):.1f}</td>"
        f"<td class='note'>{'<br>'.join(esc(x) for x in notes.get(n, []))}{('<div class=sim>Reads like: ' + esc(', '.join(sorted(set(sim)))) + '</div>') if sim else ''}</td></tr>"
    )

nav = "".join(f"<a href='#dir-{idx}'><span>0{idx}</span>{esc(name)}</a>" for idx, name, _ in mockups)

# Caveats from the team lead's read of the specs against the hackathon context (not from the judges).
CAVEATS = {
    "Route Band Signage": "Highest scoring and the easiest to build in hours (flat plates, no textures). The risk is sternness: the photography and the Arabic plates have to carry the warmth, or it reads as a transport utility.",
    "Lagoon After Dark": "The strongest story for the sustainability lever (after-dark, off-peak, walking). Dark saturated screens are hard to read on a phone outdoors and in a bright judging room; test under sunlight before committing.",
    "Hashiya Folio": "Ties directly to World Book Capital and the calligraphy heritage, and no other team will show this. Margin notes need one sentence of explanation in the pitch, and the AR plate must be the first screen shown or it reads as a brochure.",
    "Girih Screen": "The most distinctive AR treatment (line-drawn overlays through a lattice mask). The mask animation can stutter on low-end Android in a browser; precompute masks. Hold the serif to two sizes or it drifts toward a hotel brochure.",
    "Mleiha Field Sheet": "Caution: its passport stamps and ticket stubs echo Sharjah Quest, the 2025 winner built by two of this year's mentors (digital stamps, badges). If chosen, replace stamps with trench-style find codes and keep the ledger; the map-first survey sheet itself is sound.",
}
caveat_items = "".join(
    f"<li><strong>0{idx} {esc(name)}.</strong> {esc(CAVEATS.get(name, ''))}</li>" for idx, name, _ in mockups if CAVEATS.get(name)
)

page = f"""<title>Daleel Design Directions</title>
{''.join(links)}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap">
<style>
/* Frame: a quiet stone-grey chrome so each panel's own palette carries the personality. */
:root {{ --bg:#f2f3f1; --fg:#1b1d1f; --mute:#5c6166; --line:#d5d8d4; --card:#ffffff; --accent:#1f4d3a; --pick:#1f4d3a; --out:#9aa0a3;
  --sans:'Instrument Sans','IBM Plex Sans Arabic',system-ui,sans-serif; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#141617; --fg:#ebedea; --mute:#a3a9ad; --line:#2d3134; --card:#1d2022; --accent:#8fcfae; --pick:#8fcfae; --out:#6a7074; color-scheme:dark }} }}
:root[data-theme="dark"] {{ --bg:#141617; --fg:#ebedea; --mute:#a3a9ad; --line:#2d3134; --card:#1d2022; --accent:#8fcfae; --pick:#8fcfae; --out:#6a7074; color-scheme:dark }}
body {{ background:var(--bg); color:var(--fg); font-family:var(--sans); margin:0; padding-block:0 48px; }}
.frame {{ max-width:1280px; margin:0 auto; padding-inline:16px; }}
header.top {{ padding-block:40px 24px; border-bottom:1px solid var(--line); display:grid; gap:12px; }}
.eyebrow {{ font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); }}
h1 {{ font-size:clamp(28px,4vw,44px); line-height:1.05; margin:0; font-weight:600; text-wrap:balance; }}
h1 .ar {{ font-family:'IBM Plex Sans Arabic',sans-serif; font-weight:600; margin-inline-start:12px; color:var(--accent); }}
.lede {{ max-width:68ch; color:var(--mute); font-size:16px; line-height:1.5; margin:0; }}
nav.dirs {{ position:sticky; top:env(safe-area-inset-top,0px); z-index:5; background:var(--bg); border-bottom:1px solid var(--line); display:flex; gap:6px; overflow-x:auto; padding-block:10px; }}
nav.dirs a {{ flex:0 0 auto; display:inline-flex; gap:8px; align-items:baseline; padding:8px 12px; border:1px solid var(--line); border-radius:999px; color:var(--fg); text-decoration:none; font-size:14px; background:var(--card); }}
nav.dirs a span {{ font-variant-numeric:tabular-nums; color:var(--accent); font-weight:600; }}
nav.dirs a:focus-visible, .score a:focus-visible {{ outline:2px solid var(--accent); outline-offset:2px; }}
section.score {{ padding-block:32px; }}
section.score h2, section.after h2 {{ font-size:20px; margin:0 0 6px; font-weight:600; }}
section.score p {{ color:var(--mute); max-width:70ch; margin:0 0 16px; line-height:1.5; }}
.tablewrap {{ overflow-x:auto; border:1px solid var(--line); border-radius:8px; background:var(--card); }}
table {{ border-collapse:collapse; width:100%; min-width:900px; font-size:13.5px; }}
th, td {{ text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }}
th {{ font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; }}
td.num {{ font-variant-numeric:tabular-nums; text-align:right; }}
td.total {{ font-weight:600; }}
td.name a {{ color:var(--fg); font-weight:600; text-decoration:none; border-bottom:1px solid var(--accent); }}
td.name .fam {{ color:var(--mute); font-size:12px; margin-top:2px; }}
td.note {{ max-width:38ch; min-width:0; color:var(--mute); line-height:1.4; }}
td.note .sim {{ margin-top:6px; color:var(--fg); font-size:12px; }}
.pick {{ font-weight:600; color:var(--pick); font-variant-numeric:tabular-nums; }}
.nopick {{ color:var(--out); font-size:12px; }}
tr.is-out td {{ color:var(--out); }}
tr.is-out td.name .fam, tr.is-out td.note {{ color:var(--out); }}
.caveats {{ padding-inline-start:20px; max-width:80ch; line-height:1.55; color:var(--fg); display:grid; gap:8px; margin:0; }}
.caveats strong {{ font-weight:600; }}
.panels {{ display:grid; gap:40px; padding-block:16px; }}
.panels > * {{ min-width:0; }}
section.after {{ padding-block:32px; border-top:1px solid var(--line); }}
section.after ol {{ padding-inline-start:20px; line-height:1.6; color:var(--fg); max-width:70ch; }}
section.after li {{ margin-bottom:6px; }}
@media (max-width:640px) {{ header.top {{ padding-block:28px 16px; }} }}
@media (prefers-reduced-motion: reduce) {{ * {{ scroll-behavior:auto !important; transition:none !important; animation:none !important; }} }}
</style>
<div class="frame">
<header class="top">
  <div class="eyebrow">Sharjah Tourism Innovation Hackathon 2026 &middot; Team Daleel &middot; 10 October 2026</div>
  <h1>Daleel: brand and five layout directions <span class="ar" lang="ar" dir="rtl">دليل</span></h1>
  <p class="lede">Panel 00 is the team's identity (Rama's mark and palette: cream #F7F3EA, sand #E6DCC8, brass #C9A24D, navy #14213D) applied to the three demo screens. Panels 01 to 05 are the layout directions eight independent art directors proposed, scored by three judges; their colours are superseded by the brand, but their layout and interaction ideas (route bands, poster type, margin notes, lattice sheet, field cards) are still on the table. Pick the layout idea to carry into the brand, or keep panel 00 as it stands.</p>
</header>
<nav class="dirs" aria-label="Directions">{nav}</nav>
<section class="score" id="scorecard">
  <h2>Scorecard</h2>
  <p>Each judge scored every direction from 1 to 5 on six criteria (maximum 30). Lenses: an SCTDA tourism-authority judge, a product-design mentor allergic to generic AI aesthetics, and a hackathon judge who sees ten pitches in two hours and remembers only what is unmistakable on a projector. Rows are averages over the three. "Reads like" marks pairs that two or more judges said a panel would experience as the same option.</p>
  <div class="tablewrap"><table>
    <thead><tr><th>Shown</th><th>Direction</th>{''.join(f'<th>{t}</th>' for _, t in FIELDS)}<th>Total /30</th><th>Judge notes</th></tr></thead>
    <tbody>{''.join(rows)}</tbody>
  </table></div>
  <h2 style="margin-top:28px">Caveats before choosing</h2>
  <ul class="caveats">{caveat_items}</ul>
</section>
<div class="panels">
{chr(10).join(src for _, _, src in styles_and_sections)}
</div>
<section class="after" id="next">
  <h2>After you choose</h2>
  <ol>
    <li>Rama drops the logo files (SVG preferred) into design/brand/ and names the wordmark fonts, so the provisional Marcellus and Noto Naskh stand-ins can be swapped.</li>
    <li>One Higgsfield hero image from the direction's prompt (and up to three variants), then one five-second clip for the pitch opening; every asset is logged in the AI Usage Disclosure.</li>
    <li>The direction's tokens are applied to the three demo screens (Explore, AR view, Guide) in the deployed app, then the transition recipes for the itinerary swap and the guide reply.</li>
    <li>The pitch deck inherits the same tokens so the phone and the slides look like one product.</li>
  </ol>
</section>
</div>
"""
open(out_path, "w", encoding="utf-8").write(page)
print(f"directions={len(directions)} judges={len(judges)} mockups={len(mockups)} panels_spliced={len(styles_and_sections)} bytes={len(page.encode('utf-8'))}")
print("chosen:", chosen_names)
