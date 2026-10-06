import type { ReactElement, ReactNode } from "react";
import type { ResumeProfile } from "@/types/resume";
import { DOC_STYLE, buildResumeDocument } from "@/lib/resume-document";
import { compact } from "@/lib/text";

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const safeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "quicktailor-cv";

/**
 * Teks polos. Dipakai tombol TXT dan sebagai cadangan kalau PDF atau DOCX gagal dibuat.
 * Isinya berasal dari model dokumen yang sama dengan pratinjau, jadi tidak mungkin beda.
 */
export const buildPlainTextResume = (resume: ResumeProfile) => {
  const document = buildResumeDocument(resume);
  const blocks: string[] = [];

  const header = compact([document.name, document.contact]);
  if (header.length) blocks.push(header.join("\n"));

  document.sections.forEach((section) => {
    // Judul bagian huruf besar adalah bentuk paling aman untuk berkas teks polos.
    const lines: string[] = [section.heading.toUpperCase()];
    lines.push(...section.paragraphs);

    section.entries.forEach((entry) => {
      if (entry.title) lines.push(entry.title);
      if (entry.meta) lines.push(entry.meta);
      // Tanda hubung, bukan bullet Unicode: aman di semua pengurai teks.
      entry.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
      if (entry.note) lines.push(entry.note);
    });

    blocks.push(lines.join("\n"));
  });

  return `${blocks.join("\n\n")}\n`;
};

/** Pohon elemen PDF. Dipisah dari proses unduh supaya bisa diperiksa terpisah. */
export const buildPdfDocument = async (resume: ResumeProfile): Promise<ReactElement> => {
  const React = await import("react");
  const { Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const document = buildResumeDocument(resume);

  const el = (type: unknown, props: Record<string, unknown> | null, ...children: ReactNode[]) =>
    React.createElement(type as never, props as never, ...children);

  const styles = StyleSheet.create({
    page: {
      padding: DOC_STYLE.marginIn * 72,
      fontSize: DOC_STYLE.bodySizePt,
      fontFamily: DOC_STYLE.pdfFont,
      color: DOC_STYLE.ink,
      lineHeight: 1.3
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: DOC_STYLE.ruleStrong,
      paddingBottom: 8,
      marginBottom: 4
    },
    name: { fontSize: DOC_STYLE.nameSizePt, fontWeight: 700, letterSpacing: 0.6, marginBottom: 3 },
    contact: { fontSize: DOC_STYLE.metaSizePt, color: DOC_STYLE.metaInk },
    section: { marginTop: 14 },
    headingRow: {
      borderBottomWidth: 0.8,
      borderBottomColor: DOC_STYLE.ruleSoft,
      paddingBottom: 3,
      marginBottom: 6
    },
    heading: { fontSize: DOC_STYLE.headingSizePt, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" },
    entryRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
    entryTitle: { flex: 1, fontSize: DOC_STYLE.titleSizePt, fontWeight: 700 },
    entryMeta: { fontSize: DOC_STYLE.metaSizePt, color: DOC_STYLE.metaInk, marginLeft: 10 },
    metaOnly: { fontSize: DOC_STYLE.metaSizePt, color: DOC_STYLE.metaInk, marginBottom: 2 },
    paragraph: { marginBottom: 2 },
    bulletRow: { flexDirection: "row", marginBottom: 2 },
    bulletDot: { width: 12 },
    bulletText: { flex: 1 },
    note: { fontSize: DOC_STYLE.bodySizePt, marginTop: 2 }
  });

  const children: ReactElement[] = [];

  if (document.name || document.contact) {
    const headerBlocks: ReactElement[] = [];
    if (document.name) headerBlocks.push(el(Text, { key: "name", style: styles.name }, document.name));
    if (document.contact) headerBlocks.push(el(Text, { key: "contact", style: styles.contact }, document.contact));
    children.push(el(View, { key: "header", style: styles.header }, ...headerBlocks));
  }

  document.sections.forEach((section, sectionIndex) => {
    const blocks: ReactElement[] = [
      el(View, { key: "heading-row", style: styles.headingRow }, el(Text, { style: styles.heading }, section.heading))
    ];

    section.paragraphs.forEach((paragraph, index) => {
      blocks.push(el(Text, { key: `paragraph-${index}`, style: styles.paragraph }, paragraph));
    });

    section.entries.forEach((entry, entryIndex) => {
      if (entry.title && entry.meta) {
        // Judul di kiri dan tanggal di kanan pada satu baris. Keduanya masih teks
        // biasa dalam satu kolom, jadi pengurai tetap membacanya berurutan.
        blocks.push(
          el(
            View,
            { key: `entry-${entryIndex}`, style: styles.entryRow },
            el(Text, { style: styles.entryTitle }, entry.title),
            el(Text, { style: styles.entryMeta }, entry.meta)
          )
        );
      } else if (entry.title) {
        blocks.push(el(Text, { key: `entry-${entryIndex}`, style: styles.entryTitle }, entry.title));
      } else if (entry.meta) {
        blocks.push(el(Text, { key: `entry-${entryIndex}`, style: styles.metaOnly }, entry.meta));
      }

      entry.bullets.forEach((bullet, bulletIndex) => {
        blocks.push(
          el(
            View,
            { key: `bullet-${entryIndex}-${bulletIndex}`, style: styles.bulletRow },
            el(Text, { style: styles.bulletDot }, "•"),
            el(Text, { style: styles.bulletText }, bullet)
          )
        );
      });

      if (entry.note) blocks.push(el(Text, { key: `note-${entryIndex}`, style: styles.note }, entry.note));
    });

    children.push(el(View, { key: `section-${sectionIndex}`, style: styles.section }, ...blocks));
  });

  return el(
    Document,
    {
      title: document.name ? `CV ${document.name}` : "CV",
      author: document.name,
      subject: "Curriculum Vitae",
      keywords: "CV, resume, curriculum vitae",
      creator: "QuickTailor CV"
    },
    el(Page, { size: "A4", style: styles.page }, ...children)
  );
};

/** Dokumen Word. Dipisah dari proses unduh supaya bisa diperiksa terpisah. */
export const buildDocxDocument = async (resume: ResumeProfile) => {
  const { BorderStyle, Document, HeadingLevel, Paragraph, Tab, TabStopType, TextRun } = await import("docx");
  const document = buildResumeDocument(resume);
  const margin = Math.round(DOC_STYLE.marginIn * 1440);
  // Lebar area teks A4 setelah margin, dipakai sebagai posisi tab rata kanan.
  const contentWidth = 11906 - margin * 2;
  // Warna di DOCX ditulis tanpa tanda pagar.
  const ink = (value: string) => value.replace("#", "");
  const body: InstanceType<typeof Paragraph>[] = [];

  if (document.name) {
    body.push(
      new Paragraph({
        children: [
          new TextRun({ text: document.name, bold: true, size: DOC_STYLE.nameSizePt * 2, characterSpacing: 20 })
        ],
        spacing: { after: 20 }
      })
    );
  }

  if (document.contact) {
    // Garis pemisah dipasang sebagai batas bawah paragraf, jadi tidak ada tabel
    // atau kotak teks yang bisa mengacaukan pembacaan ATS.
    body.push(
      new Paragraph({
        children: [new TextRun({ text: document.contact, size: DOC_STYLE.metaSizePt * 2, color: ink(DOC_STYLE.metaInk) })],
        spacing: { after: 240 },
        border: { bottom: { color: ink(DOC_STYLE.ruleStrong), space: 6, style: BorderStyle.SINGLE, size: 8 } }
      })
    );
  }

  document.sections.forEach((section) => {
    // Judul bagian memakai gaya Heading 1 yang asli supaya pengurai mengenali
    // strukturnya, tetapi warnanya ditimpa jadi hitam lewat definisi gaya di bawah.
    body.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
        border: { bottom: { color: ink(DOC_STYLE.ruleSoft), space: 3, style: BorderStyle.SINGLE, size: 6 } }
      })
    );

    section.paragraphs.forEach((paragraph) => {
      body.push(
        new Paragraph({
          children: [new TextRun({ text: paragraph, size: DOC_STYLE.bodySizePt * 2 })],
          spacing: { after: 80 }
        })
      );
    });

    section.entries.forEach((entry) => {
      if (entry.title && entry.meta) {
        // Tab rata kanan menaruh tanggal di ujung baris yang sama. Ini masih teks
        // satu kolom, bukan tabel, dan cara ini dipakai hampir semua CV profesional.
        body.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
            children: [
              new TextRun({ text: entry.title, bold: true, size: DOC_STYLE.titleSizePt * 2 }),
              new Tab(),
              new TextRun({ text: entry.meta, size: DOC_STYLE.metaSizePt * 2, color: ink(DOC_STYLE.metaInk) })
            ],
            spacing: { before: 160, after: 20 }
          })
        );
      } else if (entry.title) {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: entry.title, bold: true, size: DOC_STYLE.titleSizePt * 2 })],
            spacing: { before: 160, after: 20 }
          })
        );
      } else if (entry.meta) {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: entry.meta, size: DOC_STYLE.metaSizePt * 2, color: ink(DOC_STYLE.metaInk) })],
            spacing: { after: 40 }
          })
        );
      }

      entry.bullets.forEach((bullet) => {
        // Daftar berbutir asli milik Word, bukan karakter tempelan. Pengurai
        // mengenalinya sebagai butir daftar yang terstruktur.
        body.push(
          new Paragraph({
            children: [new TextRun({ text: bullet, size: DOC_STYLE.bodySizePt * 2 })],
            bullet: { level: 0 }
          })
        );
      });

      if (entry.note) {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: entry.note, size: DOC_STYLE.bodySizePt * 2 })],
            spacing: { after: 40 }
          })
        );
      }
    });
  });

  return new Document({
    creator: document.name || "QuickTailor CV",
    title: document.name ? `CV ${document.name}` : "CV",
    description: "Curriculum Vitae",
    styles: {
      default: {
        document: { run: { font: DOC_STYLE.docxFont, size: DOC_STYLE.bodySizePt * 2, color: ink(DOC_STYLE.ink) } },
        heading1: {
          run: {
            font: DOC_STYLE.docxFont,
            size: DOC_STYLE.headingSizePt * 2,
            bold: true,
            color: ink(DOC_STYLE.ink),
            allCaps: true,
            characterSpacing: 20
          },
          paragraph: { spacing: { before: 280, after: 60 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            // A4 dalam twips, bukan Letter bawaan Word, karena pelamar Indonesia
            // memakai A4 dan ukuran kertas ikut memengaruhi tata letak saat dicetak.
            size: { width: 11906, height: 16838 },
            margin: { top: margin, right: margin, bottom: margin, left: margin }
          }
        },
        children: body
      }
    ]
  });
};

export const exportPdf = async (resume: ResumeProfile) => {
  const { pdf } = await import("@react-pdf/renderer");
  const document = await buildPdfDocument(resume);
  // Pohon elemen dibangun secara dinamis, jadi tipenya lebih umum daripada tipe
  // Document yang diminta react-pdf.
  const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
  downloadBlob(blob, `${safeFileName(resume.contact.fullName)}.pdf`);
};

export const exportDocx = async (resume: ResumeProfile) => {
  const { Packer } = await import("docx");
  const document = await buildDocxDocument(resume);
  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${safeFileName(resume.contact.fullName)}.docx`);
};

export const exportTextFallback = (resume: ResumeProfile) => {
  const blob = new Blob([buildPlainTextResume(resume)], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${safeFileName(resume.contact.fullName)}.txt`);
};
