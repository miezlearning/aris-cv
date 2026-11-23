export type SupportedFileType = "pdf" | "docx" | "txt" | "json";

export type ExtractedFileResult = {
  text: string;
  fileType: SupportedFileType;
  pageCount?: number;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type RawTextToken = {
  text: string;
  x: number;
  y: number;
  width: number;
};

const getExtension = (fileName: string): string => {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : "";
};

const resolveFileType = (file: File): SupportedFileType => {
  const ext = getExtension(file.name);
  if (ext === "pdf" || file.type === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (ext === "json" || file.type === "application/json") return "json";
  if (ext === "txt" || file.type === "text/plain") return "txt";

  if (ext === "doc") {
    throw new Error(
      "Format .doc (Word lama) belum didukung langsung di browser. Simpan ulang sebagai .docx atau .pdf, atau tempel teksnya di bawah."
    );
  }

  throw new Error("Format berkas belum didukung. Gunakan berkas .pdf, .docx, .txt, atau .json.");
};

const groupPdfTokensIntoLines = (tokens: RawTextToken[]): string[] => {
  if (!tokens.length) return [];

  const rows: Array<{ y: number; tokens: RawTextToken[] }> = [];
  const sortedByY = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);

  for (const token of sortedByY) {
    const existingRow = rows.find((row) => Math.abs(row.y - token.y) <= 3);
    if (existingRow) {
      existingRow.tokens.push(token);
    } else {
      rows.push({ y: token.y, tokens: [token] });
    }
  }

  const lines: string[] = [];
  for (const row of rows) {
    row.tokens.sort((a, b) => a.x - b.x);
    let line = "";
    let prevEndX: number | null = null;

    for (const token of row.tokens) {
      const piece = token.text;
      if (!piece.trim()) continue;

      if (prevEndX === null) {
        line = piece.trimStart();
      } else {
        const gap = token.x - prevEndX;
        const alreadySpaced = line.endsWith(" ") || piece.startsWith(" ");
        if (gap > 14) {
          line = `${line.trimEnd()}   ${piece.trimStart()}`;
        } else if (gap > 1.2 && !alreadySpaced) {
          line = `${line} ${piece}`;
        } else {
          line = `${line}${piece}`;
        }
      }

      prevEndX = token.x + Math.max(token.width, piece.length * 3.5);
    }

    const cleaned = line.replace(/[ \t]{4,}/g, "   ").trim();
    if (cleaned) lines.push(cleaned);
  }

  return lines;
};

const extractTextFromPdf = async (file: File): Promise<ExtractedFileResult> => {
  if (typeof window === "undefined") {
    throw new Error("Ekstraksi PDF hanya dapat dijalankan di browser.");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  let pdf: Awaited<typeof loadingTask.promise> | null = null;

  try {
    pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const tokens: RawTextToken[] = [];

      for (const rawItem of textContent.items) {
        if (!rawItem || typeof rawItem !== "object" || !("str" in rawItem)) continue;
        const item = rawItem as { str: string; transform?: number[]; width?: number };
        if (!item.str) continue;
        const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
        tokens.push({
          text: item.str,
          x: Number(transform[4] ?? 0),
          y: Number(transform[5] ?? 0),
          width: Number(item.width ?? 0)
        });
      }

      const lines = groupPdfTokensIntoLines(tokens);
      if (lines.length) pageTexts.push(lines.join("\n"));
    }

    const combined = pageTexts.join("\n").trim();
    if (combined.replace(/\s+/g, "").length < 20) {
      throw new Error(
        "Berkas PDF ini tampak seperti hasil pindaian gambar sehingga teksnya tidak bisa diseleksi. Coba unggah versi DOCX/PDF teks atau salin teks CV kamu lalu tempel di kolom bawah."
      );
    }

    return {
      text: combined,
      fileType: "pdf",
      pageCount: pdf.numPages
    };
  } finally {
    if (pdf) {
      await pdf.cleanup();
    }
    await loadingTask.destroy();
  }
};

const extractDocxParagraphText = (node: Element, buffer: { value: string }) => {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== 1) continue;
    const el = child as Element;
    const localName = el.localName || el.nodeName.split(":").pop() || "";

    if (localName === "pPr" || localName === "instrText" || localName === "delText") {
      continue;
    }

    if (localName === "t") {
      buffer.value += el.textContent ?? "";
      continue;
    }

    if (localName === "tab") {
      buffer.value += "   ";
      continue;
    }

    if (localName === "br" || localName === "cr") {
      buffer.value += "\n";
      continue;
    }

    extractDocxParagraphText(el, buffer);
  }
};

const extractDocxXmlParagraphs = (xmlString: string): string[] => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");
  const parseError = xml.getElementsByTagName("parsererror");
  if (parseError.length > 0) return [];

  const paragraphNodes = Array.from(xml.getElementsByTagName("*")).filter(
    (el) => (el.localName || el.nodeName.split(":").pop()) === "p"
  );

  const lines: string[] = [];
  for (const p of paragraphNodes) {
    const pPr = Array.from(p.children).find(
      (child) => (child.localName || child.nodeName.split(":").pop()) === "pPr"
    );
    const hasListNumPr = Boolean(
      pPr &&
        Array.from(pPr.getElementsByTagName("*")).some(
          (el) => (el.localName || el.nodeName.split(":").pop()) === "numPr"
        )
    );

    const buf = { value: "" };
    extractDocxParagraphText(p, buf);
    const splitLines = buf.value
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t]{4,}/g, "   ").trim())
      .filter(Boolean);

    splitLines.forEach((line, idx) => {
      if (hasListNumPr && idx === 0 && !/^(?:[•●▪*]|\d+[.)]|-\s+)/.test(line)) {
        lines.push(`• ${line}`);
      } else {
        lines.push(line);
      }
    });
  }

  return lines;
};

const extractTextFromDocx = async (file: File): Promise<ExtractedFileResult> => {
  if (typeof window === "undefined") {
    throw new Error("Ekstraksi DOCX hanya dapat dijalankan di browser.");
  }

  const { default: JSZip } = await import("jszip");
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Berkas DOCX tidak valid atau isi dokumennya tidak terbaca.");
  }

  const xmlParts: string[] = [];
  for (const headerName of ["word/header1.xml", "word/header2.xml"]) {
    const headerFile = zip.file(headerName);
    if (headerFile) {
      xmlParts.push(...extractDocxXmlParagraphs(await headerFile.async("string")));
    }
  }
  xmlParts.push(...extractDocxXmlParagraphs(await docFile.async("string")));

  const combined = xmlParts.join("\n").trim();
  if (!combined) {
    throw new Error("Tidak ada teks yang dapat diekstrak dari berkas DOCX tersebut.");
  }

  return {
    text: combined,
    fileType: "docx"
  };
};

export const extractTextFromFile = async (file: File): Promise<ExtractedFileResult> => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Ukuran berkas melebihi batas 10 MB. Silakan gunakan berkas CV yang lebih ringkas.");
  }

  const fileType = resolveFileType(file);
  if (fileType === "pdf") return extractTextFromPdf(file);
  if (fileType === "docx") return extractTextFromDocx(file);

  const text = (await file.text()).trim();
  if (!text) {
    throw new Error("Berkas terlihat kosong. Pilih berkas lain atau tempel teks CV di bawah.");
  }

  return { text, fileType };
};
