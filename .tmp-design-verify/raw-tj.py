import re
import zlib
from pathlib import Path

base = Path(__file__).parent
raw = (base / "cv.pdf").read_bytes()

streams = []
i = 0
while True:
    s = raw.find(b"stream", i)
    if s == -1:
        break
    e = raw.find(b"endstream", s)
    if e == -1:
        break
    body = raw[s + 6:e].lstrip(b"\r\n")
    try:
        streams.append(zlib.decompress(body))
    except zlib.error:
        streams.append(body)
    i = e + 9

content = b"".join(streams).decode("latin-1")

lines = []
for m in re.finditer(r"\[([^\]]*)\]\s*TJ", content, re.S):
    body = m.group(1)
    hexes = re.findall(r"<([0-9A-Fa-f]+)>", body)
    if not hexes:
        continue
    joined = "".join(hexes)
    odd = len(joined) % 4
    try:
        decoded = bytes.fromhex(joined[: len(joined) - odd]).decode("utf-16-be")
    except Exception as exc:
        decoded = f"<gagal: {exc}>"
    lines.append(f"panjang hex={len(joined):<4} sisa={odd}  utf16={decoded!r}")
    lines.append(f"    raw hex: {joined[:80]}")

(base / "raw-tj.txt").write_text("\n".join(lines), encoding="utf-8")
print(f"{len(lines) // 2} array TJ")
