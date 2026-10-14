"""Build LinkedIn background options for Muhammet Yalkapov (1584 x 396, plus @2x).

Usage: python build_banners.py
Writes html/<id>.html and png/<id>.png, png/<id>@2x.png, and for photo options a -clean variant
without text. Then writes png/_contact-sheet.png with a mock profile photo over each option so the
safe zone can be judged. Photo options read raw/<name>.png produced by the Higgsfield CLI.
"""
import math, os, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "html")
PNG = os.path.join(HERE, "png")
RAW = os.path.join(HERE, "raw")
CHROME = r"C:\Users\ASUS\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe"
W, H = 1584, 396
os.makedirs(HTML, exist_ok=True)
os.makedirs(PNG, exist_ok=True)

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700&family=Martian+Mono:wght@400;500&display=swap">'
LINE1 = "Cybersecurity &middot; Product &middot; Research"
LINE2 = "Abu Dhabi University &middot; GameFit &middot; Springer LNNS"


def page(body, css):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">{FONTS}
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}px;height:{H}px;overflow:hidden}}
.stage{{position:relative;width:{W}px;height:{H}px;overflow:hidden}}
.copy{{position:absolute;right:88px;top:50%;transform:translateY(-50%);text-align:right}}
.copy .l1{{font:600 42px/1.1 'Schibsted Grotesk',system-ui,sans-serif;letter-spacing:-0.01em}}
.copy .l2{{font:400 20px/1.4 'Martian Mono',ui-monospace,monospace;margin-top:14px;letter-spacing:0}}
{css}
</style></head><body><div class="stage">{body}</div></body></html>"""


def render(name, html):
    path = os.path.join(HTML, name + ".html")
    open(path, "w", encoding="utf-8").write(html)
    url = "file:///" + path.replace("\\", "/")
    for scale, suffix in ((1, ""), (2, "@2x")):
        out = os.path.join(PNG, f"{name}{suffix}.png")
        subprocess.run([CHROME, "--headless", "--hide-scrollbars", "--disable-gpu", f"--window-size={W},{H}",
                        f"--force-device-scale-factor={scale}", "--virtual-time-budget=6000",
                        f"--screenshot={out}", url], check=True, capture_output=True)
    print("rendered", name)


# ---------- photo options (Higgsfield backgrounds) ----------
PHOTOS = {
    # id: (raw file, object-position, text color, scrim css on the right side, title)
    "A-two-deserts": ("dunes.jpg", "center 55%", "#141516", "linear-gradient(90deg, rgba(246,244,240,0) 50%, rgba(246,244,240,0.5) 80%)", "Two deserts"),
    "B-knot-by-knot": ("carpet.jpg", "center 50%", "#F3EEE6", "linear-gradient(90deg, rgba(18,8,8,0) 48%, rgba(18,8,8,0.55) 80%)", "Knot by knot"),
    "C-filtered-light": ("lattice.jpg", "center 50%", "#F5F3EF", "linear-gradient(90deg, rgba(14,18,24,0) 50%, rgba(14,18,24,0.45) 82%)", "Filtered light"),
}
# Mirrored so the plain, out-of-focus side of the photograph sits under the text on the right.
MIRROR = {"B-knot-by-knot", "C-filtered-light"}
# Per-option type adjustments where the photograph is bright close to the text.
EXTRA = {"C-filtered-light": ".copy{right:64px} .copy .l1{font-size:38px} .copy .l2{font-size:19px}"}


def photo_options(overrides):
    built = []
    for oid, (raw, pos, color, scrim, title) in PHOTOS.items():
        o = overrides.get(oid, {})
        pos, color, scrim = o.get("pos", pos), o.get("color", color), o.get("scrim", scrim)
        src = os.path.join(RAW, raw)
        if not os.path.exists(src):
            print("missing", raw, "- skipped", oid)
            continue
        img = "file:///" + src.replace("\\", "/")
        flip = "transform:scaleX(-1);" if oid in MIRROR else ""
        css = f".bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:{pos};{flip}}}" \
              f".scrim{{position:absolute;inset:0;background:{scrim}}} .copy{{color:{color}}}" + EXTRA.get(oid, "")
        render(oid, page(f'<img class="bg" src="{img}" alt=""><div class="scrim"></div>'
                         f'<div class="copy"><div class="l1">{LINE1}</div><div class="l2">{LINE2}</div></div>', css))
        render(oid + "-clean", page(f'<img class="bg" src="{img}" alt="">', css))
        built.append((oid, title))
    return built


# ---------- D: Turkmen gul becoming a network ----------
def gul_network():
    ground, madder, madder2, indigo, ivory = "#170D0D", "#7A1C1E", "#A1282D", "#22304F", "#ECE5D8"
    w, h, c = 124, 86, 26
    cols = [70 + i * 168 for i in range(5)]
    rows = [66, 198, 330]
    parts = []

    def ease(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3 - 2 * t)

    def octagon(cx, cy, s=1.0):
        ww, hh, cc = w * s / 2, h * s / 2, c * s
        return [(cx - ww + cc, cy - hh), (cx + ww - cc, cy - hh), (cx + ww, cy - hh + cc), (cx + ww, cy + hh - cc),
                (cx + ww - cc, cy + hh), (cx - ww + cc, cy + hh), (cx - ww, cy + hh - cc), (cx - ww, cy - hh + cc)]

    def pts(p):
        return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)

    def diamond(cx, cy, rw, rh):
        return pts([(cx, cy - rh), (cx + rw, cy), (cx, cy + rh), (cx - rw, cy)])

    centers = {}
    for ci, cx in enumerate(cols):
        t = ease((cx - 300) / 400)
        for ri, cy in enumerate(rows):
            centers[(ci, ri)] = (cx, cy, t)
            o = octagon(cx, cy)
            # carpet state
            if t < 1:
                a = 1 - t
                parts.append(f'<polygon points="{pts(o)}" fill="{madder}" fill-opacity="{a:.2f}" stroke="{ivory}" stroke-opacity="{0.85*a+0.35*t:.2f}" stroke-width="2"/>')
                parts.append(f'<polygon points="{pts(octagon(cx, cy, 0.6))}" fill="{madder2}" fill-opacity="{a:.2f}" stroke="{ivory}" stroke-opacity="{0.7*a:.2f}" stroke-width="1.5"/>')
                for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    parts.append(f'<polygon points="{diamond(cx + dx*24, cy + dy*15, 9, 9)}" fill="{indigo}" fill-opacity="{a:.2f}" stroke="{ivory}" stroke-opacity="{0.8*a:.2f}" stroke-width="1.2"/>')
                parts.append(f'<line x1="{cx-w/2*0.6:.1f}" y1="{cy}" x2="{cx+w/2*0.6:.1f}" y2="{cy}" stroke="{ivory}" stroke-opacity="{0.6*a:.2f}" stroke-width="1.2"/>')
                parts.append(f'<line x1="{cx}" y1="{cy-h/2*0.6:.1f}" x2="{cx}" y2="{cy+h/2*0.6:.1f}" stroke="{ivory}" stroke-opacity="{0.6*a:.2f}" stroke-width="1.2"/>')
                parts.append(f'<polygon points="{diamond(cx, cy, 7, 7)}" fill="{ivory}" fill-opacity="{a:.2f}"/>')
            # network state
            if t > 0:
                parts.append(f'<polygon points="{pts(o)}" fill="none" stroke="{ivory}" stroke-opacity="{0.35*t:.2f}" stroke-width="1"/>')
                for (vx, vy) in o:
                    parts.append(f'<line x1="{cx}" y1="{cy}" x2="{vx:.1f}" y2="{vy:.1f}" stroke="{ivory}" stroke-opacity="{0.22*t:.2f}" stroke-width="1"/>')
                    parts.append(f'<circle cx="{vx:.1f}" cy="{vy:.1f}" r="3" fill="{ivory}" fill-opacity="{0.9*t:.2f}"/>')
                parts.append(f'<circle cx="{cx}" cy="{cy}" r="6" fill="{madder2}" fill-opacity="{t:.2f}" stroke="{ivory}" stroke-opacity="{t:.2f}" stroke-width="1.5"/>')
        # minor guls between rows
        if ci < len(cols) - 1:
            mx = cx + 84
            tm = ease((mx - 300) / 400)
            for my in (132, 264):
                if tm < 1:
                    parts.append(f'<polygon points="{diamond(mx, my, 15, 22)}" fill="{indigo}" fill-opacity="{1-tm:.2f}" stroke="{ivory}" stroke-opacity="{0.8*(1-tm):.2f}" stroke-width="1.2"/>')
                    parts.append(f'<polygon points="{diamond(mx, my, 5, 8)}" fill="{ivory}" fill-opacity="{1-tm:.2f}"/>')
                if tm > 0:
                    parts.append(f'<circle cx="{mx}" cy="{my}" r="3.5" fill="{ivory}" fill-opacity="{tm:.2f}"/>')
    # links between neighbouring centres in the network zone
    for (ci, ri), (cx, cy, t) in centers.items():
        for (dc, dr) in ((1, 0), (0, 1), (1, 1)):
            n = centers.get((ci + dc, ri + dr))
            if n and min(t, n[2]) > 0:
                tt = min(t, n[2])
                parts.append(f'<line x1="{cx}" y1="{cy}" x2="{n[0]}" y2="{n[1]}" stroke="{ivory}" stroke-opacity="{0.45*tt:.2f}" stroke-width="1.2"/>')
    svg = f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="{ground}"/>{"".join(parts)}</svg>'
    css = f".panel{{position:absolute;top:0;right:0;bottom:0;width:760px;background:linear-gradient(90deg, rgba(23,13,13,0), {ground} 30%)}} .copy{{color:{ivory};right:64px}} .copy .l1{{font-size:38px}} .copy .l2{{font-size:19px}} svg{{position:absolute;inset:0}}"
    body = f'{svg}<div class="panel"></div><div class="copy"><div class="l1">{LINE1}</div><div class="l2">{LINE2}</div></div>'
    render("D-gul-to-network", page(body, css))
    render("D-gul-to-network-clean", page(f"{svg}", css))


# ---------- E: the route so far ----------
def route():
    ground, ink, ink2, green, rule = "#F1F2F1", "#14171A", "#4A5058", "#0E6B4C", "#CDD2D0"
    # Profile photo covers roughly x < 380, y > 180 on desktop; the line starts after it.
    stops = [
        ("2020", "Ashgabat", "Ran a fitness club"),
        ("2024", "Abu Dhabi", "Cybersecurity at ADU"),
        ("2025", "GameFit", "Founder"),
        ("2026", "Springer", "LNNS paper, ACR'26"),
        ("2026", "Hackathons", "Tatweer 2nd place,<br>Sharjah top 10"),
    ]
    x0, x1, y = 440, 1330, 214
    xs = [x0 + i * (x1 - x0) / (len(stops) - 1) for i in range(len(stops))]
    items = []
    for i, ((yr, place, what), x) in enumerate(zip(stops, xs)):
        last = i == len(stops) - 1
        align = "left"
        tx = f"left:{x - 10:.0f}px"
        items.append(f'<div class="stop {"last" if last else ""}" style="{tx};text-align:{align}">'
                     f'<div class="yr">{yr}</div><div class="pl">{place}</div><div class="wh">{what}</div></div>')
        r = 11 if last else 8
        items.append(f'<div class="dot {"last" if last else ""}" style="left:{x - r:.0f}px;top:{y - r}px;width:{2*r}px;height:{2*r}px"></div>')
    css = f"""
.stage{{background:{ground}}}
.base{{position:absolute;left:{x0}px;top:{y-1.5}px;width:{x1-x0}px;height:3px;background:{green}}}
.lead{{position:absolute;left:120px;top:{y-0.5}px;width:{x0-120}px;height:1px;background:{rule}}}
.dot{{position:absolute;border-radius:50%;background:{ground};border:3px solid {green}}}
.dot.last{{background:{green}}}
.stop{{position:absolute;top:{y-112}px;width:250px}}
.stop .yr{{font:500 20px/1 'Martian Mono',ui-monospace,monospace;color:{green};font-variant-numeric:tabular-nums}}
.stop .pl{{font:700 32px/1.1 'Schibsted Grotesk',system-ui,sans-serif;color:{ink};margin-top:14px;letter-spacing:-0.01em}}
.stop .wh{{position:absolute;top:142px;width:215px;font:500 22px/1.3 'Schibsted Grotesk',system-ui,sans-serif;color:{ink2}}}
.stop.last .wh{{width:240px}}
.tag{{position:absolute;right:144px;top:40px;font:400 19px/1 'Martian Mono',ui-monospace,monospace;color:{ink2}}}
"""
    body = '<div class="lead"></div><div class="base"></div>' + "".join(items) + \
           '<div class="tag">Cybersecurity &middot; Product &middot; Research</div>'
    render("E-the-route-so-far", page(body, css))


def contact_sheet(options):
    rows = []
    for oid, title in options:
        img = "file:///" + os.path.join(PNG, oid + ".png").replace("\\", "/")
        rows.append(f'<figure><figcaption><b>{oid[0]}</b> {title}</figcaption><div class="frame"><img src="{img}" alt="">'
                    f'<div class="me"></div></div></figure>')
    html = f"""<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>
body{{margin:0;background:#E9EAEC;font-family:'Schibsted Grotesk',sans-serif;color:#14171A;padding:28px 32px;width:1000px}}
h1{{font-size:22px;margin:0 0 6px}} p{{margin:0 0 20px;color:#4A5058;font-size:14px}}
figure{{margin:0 0 96px}} figcaption{{font-size:15px;margin-bottom:8px}} figcaption b{{display:inline-block;width:22px}}
.frame{{position:relative;width:936px;height:234px;background:#fff;border:1px solid #CDD2D0}}
.frame img{{width:936px;height:234px;display:block}}
.me{{position:absolute;left:28px;top:132px;width:180px;height:180px;border-radius:50%;background:#B9BEC4;border:5px solid #fff}}
</style></head><body><h1>LinkedIn background options</h1><p>Shown at desktop display scale, with the profile photo position marked in gray.</p>{''.join(rows)}</body></html>"""
    path = os.path.join(HTML, "_contact-sheet.html")
    open(path, "w", encoding="utf-8").write(html)
    out = os.path.join(PNG, "_contact-sheet.png")
    hgt = 90 + len(options) * 370
    subprocess.run([CHROME, "--headless", "--hide-scrollbars", "--disable-gpu", f"--window-size=1000,{hgt}",
                    "--virtual-time-budget=6000", f"--screenshot={out}", "file:///" + path.replace("\\", "/")],
                   check=True, capture_output=True)
    print("contact sheet", out)


if __name__ == "__main__":
    overrides = {}
    ov = os.path.join(HERE, "overrides.json")
    if os.path.exists(ov):
        overrides = json.load(open(ov, encoding="utf-8"))
    opts = photo_options(overrides)
    gul_network()
    route()
    opts += [("D-gul-to-network", "Gul to network"), ("E-the-route-so-far", "The route so far")]
    contact_sheet(opts)
