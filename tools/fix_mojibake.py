"""Repair double-encoded UTF-8 (text that was read as cp1252 and re-saved as UTF-8).

Usage: python tools/fix_mojibake.py <file> [<file> ...]
Only rewrites a file when the cp1252 round trip succeeds and reduces the count of mojibake markers.
"""
import sys

MARKERS = ("Ø", "Ù", "Ã", "â€", "Â")

for path in sys.argv[1:]:
    raw = open(path, encoding="utf-8").read()
    before = sum(raw.count(m) for m in MARKERS)
    if before == 0:
        print(f"{path}: clean")
        continue
    try:
        fixed = raw.encode("cp1252", errors="strict").decode("utf-8", errors="strict")
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Fall back to a per-character attempt: characters outside cp1252 are kept as they are.
        out = []
        buf = []
        def flush():
            if buf:
                chunk = "".join(buf)
                try:
                    out.append(chunk.encode("cp1252").decode("utf-8"))
                except (UnicodeEncodeError, UnicodeDecodeError):
                    out.append(chunk)
                buf.clear()
        for ch in raw:
            try:
                ch.encode("cp1252")
                buf.append(ch)
            except UnicodeEncodeError:
                flush()
                out.append(ch)
        flush()
        fixed = "".join(out)
    after = sum(fixed.count(m) for m in MARKERS)
    if after < before:
        open(path, "w", encoding="utf-8", newline="\n").write(fixed)
        print(f"{path}: markers {before} -> {after}, rewritten")
    else:
        print(f"{path}: markers {before} -> {after}, left unchanged")
