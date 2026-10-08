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
 * Teks polos ATS standar. Dipakai untuk tombol TXT dan sistem cadangan.
 */
export const buildPlainTextResume = (resume: ResumeProfile) => {
  const document = buildResumeDocument(resume);
  const blocks: string[] = [];

  const header = compact([document.name, document.headline, document.contact]);
  if (header.length) blocks.push(header.join("\n"));

  document.sections.forEach((section) => {
    const lines: string[] = [section.heading.toUpperCase()];
    lines.push(...section.paragraphs);

    section.entries.forEach((entry) => {
      if (entry.title && entry.meta) {
        lines.push(`${entry.title}    ${entry.meta}`);
      } else if (entry.title) {
        lines.push(entry.title);
      } else if (entry.meta) {
        lines.push(entry.meta);
      }

      entry.bullets.forEach((bullet) => lines.push(`  * ${bullet}`));
      if (entry.note) lines.push(`  ${entry.note}`);
    });

    blocks.push(lines.join("\n"));
  });

  return `${blocks.join("\n\n")}\n`;
};

/**
 * Pembuat dokumen PDF berstandar ATS (Sesuai Referensi Gambar).
 * - Header Rata Tengah (Nama besar tebal, Gelar/Headline tebal, Kontak).
 * - Garis horizontal hitam di setiap judul bagian.
 * - Tanggal rata kanan sejajar dengan judul posisi.
 */
export const buildPdfDocument = async (resume: ResumeProfile): Promise<ReactElement> => {
  const React = await import("react");
  const { Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const document = buildResumeDocument(resume);

  const el = (type: unknown, props: Record<string, unknown> | null, ...children: ReactNode[]) =>
    React.createElement(type as never, props as never, ...children);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 32,
      paddingBottom: 32,
      paddingLeft: 36,
      paddingRight: 36,
      fontSize: 9,
      fontFamily: DOC_STYLE.pdfFont,
      color: "#000000",
      lineHeight: 1.25
    },
    header: {
      textAlign: "center",
      marginBottom: 6
    },
    name: {
      fontSize: 18,
      fontWeight: 700,
      textAlign: "center",
      color: "#000000",
      marginBottom: 2
    },
    headline: {
      fontSize: 10,
      fontWeight: 700,
      textAlign: "center",
      color: "#000000",
      marginBottom: 2
    },
    contact: {
      fontSize: 9,
      textAlign: "center",
      color: "#222222",
      marginBottom: 2
    },
    section: {
      marginTop: 6
    },
    headingRow: {
      borderBottomWidth: 0.8,
      borderBottomColor: "#000000",
      paddingBottom: 1.5,
      marginBottom: 3
    },
    heading: {
      fontSize: 9.5,
      fontWeight: 700,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: "#000000"
    },
    entryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: 3,
      marginBottom: 1
    },
    entryTitle: {
      flex: 1,
      fontSize: 9,
      fontWeight: 700,
      color: "#000000"
    },
    entryMeta: {
      fontSize: 9,
      color: "#000000",
      textAlign: "right"
    },
    metaOnly: {
      fontSize: 8.5,
      color: "#222222",
      marginBottom: 1
    },
    paragraph: {
      fontSize: 9,
      lineHeight: 1.25,
      color: "#000000",
      marginBottom: 2
    },
    skillRow: {
      flexDirection: "row",
      fontSize: 9,
      lineHeight: 1.25,
      marginBottom: 1.5
    },
    skillLabel: {
      fontWeight: 700,
      color: "#000000"
    },
    skillContent: {
      flex: 1,
      color: "#000000"
    },
    bulletRow: {
      flexDirection: "row",
      marginBottom: 1.5,
      paddingLeft: 10
    },
    bulletDot: {
      width: 8,
      fontSize: 9,
      color: "#000000"
    },
    bulletText: {
      flex: 1,
      fontSize: 9,
      lineHeight: 1.25,
      color: "#000000"
    },
    note: {
      fontSize: 8.5,
      color: "#333333",
      marginTop: 1
    }
  });

  const children: ReactElement[] = [];

  // 1. Centered Header
  if (document.name || document.headline || document.contact) {
    const headerBlocks: ReactElement[] = [];
    if (document.name) headerBlocks.push(el(Text, { key: "name", style: styles.name }, document.name));
    if (document.headline) headerBlocks.push(el(Text, { key: "headline", style: styles.headline }, document.headline));
    if (document.contact) headerBlocks.push(el(Text, { key: "contact", style: styles.contact }, document.contact));
    children.push(el(View, { key: "header", style: styles.header }, ...headerBlocks));
  }

  // 2. Sections
  document.sections.forEach((section, sectionIndex) => {
    const blocks: ReactElement[] = [
      el(View, { key: "heading-row", style: styles.headingRow }, el(Text, { style: styles.heading }, section.heading))
    ];

    section.paragraphs.forEach((paragraph, index) => {
      const colonIndex = paragraph.indexOf(":");
      if (colonIndex > 0 && colonIndex < 35) {
        const label = paragraph.slice(0, colonIndex);
        const rest = paragraph.slice(colonIndex + 1);
        blocks.push(
          el(
            View,
            { key: `skill-${index}`, style: styles.skillRow },
            el(Text, { style: styles.skillLabel }, `${label}:`),
            el(Text, { style: styles.skillContent }, rest)
          )
        );
      } else {
        blocks.push(el(Text, { key: `paragraph-${index}`, style: styles.paragraph }, paragraph));
      }
    });

    section.entries.forEach((entry, entryIndex) => {
      if (entry.title && entry.meta) {
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
      keywords: "CV, ATS resume, curriculum vitae",
      creator: "QuickTailor CV"
    },
    el(Page, { size: "A4", style: styles.page }, ...children)
  );
};

/**
 * Pembuat dokumen Microsoft Word (DOCX) berstandar ATS (Sesuai Referensi Gambar).
 */
export const buildDocxDocument = async (resume: ResumeProfile) => {
  const { AlignmentType, BorderStyle, Document, HeadingLevel, Paragraph, Tab, TabStopType, TextRun } = await import("docx");
  const document = buildResumeDocument(resume);
  const margin = Math.round(0.5 * 1440); // 0.5 in
  const contentWidth = 11906 - margin * 2;
  const body: InstanceType<typeof Paragraph>[] = [];

  // 1. Centered Header
  if (document.name) {
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: document.name, bold: true, size: 36, font: "Arial" })
        ],
        spacing: { after: 40 }
      })
    );
  }

  if (document.headline) {
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: document.headline, bold: true, size: 21, font: "Arial" })
        ],
        spacing: { after: 30 }
      })
    );
  }

  if (document.contact) {
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: document.contact, size: 19, font: "Arial", color: "222222" })
        ],
        spacing: { after: 120 }
      })
    );
  }

  // 2. Sections
  document.sections.forEach((section) => {
    body.push(
      new Paragraph({
        text: section.heading.toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        border: { bottom: { color: "000000", space: 2, style: BorderStyle.SINGLE, size: 6 } },
        spacing: { before: 160, after: 60 }
      })
    );

    section.paragraphs.forEach((paragraph) => {
      const colonIndex = paragraph.indexOf(":");
      if (colonIndex > 0 && colonIndex < 35) {
        const label = paragraph.slice(0, colonIndex);
        const rest = paragraph.slice(colonIndex + 1);
        body.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${label}:`, bold: true, size: 19, font: "Arial" }),
              new TextRun({ text: rest, size: 19, font: "Arial" })
            ],
            spacing: { after: 40 }
          })
        );
      } else {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: paragraph, size: 19, font: "Arial" })],
            spacing: { after: 60 }
          })
        );
      }
    });

    section.entries.forEach((entry) => {
      if (entry.title && entry.meta) {
        body.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
            children: [
              new TextRun({ text: entry.title, bold: true, size: 20, font: "Arial" }),
              new Tab(),
              new TextRun({ text: entry.meta, size: 19, font: "Arial", color: "000000" })
            ],
            spacing: { before: 80, after: 20 }
          })
        );
      } else if (entry.title) {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: entry.title, bold: true, size: 20, font: "Arial" })],
            spacing: { before: 80, after: 20 }
          })
        );
      } else if (entry.meta) {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: entry.meta, size: 19, font: "Arial", color: "222222" })],
            spacing: { after: 20 }
          })
        );
      }

      entry.bullets.forEach((bullet) => {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: bullet, size: 19, font: "Arial" })],
            bullet: { level: 0 },
            spacing: { after: 20 }
          })
        );
      });

      if (entry.note) {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: entry.note, size: 18, font: "Arial" })],
            spacing: { after: 20 }
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
        document: { run: { font: "Arial", size: 19, color: "000000" } },
        heading1: {
          run: {
            font: "Arial",
            size: 21,
            bold: true,
            color: "000000",
            allCaps: true,
            characterSpacing: 10
          },
          paragraph: { spacing: { before: 180, after: 40 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
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
