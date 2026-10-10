"""Build the five design-direction mockup panels (design/dir-<idx>.html) and record them in the journal.

Usage: python tools/build_design_panels.py
Each panel shows the same demo script (Plan, Look, Ask) in one direction's palette, type and layout,
so the team compares looks, not content. Panels follow the contract in assemble_design_page.py:
<link> tags are hoisted by the assembler, everything else is a self-scoped <style> plus one <section id="dir-N">.
After this, run assemble_design_page.py to produce design/daleel-design-directions.html.
"""
import json, os, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPECS = os.path.join(ROOT, "design", "specs")
OUT = os.path.join(ROOT, "design")
JOURNAL = os.path.join(SPECS, "workflow-journal.jsonl")

# Order and selection come from the judges: top five by average total, skipping near-duplicates
# (Khor Field Guide reads like Mleiha Field Sheet, Coral Reticle like Lagoon After Dark, Gypsum Hour like Hashiya Folio).
CHOSEN = [(1, 7), (2, 3), (3, 1), (4, 4), (5, 5)]  # (panel idx, direction spec number)

esc = html.escape

# One demo script for every panel (from 02_Execution_Plan.md section 6). Crowd curves are "typical hours", not live.
STOPS = [
    ("09:30", "Al Hisn Fort", "حصن الشارقة", "Quiet now", "quiet", "Indoor, 6 min walk"),
    ("19:00", "Al Noor Island", "جزيرة النور", "Busy 16:00–18:00, go at 19:00", "busy", "After sunset, 31°C"),
    ("Sat 08:00", "Kalba Mangroves", "قرم كلباء", "Shade route, 40 min by car", "shade", "East Coast, under-visited"),
]
SWAP = "Moving Al Noor Island from 16:30 to 19:00 avoids the daily peak and drops the walk from 39°C to 31°C."
SCORE = 82
QUESTION = "Why was the fort demolished in 1969?"
ANSWER = ("In 1969 most of Al Hisn was pulled down to make room for the modern city centre. "
          "One tower was saved, and the fort was later rebuilt from old photographs and plans. "
          "After a full restoration it reopened as a museum in 2015.")

FORT = """<svg class="fort" viewBox="0 0 200 120" aria-hidden="true"><path d="M0 112h200" class="f-ground"/>
<path class="f-wall" d="M44 112V62h8v-6h8v6h8v-6h8v6h8v-6h8v6h8v-6h8v6h8v-6h8v6h8v50z"/>
<path class="f-tower" d="M18 112V40a14 6 0 0 1 28 0v72z"/><path class="f-tower" d="M150 112V36h6v-6h7v6h7v-6h7v6h6v76z"/>
<path class="f-door" d="M92 112V90a8 8 0 0 1 16 0v22z"/><path class="f-slit" d="M30 56v10M166 50v10M70 76v8M130 76v8"/></svg>"""


def load(n):
    return json.load(open(os.path.join(SPECS, f"direction_{n}.json"), encoding="utf-8"))


def swatches(d):
    out = []
    for p in d["palette"]:
        role = p["role"].split(":")[0].split("(")[0].strip()
        out.append(f"<li><span style='background:{p['hex']}'></span><b>{esc(p['hex'])}</b><i>{esc(role)}</i></li>")
    return "<ul class='sw'>" + "".join(out) + "</ul>"


def shell(idx, d, css, fonts, plan, look, ask, specimen):
    p = f".d{idx}"
    base = f"""
{p}{{--r:0;padding:clamp(20px,4vw,40px);border-radius:12px;overflow:hidden;scroll-margin-top:64px}}
{p} *{{box-sizing:border-box}}
{p} .hd{{display:grid;gap:6px;margin-bottom:20px}}
{p} .hd .no{{font:600 13px/1 var(--mono,monospace);font-variant-numeric:tabular-nums;opacity:.75}}
{p} .hd h2{{margin:0;font-size:clamp(30px,5vw,52px);line-height:1}}
{p} .hd .tag{{margin:0;font-size:18px;max-width:52ch}}
{p} .hd .fam{{margin:0;font-size:13px;opacity:.75;max-width:80ch}}
{p} .meta{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-bottom:28px;align-items:start}}
{p} .sw{{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}}
{p} .sw li{{display:grid;gap:2px;font-size:11px;line-height:1.25;min-width:0}}
{p} .sw li span{{height:40px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)}}
{p} .sw b{{font-variant-numeric:tabular-nums}}
{p} .sw i{{font-style:normal;opacity:.75;overflow-wrap:anywhere}}
{p} .phones{{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px;justify-items:center}}
{p} figure{{margin:0;width:100%;max-width:300px;display:grid;gap:10px}}
{p} figcaption{{font-size:12px;opacity:.8;line-height:1.4}}
{p} figcaption b{{display:block;font-size:13px;opacity:1}}
{p} .ph{{aspect-ratio:9/18.5;width:100%;border-radius:28px;overflow:hidden;position:relative;display:flex;flex-direction:column;box-shadow:0 0 0 6px #0a0a0a,0 0 0 7px rgba(127,127,127,.4)}}
{p} .fort{{width:100%;height:auto;display:block}}
{p} .fort .f-ground{{fill:none;stroke-width:1.5}}
{p} .fort .f-slit{{fill:none;stroke-width:2}}
{p} .notes{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:28px;font-size:13.5px;line-height:1.5}}
{p} .notes h3{{margin:0 0 4px;font-size:13px}}
{p} .notes p{{margin:0}}
{p} [lang=ar]{{direction:rtl}}
"""
    notes = (f"<div><h3>Why Sharjah</h3><p>{esc(d['why_sharjah'])}</p></div>"
             f"<div><h3>Why sustainable</h3><p>{esc(d['why_sustainable'])}</p></div>"
             f"<div><h3>Risks</h3><p>{esc(d['risks'])}</p></div>")
    return f"""{fonts}
<style>{base}{css}</style>
<section id="dir-{idx}" class="d{idx}" aria-labelledby="dir-{idx}-h">
  <div class="hd"><span class="no">0{idx} · {esc(d['name'])}</span><h2 id="dir-{idx}-h">{esc(d['name'])}</h2><p class="tag">{esc(d['tagline'])}</p><p class="fam">{esc(d['family'])}</p></div>
  <div class="meta">{swatches(d)}{specimen}</div>
  <div class="phones">
    <figure><div class="ph">{plan}</div><figcaption><b>Plan</b>Today's itinerary scored for crowd, heat and transport, with one swap explained.</figcaption></figure>
    <figure><div class="ph">{look}</div><figcaption><b>Look</b>AR at Al Hisn Fort, slider from today back to 1823 (reconstruction labelled artist's impression).</figcaption></figure>
    <figure><div class="ph">{ask}</div><figcaption><b>Ask</b>The guide answers from the curated Sharjah corpus and reads aloud.</figcaption></figure>
  </div>
  <div class="notes">{notes}</div>
</section>
"""


# ---------- 01 Route Band Signage ----------
def route_band(d):
    i = 1; p = ".d1"
    fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Overpass:wght@800;900&family=Atkinson+Hyperlegible:wght@400;700&family=Readex+Pro:wght@400;700&display=swap">'
    css = f"""
{p}{{--bg:#F2F2F0;--plate:#14211B;--ink:#101513;--g:#0F6B3F;--a:#D8761C;--b:#1F4E8C;background:var(--bg);color:var(--ink);font-family:'Atkinson Hyperlegible',sans-serif}}
{p} .hd h2{{font-family:Overpass;font-weight:900;text-transform:uppercase;letter-spacing:-.02em}}
{p} .spec .big{{font:900 40px/1 Overpass;text-transform:uppercase}} {p} .spec .ar{{font:700 30px/1.2 'Readex Pro'}}
{p} .ph{{background:var(--bg)}}
{p} .sign{{background:var(--plate);color:#fff;padding:14px 14px 10px;display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:end}}
{p} .sign .pl{{font:900 22px/1 Overpass;text-transform:uppercase;letter-spacing:-.01em}}
{p} .sign .pa{{font:700 17px/1.2 'Readex Pro';grid-column:1;justify-self:start}}
{p} .sign .rt{{grid-row:1/3;grid-column:2;background:#fff;color:var(--plate);font:900 18px/1 Overpass;padding:6px 8px;border-radius:3px}}
{p} .gauge{{display:flex;gap:3px;grid-column:1/3;margin-top:8px;font-size:11px;align-items:center;gap:6px}}
{p} .gauge i{{width:22px;height:8px;background:#ffffff33}} {p} .gauge i.on{{background:var(--g)}}
{p} .bands i{{display:block;height:12px}}
{p} .stops{{flex:1;padding:6px 0;overflow:hidden}}
{p} .stop{{display:grid;grid-template-columns:52px 1fr;gap:2px 10px;padding:10px 14px;border-bottom:1px solid #10151322}}
{p} .stop .t{{font:700 15px/1.2 'Atkinson Hyperlegible';font-variant-numeric:tabular-nums}}
{p} .stop .n{{font:800 15px/1.1 Overpass;text-transform:uppercase}}
{p} .stop .s{{grid-column:2;font-size:12px;font-weight:700;padding:3px 6px;justify-self:start;border-radius:2px}}
{p} .s.quiet{{background:var(--g);color:#fff}} {p} .s.busy{{background:var(--a);color:var(--ink)}} {p} .s.shade{{background:var(--b);color:#fff}}
{p} .stop .x{{grid-column:2;font-size:12px}}
{p} .swap{{margin:0 14px;padding:10px;background:var(--plate);color:#fff;font-size:12.5px;line-height:1.35;border-top:6px solid var(--a)}}
{p} .score{{display:flex;justify-content:space-between;align-items:center;margin:10px 14px;font-weight:700;font-size:13px}}
{p} .score b{{font:900 28px/1 Overpass;color:var(--g)}}
{p} .bar{{display:grid;grid-template-columns:repeat(3,1fr);background:var(--plate);color:#fff;font-size:12px;font-weight:700;text-align:center}}
{p} .bar span{{padding:10px 0 14px}} {p} .bar span.on{{box-shadow:inset 0 4px 0 var(--a)}}
{p} .stage{{flex:1;position:relative;background:#cfd6da;display:flex;align-items:flex-end;overflow:hidden}}
{p} .stage .fort .f-wall,{p} .stage .fort .f-tower{{fill:#c9b79a}} {p} .stage .fort .f-door{{fill:#5a4a38}} {p} .stage .fort .f-slit{{stroke:#5a4a38}} {p} .stage .fort .f-ground{{stroke:#8a8f88}}
{p} .stage .floor{{position:absolute;inset:auto 0 0 0;height:22%;background:#b9b3a6}}
{p} .chev{{position:absolute;bottom:4%;left:50%;transform:translateX(-50%);display:flex;gap:6px}}
{p} .chev i{{width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:14px solid #fff}}
{p} .chev i:nth-child(2){{opacity:.6}} {p} .chev i:nth-child(3){{opacity:.3}}
{p} .anch{{position:absolute;top:18%;left:12%;right:12%;background:var(--plate);color:#fff;padding:8px 10px;border-top:6px solid var(--g)}}
{p} .anch b{{font:900 15px/1.1 Overpass;text-transform:uppercase;display:block}} {p} .anch span{{font-size:12px}}
{p} .tog{{display:grid;grid-template-columns:1fr 1fr;margin:10px 14px 0;border:2px solid var(--plate);font-size:12px;font-weight:700;text-align:center}}
{p} .tog span{{padding:6px}} {p} .tog .on{{background:var(--plate);color:#fff}}
{p} .yr{{margin:10px 14px;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}}
{p} .yr .tr{{height:6px;background:var(--b);position:relative}} {p} .yr .tr i{{position:absolute;left:62%;top:-7px;width:20px;height:20px;background:#fff;border:3px solid var(--plate)}}
{p} .yr small{{grid-column:1/4;font-weight:400}}
{p} .chat{{position:absolute;inset:auto 0 46px 0;height:62%;background:var(--bg);border-top:12px solid var(--b);padding:12px 14px;display:flex;flex-direction:column;gap:10px}}
{p} .q{{align-self:flex-end;background:#fff;border:2px solid var(--plate);padding:8px 10px;font-size:13px;max-width:85%}}
{p} .a{{background:var(--plate);color:#fff;padding:10px;font-size:13px;line-height:1.4}}
{p} .a u{{text-decoration-color:var(--a);text-underline-offset:3px;text-decoration-thickness:2px}}
{p} .chips{{display:flex;flex-wrap:wrap;gap:6px}} {p} .chips span{{font-size:12px;font-weight:700;padding:5px 10px;border-radius:12px}}
{p} .chips .c1{{background:var(--a);color:var(--ink)}} {p} .chips .c2{{background:var(--g);color:#fff}}
{p} .ask{{flex:1;position:relative;display:flex;flex-direction:column}}
"""
    specimen = "<div class='spec'><div class='big'>Al Hisn Fort</div><div class='ar' lang='ar'>حصن الشارقة</div><p style='margin:6px 0 0;font-size:15px'>Overpass plates, Atkinson Hyperlegible body, Readex Pro Arabic. Bands encode footprint: green low, blue water, amber heat and crowd.</p></div>"
    sign = lambda pl, ar, rt, on: (f"<div class='sign'><span class='pl'>{pl}</span><span class='pa' lang='ar'>{ar}</span><span class='rt'>{rt}</span>"
                                   f"<span class='gauge'>{''.join('<i class=on></i>' if k < on else '<i></i>' for k in range(3))} Crowd: {['low','low','medium','high'][on]}</span></div>")
    bands = "<div class='bands'><i style='background:var(--g)'></i><i style='background:var(--b)'></i></div>"
    bar = lambda on: "<div class='bar'>" + "".join(f"<span class='{'on' if k == on else ''}'>{t}</span>" for k, t in enumerate(["Look", "Map", "Ask"])) + "</div>"
    stops = "".join(f"<div class='stop'><span class='t'>{t}</span><span class='n'>{esc(n)}</span><span class='s {k}'>{esc(s)}</span><span class='x'>{esc(x)}</span></div>" for t, n, a, s, k, x in STOPS)
    plan = f"{sign('Today', 'اليوم', 'D1', 1)}{bands}<div class='stops'>{stops}</div><div class='swap'>{esc(SWAP)}</div><div class='score'>Plan footprint score<b>{SCORE}</b></div>{bar(1)}"
    look = (f"{sign('Al Hisn Fort', 'حصن الشارقة', '03', 1)}<div class='bands'><i style='background:var(--g)'></i></div>"
            f"<div class='tog'><span class='on'>Look</span><span>Map</span></div>"
            f"<div class='stage'><div class='floor'></div>{FORT}<div class='anch'><b>Built 1823</b><span>Coral stone and gypsum. Quiet until 11:00.</span></div><div class='chev'><i></i><i></i><i></i></div></div>"
            f"<div class='yr'><span>Today</span><span class='tr'><i></i></span><span>1823</span><small>Reconstruction: artist's impression</small></div>{bar(0)}")
    ask = (f"<div class='ask'>{sign('Ask Daleel', 'اسأل دليل', '?', 0)}<div class='stage' style='flex:1'><div class='floor'></div>{FORT}</div>"
           f"<div class='chat'><div class='q'>{esc(QUESTION)}</div><div class='a'>{esc(ANSWER).replace('Al Hisn', '<u>Al Hisn</u>')}</div>"
           f"<div class='chips'><span class='c1'>Read aloud</span><span class='c2'>Quiet hours today</span></div></div>{bar(2)}</div>")
    return shell(i, d, css, fonts, plan, look, ask, specimen)


# ---------- 02 Lagoon After Dark ----------
def lagoon(d):
    i = 2; p = ".d2"
    fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Noto+Kufi+Arabic:wght@800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap">'
    css = f"""
{p}{{--bg:#0B1530;--sf:#16234D;--ink:#F1F3F8;--m:#FF5C99;--g:#2EE6A6;--am:#FFB454;background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',sans-serif}}
{p} .hd h2{{font-family:'Big Shoulders Display';font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:var(--m)}}
{p} .spec .big{{font:900 46px/.95 'Big Shoulders Display';text-transform:uppercase}} {p} .spec .ar{{font:800 30px/1.2 'Noto Kufi Arabic';color:var(--g)}}
{p} .ph{{background:var(--bg)}}
{p} .top{{height:8px;background:var(--am)}}
{p} .post{{padding:16px 16px 8px;font:900 34px/.95 'Big Shoulders Display';text-transform:uppercase;letter-spacing:-.02em}}
{p} .post em{{font-style:normal;color:var(--g)}} {p} .post .ar{{display:block;font:800 18px/1.4 'Noto Kufi Arabic';color:var(--m);margin-top:4px}}
{p} .stops{{flex:1;padding:0 16px;display:grid;gap:12px;align-content:start}}
{p} .stop{{display:grid;grid-template-columns:auto 1fr;gap:2px 12px}}
{p} .stop .t{{font:800 24px/1 'Big Shoulders Display';font-variant-numeric:tabular-nums;color:var(--g)}}
{p} .stop .n{{font-weight:600;font-size:15px}}
{p} .stop .s{{grid-column:2;justify-self:start;font-size:12px;font-weight:600;padding:3px 8px;color:var(--bg)}}
{p} .s.quiet{{background:var(--g)}} {p} .s.busy{{background:var(--am)}} {p} .s.shade{{background:var(--g)}}
{p} .stop .x{{grid-column:2;font-size:12px;opacity:.75}}
{p} .swap{{margin:8px 16px;font-size:13px;line-height:1.4;border-left:3px solid var(--m);padding-left:10px}}
{p} .score{{margin:4px 16px 10px;display:flex;align-items:baseline;gap:8px;font-size:13px}} {p} .score b{{font:900 34px/1 'Big Shoulders Display';color:var(--m)}}
{p} .bar{{display:grid;grid-template-columns:repeat(3,1fr) auto;background:var(--sf);font:700 16px/1 'Big Shoulders Display';text-transform:uppercase;text-align:center;align-items:center}}
{p} .bar span{{padding:14px 0 18px}} {p} .bar .on{{color:var(--m)}} {p} .bar .lg{{padding:0 12px;font:600 13px 'IBM Plex Sans Arabic'}}
{p} .cam{{flex:1;position:relative;background:#0d1a3d;display:flex;align-items:flex-end;overflow:hidden}}
{p} .cam .sky{{position:absolute;inset:0 0 auto;height:30%;background:#13204a}}
{p} .cam .fort .f-wall,{p} .cam .fort .f-tower{{fill:#3b3a4f}} {p} .cam .fort .f-door{{fill:var(--am)}} {p} .cam .fort .f-slit{{stroke:var(--am)}} {p} .cam .fort .f-ground{{stroke:#ffffff44}}
{p} .stk{{position:absolute;padding:6px 9px;font:800 15px/1.05 'Big Shoulders Display';text-transform:uppercase;color:var(--bg)}}
{p} .stk small{{display:block;font:500 11px/1.3 'IBM Plex Sans';text-transform:none}}
{p} .stk.m{{background:var(--m);top:16%;left:8%}} {p} .stk.g{{background:var(--g);top:34%;right:7%}}
{p} .yr{{padding:10px 16px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font:800 16px 'Big Shoulders Display';background:var(--sf)}}
{p} .yr .tr{{height:4px;background:var(--ink);position:relative}} {p} .yr .tr i{{position:absolute;left:62%;top:-8px;width:20px;height:20px;background:var(--m)}}
{p} .yr small{{grid-column:1/4;font:400 11px 'IBM Plex Sans';opacity:.8}}
{p} .sheet{{position:absolute;inset:auto 0 47px 0;height:64%;background:var(--sf);padding:10px 16px;display:flex;flex-direction:column;gap:10px}}
{p} .sheet .grab{{width:36px;height:4px;background:#ffffff55;align-self:center}}
{p} .sheet h4{{margin:0;font:900 22px/1 'Big Shoulders Display';text-transform:uppercase}}
{p} .q{{align-self:flex-end;background:var(--bg);padding:8px 10px;font-size:13px;max-width:85%;border-radius:10px}}
{p} .a{{background:#0B1530;padding:10px;font-size:13px;line-height:1.45;border-radius:10px;border:2px solid var(--g)}}
{p} .btn{{align-self:flex-start;background:var(--m);color:var(--bg);font:700 16px 'Big Shoulders Display';text-transform:uppercase;padding:8px 14px}}
{p} .ask{{flex:1;position:relative;display:flex;flex-direction:column}}
"""
    specimen = "<div class='spec'><div class='big'>After sunset, on foot</div><div class='ar' lang='ar'>الشارقة بعد الغروب</div><p style='margin:6px 0 0;font-size:15px'>Big Shoulders poster type, Noto Kufi Arabic, IBM Plex body. Magenta acts, green means quiet, amber means pressure.</p></div>"
    bar = lambda on: "<div class='bar'>" + "".join(f"<span class='{'on' if k == on else ''}'>{t}</span>" for k, t in enumerate(["Look", "Go", "Ask"])) + "<span class='lg' lang='ar'>ع</span></div>"
    stops = "".join(f"<div class='stop'><span class='t'>{t}</span><span class='n'>{esc(n)}</span><span class='s {k}'>{esc(s)}</span><span class='x'>{esc(x)}</span></div>" for t, n, a, s, k, x in STOPS)
    plan = f"<div class='top'></div><div class='post'>Go <em>later</em>.<br>Walk cooler.<span class='ar' lang='ar'>اذهب لاحقًا</span></div><div class='stops'>{stops}</div><div class='swap'>{esc(SWAP)}</div><div class='score'><b>{SCORE}</b>plan score, quiet and cool</div>{bar(1)}"
    look = (f"<div class='top' style='background:var(--m)'></div><div class='cam'><div class='sky'></div>{FORT}"
            f"<span class='stk m'>Al Hisn Fort<small>Built 1823. Rebuilt and reopened 2015.</small></span><span class='stk g'>Quiet now<small>Until 11:00</small></span></div>"
            f"<div class='yr'><span>Today</span><span class='tr'><i></i></span><span>1823</span><small>Reconstruction: artist's impression</small></div>{bar(0)}")
    ask = (f"<div class='ask'><div class='top' style='background:var(--g)'></div><div class='cam' style='flex:1'><div class='sky'></div>{FORT}<span class='stk m'>Al Hisn Fort</span></div>"
           f"<div class='sheet'><span class='grab'></span><h4>Ask about Al Hisn</h4><div class='q'>{esc(QUESTION)}</div><div class='a'>{esc(ANSWER)}</div><span class='btn'>Read aloud</span></div>{bar(2)}</div>")
    return shell(i, d, css, fonts, plan, look, ask, specimen)


# ---------- 03 Hashiya Folio ----------
def hashiya(d):
    i = 3; p = ".d3"
    fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Amiri:wght@400;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap">'
    css = f"""
{p}{{--bg:#EFEFED;--sf:#FBFBFA;--ink:#1B1917;--r:#9E2B18;--l:#22407A;--gr:#5C5853;--mono:'IBM Plex Mono';background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',sans-serif}}
{p} .hd h2{{font-family:'EB Garamond';font-weight:500;color:var(--r)}}
{p} .spec .big{{font:500 42px/1.05 'EB Garamond';color:var(--r)}} {p} .spec .ar{{font:700 32px/1.4 Amiri}}
{p} .ph{{background:var(--bg)}}
{p} .rh{{display:flex;justify-content:space-between;padding:14px 16px 8px;border-bottom:1px solid var(--gr);font:400 16px 'EB Garamond'}}
{p} .rh .on{{color:var(--r)}}
{p} .ttl{{padding:14px 16px 4px;font:500 30px/1.05 'EB Garamond'}} {p} .ttl .ar{{display:block;font:400 18px/1.6 Amiri;color:var(--gr)}}
{p} .idx{{flex:1;padding:4px 16px;display:grid;align-content:start}}
{p} .ent{{display:grid;grid-template-columns:1fr auto;padding:9px 0;border-bottom:1px solid #5c585340;gap:2px}}
{p} .ent .n{{font:500 17px/1.2 'EB Garamond'}} {p} .ent .t{{font:500 11px var(--mono);color:var(--gr);font-variant-numeric:tabular-nums}}
{p} .ent .s{{grid-column:1/3;font-size:12px;color:var(--gr)}} {p} .ent .s sup{{color:var(--r);font-weight:500}}
{p} .ent.busy .s{{color:var(--r)}}
{p} .gloss{{margin:6px 16px;font:400 14px/1.4 'EB Garamond';font-style:normal;padding-left:10px;border-left:1px solid var(--r)}} {p} .gloss sup{{color:var(--r)}}
{p} .col{{margin:4px 16px 14px;display:flex;justify-content:space-between;font:500 11px var(--mono);text-transform:uppercase;color:var(--gr);border-top:1px solid var(--gr);padding-top:8px}} {p} .col b{{color:var(--ink);font-size:13px}}
{p} .plate{{margin:12px 12px 6px;background:var(--sf);border:1px solid var(--gr);position:relative;padding:8px 8px 0}}
{p} .plate .fort .f-wall,{p} .plate .fort .f-tower{{fill:#d9c9ae}} {p} .plate .fort .f-door{{fill:#6b5a44}} {p} .plate .fort .f-slit{{stroke:#6b5a44}} {p} .plate .fort .f-ground{{stroke:var(--gr)}}
{p} .plate .sky{{position:absolute;inset:8px 8px auto;height:40%;background:#dfe5ea}}
{p} .plate .fort{{position:relative}}
{p} .num{{position:absolute;width:20px;height:20px;border-radius:50%;background:var(--r);color:#fff;font:500 11px/20px var(--mono);text-align:center}}
{p} .cap{{font:500 10.5px/1.4 var(--mono);text-transform:uppercase;color:var(--gr);padding:6px 14px}}
{p} .yr{{padding:4px 14px 8px;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font:400 15px 'EB Garamond'}}
{p} .yr .tr{{height:1px;background:var(--ink);position:relative}} {p} .yr .tr i{{position:absolute;left:62%;top:-6px;width:2px;height:13px;background:var(--r)}}
{p} .marg{{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 14px 12px;font:400 13.5px/1.35 'EB Garamond'}}
{p} .marg p{{margin:0}} {p} .marg sup{{color:var(--r);font-family:var(--mono);font-size:10px}}
{p} .q{{font:italic 400 15px/1.3 'EB Garamond';color:var(--l);padding:10px 16px 0}}
{p} .ans{{flex:1;padding:6px 16px;display:grid;grid-template-columns:1.4fr 1fr;gap:12px;align-content:start}}
{p} .ans .matn{{font:400 15px/1.45 'EB Garamond'}} {p} .ans .matn::first-letter{{color:var(--r)}}
{p} .ans .hash{{font:400 12.5px/1.4 'EB Garamond';color:var(--gr);border-left:1px solid #5c585360;padding-left:8px}} {p} .ans .hash sup{{color:var(--r)}}
{p} .field{{margin:8px 16px 14px;border-bottom:1px solid var(--ink);font:italic 14px 'EB Garamond';color:var(--gr);padding:6px 0;display:flex;justify-content:space-between}}
{p} .field b{{font:500 11px var(--mono);color:var(--r);font-style:normal;text-transform:uppercase}}
"""
    specimen = "<div class='spec'><div class='big'>Sharjah, read in the margins</div><div class='ar' lang='ar'>الشارقة في الحواشي</div><p style='margin:6px 0 0;font-size:15px'>EB Garamond and Amiri for display, IBM Plex for body, Plex Mono for plate captions only. Rubric red marks notes and actions.</p></div>"
    rh = lambda on: "<div class='rh'>" + "".join(f"<span class='{'on' if k == on else ''}'>{t}</span>" for k, t in enumerate(["Index", "Plate", "Colophon"])) + "</div>"
    ents = "".join(f"<div class='ent {k}'><span class='n'>{esc(n)}</span><span class='t'>{t}</span><span class='s'><sup>{j+1}</sup> {esc(s)}. {esc(x)}.</span></div>" for j, (t, n, a, s, k, x) in enumerate(STOPS))
    plan = (f"{rh(0)}<div class='ttl'>The day, as an index<span class='ar' lang='ar'>فهرس اليوم</span></div><div class='idx'>{ents}</div>"
            f"<p class='gloss'><sup>2</sup> {esc(SWAP)}</p><div class='col'><span>Colophon, plan score</span><b>{SCORE}/100</b></div>")
    look = (f"{rh(1)}<div class='plate'><div class='sky'></div>{FORT}<span class='num' style='top:22%;left:14%'>1</span><span class='num' style='top:40%;left:52%'>2</span></div>"
            f"<div class='cap'>Plate 7. Al Hisn Fort, east wall, coral stone</div><div class='yr'><span>Today</span><span class='tr'><i></i></span><span>1823</span></div>"
            f"<div class='marg'><p><sup>1</sup> Round tower, the one part of the fort saved in 1969.</p><p><sup>2</sup> Gate. The 1823 view is an artist's impression, not a photograph.</p></div>")
    ask = (f"{rh(1)}<p class='q'>{esc(QUESTION)}</p><div class='ans'><div class='matn'>{esc(ANSWER)}</div>"
           f"<div class='hash'><sup>3</sup> Quiet until 11:00 today. The museum is indoors, so it holds up in the heat.<br><br><sup>4</sup> Read aloud</div></div>"
           f"<div class='field'>Write a question in the margin<b>Ask</b></div>")
    return shell(i, d, css, fonts, plan, look, ask, specimen)


# ---------- 04 Girih Screen ----------
def girih(d):
    i = 4; p = ".d4"
    fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Reem+Kufi:wght@500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap">'
    lattice = ("<svg class='lat' aria-hidden='true'><defs><pattern id='khatam' width='28' height='28' patternUnits='userSpaceOnUse'>"
               "<path d='M14 2l4 8 8 4-8 4-4 8-4-8-8-4 8-4z' fill='none' stroke='#D1AA4F' stroke-width='.8'/></pattern></defs><rect width='100%' height='100%' fill='url(#khatam)'/></svg>")
    css = f"""
{p}{{--bg:#0F3D3E;--sf:#175152;--ink:#F1E9D6;--br:#D1AA4F;--co:#D27A5A;--vg:#86C3B2;--mono:'IBM Plex Mono';background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',sans-serif}}
{p} .hd h2{{font-family:'Cormorant Garamond';font-weight:600;color:var(--br)}}
{p} .spec .big{{font:600 40px/1.05 'Cormorant Garamond';color:var(--br)}} {p} .spec .ar{{font:700 30px/1.4 'Reem Kufi'}}
{p} .ph{{background:var(--bg)}}
{p} .cam{{position:relative;background:#2b5a5b;display:flex;align-items:flex-end;overflow:hidden}}
{p} .cam .fort .f-wall,{p} .cam .fort .f-tower{{fill:#c99a7f}} {p} .cam .fort .f-door{{fill:#5d3d2c}} {p} .cam .fort .f-slit{{stroke:#5d3d2c}} {p} .cam .fort .f-ground{{stroke:#ffffff55}}
{p} .cam .wire{{position:absolute;inset:auto 0 0;}} {p} .cam .wire .fort *{{fill:none!important;stroke:var(--br)!important;stroke-width:1.5}}
{p} .lat{{position:absolute;inset:0;width:100%;height:100%}}
{p} .sheet{{background:var(--sf);border-top:2px solid var(--br);flex:1;display:flex;flex-direction:column;padding:12px 14px;gap:8px;clip-path:polygon(0 10px,10px 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}}
{p} .sheet h4{{margin:0;font:600 24px/1.05 'Cormorant Garamond';color:var(--br)}} {p} .sheet h4 .ar{{font:500 15px 'Reem Kufi';color:var(--ink);margin-left:8px}}
{p} .map{{height:74px;position:relative;border:1px solid #D1AA4F66}}
{p} .map svg{{width:100%;height:100%}}
{p} .stop{{display:grid;grid-template-columns:56px 1fr;gap:1px 8px;padding:6px 0;border-bottom:1px solid #D1AA4F40;font-size:13px}}
{p} .stop .t{{font:500 12px var(--mono);color:var(--vg)}} {p} .stop .n{{font-weight:500}}
{p} .stop .s{{grid-column:2;font-size:11.5px;color:var(--vg)}} {p} .stop.busy .s{{color:var(--co);font-weight:500}}
{p} .strip{{font:500 11px var(--mono);color:var(--vg);display:flex;justify-content:space-between;border-top:1px solid #86C3B255;padding-top:6px}}
{p} .thr{{height:56px;background:var(--bg);border-top:1px solid var(--br);display:grid;grid-template-columns:repeat(3,1fr);align-items:center;text-align:center;font-size:12px}}
{p} .thr .on{{color:var(--br);font-weight:500}} {p} .thr .pill{{justify-self:center;background:var(--br);color:var(--bg);padding:6px 14px;border-radius:999px;font-weight:500}}
{p} .yr{{position:absolute;left:12px;right:12px;bottom:12px;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font:500 11px var(--mono);color:var(--ink)}}
{p} .yr .tr{{height:1.5px;background:var(--br);position:relative}} {p} .yr .tr i{{position:absolute;left:62%;top:-6px;width:12px;height:12px;transform:rotate(45deg);background:var(--br)}}
{p} .lbl{{position:absolute;top:12px;left:12px;right:12px;font:600 20px/1.1 'Cormorant Garamond';color:var(--br)}} {p} .lbl small{{display:block;font:500 11px var(--mono);color:var(--vg);margin-top:4px}}
{p} .turn{{font-size:13px;padding:6px 0;border-bottom:1px solid #D1AA4F55}}
{p} .rep{{font:500 16px/1.35 'Cormorant Garamond'}}
"""
    specimen = "<div class='spec'><div class='big'>Light in, heat out</div><div class='ar' lang='ar'>من خلف المشربية</div><p style='margin:6px 0 0;font-size:15px'>Cormorant and Reem Kufi for display, IBM Plex body, Plex Mono for data. Brass is stroke only; verdigris marks every sustainability figure.</p></div>"
    thr = lambda on: "<div class='thr'>" + "".join(f"<span class='{'on' if k == on else ''}'>{t}</span>" for k, t in enumerate(["Plan", "Look", "Ask"])) + "</div>"
    route = ("<svg viewBox='0 0 240 74' aria-hidden='true'><path d='M10 60 C60 20 100 58 150 30 S220 20 232 12' fill='none' stroke='#D1AA4F' stroke-width='1.5'/>"
             "<path d='M150 30 S220 20 232 12' fill='none' stroke='#86C3B2' stroke-width='4' stroke-dasharray='2 3'/>"
             "<circle cx='10' cy='60' r='4' fill='#86C3B2'/><circle cx='150' cy='30' r='6' fill='#D27A5A'/><circle cx='232' cy='12' r='4' fill='#86C3B2'/></svg>")
    stops = "".join(f"<div class='stop {k}'><span class='t'>{t}</span><span class='n'>{esc(n)}</span><span class='s'>{esc(s)}</span></div>" for t, n, a, s, k, x in STOPS)
    plan = (f"<div class='cam' style='height:14%'>{lattice}</div><div class='sheet'><h4>Today's plan<span class='ar' lang='ar'>خطة اليوم</span></h4><div class='map'>{route}</div>{stops}"
            f"<p style='margin:0;font-size:12px;line-height:1.4'>{esc(SWAP)}</p><div class='strip'><span>SHADE 68%</span><span>CROWD LOW</span><span>SCORE {SCORE}</span></div></div>{thr(0)}")
    look = (f"<div class='cam' style='flex:1'>{FORT}<div class='wire'>{FORT}</div><div class='lbl'>Al Hisn Fort, 1823<small>BRASS LINE: ARTIST'S IMPRESSION</small></div>"
            f"<div class='yr'><span>TODAY</span><span class='tr'><i></i></span><span>1823</span></div></div>"
            f"<div style='padding:8px 12px;font:500 11px var(--mono);color:var(--vg);background:var(--bg)'>SHADE · CROWD LOW · 0.4 KG CO₂ ON FOOT</div>{thr(1)}")
    ask = (f"<div class='cam' style='height:34%'>{FORT}{lattice}</div><div class='sheet'><div class='turn'>{esc(QUESTION)}</div><div class='rep'>{esc(ANSWER)}</div>"
           f"<div class='strip'><span>READ ALOUD</span><span>SOURCE: DALEEL CORPUS</span></div></div><div class='thr'><span>Plan</span><span>Look</span><span class='pill'>Ask</span></div>")
    return shell(i, d, css, fonts, plan, look, ask, specimen)


# ---------- 05 Mleiha Field Sheet ----------
def mleiha(d):
    i = 5; p = ".d5"
    fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,600..900,50,1;1,9..144,400..600,50,1&family=Amiri:wght@400;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap">'
    css = f"""
{p}{{--bg:#E4E7E3;--sf:#FFFFFF;--ink:#1C1A17;--ox:#9E3E18;--mg:#1F5F4E;--st:#8F1D21;--mono:'IBM Plex Mono';background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',sans-serif}}
{p} .hd h2{{font-family:Fraunces;font-weight:900;color:var(--ox)}}
{p} .spec .big{{font:800 40px/1.05 Fraunces}} {p} .spec .ar{{font:700 30px/1.4 Amiri;color:var(--mg)}}
{p} .ph{{background:var(--bg)}}
{p} .map{{flex:1;position:relative;overflow:hidden}}
{p} .map svg{{position:absolute;inset:0;width:100%;height:100%}}
{p} .tabs{{position:absolute;right:0;top:56px;display:grid;gap:4px;z-index:2}}
{p} .tabs span{{writing-mode:vertical-rl;background:var(--sf);font:500 10px var(--mono);text-transform:uppercase;padding:10px 5px;border:1px solid #1c1a1733;border-right:0}}
{p} .tabs .on{{background:var(--ink);color:var(--sf)}}
{p} .card{{background:var(--sf);border-top:1px solid #1c1a1733;padding:12px 14px;display:grid;gap:6px;position:relative}}
{p} .card .hdr{{font:500 10.5px var(--mono);text-transform:uppercase;color:#1c1a17aa;display:flex;justify-content:space-between}}
{p} .card h4{{margin:0;font:800 22px/1.05 Fraunces}} {p} .card h4 .ar{{font:400 15px Amiri;color:var(--mg);margin-left:6px}}
{p} .stop{{display:grid;grid-template-columns:62px 1fr;gap:1px 8px;padding:5px 0;border-bottom:1px solid #1c1a1720;font-size:13px}}
{p} .stop .t{{font:500 11px var(--mono)}} {p} .stop .s{{grid-column:2;font:italic 400 13px Fraunces;color:var(--mg)}} {p} .stop.busy .s{{color:var(--ox)}}
{p} .note{{font:italic 400 13.5px/1.35 Fraunces;color:var(--ox)}}
{p} .stamp{{position:absolute;right:14px;top:-34px;width:62px;height:62px;border-radius:50%;border:1.5px solid var(--st);color:var(--st);display:grid;place-items:center;text-align:center;font:500 9px/1.2 var(--mono);transform:rotate(-3deg);background:#ffffffd9;opacity:.92}}
{p} .stamp b{{font-size:15px}}
{p} .lens{{flex:1;position:relative;background:#c7cfc9;display:flex;align-items:flex-end;overflow:hidden}}
{p} .lens .fort .f-wall,{p} .lens .fort .f-tower{{fill:#c8ad8c}} {p} .lens .fort .f-door{{fill:#5b4330}} {p} .lens .fort .f-slit{{stroke:#5b4330}} {p} .lens .fort .f-ground{{stroke:#1c1a1766}}
{p} .ticks{{position:absolute;left:8px;top:16px;bottom:16px;width:12px;background:repeating-linear-gradient(to bottom,var(--ink) 0 1px,transparent 1px 18px);border-left:1px solid var(--ink)}}
{p} .ac{{position:absolute;font:500 10.5px/1.3 var(--mono);text-transform:uppercase;background:#ffffffcc;padding:4px 6px;border:1px solid var(--ink)}}
{p} .arrow{{position:absolute;right:22%;bottom:16%;font:800 34px/1 Fraunces;color:var(--ox)}}
{p} .yr{{padding:10px 14px;background:var(--sf);display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font:500 11px var(--mono)}}
{p} .yr .tr{{height:1px;background:var(--ink);position:relative}} {p} .yr .tr i{{position:absolute;left:62%;top:-6px;width:12px;height:12px;border-radius:50%;background:var(--ox)}}
{p} .yr small{{grid-column:1/4;font:italic 400 12px Fraunces;text-transform:none}}
{p} .q{{font-size:13px;padding:6px 8px;border:1px solid #1c1a1740;align-self:start}}
{p} .field{{border-bottom:1px solid var(--ink);font:500 10.5px var(--mono);text-transform:uppercase;padding:8px 0 4px;display:flex;justify-content:space-between;color:#1c1a17aa}}
"""
    specimen = "<div class='spec'><div class='big'>Map first, notes in the margin</div><div class='ar' lang='ar'>دفتر الميدان</div><p style='margin:6px 0 0;font-size:15px'>Fraunces with Amiri, IBM Plex body, Plex Mono capitals for codes and stamps. Oxide for waypoints, mangrove green for protected areas.</p></div>"
    tabs = lambda on: "<div class='tabs'>" + "".join(f"<span class='{'on' if k == on else ''}'>{t}</span>" for k, t in enumerate(["Map", "Notebook", "Guide"])) + "</div>"
    mapsvg = ("<svg viewBox='0 0 300 300' preserveAspectRatio='xMidYMid slice' aria-hidden='true'><rect width='300' height='300' fill='#E4E7E3'/>"
              "<path d='M0 210 C60 190 90 240 160 220 S260 170 300 180 V300 H0z' fill='#c9d6d6'/>"
              "<path d='M200 60 l60 10 l-10 60 l-55 -12z' fill='none' stroke='#1F5F4E' stroke-width='1'/><path d='M205 70 l45 7M203 85 l48 8M201 100 l47 9' stroke='#1F5F4E' stroke-width='.8'/>"
              "<path d='M20 40 L120 90 L260 30 M40 160 L150 120 L280 150 M120 90 L150 120 L160 220' fill='none' stroke='#1c1a1755' stroke-width='1.2'/>"
              "<path d='M70 70 Q120 100 150 120 T230 95' fill='none' stroke='#9E3E18' stroke-width='2.5' stroke-dasharray='6 4'/>"
              "<circle cx='70' cy='70' r='6' fill='#9E3E18'/><circle cx='150' cy='120' r='6' fill='#9E3E18'/><circle cx='230' cy='95' r='6' fill='#1F5F4E'/>"
              "<path d='M150 120 L175 150' stroke='#1c1a17' stroke-width='.8'/><text x='178' y='160' font-family='Fraunces' font-style='italic' font-size='13' fill='#9E3E18'>go at 19:00</text></svg>")
    stops = "".join(f"<div class='stop {k}'><span class='t'>{t}</span><span>{esc(n)}</span><span class='s'>{esc(s)}</span></div>" for t, n, a, s, k, x in STOPS)
    plan = (f"<div class='map'>{mapsvg}{tabs(0)}</div><div class='card'><div class='hdr'><span>SHJ-D1 · 25.36N 55.39E</span><span>Score {SCORE}</span></div>"
            f"<h4>Today's survey<span class='ar' lang='ar'>مسح اليوم</span></h4>{stops}<p class='note' style='margin:0'>{esc(SWAP)}</p></div>")
    look = (f"<div class='lens'>{FORT}<div class='ticks'></div><span class='ac' style='top:14%;left:26%'>Al Hisn · SHJ-03<br>Built 1823 · 25.358N</span>"
            f"<span class='ac' style='top:34%;right:8%'>Quiet to 11:00</span><span class='arrow'>→</span></div>"
            f"<div class='yr'><span>TODAY</span><span class='tr'><i></i></span><span>1823</span><small>The 1823 view is an artist's impression.</small></div>")
    ask = (f"<div class='map'>{mapsvg}{tabs(2)}</div><div class='card'><span class='stamp'><span>SHJ-03<br><b>10·10</b><br>ON FOOT</span></span>"
           f"<div class='hdr'><span>SHJ-03 · Al Hisn Fort</span><span>Open 08:00–20:00</span></div>"
           f"<div class='q'>{esc(QUESTION)}</div><p class='note' style='margin:0'>{esc(ANSWER)}</p><div class='field'><span>Ask the guide</span><span>Read aloud</span></div></div>")
    return shell(i, d, css, fonts, plan, look, ask, specimen)


# ---------- 00 Daleel brand (the team's own identity, Rama, 10 October) ----------
BRAND = {
    "name": "Daleel brand",
    "tagline": "Look Up.",
    "family": "The team's identity: octagonal compass mark with a brass needle and a location pin, navy wordmark in Latin and Arabic, cream ground.",
    "palette": [
        {"role": "background: cream", "hex": "#F7F3EA"},
        {"role": "surface: sand", "hex": "#E6DCC8"},
        {"role": "accent: brass gold, fills and strokes; text only on navy", "hex": "#C9A24D"},
        {"role": "ink: navy, all text on light grounds (14.4:1 on cream)", "hex": "#14213D"},
        {"role": "derived: dark brass for gold-toned text on cream (4.56:1)", "hex": "#8A6A1F"},
    ],
    "why_sharjah": "The octagon follows the eight-fold geometry of Sharjah's heritage screens and tiles, and the compass needle is the guide in the name. Navy and brass sit with the coral stone and gypsum of the Heart of Sharjah without a trend palette.",
    "why_sustainable": "The needle is the product: it points visitors to a better time and a quieter place. Gold marks the recommended choice and navy carries the facts, so the nudge reads at a glance.",
    "risks": "Gold on cream is 2.17:1 and gold on sand 1.76:1, so gold can never carry text on light grounds: use navy, or dark brass #8A6A1F for gold-toned text. The type here is provisional (Marcellus and Noto Naskh Arabic as stand-ins for the wordmark); swap in the fonts Rama used. The mark is drawn as a plain octagon placeholder until the logo file is in design/brand/.",
}


def brand(d):
    i = 0; p = ".d0"
    fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus&family=Noto+Naskh+Arabic:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">'
    octo = lambda s, extra="": (f"<svg class='oct' width='{s}' height='{s}' viewBox='0 0 40 40' aria-hidden='true'><path d='M12 2h16l10 10v16L28 38H12L2 28V12z' fill='none' stroke='#C9A24D' stroke-width='2'/>"
                                f"<circle cx='20' cy='20' r='11' fill='none' stroke='currentColor' stroke-width='1'/><path d='M20 20 L29 9' stroke='#C9A24D' stroke-width='3' stroke-linecap='round'/><circle cx='20' cy='20' r='3.5' fill='#C9A24D'/>{extra}</svg>")
    css = f"""
{p}{{--bg:#F7F3EA;--sf:#E6DCC8;--g:#C9A24D;--n:#14213D;--gt:#8A6A1F;--mono:'IBM Plex Mono';background:var(--bg);color:var(--n);font-family:'IBM Plex Sans',sans-serif;box-shadow:inset 0 0 0 2px var(--g)}}
{p} .hd h2{{font-family:Marcellus;font-weight:400}}
{p} .hd .no{{color:var(--gt)}}
{p} .spec{{display:grid;gap:4px}} {p} .spec .wm{{display:flex;align-items:center;gap:14px;font:400 44px/1 Marcellus}} {p} .spec .wm .ar{{font:700 40px/1.2 'Noto Naskh Arabic'}}
{p} .spec .oct{{color:var(--n)}}
{p} .ph{{background:var(--bg)}}
{p} .top{{background:var(--n);color:var(--bg);padding:14px 16px 12px;display:flex;align-items:center;gap:10px}}
{p} .top .oct{{color:var(--bg);flex:none}}
{p} .top .wm{{font:400 22px/1 Marcellus}} {p} .top .wm .ar{{font:700 18px 'Noto Naskh Arabic';margin-left:6px}}
{p} .top .day{{margin-left:auto;font:500 11px var(--mono);color:var(--g)}}
{p} .ttl{{padding:14px 16px 6px;font:400 24px/1.1 Marcellus}}
{p} .stops{{flex:1;padding:0 12px;display:grid;gap:8px;align-content:start}}
{p} .stop{{background:#fff;border:1px solid var(--sf);border-radius:12px;padding:10px 12px;display:grid;grid-template-columns:56px 1fr;gap:2px 8px}}
{p} .stop .t{{font:500 12px var(--mono);font-variant-numeric:tabular-nums;padding-top:2px}}
{p} .stop .n{{font-weight:600;font-size:14.5px}} {p} .stop .n .ar{{font:500 13px 'Noto Naskh Arabic';opacity:.7;margin-left:6px}}
{p} .stop .s{{grid-column:2;justify-self:start;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px}}
{p} .s.quiet{{background:var(--n);color:var(--g)}} {p} .s.busy{{background:var(--g);color:var(--n)}} {p} .s.shade{{background:var(--sf);color:var(--n)}}
{p} .swap{{margin:10px 12px 0;padding:10px 12px;border-radius:12px;background:var(--sf);font-size:12.5px;line-height:1.4;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}}
{p} .needle{{width:18px;height:18px;flex:none}}
{p} .score{{display:flex;align-items:center;justify-content:space-between;margin:10px 16px;font-size:13px}}
{p} .score b{{font:400 30px/1 Marcellus}} {p} .score small{{color:var(--gt);font-weight:600}}
{p} .bar{{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--sf);background:var(--bg);text-align:center;font-size:12px;font-weight:600}}
{p} .bar span{{padding:10px 0 16px;position:relative}} {p} .bar .on::before{{content:'';position:absolute;top:-1px;left:30%;right:30%;height:3px;background:var(--g)}}
{p} .cam{{flex:1;position:relative;background:#cdd3d6;display:flex;align-items:flex-end;overflow:hidden}}
{p} .cam .fort .f-wall,{p} .cam .fort .f-tower{{fill:#d6c3a3}} {p} .cam .fort .f-door{{fill:#5a4630}} {p} .cam .fort .f-slit{{stroke:#5a4630}} {p} .cam .fort .f-ground{{stroke:#14213d55}}
{p} .tagx{{position:absolute;top:14%;left:10%;background:var(--n);color:var(--bg);padding:8px 12px;border-radius:12px;font-size:12px;border:1px solid var(--g)}}
{p} .tagx b{{display:block;font:400 17px Marcellus;color:var(--g)}}
{p} .pin{{position:absolute;top:42%;left:46%;width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--g);border:2px solid var(--n)}}
{p} .yr{{background:var(--n);color:var(--bg);padding:12px 16px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font:500 12px var(--mono)}}
{p} .yr .tr{{height:2px;background:#F7F3EA55;position:relative}} {p} .yr .tr::before{{content:'';position:absolute;inset:0 38% 0 0;background:var(--g)}}
{p} .yr .tr i{{position:absolute;left:62%;top:-8px;width:18px;height:18px;border-radius:50%;background:var(--g);border:3px solid var(--n);box-shadow:0 0 0 1px var(--g)}}
{p} .yr small{{grid-column:1/4;font:400 11px 'IBM Plex Sans';color:var(--sf)}}
{p} .ask{{flex:1;position:relative;display:flex;flex-direction:column}}
{p} .sheet{{position:absolute;inset:auto 0 45px 0;height:66%;background:var(--bg);border-radius:20px 20px 0 0;padding:14px 14px 10px;display:flex;flex-direction:column;gap:10px;box-shadow:0 -1px 0 var(--sf)}}
{p} .sheet h4{{margin:0;font:400 20px Marcellus;display:flex;align-items:center;gap:8px}}
{p} .q{{align-self:flex-end;background:var(--sf);padding:8px 12px;border-radius:14px 14px 4px 14px;font-size:13px;max-width:85%}}
{p} .a{{background:var(--n);color:var(--bg);padding:10px 12px;border-radius:14px 14px 14px 4px;font-size:13px;line-height:1.45}}
{p} .btns{{display:flex;gap:8px}} {p} .btns span{{font-size:12px;font-weight:600;padding:7px 12px;border-radius:999px}}
{p} .btns .pr{{background:var(--g);color:var(--n)}} {p} .btns .sc{{border:1px solid var(--n)}}
"""
    needle = "<svg class='needle' viewBox='0 0 18 18' aria-hidden='true'><path d='M9 9 L16 2' stroke='#C9A24D' stroke-width='3' stroke-linecap='round'/><circle cx='9' cy='9' r='3' fill='#14213D'/></svg>"
    specimen = (f"<div class='spec'><div class='wm'>{octo(56)}<span>Daleel</span><span class='ar' lang='ar'>دليل</span></div>"
                "<p style='margin:6px 0 0;font-size:15px;line-height:1.5'>Navy carries every word; gold marks the one choice Daleel recommends (the needle, the primary button, the active tab). "
                "Type is a provisional match for the wordmark: Marcellus and Noto Naskh Arabic for display, IBM Plex Sans and Plex Sans Arabic for body.</p></div>")
    top = lambda right: f"<div class='top'>{octo(28)}<span class='wm'>Daleel<span class='ar' lang='ar'>دليل</span></span><span class='day'>{right}</span></div>"
    bar = lambda on: "<div class='bar'>" + "".join(f"<span class='{'on' if k == on else ''}'>{t}</span>" for k, t in enumerate(["Plan", "Look Up", "Ask"])) + "</div>"
    stops = "".join(f"<div class='stop'><span class='t'>{t}</span><span class='n'>{esc(n)}<span class='ar' lang='ar'>{a}</span></span><span class='s {k}'>{esc(s)}</span></div>" for t, n, a, s, k, x in STOPS)
    plan = f"{top('SAT 10 OCT · 34°C')}<div class='ttl'>Today, at the right time</div><div class='stops'>{stops}</div><div class='swap'>{needle}<span>{esc(SWAP)}</span></div><div class='score'><span>Plan score<br><small>Quiet, cool, low footprint</small></span><b>{SCORE}</b></div>{bar(0)}"
    look = (f"{top('AL HISN FORT')}<div class='cam'>{FORT}<span class='tagx'><b>Al Hisn Fort</b>Built 1823 · quiet until 11:00</span><span class='pin'></span></div>"
            f"<div class='yr'><span>TODAY</span><span class='tr'><i></i></span><span>1823</span><small>The 1823 view is an artist's impression.</small></div>{bar(1)}")
    ask = (f"<div class='ask'>{top('GUIDE')}<div class='cam' style='flex:1'>{FORT}</div>"
           f"<div class='sheet'><h4>{octo(22)}Ask Daleel</h4><div class='q'>{esc(QUESTION)}</div><div class='a'>{esc(ANSWER)}</div>"
           f"<div class='btns'><span class='pr'>Read aloud</span><span class='sc'>Quiet hours today</span></div></div>{bar(2)}</div>")
    return shell(i, d, css, fonts, plan, look, ask, specimen)


CHOSEN.insert(0, (0, "brand"))  # the team's identity leads the page
BUILDERS = {7: route_band, 3: lagoon, 1: hashiya, 4: girih, 5: mleiha, "brand": brand}

if __name__ == "__main__":
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with open(JOURNAL, "a", encoding="utf-8") as j:
        for idx, n in CHOSEN:
            d = BRAND if n == "brand" else load(n)
            src = BUILDERS[n](d)
            open(os.path.join(OUT, f"dir-{idx}.html"), "w", encoding="utf-8").write(src)
            j.write(json.dumps({"type": "result", "label": f"mockup:{idx}:{d['name']}", "phase": "Mockups",
                                "result": {"file": f"design/dir-{idx}.html", "builder": "tools/build_design_panels.py"}, "ts": now}) + "\n")
            print(f"dir-{idx}.html  {d['name']}  {len(src.encode())} bytes")
