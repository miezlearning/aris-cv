import type { ReactElement, ReactNode } from "react";
import type { CvTemplate, ResumeProfile } from "@/types/resume";
import { buildAtsFileName } from "@/lib/ats/hygiene";
import { DOC_STYLE, buildResumeDocument, type ResumeBuildOptions } from "@/lib/resume-document";
import { compact } from "@/lib/text";

export type ExportFileOptions = ResumeBuildOptions & {
  targetJobTitle?: string;
};

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

type PdfMetrics = {
  padV: number;
  padH: number;
  fontFamily: string;
  bodySize: number;
  lineHeight: number;
  nameSize: number;
  headlineSize: number;
  contactSize: number;
  headingSize: number;
  entrySize: number;
  metaSize: number;
  noteSize: number;
  sectionTop: number;
  headingBottom: number;
  entryTop: number;
  bulletBottom: number;
  alignHeader: "center" | "left";
  headerDivider: boolean;
  twoTierEntry: boolean;
};

const PDF_TEMPLATE_METRICS: Record<CvTemplate, PdfMetrics> = {
  compact_centered: {
    padV: 28,
    padH: 34,
    fontFamily: DOC_STYLE.pdfFont,
    bodySize: 8.5,
    lineHeight: 1.24,
    nameSize: 16.5,
    headlineSize: 9.2,
    contactSize: 8.3,
    headingSize: 9.2,
    entrySize: 8.7,
    metaSize: 8.3,
    noteSize: 8.2,
    sectionTop: 5,
    headingBottom: 2.5,
    entryTop: 2.5,
    bulletBottom: 1.2,
    alignHeader: "center",
    headerDivider: false,
    twoTierEntry: false
  },
  classic_editorial: {
    padV: 38,
    padH: 42,
    fontFamily: DOC_STYLE.pdfFont,
    bodySize: 9.5,
    lineHeight: 1.32,
    nameSize: 18,
    headlineSize: 10,
    contactSize: 9,
    headingSize: 10,
    entrySize: 9.5,
    metaSize: 9,
    noteSize: 9,
    sectionTop: 7,
    headingBottom: 4,
    entryTop: 4,
    bulletBottom: 2,
    alignHeader: "center",
    headerDivider: false,
    twoTierEntry: false
  },
  executive_left: {
    padV: 42,
    padH: 46,
    fontFamily: DOC_STYLE.pdfSerifFont,
    bodySize: 9.5,
    lineHeight: 1.34,
    nameSize: 19,
    headlineSize: 10,
    contactSize: 9,
    headingSize: 10,
    entrySize: 9.5,
    metaSize: 9,
    noteSize: 9,
    sectionTop: 8,
    headingBottom: 4,
    entryTop: 4.5,
    bulletBottom: 2.2,
    alignHeader: "left",
    headerDivider: true,
    twoTierEntry: true
  }
};

/**
 * Teks polos ATS standar. Dipakai untuk tombol TXT dan pengecekan parsing linear.
 */
export const buildPlainTextResume = (
  resume: ResumeProfile,
  lang: "id" | "en" = "id",
  options?: ResumeBuildOptions
) => {
  const document = buildResumeDocument(resume, lang, options);
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

      const entryNotes = entry.notes?.length ? entry.notes : entry.note ? [entry.note] : [];
      entryNotes.forEach((n) => lines.push(`  ${n}`));
      entry.bullets.forEach((bullet) => lines.push(`  * ${bullet}`));
    });

    blocks.push(lines.join("\n"));
  });

  return `${blocks.join("\n\n")}\n`;
};

/**
 * Pembuat dokumen PDF berstandar ATS (100% linear satu kolom, teks murni bisa diseleksi, tanpa tabel/ikon).
 */
export const buildPdfDocument = async (
  resume: ResumeProfile,
  lang: "id" | "en" = "id",
  options?: ResumeBuildOptions
): Promise<ReactElement> => {
  const React = await import("react");
  const { Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const document = buildResumeDocument(resume, lang, options);
  const m = PDF_TEMPLATE_METRICS[document.template];

  const el = (type: unknown, props: Record<string, unknown> | null, ...children: ReactNode[]) =>
    React.createElement(type as never, props as never, ...children);

  const styles = StyleSheet.create({
    page: {
      paddingTop: m.padV,
      paddingBottom: m.padV,
      paddingLeft: m.padH,
      paddingRight: m.padH,
      fontSize: m.bodySize,
      fontFamily: m.fontFamily,
      color: "#000000",
      lineHeight: m.lineHeight
    },
    header: {
      textAlign: m.alignHeader,
      marginBottom: m.headerDivider ? 8 : m.padV <= 30 ? 5 : 8,
      ...(m.headerDivider
        ? {
            borderBottomWidth: 1.1,
            borderBottomColor: "#000000",
            paddingBottom: 6
          }
        : {})
    },
    name: {
      fontSize: m.nameSize,
      lineHeight: 1.22,
      fontWeight: 700,
      textAlign: m.alignHeader,
      color: "#000000",
      marginBottom: m.padV <= 30 ? 3 : 4
    },
    headline: {
      fontSize: m.headlineSize,
      lineHeight: 1.28,
      fontWeight: 700,
      textAlign: m.alignHeader,
      color: "#000000",
      marginBottom: m.padV <= 30 ? 2.5 : 3.5
    },
    contact: {
      fontSize: m.contactSize,
      lineHeight: 1.3,
      textAlign: m.alignHeader,
      color: "#222222",
      marginBottom: 1.5
    },
    section: {
      marginTop: m.sectionTop
    },
    headingRow: {
      borderBottomWidth: 0.8,
      borderBottomColor: "#000000",
      paddingBottom: 2,
      marginBottom: m.headingBottom
    },
    heading: {
      fontSize: m.headingSize,
      lineHeight: 1.25,
      fontWeight: 700,
      letterSpacing: 0.35,
      textTransform: "uppercase",
      color: "#000000"
    },
    entryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: m.entryTop,
      marginBottom: 1.5
    },
    entryTitle: {
      fontSize: m.entrySize,
      lineHeight: m.lineHeight,
      color: "#000000",
      marginTop: m.entryTop,
      marginBottom: 1.5
    },
    entryTitleInRow: {
      flex: 1,
      fontSize: m.entrySize,
      lineHeight: m.lineHeight,
      color: "#000000",
      paddingRight: 8
    },
    entryTitleBold: {
      fontWeight: 700,
      color: "#000000"
    },
    entryTitleRegular: {
      fontWeight: 400,
      color: "#000000"
    },
    entrySecondaryLine: {
      fontSize: m.noteSize,
      lineHeight: m.lineHeight,
      fontStyle: "italic",
      color: "#222222",
      marginBottom: 1.5
    },
    entryMeta: {
      fontSize: m.metaSize,
      lineHeight: m.lineHeight,
      color: "#000000",
      textAlign: "right"
    },
    metaOnly: {
      fontSize: m.metaSize,
      lineHeight: m.lineHeight,
      color: "#222222",
      marginBottom: 1.5
    },
    paragraph: {
      fontSize: m.bodySize,
      lineHeight: m.lineHeight,
      color: "#000000",
      marginBottom: m.padV <= 30 ? 1.5 : 2.5
    },
    boldLabel: {
      fontWeight: 700,
      color: "#000000"
    },
    bulletRow: {
      flexDirection: "row",
      marginBottom: m.bulletBottom,
      paddingLeft: m.padV <= 30 ? 8 : 10
    },
    bulletDot: {
      width: 8,
      fontSize: m.bodySize,
      lineHeight: m.lineHeight,
      color: "#000000"
    },
    bulletText: {
      flex: 1,
      fontSize: m.bodySize,
      lineHeight: m.lineHeight,
      color: "#000000"
    },
    note: {
      fontSize: m.noteSize,
      lineHeight: m.lineHeight,
      color: "#222222",
      marginBottom: 1.5
    }
  });

  const children: ReactElement[] = [];

  if (document.name || document.headline || document.contact) {
    const headerBlocks: ReactElement[] = [];
    if (document.name) headerBlocks.push(el(Text, { key: "name", style: styles.name }, document.name));
    if (document.headline) headerBlocks.push(el(Text, { key: "headline", style: styles.headline }, document.headline));
    if (document.contact) headerBlocks.push(el(Text, { key: "contact", style: styles.contact }, document.contact));
    children.push(el(View, { key: "header", style: styles.header }, ...headerBlocks));
  }

  document.sections.forEach((section, sectionIndex) => {
    const blocks: ReactElement[] = [
      el(View, { key: "heading-row", style: styles.headingRow }, el(Text, { style: styles.heading }, section.heading))
    ];

    section.paragraphs.forEach((paragraph, index) => {
      const colonIndex = paragraph.indexOf(":");
      if (colonIndex > 0 && colonIndex < 38) {
        const label = paragraph.slice(0, colonIndex);
        const rest = paragraph.slice(colonIndex + 1);
        blocks.push(
          el(
            Text,
            { key: `paragraph-${index}`, style: styles.paragraph },
            el(Text, { style: styles.boldLabel }, `${label}:`),
            rest
          )
        );
      } else {
        blocks.push(el(Text, { key: `paragraph-${index}`, style: styles.paragraph }, paragraph));
      }
    });

    section.entries.forEach((entry, entryIndex) => {
      if (m.twoTierEntry) {
        const primaryLabel = entry.titlePrimary || entry.title;
        if (primaryLabel && entry.meta) {
          blocks.push(
            el(
              View,
              { key: `entry-${entryIndex}`, style: styles.entryRow },
              el(Text, { style: [styles.entryTitleInRow, styles.entryTitleBold] }, primaryLabel),
              el(Text, { style: styles.entryMeta }, entry.meta)
            )
          );
        } else if (primaryLabel) {
          blocks.push(
            el(Text, { key: `entry-${entryIndex}`, style: [styles.entryTitle, styles.entryTitleBold] }, primaryLabel)
          );
        } else if (entry.meta) {
          blocks.push(el(Text, { key: `entry-${entryIndex}`, style: styles.metaOnly }, entry.meta));
        }

        if (entry.titleSecondary) {
          blocks.push(
            el(Text, { key: `entry-sec-${entryIndex}`, style: styles.entrySecondaryLine }, entry.titleSecondary)
          );
        }
      } else {
        const titleChildren: ReactNode[] = entry.titlePrimary
          ? [
              el(Text, { key: "tp", style: styles.entryTitleBold }, entry.titlePrimary),
              ...(entry.titleSecondary
                ? [el(Text, { key: "ts", style: styles.entryTitleRegular }, ` | ${entry.titleSecondary}`)]
                : [])
            ]
          : [entry.title];

        if (entry.title && entry.meta) {
          blocks.push(
            el(
              View,
              { key: `entry-${entryIndex}`, style: styles.entryRow },
              el(Text, { style: styles.entryTitleInRow }, ...titleChildren),
              el(Text, { style: styles.entryMeta }, entry.meta)
            )
          );
        } else if (entry.title) {
          blocks.push(el(Text, { key: `entry-${entryIndex}`, style: styles.entryTitle }, ...titleChildren));
        } else if (entry.meta) {
          blocks.push(el(Text, { key: `entry-${entryIndex}`, style: styles.metaOnly }, entry.meta));
        }
      }

      const entryNotes = entry.notes?.length ? entry.notes : entry.note ? [entry.note] : [];
      entryNotes.forEach((noteLine, noteIndex) => {
        const colonIdx = noteLine.indexOf(":");
        if (colonIdx > 0 && colonIdx < 28) {
          const label = noteLine.slice(0, colonIdx);
          const rest = noteLine.slice(colonIdx + 1);
          blocks.push(
            el(
              Text,
              { key: `note-${entryIndex}-${noteIndex}`, style: styles.note },
              el(Text, { style: styles.boldLabel }, `${label}:`),
              rest
            )
          );
        } else {
          blocks.push(el(Text, { key: `note-${entryIndex}-${noteIndex}`, style: styles.note }, noteLine));
        }
      });

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
 * Pembuat dokumen Microsoft Word (DOCX) berstandar ATS (Heading semantik, tanpa tabel, 1 kolom linear).
 */
export const buildDocxDocument = async (
  resume: ResumeProfile,
  lang: "id" | "en" = "id",
  options?: ResumeBuildOptions
) => {
  const { AlignmentType, BorderStyle, Document, HeadingLevel, Paragraph, Tab, TabStopType, TextRun } = await import(
    "docx"
  );
  const document = buildResumeDocument(resume, lang, options);
  const template = document.template;
  const isCompact = template === "compact_centered";
  const isExecutive = template === "executive_left";

  const margin = Math.round((isCompact ? 0.44 : isExecutive ? 0.62 : 0.58) * 1440);
  const contentWidth = 11906 - margin * 2;
  const font = isExecutive ? DOC_STYLE.docxSerifFont : DOC_STYLE.docxFont;
  const alignment = isExecutive ? AlignmentType.LEFT : AlignmentType.CENTER;

  const nameSz = isCompact ? 34 : isExecutive ? 38 : 36;
  const headlineSz = isCompact ? 18 : 21;
  const contactSz = isCompact ? 17 : 19;
  const headingSz = isCompact ? 18 : 20;
  const entrySz = isCompact ? 18 : 20;
  const bodySz = isCompact ? 17 : 19;
  const noteSz = isCompact ? 17 : 18;

  const body: InstanceType<typeof Paragraph>[] = [];

  if (document.name) {
    body.push(
      new Paragraph({
        alignment,
        children: [new TextRun({ text: document.name, bold: true, size: nameSz, font })],
        spacing: { after: isCompact ? 25 : 40 }
      })
    );
  }

  if (document.headline) {
    body.push(
      new Paragraph({
        alignment,
        children: [new TextRun({ text: document.headline, bold: true, size: headlineSz, font })],
        spacing: { after: isCompact ? 25 : 35 }
      })
    );
  }

  if (document.contact) {
    body.push(
      new Paragraph({
        alignment,
        children: [new TextRun({ text: document.contact, size: contactSz, font, color: "222222" })],
        ...(isExecutive
          ? { border: { bottom: { color: "000000", space: 4, style: BorderStyle.SINGLE, size: 10 } } }
          : {}),
        spacing: { after: isCompact ? 80 : 140 }
      })
    );
  }

  document.sections.forEach((section) => {
    body.push(
      new Paragraph({
        text: section.heading.toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        border: { bottom: { color: "000000", space: 2, style: BorderStyle.SINGLE, size: 6 } },
        spacing: { before: isCompact ? 110 : 160, after: isCompact ? 45 : 70 }
      })
    );

    section.paragraphs.forEach((paragraph) => {
      const colonIndex = paragraph.indexOf(":");
      if (colonIndex > 0 && colonIndex < 38) {
        const label = paragraph.slice(0, colonIndex);
        const rest = paragraph.slice(colonIndex + 1);
        body.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${label}:`, bold: true, size: bodySz, font }),
              new TextRun({ text: rest, size: bodySz, font })
            ],
            spacing: { after: isCompact ? 30 : 45 }
          })
        );
      } else {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: paragraph, size: bodySz, font })],
            spacing: { after: isCompact ? 40 : 65 }
          })
        );
      }
    });

    section.entries.forEach((entry) => {
      const primaryLabel = entry.titlePrimary || entry.title;
      if (isExecutive) {
        if (primaryLabel && entry.meta) {
          body.push(
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
              children: [
                new TextRun({ text: primaryLabel, bold: true, size: entrySz, font }),
                new Tab(),
                new TextRun({ text: entry.meta, size: contactSz, font, color: "000000" })
              ],
              spacing: { before: 95, after: 15 }
            })
          );
        } else if (primaryLabel) {
          body.push(
            new Paragraph({
              children: [new TextRun({ text: primaryLabel, bold: true, size: entrySz, font })],
              spacing: { before: 95, after: 15 }
            })
          );
        } else if (entry.meta) {
          body.push(
            new Paragraph({
              children: [new TextRun({ text: entry.meta, size: contactSz, font, color: "222222" })],
              spacing: { after: 20 }
            })
          );
        }

        if (entry.titleSecondary) {
          body.push(
            new Paragraph({
              children: [new TextRun({ text: entry.titleSecondary, italics: true, size: noteSz, font, color: "222222" })],
              spacing: { after: 25 }
            })
          );
        }
      } else {
        const titleRuns = entry.titlePrimary
          ? [
              new TextRun({ text: entry.titlePrimary, bold: true, size: entrySz, font }),
              ...(entry.titleSecondary
                ? [new TextRun({ text: ` | ${entry.titleSecondary}`, size: entrySz, font })]
                : [])
            ]
          : [new TextRun({ text: entry.title, bold: true, size: entrySz, font })];

        if (entry.title && entry.meta) {
          body.push(
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
              children: [
                ...titleRuns,
                new Tab(),
                new TextRun({ text: entry.meta, size: contactSz, font, color: "000000" })
              ],
              spacing: { before: isCompact ? 55 : 90, after: isCompact ? 15 : 25 }
            })
          );
        } else if (entry.title) {
          body.push(
            new Paragraph({
              children: titleRuns,
              spacing: { before: isCompact ? 55 : 90, after: isCompact ? 15 : 25 }
            })
          );
        } else if (entry.meta) {
          body.push(
            new Paragraph({
              children: [new TextRun({ text: entry.meta, size: contactSz, font, color: "222222" })],
              spacing: { after: isCompact ? 15 : 25 }
            })
          );
        }
      }

      const entryNotes = entry.notes?.length ? entry.notes : entry.note ? [entry.note] : [];
      entryNotes.forEach((noteLine) => {
        const colonIdx = noteLine.indexOf(":");
        if (colonIdx > 0 && colonIdx < 28) {
          const label = noteLine.slice(0, colonIdx);
          const rest = noteLine.slice(colonIdx + 1);
          body.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${label}:`, bold: true, size: noteSz, font, color: "222222" }),
                new TextRun({ text: rest, size: noteSz, font, color: "222222" })
              ],
              spacing: { after: isCompact ? 15 : 20 }
            })
          );
        } else {
          body.push(
            new Paragraph({
              children: [new TextRun({ text: noteLine, size: noteSz, font, color: "222222" })],
              spacing: { after: isCompact ? 15 : 20 }
            })
          );
        }
      });

      entry.bullets.forEach((bullet) => {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: bullet, size: bodySz, font })],
            bullet: { level: 0 },
            spacing: { after: isCompact ? 15 : 25 }
          })
        );
      });
    });
  });

  return new Document({
    creator: document.name || "QuickTailor CV",
    title: document.name ? `CV ${document.name}` : "CV",
    description: "Curriculum Vitae",
    styles: {
      default: {
        document: { run: { font, size: bodySz, color: "000000" } },
        heading1: {
          run: {
            font,
            size: headingSz,
            bold: true,
            color: "000000",
            allCaps: true,
            characterSpacing: 6
          },
          paragraph: { spacing: { before: isCompact ? 110 : 180, after: isCompact ? 30 : 45 } }
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

export const exportPdf = async (
  resume: ResumeProfile,
  lang: "id" | "en" = "id",
  options?: ExportFileOptions
) => {
  const { pdf } = await import("@react-pdf/renderer");
  const document = await buildPdfDocument(resume, lang, options);
  const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
  downloadBlob(blob, `${buildAtsFileName(resume, lang, options?.targetJobTitle)}.pdf`);
};

export const exportDocx = async (
  resume: ResumeProfile,
  lang: "id" | "en" = "id",
  options?: ExportFileOptions
) => {
  const { Packer } = await import("docx");
  const document = await buildDocxDocument(resume, lang, options);
  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${buildAtsFileName(resume, lang, options?.targetJobTitle)}.docx`);
};

export const exportTextFallback = (
  resume: ResumeProfile,
  lang: "id" | "en" = "id",
  options?: ExportFileOptions
) => {
  const blob = new Blob([buildPlainTextResume(resume, lang, options)], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${buildAtsFileName(resume, lang, options?.targetJobTitle)}.txt`);
};
