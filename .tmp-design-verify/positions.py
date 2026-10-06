import re
import zlib
from pathlib import Path

base = Path(__file__).parent
pdf_bytes = (base / "cv.pdf").read_bytes()

streams = []
index = 0
while True:
    start = pdf_bytes.find(b"stream", index)
    if start == -1:
        break
    end = pdf_bytes.find(b"endstream", start)
    if end == -1:
        break
    body = pdf_bytes[start + len(b"stream"):end].lstrip(b"\r\n")
    try:
        streams.append(zlib.decompress(body))
    except zlib.error:
        streams.append(body)
    index = end + len(b"endstream")


def mul(m, n):
    """Perkalian matriks affine PDF: m lalu n."""
    a1, b1, c1, d1, e1, f1 = m
    a2, b2, c2, d2, e2, f2 = n
    return (
        a1 * a2 + b1 * c2,
        a1 * b2 + b1 * d2,
        c1 * a2 + d1 * c2,
        c1 * b2 + d1 * d2,
        e1 * a2 + f1 * c2 + e2,
        e1 * b2 + f1 * d2 + f2,
    )


TOKEN = re.compile(
    r"(?P<save>q)\b|(?P<restore>Q)\b"
    r"|(?P<cm>[\d.\-]+ [\d.\-]+ [\d.\-]+ [\d.\-]+ [\d.\-]+ [\d.\-]+ cm)"
    r"|(?P<tm>1 0 0 1 [\d.\-]+ [\d.\-]+ Tm)"
    r"|(?P<tj>\[[^\]]*\]\s*TJ)",
    re.S,
)

# Halaman A4: 595.28 x 841.89 pt. Margin 0,75 inci = 54 pt.
PAGE_WIDTH = 595.28
LEFT = 54.0
RIGHT = PAGE_WIDTH - 54.0

placements = []
for stream in streams:
    text = stream.decode("latin-1", errors="replace")
    ctm = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    stack = []
    tmat = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)

    for token in TOKEN.finditer(text):
        if token.group("save"):
            stack.append(ctm)
        elif token.group("restore"):
            if stack:
                ctm = stack.pop()
        elif token.group("cm"):
            values = tuple(float(v) for v in token.group("cm").split()[:6])
            ctm = mul(values, ctm)
        elif token.group("tm"):
            values = tuple(float(v) for v in token.group("tm").split()[:6])
            tmat = values
        elif token.group("tj"):
            digits = re.sub(r"\s", "", "".join(re.findall(r"<([0-9A-Fa-f]+)>", token.group("tj"))))
            if not digits:
                continue
            piece = "".join(
                bytes.fromhex(digits[i:i + 4]).decode("cp1252", errors="replace")
                for i in range(0, len(digits) - 3, 4)
            )
            if not piece.strip():
                continue
            combined = mul(tmat, ctm)
            placements.append((round(combined[4], 1), round(combined[5], 1), piece))

placements.sort(key=lambda item: (-item[1], item[0]))

out = [f"halaman A4: lebar {PAGE_WIDTH} pt, margin kiri {LEFT} pt, batas kanan {RIGHT} pt", ""]
out.append(f"{'x':>7} {'y':>7}  teks")
out.append("-" * 78)
for x, y, piece in placements:
    out.append(f"{x:>7} {y:>7}  {piece}")

# Baris yang punya dua potongan teks pada ketinggian sama = judul kiri, tanggal kanan.
out.append("")
out.append("=== baris dengan dua potongan sejajar ===")
rows = {}
for x, y, piece in placements:
    rows.setdefault(y, []).append((x, piece))
for y, items in sorted(rows.items(), key=lambda item: -item[0]):
    if len(items) >= 2:
        items.sort()
        out.append(f"y={y:>7}  kiri x={items[0][0]:>6} '{items[0][1][:42]}'   kanan x={items[-1][0]:>6} '{items[-1][1][:20]}'")

(base / "positions.txt").write_text("\n".join(out), encoding="utf-8")
print(f"{len(placements)} potongan teks dengan posisi nyata")
