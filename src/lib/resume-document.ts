import type { ResumeProfile } from "@/types/resume";
import { compact, unique } from "@/lib/text";

/**
 * Model dokumen tunggal untuk CV.
 *
 * Pratinjau di layar, PDF, DOCX, dan TXT semuanya merender model ini, jadi isi yang
 * dilihat pengguna tidak mungkin berbeda dari isi yang diunduh. Sebelumnya keempat
 * renderer menyusun isinya masing-masing, dan di situlah isinya jadi tidak sinkron.
 *
 * Aturan format di berkas ini mengikuti syarat pembaca ATS:
 * - Satu kolom, tanpa tabel dan tanpa kotak teks.
 * - Kontak di badan atas dokumen, bukan di header atau footer.
 * - Judul bagian memakai istilah standar yang dikenali parser.
 * - Bagian yang kosong tidak ditulis sama sekali, bukan ditulis sebagai judul kosong.
 * - Keahlian ditulis sebagai satu daftar kata kunci tanpa sub-label, karena label
 *   seperti "Tools:" berisiko ikut terbaca sebagai nama keahlian.
 */

export type ResumeEntry = {
  /** Contoh: "Data Analyst, PT Contoh". */
  title: string;
  /** Contoh: "08/2024 - Present". */
  meta: string;
  /** Baris tambahan di bawah meta, contoh: "GPA/IPK: 3.75/4.00". */
  note: string;
  bullets: string[];
};

export type ResumeSection = {
  /** Istilah standar yang dikenali sistem ATS, bukan nama kreatif. */
  heading: string;
  paragraphs: string[];
  entries: ResumeEntry[];
};

export type ResumeDocument = {
  name: string;
  /** Semua kontak digabung satu baris dengan pemisah garis tegak. */
  contact: string;
  sections: ResumeSection[];
  isEmpty: boolean;
};

/** Ukuran dan warna dipakai bersama oleh PDF dan DOCX supaya gaya keduanya tidak pernah berbeda. */
export const DOC_STYLE = {
  /* PDF memakai Helvetica. Metriknya setara Arial dan font ini bawaan PDF,
     jadi teksnya tetap terbaca ATS tanpa menyematkan berkas font tambahan. */
  pdfFont: "Helvetica",
  docxFont: "Arial",
  bodySizePt: 11,
  nameSizePt: 20,
  titleSizePt: 11.5,
  headingSizePt: 11,
  metaSizePt: 9.5,
  marginIn: 0.75,
  /* Hierarki visual dibangun dari garis pemisah dan ukuran huruf, bukan gambar,
     tabel, atau blok warna. Garis tidak menyimpan teks, jadi ATS tidak kehilangan apa pun. */
  ink: "#111111",
  metaInk: "#444444",
  ruleStrong: "#333333",
  ruleSoft: "#9AA0A6"
} as const;

const buildExperienceEntries = (resume: ResumeProfile): ResumeEntry[] =>
  resume.workExperience
    .map((item): ResumeEntry | null => {
      const title = compact([item.role, item.company]).join(", ");
      // Tanggal harus konsisten. Pekerjaan tanpa tanggal selesai selalu berarti
      // masih berjalan, jadi ditulis "Present" seperti yang diminta sistem ATS.
      const end = item.endDate.trim() || (item.isCurrent ? "Present" : "");
      const meta = compact([item.startDate.trim(), end]).join(" - ");
      const bullets = item.bulletPoints.map((bullet) => bullet.trim()).filter(Boolean);

      if (!title && !meta && !bullets.length) return null;
      return { title, meta, note: "", bullets };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

const buildEducationEntries = (resume: ResumeProfile): ResumeEntry[] =>
  resume.education
    .map((item): ResumeEntry | null => {
      const title = compact([item.degree, item.fieldOfStudy]).join(", ");
      const meta = compact([item.institution, item.graduationDate]).join(", ");
      const note = item.gpa.trim() ? `GPA/IPK: ${item.gpa.trim()}` : "";

      if (!title && !meta && !note) return null;
      return { title, meta, note, bullets: [] };
    })
    .filter((entry): entry is ResumeEntry => entry !== null);

export const buildResumeDocument = (resume: ResumeProfile): ResumeDocument => {
  const sections: ResumeSection[] = [];

  const summary = resume.summary.trim();
  if (summary) {
    sections.push({ heading: "Summary", paragraphs: [summary], entries: [] });
  }

  const experience = buildExperienceEntries(resume);
  if (experience.length) {
    sections.push({ heading: "Experience", paragraphs: [], entries: experience });
  }

  const education = buildEducationEntries(resume);
  if (education.length) {
    sections.push({ heading: "Education", paragraphs: [], entries: education });
  }

  // Satu daftar datar: keahlian teknis lebih dulu karena paling sering dicocokkan,
  // lalu alat kerja, lalu sikap kerja.
  const skills = unique([
    ...resume.skills.hardSkills,
    ...resume.skills.tools,
    ...resume.skills.softSkills
  ].map((skill) => skill.trim()).filter(Boolean));

  if (skills.length) {
    sections.push({ heading: "Skills", paragraphs: [skills.join(", ")], entries: [] });
  }

  const name = resume.contact.fullName.trim();
  const contact = compact([
    resume.contact.email.trim(),
    resume.contact.phone.trim(),
    resume.contact.location.trim(),
    resume.contact.linkedinUrl.trim(),
    resume.contact.portfolioUrl.trim()
  ]).join(" | ");

  return { name, contact, sections, isEmpty: !name && !contact && !sections.length };
};

/** Daftar bagian yang belum diisi, ditampilkan di luar lembar CV sebagai panduan. */
export const getMissingParts = (resume: ResumeProfile): string[] => {
  const missing: string[] = [];

  if (!resume.contact.fullName.trim()) missing.push("nama lengkap");
  if (!resume.contact.email.trim()) missing.push("email");
  if (!resume.contact.phone.trim()) missing.push("nomor telepon");
  if (!resume.summary.trim()) missing.push("ringkasan");

  const hasExperience = resume.workExperience.some(
    (item) => item.role.trim() || item.company.trim() || item.bulletPoints.some((bullet) => bullet.trim())
  );
  if (!hasExperience) missing.push("pengalaman kerja");

  const hasBullets = resume.workExperience.some((item) => item.bulletPoints.some((bullet) => bullet.trim()));
  if (hasExperience && !hasBullets) missing.push("poin pengalaman");

  const hasEducation = resume.education.some((item) => item.institution.trim() || item.degree.trim());
  if (!hasEducation) missing.push("pendidikan");

  const hasSkills = [...resume.skills.hardSkills, ...resume.skills.tools, ...resume.skills.softSkills].some((skill) => skill.trim());
  if (!hasSkills) missing.push("keahlian");

  return missing;
};
