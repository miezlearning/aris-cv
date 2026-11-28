import type { ResumeProfile, WorkExperience } from "@/types/resume";
import { containsTermBoundary, getRelatedTerms, normalizeForMatch } from "@/lib/ats/synonyms";
import {
  isPresentToken,
  isWorkExperienceChronological,
  parseDatePoint
} from "@/lib/chronology";

const PLACEHOLDER_RE =
  /\[(?:\s*(?:isi|insert|angka|jumlah|persen|target|nama|tahun|bulan|todo|tbd|xxx|\.{2,}|x\b|%)[^\]]{0,40})\]/i;

const ID_FIRST_PERSON_RE = /\b(?:saya|aku|gue|gua|diriku)\b/i;
const EN_START_FIRST_PERSON_RE = /^(?:i(?:'m|'ve|'d|'ll)?|my)\s+/i;
const EN_MID_FIRST_PERSON_RE =
  /\b(?:i\s+(?:am|was|have|had|built|developed|created|managed|led|worked|helped|assisted|designed|implemented|handled|did|made|use|used|spearheaded|coordinated|analyzed|maintained|supported)|i'm|i've|myself|my\s+(?:role|team|work|responsibility|responsibilities|experience|goal|focus|job))\b/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type PreExportWarning = {
  id: string;
  severity: "error" | "warn";
  message: string;
  actionKind?: "sort_experience" | "goto_editor";
};

export const countWords = (text?: string): number => {
  const clean = (text ?? "").trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
};

export const hasUnfilledPlaceholder = (text?: string): boolean => {
  const clean = (text ?? "").trim();
  if (!clean) return false;
  return PLACEHOLDER_RE.test(clean);
};

export const hasFirstPersonPronoun = (text?: string): boolean => {
  const clean = (text ?? "").trim().replace(/^[-•*\u2022\s]+/, "").trim();
  if (!clean) return false;
  return (
    ID_FIRST_PERSON_RE.test(clean) ||
    EN_START_FIRST_PERSON_RE.test(clean) ||
    EN_MID_FIRST_PERSON_RE.test(clean)
  );
};

export const hasInvertedWorkDateRange = (
  item: Pick<WorkExperience, "startDate" | "endDate" | "isCurrent">
): boolean => {
  if (item.isCurrent || isPresentToken(item.endDate)) return false;
  const start = parseDatePoint(item.startDate, "start");
  const end = parseDatePoint(item.endDate, "end");
  return Boolean(start !== null && end !== null && end < start);
};

export const isValidEmailFormat = (email?: string): boolean => {
  const clean = (email ?? "").trim();
  if (!clean) return true;
  return EMAIL_RE.test(clean);
};

export const hasMessyUrl = (url?: string): boolean => {
  const clean = (url ?? "").trim();
  if (!clean) return false;
  return /^https?:\/\//i.test(clean) || /^www\./i.test(clean) || /[?#]/.test(clean) || /\/$/.test(clean);
};

export const cleanProfileUrl = (url?: string): string => {
  const clean = (url ?? "").trim();
  if (!clean) return "";
  return clean
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
};

export const getBulletHygieneWarnings = (bullet: string): string[] => {
  const clean = bullet.trim();
  if (!clean) return [];
  const warnings: string[] = [];

  if (hasUnfilledPlaceholder(clean)) {
    warnings.push("Masih ada placeholder [...] yang belum diisi.");
  }
  if (hasFirstPersonPronoun(clean)) {
    warnings.push("Hindari kata ganti orang pertama (Saya/Aku/I); mulai langsung dengan kata kerja aktif.");
  }
  if (clean.length > 240) {
    warnings.push("Poin cukup panjang (>240 karakter); pertimbangkan meringkas jadi 1-2 baris agar cepat dipindai HR.");
  }

  return warnings;
};

export const collectPreExportAtsWarnings = (resume: ResumeProfile): PreExportWarning[] => {
  const warnings: PreExportWarning[] = [];

  const allProse = [
    resume.summary ?? "",
    ...(resume.workExperience ?? []).flatMap((w) => w.bulletPoints ?? []),
    ...(resume.projects ?? []).flatMap((p) => p.bulletPoints ?? []),
    ...(resume.organizations ?? []).flatMap((o) => o.bulletPoints ?? [])
  ];

  if (allProse.some(hasUnfilledPlaceholder)) {
    warnings.push({
      id: "unfilled-placeholders",
      severity: "error",
      message: "Masih ada placeholder [...] (misal [isi jumlah]) yang belum diganti angka nyata atau dihapus.",
      actionKind: "goto_editor"
    });
  }

  if ((resume.workExperience ?? []).length >= 2 && !isWorkExperienceChronological(resume.workExperience ?? [])) {
    warnings.push({
      id: "non-chronological-experience",
      severity: "warn",
      message: "Urutan pengalaman kerja belum kronologis terbalik (posisi aktif/terbaru harus di paling atas).",
      actionKind: "sort_experience"
    });
  }

  if ((resume.workExperience ?? []).some(hasInvertedWorkDateRange)) {
    warnings.push({
      id: "inverted-work-dates",
      severity: "error",
      message: "Ada pengalaman kerja dengan tanggal selesai lebih awal daripada tanggal mulai.",
      actionKind: "goto_editor"
    });
  }

  if (resume.contact?.email?.trim() && !isValidEmailFormat(resume.contact.email)) {
    warnings.push({
      id: "invalid-email",
      severity: "warn",
      message: "Format alamat email di Profil & Kontak terlihat belum valid.",
      actionKind: "goto_editor"
    });
  }

  return warnings;
};

const sanitizeFileSegment = (raw: string): string =>
  raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

export const buildAtsFileName = (
  resume: ResumeProfile,
  lang: "id" | "en" = "id",
  targetJobTitle?: string
): string => {
  const prefix = lang === "en" ? "Resume" : "CV";
  const namePart = sanitizeFileSegment(resume.contact?.fullName ?? "");

  if (!namePart) {
    return `${prefix}_QuickTailor`;
  }

  const rawRole =
    targetJobTitle?.trim() ||
    (resume.contact?.headline ?? "").split("|")[0]?.trim() ||
    "";
  const limitedRole = rawRole.split(/\s+/).slice(0, 4).join(" ").slice(0, 36);
  const rolePart = sanitizeFileSegment(limitedRole);

  return rolePart ? `${prefix}_${namePart}_${rolePart}` : `${prefix}_${namePart}`;
};

const TRANSFERABLE_SKILL_CLUSTERS: string[][] = [
  ["C#", ".NET", "ASP.NET", "Java", "Spring Boot", "TypeScript", "Node.js", "Python", "Go", "PHP", "Laravel", "Kotlin", "C++", "REST API"],
  ["React", "React.js", "Next.js", "Vue", "Vue.js", "Angular", "Svelte", "JavaScript", "TypeScript", "Tailwind CSS"],
  ["PostgreSQL", "MySQL", "SQL Server", "Oracle", "SQLite", "MongoDB", "Redis", "SQL"],
  ["AWS", "Google Cloud", "GCP", "Azure", "Docker", "Kubernetes", "CI/CD", "Linux", "Git"],
  ["Power BI", "Tableau", "Looker", "Microsoft Excel", "Excel", "SQL", "Python", "SPSS", "Google Sheets"],
  ["Flutter", "React Native", "Kotlin", "Swift", "Android", "iOS"],
  ["Figma", "Adobe XD", "Canva", "Photoshop", "Illustrator"]
];

export const findTransferableSkillsInProfile = (
  resume: ResumeProfile,
  missingSkill: string
): string[] => {
  const normMissing = normalizeForMatch(missingSkill);
  if (!normMissing) return [];

  const candidateTerms = new Set<string>();
  const clusterTermsForLookup: string[] = [];

  for (const cluster of TRANSFERABLE_SKILL_CLUSTERS) {
    if (cluster.some((item) => normalizeForMatch(item) === normMissing)) {
      for (const item of cluster) {
        const normItem = normalizeForMatch(item);
        if (normItem && normItem !== normMissing) {
          candidateTerms.add(normItem);
          clusterTermsForLookup.push(item);
        }
      }
    }
  }

  for (const related of getRelatedTerms(missingSkill)) {
    const normRel = normalizeForMatch(related);
    if (normRel && normRel !== normMissing) {
      candidateTerms.add(normRel);
    }
  }

  if (candidateTerms.size === 0) return [];

  const found: string[] = [];
  const seen = new Set<string>();
  const addIfRelevant = (rawSkill: string) => {
    const clean = rawSkill.trim();
    const norm = normalizeForMatch(clean);
    if (!norm || norm === normMissing || seen.has(norm) || !candidateTerms.has(norm)) return;
    seen.add(norm);
    found.push(clean);
  };

  const explicitSkills = [
    ...(resume.skills?.hardSkills ?? []),
    ...(resume.skills?.tools ?? []),
    ...(resume.skills?.softSkills ?? []),
    ...(resume.skills?.groups ?? []).flatMap((g) => g.items ?? [])
  ];
  explicitSkills.forEach(addIfRelevant);

  if (found.length < 3) {
    const proseCorpus = normalizeForMatch(
      [
        resume.summary ?? "",
        ...(resume.workExperience ?? []).flatMap((w) => [w.role, ...(w.bulletPoints ?? [])]),
        ...(resume.projects ?? []).flatMap((p) => [p.name, ...(p.technologies ?? []), ...(p.bulletPoints ?? [])]),
        ...(resume.organizations ?? []).flatMap((o) => [o.role, ...(o.bulletPoints ?? [])])
      ].join(" ")
    );
    if (proseCorpus) {
      for (const clusterTerm of clusterTermsForLookup) {
        if (containsTermBoundary(proseCorpus, clusterTerm)) {
          addIfRelevant(clusterTerm);
        }
        if (found.length >= 3) break;
      }
    }
  }

  return found.slice(0, 3);
};

export const findInventedSkills = (
  originalText: string,
  aiOutput: string,
  forbiddenSkills: string[]
): string[] => {
  const normOriginal = normalizeForMatch(originalText);
  const normOutput = normalizeForMatch(aiOutput);
  if (!normOutput || !forbiddenSkills.length) return [];

  const invented: string[] = [];
  const seen = new Set<string>();

  for (const skill of forbiddenSkills) {
    const clean = skill.trim();
    const normSkill = normalizeForMatch(clean);
    if (!normSkill || seen.has(normSkill)) continue;
    seen.add(normSkill);

    if (containsTermBoundary(normOutput, clean) && !containsTermBoundary(normOriginal, clean)) {
      invented.push(clean);
    }
  }

  return invented;
};
