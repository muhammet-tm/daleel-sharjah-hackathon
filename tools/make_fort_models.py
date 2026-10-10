"""Generate simplified Al Hisn Fort scale models (GLB) for the AR time-travel view.

Usage: python tools/make_fort_models.py
Writes app/public/models/al-hisn-{1823,1969,today}.glb. No dependencies.
These are artist's impressions built from boxes and cylinders, not surveyed reconstructions:
1823 = the fort as built, with a low coral-stone town and palm-frond (barasti) houses around it.
1969 = after the demolition, one round tower standing among rubble beside new roads and blocks.
today = the rebuilt fort (reopened as a museum in 2015) in front of the modern city.
Units are metres; the base is 1.6 m across so the model sits on a table in AR.
"""
import json, math, os, struct

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "public", "models")

MATS = {
    "coral": (0.74, 0.62, 0.46), "gypsum": (0.88, 0.83, 0.74), "wood": (0.36, 0.23, 0.12),
    "sand": (0.80, 0.74, 0.62), "palm": (0.37, 0.48, 0.23), "trunk": (0.47, 0.36, 0.24),
    "barasti": (0.72, 0.61, 0.42), "water": (0.42, 0.58, 0.66), "concrete": (0.66, 0.67, 0.68),
    "glass": (0.55, 0.63, 0.71), "road": (0.33, 0.34, 0.36), "rubble": (0.62, 0.55, 0.45),
}


class Scene:
    def __init__(self):
        self.parts = {m: ([], [], []) for m in MATS}  # positions, normals, indices

    def _quad(self, mat, a, b, c, d, n):
        pos, nor, idx = self.parts[mat]
        base = len(pos)
        pos += [a, b, c, d]; nor += [n] * 4
        idx += [base, base + 1, base + 2, base, base + 2, base + 3]

    def box(self, mat, cx, cz, w, d, h, y0=0.0):
        x0, x1, z0, z1, y1 = cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, y0 + h
        q = self._quad
        q(mat, (x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (0, 1, 0))
        q(mat, (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), (0, 0, 1))
        q(mat, (x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (0, 0, -1))
        q(mat, (x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (1, 0, 0))
        q(mat, (x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), (-1, 0, 0))

    def cylinder(self, mat, cx, cz, r, h, y0=0.0, seg=24, top_r=None):
        top_r = r if top_r is None else top_r
        pos, nor, idx = self.parts[mat]
        for i in range(seg):
            a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
            p = [(cx + r * math.cos(a0), y0, cz + r * math.sin(a0)), (cx + r * math.cos(a1), y0, cz + r * math.sin(a1)),
                 (cx + top_r * math.cos(a1), y0 + h, cz + top_r * math.sin(a1)), (cx + top_r * math.cos(a0), y0 + h, cz + top_r * math.sin(a0))]
            n0, n1 = (math.cos(a0), 0, math.sin(a0)), (math.cos(a1), 0, math.sin(a1))
            base = len(pos)
            pos += [p[0], p[1], p[2], p[3]]; nor += [n0, n1, n1, n0]
            idx += [base, base + 2, base + 1, base, base + 3, base + 2]
            if top_r > 0:
                base = len(pos)
                pos += [(cx, y0 + h, cz), p[3], p[2]]; nor += [(0, 1, 0)] * 3
                idx += [base, base + 1, base + 2]

    def crenellate(self, mat, x0, z0, x1, z1, y, size=0.035, gap=0.03):
        length = math.hypot(x1 - x0, z1 - z0)
        n = int(length // (size + gap))
        for i in range(n):
            t = (i * (size + gap) + size / 2 + (length - n * (size + gap) + gap) / 2) / length
            cx, cz = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
            self.box(mat, cx, cz, size if x1 != x0 else 0.05, size if z1 != z0 else 0.05, 0.035, y)

    def save(self, path):
        bin_parts, views, accessors, prims, materials = bytearray(), [], [], [], []
        def add_view(data, target):
            while len(bin_parts) % 4:
                bin_parts.append(0)
            views.append({"buffer": 0, "byteOffset": len(bin_parts), "byteLength": len(data), "target": target})
            bin_parts.extend(data)
            return len(views) - 1
        for mat, (pos, nor, idx) in self.parts.items():
            if not idx:
                continue
            r, g, b = MATS[mat]
            materials.append({"name": mat, "pbrMetallicRoughness": {"baseColorFactor": [r, g, b, 1], "metallicFactor": 0,
                              "roughnessFactor": 0.35 if mat in ("water", "glass") else 0.9}})
            pv = add_view(b"".join(struct.pack("<3f", *p) for p in pos), 34962)
            nv = add_view(b"".join(struct.pack("<3f", *n) for n in nor), 34962)
            iv = add_view(b"".join(struct.pack("<I", i) for i in idx), 34963)
            mins = [min(p[k] for p in pos) for k in range(3)]; maxs = [max(p[k] for p in pos) for k in range(3)]
            accessors += [{"bufferView": pv, "componentType": 5126, "count": len(pos), "type": "VEC3", "min": mins, "max": maxs},
                          {"bufferView": nv, "componentType": 5126, "count": len(nor), "type": "VEC3"},
                          {"bufferView": iv, "componentType": 5125, "count": len(idx), "type": "SCALAR"}]
            a = len(accessors)
            prims.append({"attributes": {"POSITION": a - 3, "NORMAL": a - 2}, "indices": a - 1, "material": len(materials) - 1})
        while len(bin_parts) % 4:
            bin_parts.append(0)
        gltf = {"asset": {"version": "2.0", "generator": "Daleel make_fort_models.py"},
                "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0, "name": os.path.basename(path)}],
                "meshes": [{"primitives": prims}], "materials": materials, "accessors": accessors,
                "bufferViews": views, "buffers": [{"byteLength": len(bin_parts)}]}
        js = json.dumps(gltf, separators=(",", ":")).encode()
        js += b" " * ((4 - len(js) % 4) % 4)
        out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_parts))
        out += struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(bin_parts), 0x004E4942) + bytes(bin_parts)
        open(path, "wb").write(out)
        return len(out)


def fort(s, standing="all"):
    """Courtyard fort: 0.9 m square, walls 0.26 m, round tower NW, square tower SE, gate on the south wall."""
    H, T, half = 0.26, 0.06, 0.45
    if standing == "all":
        for cx, cz, w, d in [(0, -half, 0.9, T), (0, half, 0.9, T), (-half, 0, T, 0.9), (half, 0, T, 0.9)]:
            s.box("coral", cx, cz, w, d, H)
        s.crenellate("gypsum", -half, -half, half, -half, H); s.crenellate("gypsum", -half, half, half, half, H)
        s.crenellate("gypsum", -half, -half, -half, half, H); s.crenellate("gypsum", half, -half, half, half, H)
        s.box("wood", 0, half + 0.031, 0.12, 0.012, 0.17)                      # gate
        s.box("gypsum", 0, half + 0.035, 0.18, 0.012, 0.025, 0.17)             # gate lintel
        s.box("coral", 0.1, 0.05, 0.42, 0.3, 0.2)                               # inner majlis block
        s.box("gypsum", 0.1, 0.05, 0.44, 0.32, 0.02, 0.2)
        s.box("coral", half - 0.02, half - 0.02, 0.22, 0.22, 0.44)              # square tower SE
        s.crenellate("gypsum", half - 0.13, half + 0.09, half + 0.09, half + 0.09, 0.44, 0.03, 0.025)
        s.crenellate("gypsum", half - 0.13, half - 0.13, half + 0.09, half - 0.13, 0.44, 0.03, 0.025)
    s.cylinder("coral", -half + 0.02, -half + 0.02, 0.14, 0.4)                  # round tower NW (the one saved in 1969)
    for i in range(10):
        a = 2 * math.pi * i / 10
        s.box("gypsum", -half + 0.02 + 0.125 * math.cos(a), -half + 0.02 + 0.125 * math.sin(a), 0.035, 0.035, 0.035, 0.4)


def palm(s, x, z, h=0.32):
    s.cylinder("trunk", x, z, 0.012, h, seg=8)
    for i in range(6):
        a = 2 * math.pi * i / 6
        s.box("palm", x + 0.05 * math.cos(a), z + 0.05 * math.sin(a), 0.1 if i % 2 else 0.03, 0.03 if i % 2 else 0.1, 0.012, h - 0.01)


def base(s):
    s.box("sand", 0, 0, 1.6, 1.6, 0.02, -0.02)


def build_1823():
    s = Scene(); base(s); fort(s)
    s.box("water", 0, -0.72, 1.6, 0.16, 0.004, 0.0)                            # creek edge to the north
    for x, z in [(-0.62, 0.2), (-0.62, 0.5), (0.62, -0.25), (0.62, 0.15), (-0.3, 0.68), (0.3, 0.68)]:
        s.box("coral", x, z, 0.18, 0.16, 0.1); s.box("gypsum", x, z, 0.19, 0.17, 0.012, 0.1)
    for x, z in [(0.62, 0.55), (-0.62, -0.2), (0.0, 0.7)]:
        s.box("barasti", x, z, 0.14, 0.1, 0.08); s.cylinder("barasti", x, z, 0.075, 0.04, 0.08, seg=4, top_r=0.0)
    for x, z in [(-0.7, -0.5), (0.7, -0.5), (0.72, 0.7), (-0.72, 0.72)]:
        palm(s, x, z)
    return s


def build_1969():
    s = Scene(); base(s); fort(s, standing="tower")
    for i, (x, z) in enumerate([(-0.2, -0.3), (0.1, 0.0), (0.3, 0.3), (-0.1, 0.35), (0.35, -0.2), (-0.3, 0.1)]):
        s.box("rubble", x, z, 0.12 + 0.02 * (i % 3), 0.09, 0.025 + 0.01 * (i % 2))
    s.box("road", 0, 0.66, 1.6, 0.16, 0.004)                                    # new road
    s.box("road", 0.66, 0, 0.16, 1.6, 0.004)
    for x, z, h in [(-0.55, 0.62, 0.22), (0.2, -0.65, 0.18), (-0.62, -0.62, 0.26)]:
        s.box("concrete", x, z, 0.24, 0.16, h)
    return s


def build_today():
    s = Scene(); base(s); fort(s)
    s.box("gypsum", 0, 0.66, 1.0, 0.24, 0.006)                                  # paved plaza in front of the gate
    for x, z, w, h in [(-0.6, -0.62, 0.22, 0.9), (-0.25, -0.68, 0.18, 1.2), (0.15, -0.66, 0.2, 0.75), (0.55, -0.6, 0.24, 1.05), (0.7, 0.1, 0.16, 0.6)]:
        s.box("glass", x, z, w, 0.16, h)
    for x, z in [(-0.45, 0.68), (0.45, 0.68), (-0.7, 0.3)]:
        palm(s, x, z, 0.26)
    return s


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, build in [("1823", build_1823), ("1969", build_1969), ("today", build_today)]:
        n = build().save(os.path.join(OUT, f"al-hisn-{name}.glb"))
        print(f"al-hisn-{name}.glb {n} bytes")
