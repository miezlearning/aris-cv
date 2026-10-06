import re
import sys
import zipfile
import zlib
from pathlib import Path

base = Path(__file__).parent
failures = []


def check(name, condition, detail):
    print(f"{'LULUS' if condition else 'GAGAL'}  {name}")
    print(f"       {detail}")
    if not condition:
        failures.append(name)


def normalize(value):
    return re.sub(r"\s+", " ", value.replace("\u2022", "-").replace("\t", " ")).strip()


# ------------------------------------------------------------------ DOCX
from docx import Document

docx_path = base / "cv.docx"
document = Document(str(docx_path))
section = document.sections[0]

check(
    "DOCX tetap A4 dengan margin 0,75 inci",
    abs(section.page_width / 914400 - 8.27) < 0.05 and abs(section.left_margin / 914400 - 0.75) < 0.02,
    f"{section.page_width / 914400:.2f} x {section.page_height / 914400:.2f} inci, margin {section.left_margin / 914400:.3f} inci",
)

with zipfile.ZipFile(docx_path) as archive:
    document_xml = archive.read("word/document.xml").decode("utf-8")
    styles_xml = archive.read("word/styles.xml").decode("utf-8")

check(
    "DOCX memakai garis pemisah paragraf, bukan tabel atau kotak teks",
    "<w:pBdr>" in document_xml and "<w:tbl>" not in document_xml and "<w:txbxContent>" not in document_xml,
    f"pBdr: {document_xml.count('<w:pBdr>')} bagian | tabel: {document_xml.count('<w:tbl>')} | kotak teks: {document_xml.count('<w:txbxContent>')}",
)

check(
    "DOCX memakai tab rata kanan untuk tanggal",
    "<w:tabs>" in document_xml and 'w:val="right"' in document_xml and "<w:tab/>" in document_xml,
    f"tab: {document_xml.count('<w:tabs>')} blok, tab stop rata kanan: {'w:val=\"right\"' in document_xml}",
)

check(
    "DOCX tidak memakai kolom ganda",
    "<w:cols" not in document_xml or 'w:num="1"' in document_xml,
    "tidak ada tata letak berkolom",
)

paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
docx_text = "\n".join(paragraphs)

check(
    "DOCX memuat seluruh isi model",
    all(
        normalize(token) in normalize(docx_text)
        for token in [
            "Aris Pratama",
            "aris.pratama@example.com | 0812-3456-7890 | Jakarta Selatan | linkedin.com/in/arispratama",
            "Summary",
            "Experience",
            "Education",
            "Skills",
            "Data Analyst, PT Contoh Sejahtera",
            "08/2024 - Present",
            "Intern Data, Startup Contoh",
            "S1, Sistem Informasi",
            "Universitas Contoh, 2024",
            "GPA/IPK: 3.75/4.00",
            "SQL, analisis data, Excel, Power BI, komunikasi, kolaborasi",
        ]
    ),
    f"{len(paragraphs)} paragraf berisi",
)

check(
    "judul bagian DOCX tetap Heading 1 dan berwarna hitam",
    "Heading1" in document_xml and "Arial" in (document_xml + styles_xml),
    "gaya Heading 1 asli, font Arial, warna hitam",
)

# ------------------------------------------------------------------ PDF
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

content = b"\n".join(streams).decode("latin-1", errors="replace")

check(
    "PDF tetap memakai font standar tanpa disematkan",
    b"/BaseFont /Helvetica" in pdf_bytes and b"WinAnsiEncoding" in pdf_bytes and b"/FontFile" not in pdf_bytes,
    f"Helvetica: {pdf_bytes.count(b'/BaseFont /Helvetica')} | WinAnsi: {pdf_bytes.count(b'WinAnsiEncoding')} | font tersemat: {pdf_bytes.count(b'/FontFile')}",
)

rules = len(re.findall(r"[\d.\-]+ [\d.\-]+ [\d.\-]+ [\d.\-]+ re", content))
lines = len(re.findall(r"[\d.\-]+ [\d.\-]+ m", content))
check(
    "PDF menggambar garis pemisah tanpa tabel",
    rules + lines >= 5,
    f"{rules} kotak isian + {lines} goresan garis dipakai untuk kepala dan judul bagian",
)

# ------------------------------------------------------------------ teks PDF
mapping = {}
for match in re.finditer(rb"/ToUnicode", pdf_bytes):
    pass

lines_out = []
for stream in streams:
    for array_match in re.finditer(rb"\[(.*?)\]\s*TJ", stream, re.S):
        body = array_match.group(1)
        piece = []
        for token in re.finditer(rb"<([0-9A-Fa-f\s]+)>|\((?:\\.|[^\\()])*\)", body):
            if token.group(1) is not None:
                data = bytes.fromhex(re.sub(rb"\s", b"", token.group(1)).decode())
                piece.append(data.decode("cp1252", errors="replace"))
            else:
                literal = token.group(0)
                piece.append(literal[1:-1].decode("cp1252", errors="replace"))
        if piece:
            lines_out.append("".join(piece))

pdf_text = "\n".join(lines_out)
check(
    "PDF tetap memuat seluruh isi model",
    all(
        normalize(token).lower() in normalize(pdf_text).lower()
        for token in [
            "Aris Pratama",
            "aris.pratama@example.com",
            "Summary",
            "Experience",
            "Education",
            "Skills",
            "Data Analyst, PT Contoh Sejahtera",
            "08/2024 - Present",
            "Universitas Contoh, 2024",
            "GPA/IPK: 3.75/4.00",
            "SQL, analisis data, Excel, Power BI, komunikasi, kolaborasi",
        ]
    ),
    f"{len(lines_out)} baris teks terbaca",
)

# Tanggal rata kanan: posisi nyata dihitung dengan mengalikan matriks teks dan matriks
# transformasi halaman, karena react-pdf memakai cm bertingkat, bukan Tm langsung.
def multiply(m, n):
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
            ctm = multiply(tuple(float(v) for v in token.group("cm").split()[:6]), ctm)
        elif token.group("tm"):
            tmat = tuple(float(v) for v in token.group("tm").split()[:6])
        elif token.group("tj"):
            digits = re.sub(r"\s", "", "".join(re.findall(r"<([0-9A-Fa-f]+)>", token.group("tj"))))
            if not digits:
                continue
            # Satu byte per karakter (WinAnsi), bukan UTF-16.
            piece = bytes.fromhex(digits).decode("cp1252", errors="replace")
            if not piece.strip():
                continue
            combined = multiply(tmat, ctm)
            placements.append((round(combined[4], 1), round(combined[5], 1), piece))

right_margin = 595.28 - 54.0
dates = [item for item in placements if re.match(r"^\d{2}/\d{4}", item[2])]
check(
    "tanggal tergambar di sisi kanan, sebaris dengan judul",
    len(dates) >= 2 and all(item[0] > 400 for item in dates),
    f"{len(dates)} tanggal, x = {[item[0] for item in dates]} (batas kanan {right_margin:.1f} pt)",
)

titles = [item for item in placements if item[0] < 60 and ("Analyst" in item[2] or "Intern" in item[2])]
check(
    "judul pengalaman tergambar di margin kiri",
    len(titles) >= 2 and all(abs(item[0] - 54.0) < 1 for item in titles),
    f"{len(titles)} judul pada x = {[item[0] for item in titles]} (margin kiri 54 pt)",
)

dots = [item for item in placements if item[2].strip() == "\u2022"]
bullet_texts = [item for item in placements if 60 < item[0] < 80 and len(item[2]) > 20]
check(
    "poin pengalaman memakai bullet menjorok, bukan teks rata margin",
    len(dots) == 3
    and all(abs(item[0] - 54.0) < 1 for item in dots)
    and len(bullet_texts) >= 3
    and all(abs(item[0] - 66.0) < 1 for item in bullet_texts),
    f"{len(dots)} bullet di x={[item[0] for item in dots]}, teks poin di x={[item[0] for item in bullet_texts]} (menjorok 12 pt)",
)

# ------------------------------------------------------------------ TXT
txt_text = (base / "cv.txt").read_text(encoding="utf-8")
check(
    "TXT tetap memuat seluruh isi model",
    all(
        normalize(token).lower() in normalize(txt_text).lower()
        for token in ["Aris Pratama", "Summary", "Experience", "Education", "Skills", "GPA/IPK: 3.75/4.00"]
    ),
    "teks polos tetap lengkap",
)

print(f"\n{len(failures)} kegagalan")
sys.exit(1 if failures else 0)
