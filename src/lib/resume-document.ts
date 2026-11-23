import type { CvLanguage, DetectedLanguage, ResumeProfile } from "@/types/resume";
import { translateProfileToEnglish } from "@/lib/ats/translator";
import { compact } from "@/lib/text";

export type SectionKey =
  | "summary"
  | "education"
  | "experience"
  | "projects"
  | "organizations"
  | "certifications"
  | "skills";

export type ResumeEntry = {
  /** Contoh: "Frontend Web Intern | PT Mitra Sehat Digital, Semarang". */
  title: string;
  /** Contoh: "Aug 2024 - Dec 2024". */
  meta: string;
  /** Baris catatan utama (untuk kompatibilitas). */
  note: string;
  /** Baris catatan terstruktur (misal IPK, Tugas Akhir, Mata Kuliah, Teknologi). */
  notes: string[];
  bullets: string[];
};

export type ResumeSection = {
  sectionKey: SectionKey;
  heading: string;
  paragraphs: string[];
  entries: ResumeEntry[];
};

export type ResumeDocument = {
  language: "id" | "en";
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
  bodySizePt: 9.5,
  nameSizePt: 18,
  headlineSizePt: 10,
  headingSizePt: 10,
  metaSizePt: 9.5,
  marginIn: 0.58,
  ink: "#000000",
  metaInk: "#222222",
  ruleStrong: "#000000",
  ruleSoft: "#000000"
} as const;

type DocLabels = {
  summary: string;
  education: string;
  experience: string;
  projects: string;
  organizations: string;
  certifications: string;
  skills: string;
  present: string;
  gpa: string;
  thesis: string;
  coursework: string;
  achievements: string;
  techStack: string;
  link: string;
  hardSkills: string;
  tools: string;
  softSkills: string;
  internTag: string;
  freelanceTag: string;
  parttimeTag: string;
};

const DOC_LABELS: Record<"id" | "en", DocLabels> = {
  id: {
    summary: "RINGKASAN PROFIL",
    education: "PENDIDIKAN",
    experience: "PENGALAMAN KERJA & MAGANG",
    projects: "PROYEK & STUDI KASUS",
    organizations: "ORGANISASI & KEPANITIAAN",
    certifications: "PELATIHAN & SERTIFIKASI",
    skills: "KEAHLIAN",
    present: "Sekarang",
    gpa: "IPK",
    thesis: "Tugas Akhir",
    coursework: "Mata Kuliah Relevan",
    achievements: "Prestasi",
    techStack: "Teknologi",
    link: "Tautan",
    hardSkills: "Keahlian Teknis",
    tools: "Alat & Perangkat Lunak",
    softSkills: "Kompetensi Pendukung",
    internTag: "Magang",
    freelanceTag: "Freelance",
    parttimeTag: "Paruh Waktu"
  },
  en: {
    summary: "SUMMARY",
    education: "EDUCATION",
    experience: "WORK EXPERIENCE",
    projects: "PROJECTS & CASE STUDIES",
    organizations: "ORGANIZATIONS & LEADERSHIP",
    certifications: "CERTIFICATIONS & TRAINING",
    skills: "SKILLS",
    present: "Present",
    gpa: "GPA",
    thesis: "Thesis",
    coursework: "Relevant Coursework",
    achievements: "Achievements",
    techStack: "Technologies",
    link: "Link",
    hardSkills: "Technical Skills",
    tools: "Tools & Software",
    softSkills: "Soft Skills",
    internTag: "Internship",
    freelanceTag: "Freelance",
    parttimeTag: "Part-time"
  }
};

export const resolveCvLanguage = (
  preference: CvLanguage = "auto",
  detectedJobLang?: DetectedLanguage
): "id" | "en" => {
  if (preference === "id") return "id";
  if (preference === "en") return "en";
  return detectedJobLang === "en" ? "en" : "id";
};

const normalizeEndDate = (rawEnd: string | undefined, isCurrent: boolean, presentLabel: string): string => {
  const clean = (rawEnd ?? "").trim();
  if (isCurrent || /^(present|sekarang|saat ini)$/i.test(clean)) return presentLabel;
  return clean;
};

const buildExperienceEntries = (resume: ResumeProfile, labels: DocLabels): ResumeEntry[] =>
  (resume.workExperience ?? [])
    .map((item): ResumeEntry | null => {
      let roleLabel = (item.role ?? "").trim();
      if (roleLabel && item.type === "internship" && !/intern|magang|msib|pkl/i.test(roleLabel)) {
        roleLabel = `${roleLabel} (${labels.internTag})`;
      } else if (roleLabel && item.type === "freelance" && !/freelance|lepas/i.test(roleLabel)) {
        roleLabel = `${roleLabel} (${labels.freelanceTag})`;
      } else if (roleLabel && item.type === "parttime" && !/part[- ]?time|paruh waktu/i.test(roleLabel)) {
        roleLabel = `${roleLabel} (${labels.parttimeTag})`;
      }

      const companyWithLoc = compact([item.company?.trim(), item.location?.trim()]).join(", ");
      const title = compact([roleLabel, companyWithLoc]).join(" | ");
      const bullets = (item.bulletPoints ?? []).map((bullet) => bullet.trim()).filter(Boolean);

      // Cegah elemen yatim: jika judul posisi/perusahaan dan poin semuanya kosong, abaikan seluruh entri (jangan tampilkan "Present")
      if (!title && !bullets.length) return null;

      const start = (item.startDate ?? "").trim();
      const end = normalizeEndDate(item.endDate, Boolean(item.isCurrent), labels.present);
      const meta = compact([start, end]).join(" - ");

      return { title, meta, note: "", notes: [], bullets };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

const buildEducationEntries = (resume: ResumeProfile, labels: DocLabels): ResumeEntry[] =>
  (resume.education ?? [])
    .map((item): ResumeEntry | null => {
      const degreePart = compact([item.degree?.trim(), item.fieldOfStudy?.trim()]).join(" - ");
      const title = compact([degreePart, item.institution?.trim()]).join(" | ");
      const meta = (item.graduationDate ?? "").trim();
      const notes: string[] = [];

      if (item.gpa?.trim()) notes.push(`${labels.gpa}: ${item.gpa.trim()}`);
      if (item.thesisTitle?.trim()) notes.push(`${labels.thesis}: ${item.thesisTitle.trim()}`);
      if (item.relevantCoursework?.length) {
        const cleanCourses = item.relevantCoursework.map((c) => c.trim()).filter(Boolean);
        if (cleanCourses.length) notes.push(`${labels.coursework}: ${cleanCourses.join(", ")}`);
      }
      if (item.achievements?.trim()) notes.push(`${labels.achievements}: ${item.achievements.trim()}`);

      if (!title && !meta && !notes.length) return null;
      return {
        title,
        meta,
        note: notes[0] ?? "",
        notes,
        bullets: []
      };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

const buildProjectEntries = (resume: ResumeProfile, labels: DocLabels): ResumeEntry[] =>
  (resume.projects ?? [])
    .map((item): ResumeEntry | null => {
      const nameAndContext = compact([item.name?.trim(), item.context?.trim()]).join(" - ");
      const title = compact([nameAndContext, item.role?.trim()]).join(" | ");
      const meta = (item.period ?? "").trim();
      const bullets = (item.bulletPoints ?? []).map((b) => b.trim()).filter(Boolean);
      const notes: string[] = [];

      const techs = (item.technologies ?? []).map((t) => t.trim()).filter(Boolean);
      if (techs.length) notes.push(`${labels.techStack}: ${techs.join(", ")}`);
      if (item.url?.trim()) {
        const cleanUrl = item.url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        notes.push(`${labels.link}: ${cleanUrl}`);
      }

      if (!title && !bullets.length && !notes.length) return null;
      return { title, meta, note: notes[0] ?? "", notes, bullets };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

const buildOrganizationEntries = (resume: ResumeProfile): ResumeEntry[] =>
  (resume.organizations ?? [])
    .map((item): ResumeEntry | null => {
      const title = compact([item.role?.trim(), item.organization?.trim()]).join(" | ");
      const meta = (item.period ?? "").trim();
      const bullets = (item.bulletPoints ?? []).map((b) => b.trim()).filter(Boolean);

      if (!title && !bullets.length) return null;
      return { title, meta, note: "", notes: [], bullets };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

const buildCertificationParagraphs = (resume: ResumeProfile): string[] => {
  const structured = (resume.certificationItems ?? [])
    .map((item) => {
      const name = (item.name ?? "").trim();
      if (!name) return "";
      const issuer = (item.issuer ?? "").trim();
      const year = (item.year ?? "").trim();
      const suffix = compact([issuer, year]).join(", ");
      return suffix ? `${name} (${suffix})` : name;
    })
    .filter(Boolean);

  const legacy = (resume.certifications ?? []).map((c) => c.trim()).filter(Boolean);
  return [...structured, ...legacy];
};

const buildSkillsParagraphs = (resume: ResumeProfile, labels: DocLabels): string[] => {
  const paragraphs: string[] = [];
  const hard = (resume.skills?.hardSkills ?? []).map((s) => s.trim()).filter(Boolean);
  const tools = (resume.skills?.tools ?? []).map((s) => s.trim()).filter(Boolean);
  const soft = (resume.skills?.softSkills ?? []).map((s) => s.trim()).filter(Boolean);

  const allRaw = [...hard, ...tools, ...soft];
  const hasPrefixes = allRaw.some((item) => item.includes(":"));

  if (hasPrefixes) {
    allRaw.forEach((item) => {
      if (item) paragraphs.push(item);
    });
    return paragraphs;
  }

  if (hard.length) paragraphs.push(`${labels.hardSkills}: ${hard.join(", ")}`);
  if (tools.length) paragraphs.push(`${labels.tools}: ${tools.join(", ")}`);
  if (soft.length) paragraphs.push(`${labels.softSkills}: ${soft.join(", ")}`);

  return paragraphs;
};

const SECTION_ORDER: Record<ResumeProfile["experienceLevel"], SectionKey[]> = {
  fresh_graduate: [
    "summary",
    "education",
    "experience",
    "projects",
    "organizations",
    "certifications",
    "skills"
  ],
  early_career: [
    "summary",
    "experience",
    "projects",
    "education",
    "organizations",
    "certifications",
    "skills"
  ],
  experienced: [
    "summary",
    "experience",
    "skills",
    "education",
    "projects",
    "organizations",
    "certifications"
  ]
};

export type ResumeBuildOptions = {
  translateContent?: boolean;
  translatedOverride?: ResumeProfile | null;
};

export const buildResumeDocument = (
  resume: ResumeProfile,
  language: "id" | "en" = "id",
  options?: ResumeBuildOptions
): ResumeDocument => {
  const effectiveResume =
    language === "en" && options?.translateContent !== false
      ? options?.translatedOverride ?? translateProfileToEnglish(resume)
      : resume;

  const labels = DOC_LABELS[language];
  const sectionMap = new Map<SectionKey, ResumeSection>();

  const summary = (effectiveResume.summary || "").trim();
  if (summary) {
    sectionMap.set("summary", {
      sectionKey: "summary",
      heading: labels.summary,
      paragraphs: [summary],
      entries: []
    });
  }

  const education = buildEducationEntries(effectiveResume, labels);
  if (education.length) {
    sectionMap.set("education", {
      sectionKey: "education",
      heading: labels.education,
      paragraphs: [],
      entries: education
    });
  }

  const experience = buildExperienceEntries(effectiveResume, labels);
  if (experience.length) {
    sectionMap.set("experience", {
      sectionKey: "experience",
      heading: labels.experience,
      paragraphs: [],
      entries: experience
    });
  }

  const projects = buildProjectEntries(effectiveResume, labels);
  if (projects.length) {
    sectionMap.set("projects", {
      sectionKey: "projects",
      heading: labels.projects,
      paragraphs: [],
      entries: projects
    });
  }

  const organizations = buildOrganizationEntries(effectiveResume);
  if (organizations.length) {
    sectionMap.set("organizations", {
      sectionKey: "organizations",
      heading: labels.organizations,
      paragraphs: [],
      entries: organizations
    });
  }

  const certParagraphs = buildCertificationParagraphs(effectiveResume);
  if (certParagraphs.length) {
    sectionMap.set("certifications", {
      sectionKey: "certifications",
      heading: labels.certifications,
      paragraphs: certParagraphs,
      entries: []
    });
  }

  const skillParagraphs = buildSkillsParagraphs(effectiveResume, labels);
  if (skillParagraphs.length) {
    sectionMap.set("skills", {
      sectionKey: "skills",
      heading: labels.skills,
      paragraphs: skillParagraphs,
      entries: []
    });
  }

  const order = SECTION_ORDER[effectiveResume.experienceLevel ?? "fresh_graduate"];
  const sections: ResumeSection[] = [];
  for (const key of order) {
    const sec = sectionMap.get(key);
    if (sec) sections.push(sec);
  }

  const name = (effectiveResume.contact?.fullName || "").trim();
  const headline = (effectiveResume.contact?.headline || "").trim();

  const cleanLinkedin = (effectiveResume.contact?.linkedinUrl || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");
  const cleanPortfolio = (effectiveResume.contact?.portfolioUrl || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");

  const contact = compact([
    (effectiveResume.contact?.location || "").trim(),
    (effectiveResume.contact?.email || "").trim(),
    (effectiveResume.contact?.phone || "").trim(),
    cleanLinkedin,
    cleanPortfolio
  ]).join(" | ");

  return {
    language,
    name,
    headline,
    contact,
    sections,
    isEmpty: !name && !headline && !contact && !sections.length
  };
};

export const estimateA4Pages = (doc: ResumeDocument): { estimatedPages: number; lineEstimate: number } => {
  if (doc.isEmpty) return { estimatedPages: 1, lineEstimate: 0 };

  let lines = 0;
  if (doc.name) lines += 2;
  if (doc.headline) lines += 1;
  if (doc.contact) lines += Math.max(1, Math.ceil(doc.contact.length / 85));

  for (const section of doc.sections) {
    lines += 2.2; // heading + spacing
    for (const p of section.paragraphs) {
      lines += Math.max(1, Math.ceil(p.length / 88));
    }
    for (const entry of section.entries) {
      lines += 1.4;
      for (const note of entry.notes) {
        lines += Math.max(1, Math.ceil(note.length / 88));
      }
      for (const bullet of entry.bullets) {
        lines += Math.max(1, Math.ceil(bullet.length / 82));
      }
    }
  }

  const lineEstimate = Math.round(lines);
  const estimatedPages = Math.max(1, Math.ceil(lineEstimate / 47));
  return { estimatedPages, lineEstimate };
};

export const getMissingParts = (resume: ResumeProfile): string[] => {
  const missing: string[] = [];

  if (!resume.contact?.fullName?.trim()) missing.push("nama lengkap");
  if (!resume.contact?.email?.trim()) missing.push("email");
  if (!resume.summary?.trim()) missing.push("ringkasan profil");

  const hasEducation = (resume.education || []).some(
    (item) => item.institution?.trim() || item.degree?.trim() || item.fieldOfStudy?.trim()
  );
  if (!hasEducation) missing.push("pendidikan");

  const hasWork = (resume.workExperience || []).some(
    (item) => item.role?.trim() || item.company?.trim() || item.bulletPoints?.some((b) => b?.trim())
  );
  const hasProject = (resume.projects || []).some(
    (item) => item.name?.trim() || item.bulletPoints?.some((b) => b?.trim())
  );
  const hasOrg = (resume.organizations || []).some(
    (item) => item.organization?.trim() || item.role?.trim() || item.bulletPoints?.some((b) => b?.trim())
  );

  if (resume.experienceLevel === "fresh_graduate") {
    if (!hasWork && !hasProject && !hasOrg) {
      missing.push("proyek, magang, atau organisasi");
    }
  } else if (!hasWork) {
    missing.push("pengalaman kerja");
  }

  const hasSkills = [
    ...(resume.skills?.hardSkills || []),
    ...(resume.skills?.tools || []),
    ...(resume.skills?.softSkills || [])
  ].some((skill) => skill?.trim());
  if (!hasSkills) missing.push("keahlian");

  return missing;
};
