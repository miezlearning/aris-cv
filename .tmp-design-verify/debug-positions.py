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

lines = []
for stream in streams:
    text = stream.decode("latin-1", errors="replace")
    # Lacak matriks teks dan geseran cm untuk menghitung posisi mendatar nyata.
    offset_x = 0.0
    tm_x = tm_y = 0.0
    for token in re.finditer(r"([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+) cm|1 0 0 1 ([\d.\-]+) ([\d.\-]+) Tm|(\[.*?\]\s*TJ)", text, re.S):
        if token.group(1) is not None:
            offset_x = float(token.group(5))
        elif token.group(7) is not None:
            tm_x = float(token.group(7))
            tm_y = float(token.group(8))
        else:
            body = token.group(9)
            digits = re.sub(r"\s", "", "".join(re.findall(r"<([0-9A-Fa-f]+)>", body)))
            if not digits:
                continue
            piece = "".join(
                bytes.fromhex(digits[i:i + 4]).decode("cp1252", errors="replace") for i in range(0, len(digits) - 3, 4)
            )
            if piece.strip():
                lines.append((round(offset_x, 1), round(tm_x, 1), round(tm_y, 1), piece))

out = ["x_cm | x_tm | y_tm | teks", "-" * 60]
for item in lines:
    out.append(f"{item[0]:>7} | {item[1]:>7} | {item[2]:>7} | {item[3]}")

(base / "positions.txt").write_text("\n".join(out), encoding="utf-8")
print(f"{len(lines)} potongan teks")
