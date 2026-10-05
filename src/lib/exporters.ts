import type { ExportMode, ResumeProfile } from "@/types/resume";
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

export const buildPlainTextResume = (resume: ResumeProfile, mode: ExportMode) => {
  const watermark = mode === "preview" ? ["PRATINJAU QUICKTAILOR CV"] : [];
  const contact = compact([
    resume.contact.fullName,
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedinUrl,
    resume.contact.portfolioUrl
  ]);
  const lines = [
    ...watermark,
    ...contact,
    "",
    "SUMMARY",
    resume.summary,
    "",
    "EXPERIENCE",
    ...resume.workExperience.flatMap((item) => [
      compact([item.role, item.company]).join(", "),
      compact([item.startDate, item.endDate]).join(" - "),
      ...item.bulletPoints.filter(Boolean).map((bullet) => `- ${bullet}`),
      ""
    ]),
    "EDUCATION",
    ...resume.education.flatMap((item) => [
      compact([item.degree, item.fieldOfStudy]).join(", "),
      compact([item.institution, item.graduationDate]).join(", "),
      item.gpa ? `GPA/IPK: ${item.gpa}` : "",
      ""
    ]),
    "SKILLS",
    compact([
      resume.skills.hardSkills.length ? `Hard Skills: ${resume.skills.hardSkills.join(", ")}` : "",
      resume.skills.tools.length ? `Tools: ${resume.skills.tools.join(", ")}` : "",
      resume.skills.softSkills.length ? `Soft Skills: ${resume.skills.softSkills.join(", ")}` : ""
    ]).join("\n")
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
};

export const exportPdf = async (resume: ResumeProfile, mode: ExportMode) => {
  const React = await import("react");
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const styles = StyleSheet.create({
    page: { padding: 54, fontSize: 10, fontFamily: "Helvetica", color: "#101513", lineHeight: 1.35 },
    name: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
    contact: { fontSize: 9, marginBottom: 12 },
    section: { marginTop: 12 },
    heading: { fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: "uppercase" },
    itemTitle: { fontSize: 10, fontWeight: 700 },
    muted: { fontSize: 9, color: "#4b5563", marginBottom: 3 },
    bullet: { marginBottom: 3 },
    watermark: { fontSize: 10, color: "#b42318", marginBottom: 10 }
  });

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      mode === "preview" ? React.createElement(Text, { style: styles.watermark }, "PRATINJAU QUICKTAILOR CV") : null,
      React.createElement(Text, { style: styles.name }, resume.contact.fullName || "Nama lengkap"),
      React.createElement(
        Text,
        { style: styles.contact },
        compact([
          resume.contact.email,
          resume.contact.phone,
          resume.contact.location,
          resume.contact.linkedinUrl,
          resume.contact.portfolioUrl
        ]).join(" | ")
      ),
      React.createElement(View, { style: styles.section }, React.createElement(Text, { style: styles.heading }, "Summary"), React.createElement(Text, null, resume.summary)),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.heading }, "Experience"),
        ...resume.workExperience.flatMap((item) => [
          React.createElement(Text, { key: `${item.id}-title`, style: styles.itemTitle }, compact([item.role, item.company]).join(", ")),
          React.createElement(Text, { key: `${item.id}-date`, style: styles.muted }, compact([item.startDate, item.endDate]).join(" - ")),
          ...item.bulletPoints.filter(Boolean).map((bullet, index) => React.createElement(Text, { key: `${item.id}-${index}`, style: styles.bullet }, `- ${bullet}`))
        ])
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.heading }, "Education"),
        ...resume.education.flatMap((item) => [
          React.createElement(Text, { key: `${item.id}-degree`, style: styles.itemTitle }, compact([item.degree, item.fieldOfStudy]).join(", ")),
          React.createElement(Text, { key: `${item.id}-school`, style: styles.muted }, compact([item.institution, item.graduationDate]).join(", ")),
          item.gpa ? React.createElement(Text, { key: `${item.id}-gpa` }, `GPA/IPK: ${item.gpa}`) : null
        ])
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.heading }, "Skills"),
        React.createElement(Text, null, compact([
          resume.skills.hardSkills.length ? `Hard Skills: ${resume.skills.hardSkills.join(", ")}` : "",
          resume.skills.tools.length ? `Tools: ${resume.skills.tools.join(", ")}` : "",
          resume.skills.softSkills.length ? `Soft Skills: ${resume.skills.softSkills.join(", ")}` : ""
        ]).join("\n"))
      )
    )
  );

  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `${safeFileName(resume.contact.fullName)}-${mode}.pdf`);
};

export const exportDocx = async (resume: ResumeProfile, mode: ExportMode) => {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const paragraph = (text: string, options: { bullet?: boolean; bold?: boolean } = {}) =>
    new Paragraph({
      text: options.bold ? undefined : text,
      bullet: options.bullet ? { level: 0 } : undefined,
      children: options.bold ? [new TextRun({ text, bold: true })] : undefined
    });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...(mode === "preview" ? [paragraph("PRATINJAU QUICKTAILOR CV")] : []),
          new Paragraph({ text: resume.contact.fullName || "Nama lengkap", heading: HeadingLevel.TITLE }),
          paragraph(compact([
            resume.contact.email,
            resume.contact.phone,
            resume.contact.location,
            resume.contact.linkedinUrl,
            resume.contact.portfolioUrl
          ]).join(" | ")),
          new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_1 }),
          paragraph(resume.summary),
          new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_1 }),
          ...resume.workExperience.flatMap((item) => [
            paragraph(compact([item.role, item.company]).join(", "), { bold: true }),
            paragraph(compact([item.startDate, item.endDate]).join(" - ")),
            ...item.bulletPoints.filter(Boolean).map((bullet) => paragraph(bullet, { bullet: true }))
          ]),
          new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_1 }),
          ...resume.education.flatMap((item) => [
            paragraph(compact([item.degree, item.fieldOfStudy]).join(", "), { bold: true }),
            paragraph(compact([item.institution, item.graduationDate]).join(", ")),
            item.gpa ? paragraph(`GPA/IPK: ${item.gpa}`) : paragraph("")
          ]),
          new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_1 }),
          paragraph(compact([
            resume.skills.hardSkills.length ? `Hard Skills: ${resume.skills.hardSkills.join(", ")}` : "",
            resume.skills.tools.length ? `Tools: ${resume.skills.tools.join(", ")}` : "",
            resume.skills.softSkills.length ? `Soft Skills: ${resume.skills.softSkills.join(", ")}` : ""
          ]).join("\n"))
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFileName(resume.contact.fullName)}-${mode}.docx`);
};

export const exportTextFallback = (resume: ResumeProfile, mode: ExportMode) => {
  const blob = new Blob([buildPlainTextResume(resume, mode)], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${safeFileName(resume.contact.fullName)}-${mode}.txt`);
};
