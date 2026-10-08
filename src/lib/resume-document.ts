import type { ResumeProfile } from "@/types/resume";
import { compact, unique } from "@/lib/text";

export type ResumeEntry = {
  /** Contoh: "Full Stack Engineer | Universitas Mulawarman, Samarinda". */
  title: string;
  /** Contoh: "Jan 2024 – Present". */
  meta: string;
  /** Baris tambahan di bawah meta, contoh: "GPA/IPK: 3.75/4.00". */
  note: string;
  bullets: string[];
};

export type ResumeSection = {
  /** Istilah standar yang dikenali sistem ATS (SUMMARY, WORK EXPERIENCE, EDUCATION, SKILLS, CERTIFICATIONS). */
  heading: string;
  paragraphs: string[];
  entries: ResumeEntry[];
};

export type ResumeDocument = {
  name: string;
  headline: string;
  /** Kontak digabung satu baris dengan pemisah pipa (|). */
  contact: string;
  sections: ResumeSection[];
  isEmpty: boolean;
};

/** Ukuran dan warna dipakai bersama oleh PDF, DOCX, dan Pratinjau. */
export const DOC_STYLE = {
  pdfFont: "Helvetica",
  docxFont: "Arial",
  bodySizePt: 10,
  nameSizePt: 20,
  headlineSizePt: 10.5,
  headingSizePt: 10.5,
  metaSizePt: 9.5,
  marginIn: 0.5,
  ink: "#000000",
  metaInk: "#222222",
  ruleStrong: "#000000",
  ruleSoft: "#000000"
} as const;

const buildExperienceEntries = (resume: ResumeProfile): ResumeEntry[] =>
  resume.workExperience
    .map((item): ResumeEntry | null => {
      const companyWithLoc = compact([item.company?.trim(), item.location?.trim()]).join(", ");
      const title = compact([item.role?.trim(), companyWithLoc]).join(" | ");
      const end = item.endDate?.trim() || (item.isCurrent ? "Present" : "");
      const meta = compact([item.startDate?.trim(), end]).join(" – ");
      const bullets = (item.bulletPoints || []).map((bullet) => bullet.trim()).filter(Boolean);

      if (!title && !meta && !bullets.length) return null;
      return { title, meta, note: "", bullets };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

const buildEducationEntries = (resume: ResumeProfile): ResumeEntry[] =>
  resume.education
    .map((item): ResumeEntry | null => {
      const degreePart = compact([item.degree?.trim(), item.fieldOfStudy?.trim()]).join(", ");
      const title = compact([degreePart, item.institution?.trim()]).join(" | ");
      const meta = item.graduationDate?.trim() || "";
      const note = item.gpa?.trim() ? `GPA/IPK: ${item.gpa.trim()}` : "";

      if (!title && !meta && !note) return null;
      return { title, meta, note, bullets: [] };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

const buildSkillsParagraphs = (resume: ResumeProfile): string[] => {
  const paragraphs: string[] = [];
  const hard = (resume.skills?.hardSkills || []).map((s) => s.trim()).filter(Boolean);
  const tools = (resume.skills?.tools || []).map((s) => s.trim()).filter(Boolean);
  const soft = (resume.skills?.softSkills || []).map((s) => s.trim()).filter(Boolean);

  // If skills already have colon prefix (e.g. "Programming: Python, SQL")
  const allRaw = [...hard, ...tools, ...soft];
  const hasPrefixes = allRaw.some((item) => item.includes(":"));

  if (hasPrefixes) {
    allRaw.forEach((item) => {
      if (item) paragraphs.push(item);
    });
    return paragraphs;
  }

  // Categorize standard lists matching reference
  if (hard.length) {
    paragraphs.push(`Programming & Technical: ${hard.join(", ")}`);
  }
  if (tools.length) {
    paragraphs.push(`Frameworks & Tools: ${tools.join(", ")}`);
  }
  if (soft.length) {
    paragraphs.push(`Soft Skills & Other: ${soft.join(", ")}`);
  }

  return paragraphs;
};

export const buildResumeDocument = (resume: ResumeProfile): ResumeDocument => {
  const sections: ResumeSection[] = [];

  const summary = (resume.summary || "").trim();
  if (summary) {
    sections.push({ heading: "SUMMARY", paragraphs: [summary], entries: [] });
  }

  const experience = buildExperienceEntries(resume);
  if (experience.length) {
    sections.push({ heading: "WORK EXPERIENCE", paragraphs: [], entries: experience });
  }

  const education = buildEducationEntries(resume);
  if (education.length) {
    sections.push({ heading: "EDUCATION", paragraphs: [], entries: education });
  }

  const skillParagraphs = buildSkillsParagraphs(resume);
  if (skillParagraphs.length) {
    sections.push({ heading: "SKILLS", paragraphs: skillParagraphs, entries: [] });
  }

  const certs = (resume.certifications || []).map((c) => c.trim()).filter(Boolean);
  if (certs.length) {
    sections.push({ heading: "CERTIFICATIONS", paragraphs: [certs.join("; ")], entries: [] });
  }

  const name = (resume.contact?.fullName || "").trim();
  const headline = (resume.contact?.headline || "").trim();

  // Strip http:// or https:// from linkedin for cleaner ATS header
  const cleanLinkedin = (resume.contact?.linkedinUrl || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const cleanPortfolio = (resume.contact?.portfolioUrl || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");

  const contact = compact([
    (resume.contact?.location || "").trim(),
    (resume.contact?.email || "").trim(),
    (resume.contact?.phone || "").trim(),
    cleanLinkedin,
    cleanPortfolio
  ]).join(" | ");

  return {
    name,
    headline,
    contact,
    sections,
    isEmpty: !name && !contact && !sections.length
  };
};

export const getMissingParts = (resume: ResumeProfile): string[] => {
  const missing: string[] = [];

  if (!resume.contact?.fullName?.trim()) missing.push("nama lengkap");
  if (!resume.contact?.email?.trim()) missing.push("email");
  if (!resume.summary?.trim()) missing.push("ringkasan");

  const hasExperience = (resume.workExperience || []).some(
    (item) => item.role?.trim() || item.company?.trim() || item.bulletPoints?.some((bullet) => bullet?.trim())
  );
  if (!hasExperience) missing.push("pengalaman kerja");

  const hasEducation = (resume.education || []).some((item) => item.institution?.trim() || item.degree?.trim());
  if (!hasEducation) missing.push("pendidikan");

  const hasSkills = [...(resume.skills?.hardSkills || []), ...(resume.skills?.tools || []), ...(resume.skills?.softSkills || [])].some((skill) => skill?.trim());
  if (!hasSkills) missing.push("keahlian");

  return missing;
};
