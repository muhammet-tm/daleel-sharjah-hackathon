import json, sys, os
journal, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
labels = {}
results = []
with open(journal, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            e = json.loads(line)
        except Exception:
            continue
        t = e.get("type")
        if t == "started":
            labels[e.get("agentId")] = e.get("label")
        elif t in ("completed", "finished", "result"):
            aid = e.get("agentId")
            lab = e.get("label") or labels.get(aid) or aid
            results.append((lab, aid, e.get("result", e)))
seen = {}
for lab, aid, res in results:
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in str(lab))
    n = seen.get(safe, 0); seen[safe] = n + 1
    name = safe if n == 0 else f"{safe}__{n}"
    with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as w:
        json.dump(res, w, ensure_ascii=False, indent=1)
print("started:", len(labels), "| results:", len(results))
for lab, aid, res in results:
    if str(lab).startswith("verify"):
        r = res if isinstance(res, dict) else {}
        print(f"  {lab}: refuted={r.get('refuted')} | {str(r.get('reason',''))[:160]}")
    else:
        print(f"  {lab}: {len(json.dumps(res, ensure_ascii=False)) if res is not None else 0} chars")
