export type SupportedFileType = "pdf" | "docx" | "txt" | "json" | "zip" | "csv";

export type ExtractedFileResult = {
  text: string;
  fileType: SupportedFileType;
  pageCount?: number;
  linkedInCsvFiles?: Record<string, string>;
  detectedSource?: "linkedin_pdf" | "linkedin_archive";
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ZIP_SIZE_BYTES = 25 * 1024 * 1024;

export type RawTextToken = {
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
  if (
    ext === "zip" ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  ) {
    return "zip";
  }
  if (ext === "csv" || file.type === "text/csv") return "csv";
  if (ext === "json" || file.type === "application/json") return "json";
  if (ext === "txt" || file.type === "text/plain") return "txt";

  if (ext === "doc") {
    throw new Error(
      "Format .doc (Word lama) belum didukung langsung di browser. Simpan ulang sebagai .docx atau .pdf, atau tempel teksnya di bawah."
    );
  }

  throw new Error(
    "Format berkas belum didukung. Gunakan berkas .pdf, .docx, .zip, .csv, .txt, atau .json."
  );
};

const isLinkedInPageMarker = (value: string): boolean =>
  /^Page\s+\d+\s+of\s+\d+$/i.test(value.trim());

const estimateTokenEndX = (token: RawTextToken): number =>
  token.x + Math.max(token.width, token.text.trim().length * 3.2);

const hasHeavySplitCrossing = (tokens: RawTextToken[], splitX: number): boolean => {
  let crossing = 0;
  for (const token of tokens) {
    const trimmed = token.text.trim();
    if (trimmed.length < 2 || isLinkedInPageMarker(trimmed)) continue;
    if (token.x < splitX - 2 && estimateTokenEndX(token) > splitX + 2) {
      crossing += 1;
    }
  }
  return crossing > 3;
};

/**
 * Detects whether a PDF page uses a two-column sidebar layout (like LinkedIn's
 * Save-to-PDF export) and returns the gutter x-coordinate separating them.
 */
export const detectTwoColumnSplitX = (
  tokens: RawTextToken[],
  pageWidth = 595
): number | null => {
  const cleanTokens = tokens.filter((token) => {
    const trimmed = token.text.trim();
    return trimmed.length > 0 && !isLinkedInPageMarker(trimmed);
  });
  if (cleanTokens.length < 12) return null;

  const maxTokenEnd = cleanTokens.reduce(
    (max, token) => Math.max(max, estimateTokenEndX(token)),
    0
  );
  const effectiveWidth = Math.max(pageWidth > 0 ? pageWidth : 595, maxTokenEnd, 420);

  const rows: Array<{ y: number; tokens: RawTextToken[] }> = [];
  for (const token of [...cleanTokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((item) => Math.abs(item.y - token.y) <= 3);
    if (row) {
      row.tokens.push(token);
    } else {
      rows.push({ y: token.y, tokens: [token] });
    }
  }

  const minSplit = Math.round(effectiveWidth * 0.27);
  const maxSplit = Math.round(effectiveWidth * 0.44);
  const rightMarginCeiling = effectiveWidth * 0.56;

  let bestSplitX: number | null = null;
  let bestScore = -Infinity;

  for (let candidate = minSplit; candidate <= maxSplit; candidate += 4) {
    let crossingCount = 0;
    let leftTokenCount = 0;
    let rightTokenCount = 0;
    let minGapAroundSplit = Infinity;

    for (const token of cleanTokens) {
      const endX = estimateTokenEndX(token);
      if (token.x < candidate - 2 && endX > candidate + 2) {
        if (token.text.trim().length >= 2) {
          crossingCount += 1;
        }
      } else if (endX <= candidate + 2) {
        leftTokenCount += 1;
        minGapAroundSplit = Math.min(minGapAroundSplit, Math.max(0, candidate - endX));
      } else {
        rightTokenCount += 1;
        minGapAroundSplit = Math.min(minGapAroundSplit, Math.max(0, token.x - candidate));
      }
    }

    if (crossingCount > 1 || leftTokenCount < 4 || rightTokenCount < 8) {
      continue;
    }

    let totalLeftRows = 0;
    let leftOnlyRows = 0;
    let rightMarginRows = 0;

    for (const row of rows) {
      const hasLeft = row.tokens.some((t) => estimateTokenEndX(t) <= candidate + 2);
      const hasRightNearColumnStart = row.tokens.some(
        (t) => t.x >= candidate - 2 && t.x <= rightMarginCeiling
      );
      if (hasLeft) totalLeftRows += 1;
      if (hasLeft && !hasRightNearColumnStart) leftOnlyRows += 1;
      if (hasRightNearColumnStart) rightMarginRows += 1;
    }

    if (totalLeftRows < 3 || rightMarginRows < 5 || (leftOnlyRows < 2 && totalLeftRows < 4)) {
      continue;
    }

    const gutterBonus = Number.isFinite(minGapAroundSplit) ? Math.min(minGapAroundSplit, 24) : 0;
    const score = totalLeftRows * 2 + rightMarginRows * 3 + gutterBonus - crossingCount * 40;

    if (score > bestScore) {
      bestScore = score;
      bestSplitX = candidate;
    }
  }

  return bestSplitX;
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

/**
 * Splits a page's PDF tokens around `splitX` and returns clean reading lines
 * for the left sidebar and right main column separately.
 */
export const extractTwoColumnPdfLines = (
  tokens: RawTextToken[],
  splitX: number
): { leftLines: string[]; rightLines: string[] } => {
  const leftTokens: RawTextToken[] = [];
  const rightTokens: RawTextToken[] = [];

  for (const token of tokens) {
    const trimmed = token.text.trim();
    if (!trimmed || isLinkedInPageMarker(trimmed)) continue;
    if (estimateTokenEndX(token) <= splitX + 2) {
      leftTokens.push(token);
    } else {
      rightTokens.push(token);
    }
  }

  return {
    leftLines: groupPdfTokensIntoLines(leftTokens).filter((line) => !isLinkedInPageMarker(line)),
    rightLines: groupPdfTokensIntoLines(rightTokens).filter((line) => !isLinkedInPageMarker(line))
  };
};

const looksLikeLinkedInPdfContent = (text: string): boolean => {
  const hasLinkedInUrl = /(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\//i.test(text);
  const hasSidebarHeader = /\b(?:Top Skills|Contact|Honors-Awards)\b/i.test(text);
  const hasMainHeader = /\b(?:Summary|Experience|Education)\b/i.test(text);
  return hasLinkedInUrl || (hasSidebarHeader && hasMainHeader);
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
    const pageData: Array<{ tokens: RawTextToken[]; pageWidth: number }> = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const pageWidth =
        typeof page.getViewport === "function" ? page.getViewport({ scale: 1 }).width : 595;
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

      pageData.push({ tokens, pageWidth });
    }

    let activeSplitX: number | null = null;
    const mainColumnLines: string[] = [];
    const sidebarLines: string[] = [];
    const fallbackPageTexts: string[] = [];

    for (const { tokens, pageWidth } of pageData) {
      const pageSplitX = detectTwoColumnSplitX(tokens, pageWidth);
      const resolvedSplitX: number | null =
        pageSplitX ??
        (activeSplitX !== null && !hasHeavySplitCrossing(tokens, activeSplitX)
          ? activeSplitX
          : null);

      if (resolvedSplitX !== null) {
        activeSplitX = resolvedSplitX;
        const { leftLines, rightLines } = extractTwoColumnPdfLines(tokens, resolvedSplitX);
        if (rightLines.length) mainColumnLines.push(...rightLines);
        if (leftLines.length) sidebarLines.push(...leftLines);
      } else {
        const lines = groupPdfTokensIntoLines(tokens).filter((line) => !isLinkedInPageMarker(line));
        if (lines.length) {
          if (activeSplitX !== null) {
            mainColumnLines.push(...lines);
          } else {
            fallbackPageTexts.push(lines.join("\n"));
          }
        }
      }
    }

    const combined =
      activeSplitX !== null
        ? [...mainColumnLines, ...sidebarLines].join("\n").trim()
        : fallbackPageTexts.join("\n").trim();

    if (combined.replace(/\s+/g, "").length < 20) {
      throw new Error(
        "Berkas PDF ini tampak seperti hasil pindaian gambar sehingga teksnya tidak bisa diseleksi. Coba unggah versi DOCX/PDF teks atau salin teks CV kamu lalu tempel di kolom bawah."
      );
    }

    return {
      text: combined,
      fileType: "pdf",
      pageCount: pdf.numPages,
      detectedSource:
        activeSplitX !== null && looksLikeLinkedInPdfContent(combined)
          ? "linkedin_pdf"
          : undefined
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

const extractTextFromZip = async (file: File): Promise<ExtractedFileResult> => {
  if (typeof window === "undefined") {
    throw new Error("Ekstraksi arsip ZIP hanya dapat dijalankan di browser.");
  }
  if (file.size > MAX_ZIP_SIZE_BYTES) {
    throw new Error(
      "Ukuran arsip ZIP melebihi batas 25 MB. Kamu dapat mengekstrak berkas .csv intinya (Profile, Positions, Education, Skills) lalu mengunggahnya bersamaan."
    );
  }

  const { default: JSZip } = await import("jszip");
  const buffer = await file.arrayBuffer();
  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("Berkas ZIP tidak valid atau rusak sehingga tidak dapat dibaca.");
  }

  const csvFiles: Record<string, string> = {};
  const fallbackTexts: string[] = [];

  for (const [entryPath, entry] of Object.entries(zip.files)) {
    if (entry.dir || entryPath.startsWith("__MACOSX/")) continue;
    const baseName = entryPath.split("/").pop() || entryPath;
    const ext = getExtension(baseName);

    if (ext === "csv") {
      const content = await entry.async("string");
      if (content.trim() && (!csvFiles[baseName] || content.length > csvFiles[baseName].length)) {
        csvFiles[baseName] = content;
      }
    } else if (ext === "txt" || ext === "json") {
      const content = (await entry.async("string")).trim();
      if (content) fallbackTexts.push(content);
    }
  }

  const csvNames = Object.keys(csvFiles);
  if (csvNames.length > 0) {
    return {
      text: `[Arsip LinkedIn CSV: ${csvNames.join(", ")}]`,
      fileType: "zip",
      linkedInCsvFiles: csvFiles,
      detectedSource: "linkedin_archive"
    };
  }

  if (fallbackTexts.length > 0) {
    return {
      text: fallbackTexts.join("\n\n").trim(),
      fileType: "zip"
    };
  }

  throw new Error(
    "Arsip ZIP ini tidak berisi berkas CSV ekspor LinkedIn maupun berkas teks/JSON yang didukung."
  );
};

export const extractTextFromFile = async (file: File): Promise<ExtractedFileResult> => {
  const fileType = resolveFileType(file);

  if (fileType === "zip") {
    return extractTextFromZip(file);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Ukuran berkas melebihi batas 10 MB. Silakan gunakan berkas yang lebih ringkas.");
  }

  if (fileType === "pdf") return extractTextFromPdf(file);
  if (fileType === "docx") return extractTextFromDocx(file);

  const text = (await file.text()).trim();
  if (!text) {
    throw new Error("Berkas terlihat kosong. Pilih berkas lain atau tempel teks di kolom bawah.");
  }

  if (fileType === "csv") {
    return {
      text,
      fileType: "csv",
      linkedInCsvFiles: { [file.name]: text },
      detectedSource: "linkedin_archive"
    };
  }

  return { text, fileType };
};

/**
 * Extracts one LinkedIn export resource (`.zip`, `.pdf`, or one/more `.csv` files)
 * locally in the browser without uploading files to any server.
 */
export const extractLinkedInFiles = async (
  files: FileList | File[]
): Promise<ExtractedFileResult> => {
  const list = Array.from(files ?? []);
  if (list.length === 0) {
    throw new Error("Pilih minimal satu berkas terlebih dahulu.");
  }

  if (list.length === 1) {
    return extractTextFromFile(list[0]);
  }

  let totalBytes = 0;
  const csvFiles: Record<string, string> = {};

  for (const file of list) {
    totalBytes += file.size;
    if (totalBytes > MAX_ZIP_SIZE_BYTES) {
      throw new Error("Total ukuran berkas melebihi batas 25 MB.");
    }
    if (getExtension(file.name) !== "csv") {
      throw new Error(
        "Untuk mengunggah banyak berkas sekaligus, pilih kumpulan berkas .csv hasil ekspor LinkedIn (atau unggah 1 arsip .zip / 1 berkas .pdf)."
      );
    }
    const content = (await file.text()).trim();
    if (content) {
      csvFiles[file.name] = content;
    }
  }

  const names = Object.keys(csvFiles);
  if (names.length === 0) {
    throw new Error("Semua berkas CSV yang dipilih terlihat kosong.");
  }

  return {
    text: `[Berkas LinkedIn CSV: ${names.join(", ")}]`,
    fileType: "csv",
    linkedInCsvFiles: csvFiles,
    detectedSource: "linkedin_archive"
  };
};
