import type {
  AdministrativeItem,
  DetectedLanguage,
  EducationCriterion,
  ExtractedKeywords,
  ImplicitCompetency,
  NormalizedJobQualifications
} from "@/types/resume";
import { containsTermBoundary, findSynonymMatch, normalizeForMatch } from "@/lib/ats/synonyms";
import {
  ADMIN_RULES,
  HARD_SKILL_TAXONOMY,
  IMPLICIT_DOMAIN_TEMPLATES,
  SOFT_SKILL_TAXONOMY,
  type HardSkillEntry
} from "@/lib/ats/taxonomy";

const ID_FUNCTION_WORDS = [
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "dalam",
  "memiliki",
  "mampu",
  "pengalaman",
  "lulusan",
  "maksimal",
  "minimal",
  "bersedia",
  "usia",
  "pelamar",
  "lowongan",
  "pekerjaan",
  "bertanggung",
  "melampirkan",
  "wajib",
  "diutamakan",
  "menguasai",
  "mengelola",
  "rumah sakit",
  "gudang"
];

const EN_FUNCTION_WORDS = [
  "the",
  "and",
  "or",
  "for",
  "with",
  "experience",
  "requirements",
  "responsibilities",
  "skills",
  "proficient",
  "knowledge",
  "degree",
  "bachelor",
  "ability",
  "develop",
  "maintain",
  "strong",
  "must",
  "preferred",
  "candidates",
  "working",
  "familiarity"
];

export const detectLanguage = (text: string): DetectedLanguage => {
  const norm = normalizeForMatch(text);
  if (!norm) return "id";

  const idHits = ID_FUNCTION_WORDS.filter((w) => containsTermBoundary(norm, w)).length;
  const enHits = EN_FUNCTION_WORDS.filter((w) => containsTermBoundary(norm, w)).length;

  if (enHits >= 4 && enHits > idHits * 1.4) return "en";
  if (idHits >= 3 && idHits > enHits * 1.4) return "id";
  if (idHits >= 2 && enHits >= 2) return "mixed";
  return enHits > idHits ? "en" : "id";
};

const DISPLAY_CASING: Record<string, string> = {
  "ms. office": "Ms. Office",
  "ms office": "Ms. Office",
  "microsoft office": "Microsoft Office",
  "ms. excel": "Ms. Excel",
  "ms excel": "Ms. Excel",
  "microsoft excel": "Microsoft Excel",
  "excel": "Microsoft Excel",
  "ms word": "Ms. Word",
  "microsoft word": "Microsoft Word",
  "powerpoint": "PowerPoint",
  "html": "HTML",
  "html5": "HTML5",
  "css": "CSS",
  "css3": "CSS3",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "react": "React",
  "react.js": "React.js",
  "reactjs": "React.js",
  "next.js": "Next.js",
  "nextjs": "Next.js",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  "vue": "Vue.js",
  "vue.js": "Vue.js",
  "restful api": "RESTful API",
  "rest api": "REST API",
  "backend api": "Backend API",
  "graphql": "GraphQL",
  "sql": "SQL",
  "mysql": "MySQL",
  "postgresql": "PostgreSQL",
  "postgres": "PostgreSQL",
  "mongodb": "MongoDB",
  "git": "Git",
  "github": "GitHub",
  "gitlab": "GitLab",
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "ci/cd": "CI/CD",
  "aws": "AWS",
  "gcp": "Google Cloud Platform",
  "azure": "Microsoft Azure",
  "qa": "Quality Assurance (QA)",
  "ui/ux": "UI/UX",
  "ui ux": "UI/UX",
  "simrs": "SIMRS",
  "rme": "Rekam Medis Elektronik (RME)",
  "lan/wan": "LAN/WAN",
  "mikrotik": "Mikrotik",
  "tcp/ip": "TCP/IP",
  "it support": "IT Support",
  "helpdesk": "Helpdesk",
  "sap": "SAP",
  "erp": "ERP",
  "wms": "WMS",
  "hris": "HRIS",
  "crm": "CRM",
  "seo": "SEO",
  "sem": "SEM",
  "ga4": "Google Analytics (GA4)",
  "spss": "SPSS"
};

const toTitleCase = (value: string): string =>
  value
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (["it", "ui", "ux", "sql", "qa", "hr", "cv", "os", "lan", "wan", "erp", "wms", "crm", "seo", "sem"].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

const formatDisplayTerm = (term: string): string => {
  const clean = term.toLowerCase().trim();
  if (DISPLAY_CASING[clean]) return DISPLAY_CASING[clean];
  return toTitleCase(clean);
};

/**
 * Memecah teks lowongan (paragraf, bullet, titik koma) menjadi klausa pendek
 * sambil mempertahankan desimal (3.00) dan ekstensi teknologi (.js, Ms.).
 */
const splitClauses = (raw: string): string[] => {
  const safe = raw
    .replace(/\bMs\.\s+/gi, "Ms ")
    .replace(/\bFc\.\s+/gi, "Fc ")
    .replace(/\bMaks\.\s+/gi, "Maks ")
    .replace(/\bMin\.\s+/gi, "Min ")
    .replace(/(\d)\.(\d)/g, "$1_DOT_$2")
    .replace(/\.js\b/gi, "_DOT_js")
    .replace(/\.net\b/gi, "_DOT_net")
    .replace(/\.id\b/gi, "_DOT_id");

  return safe
    .split(/(?:\r?\n|;|[•●▪◦‣]|(?:\.\s+))/)
    .map((part) =>
      part
        .replace(/_DOT_/g, ".")
        .replace(/^[-*\d.)\s]+/, "")
        .trim()
    )
    .filter(Boolean);
};

const EDUCATION_LEVEL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "SMA/SMK", pattern: /\bsma\s*\/?\s*smk\b|\bsmk\b|\bsma\b|\bsederajat\b/i },
  { label: "D3", pattern: /\bd3\b|\bdiploma\s*(?:iii|3)\b/i },
  { label: "D4", pattern: /\bd4\b|\bsarjana\s+terapan\b/i },
  { label: "S1", pattern: /\bs1\b|\bsarjana\b|\bbachelor(?:'?s)?\b/i },
  { label: "S2", pattern: /\bs2\b|\bmagister\b|\bmaster(?:'?s)?\b/i }
];

const MAJOR_DICTIONARY: Array<{ label: string; terms: string[] }> = [
  { label: "S1 Komputer", terms: ["s1 komputer", "sarjana komputer"] },
  { label: "Teknik Informatika", terms: ["teknik informatika", "informatics"] },
  { label: "Ilmu Komputer", terms: ["ilmu komputer", "computer science"] },
  { label: "Sistem Informasi", terms: ["sistem informasi", "information systems"] },
  { label: "Teknologi Informasi", terms: ["teknologi informasi", "information technology"] },
  { label: "Rekayasa Perangkat Lunak", terms: ["rekayasa perangkat lunak", "software engineering", "rpl"] },
  { label: "Teknik Komputer & Jaringan (TKJ)", terms: ["teknik komputer dan jaringan", "tkj", "teknik komputer"] },
  { label: "Akuntansi", terms: ["akuntansi", "accounting"] },
  { label: "Manajemen / Bisnis", terms: ["manajemen bisnis", "administrasi bisnis", "manajemen", "management", "business administration"] },
  { label: "Ekonomi / Keuangan", terms: ["s1 ekonomi", "sarjana ekonomi", "ekonomi", "economics", "finance", "perpajakan"] },
  { label: "Administrasi Perkantoran", terms: ["administrasi perkantoran"] },
  { label: "Desain Komunikasi Visual (DKV)", terms: ["desain komunikasi visual", "dkv", "visual communication design", "desain grafis", "graphic design"] },
  { label: "Ilmu Komunikasi", terms: ["ilmu komunikasi", "communication science"] },
  { label: "Rekam Medis & Informasi Kesehatan", terms: ["rekam medis dan informasi kesehatan", "rekam medis", "rmik", "health informatics"] },
  { label: "Kesehatan / Keperawatan / Farmasi", terms: ["kesehatan masyarakat", "keperawatan", "farmasi", "administrasi rumah sakit"] },
  { label: "Psikologi / Hukum", terms: ["psikologi", "psychology", "hukum", "law"] }
];

const extractEducationCriteria = (clauses: string[]): EducationCriterion[] => {
  const criteria: EducationCriterion[] = [];
  const seenKeys = new Set<string>();

  clauses.forEach((clause) => {
    const levels = EDUCATION_LEVEL_PATTERNS.filter((item) => item.pattern.test(clause)).map((item) => item.label);
    const normClause = normalizeForMatch(clause);
    const majors = MAJOR_DICTIONARY.filter((major) =>
      major.terms.some((term) => containsTermBoundary(normClause, term))
    ).map((major) => major.label);

    const gpaMatch = clause.match(/\b(?:ipk|gpa)\s*(?:min\.?|minimal|>=|at\s+least)?\s*([0-4][.,]\d{1,2})/i);
    const minGpa = gpaMatch ? Number(gpaMatch[1].replace(",", ".")) : undefined;

    if (!levels.length && !majors.length && minGpa === undefined) return;

    const dedupKey = `${levels.join(",")}|${majors.join(",")}|${minGpa ?? ""}`;
    if (seenKeys.has(dedupKey)) return;
    seenKeys.add(dedupKey);

    const parts: string[] = [];
    if (levels.length) parts.push(levels.join(" / "));
    if (majors.length) parts.push(majors.join(" / "));
    else if (levels.length) parts.push("Semua jurusan relevan");
    if (minGpa !== undefined && !Number.isNaN(minGpa)) parts.push(`IPK min. ${minGpa.toFixed(2)}`);

    criteria.push({
      id: `edu-req-${criteria.length + 1}`,
      levels,
      majors,
      minGpa: minGpa !== undefined && !Number.isNaN(minGpa) ? minGpa : undefined,
      rawSnippet: clause.slice(0, 140),
      label: parts.join(" - ")
    });
  });

  return criteria;
};

const matchTaxonomyEntries = (normCorpus: string, taxonomy: HardSkillEntry[]): string[] => {
  const results: string[] = [];
  const seenNormalized = new Set<string>();

  for (const entry of taxonomy) {
    const hitTerm = entry.terms.find((term) => containsTermBoundary(normCorpus, term));
    if (!hitTerm) continue;

    const display = formatDisplayTerm(hitTerm);
    const key = normalizeForMatch(display);
    if (!key || seenNormalized.has(key)) continue;

    seenNormalized.add(key);
    results.push(display);
  }

  return results;
};

/**
 * Mengisolasi klausa syarat administratif & berkas, lalu menyisakan teks kualifikasi teknis/kerja.
 */
const isolateAdministrativeItems = (
  clauses: string[]
): { adminItems: AdministrativeItem[]; cleanSkillClauses: string[] } => {
  const adminItems: AdministrativeItem[] = [];
  const seenIds = new Set<string>();
  const cleanSkillClauses: string[] = [];

  for (const clause of clauses) {
    let cleaned = clause;

    for (const rule of ADMIN_RULES) {
      const match = clause.match(rule.pattern);
      if (match) {
        if (!seenIds.has(rule.id)) {
          seenIds.add(rule.id);
          adminItems.push({
            id: rule.id,
            label: rule.label,
            subType: rule.subType,
            rawSnippet: match[0].trim()
          });
        }
        const stripper = rule.stripPattern ?? new RegExp(rule.pattern.source, "gi");
        cleaned = cleaned.replace(stripper, " ");
      }
    }

    // Bersihkan frasa pengantar pengiriman berkas agar tidak memicu false match kata kerja/teknis
    cleaned = cleaned
      .replace(/\b(?:kirimkan|kirim|lampirkan|melampirkan|persyaratan berkas|berkas lamaran|dokumen pendukung)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length >= 2) {
      cleanSkillClauses.push(cleaned);
    }
  }

  return { adminItems, cleanSkillClauses };
};

export const normalizeJobDescription = (
  rawDescription: string,
  jobTitle = ""
): NormalizedJobQualifications => {
  const fullInput = [jobTitle, rawDescription].filter(Boolean).join("\n");
  const detectedLanguage = detectLanguage(fullInput);
  const clauses = splitClauses(rawDescription);

  // 1. Isolasi syarat administratif sebelum ekstraksi skill
  const { adminItems, cleanSkillClauses } = isolateAdministrativeItems(clauses);

  // 2. Ekstraksi kriteria pendidikan dari keseluruhan iklan
  const education_criteria = extractEducationCriteria(clauses);

  // 3. Ekstraksi hard skills & tools dari korpus yang sudah bebas berkas administratif
  const skillCorpus = [jobTitle, ...cleanSkillClauses].join(" ");
  const normSkillCorpus = normalizeForMatch(skillCorpus);

  const explicit_hard_skills_and_tools = matchTaxonomyEntries(normSkillCorpus, HARD_SKILL_TAXONOMY).slice(0, 28);

  // 4. Ekstraksi soft skills & karakter kerja
  const soft_skills_and_work_traits = matchTaxonomyEntries(normSkillCorpus, SOFT_SKILL_TAXONOMY).slice(0, 14);

  // 5. Pemetaan kompetensi domain implisit (hanya saran opt-in, tidak masuk otomatis ke CV)
  const detectedDomains: string[] = [];
  const implicit_domain_competencies: ImplicitCompetency[] = [];
  const seenImplicit = new Set<string>();

  for (const template of IMPLICIT_DOMAIN_TEMPLATES) {
    if (!template.triggers.test(fullInput)) continue;
    detectedDomains.push(template.domain);

    for (const comp of template.competencies) {
      const compNorm = normalizeForMatch(comp.skill);
      const alreadyExplicit = explicit_hard_skills_and_tools.some((explicit) => {
        const expNorm = normalizeForMatch(explicit);
        if (
          containsTermBoundary(expNorm, compNorm) ||
          containsTermBoundary(compNorm, expNorm) ||
          compNorm.includes(expNorm)
        ) {
          return true;
        }
        return Boolean(findSynonymMatch(expNorm, comp.skill));
      });

      if (alreadyExplicit || seenImplicit.has(compNorm)) continue;
      seenImplicit.add(compNorm);

      implicit_domain_competencies.push({
        id: `imp-${implicit_domain_competencies.length + 1}`,
        skill: comp.skill,
        domain: template.domain,
        reason: comp.reason
      });

      if (implicit_domain_competencies.length >= 6) break;
    }
  }

  return {
    detectedLanguage,
    detectedDomains,
    administrative_requirements: adminItems,
    education_criteria,
    explicit_hard_skills_and_tools,
    implicit_domain_competencies,
    soft_skills_and_work_traits
  };
};

export const toLegacyExtractedKeywords = (normalized: NormalizedJobQualifications): ExtractedKeywords => ({
  requiredHardSkills: normalized.explicit_hard_skills_and_tools,
  domainKeywords: normalized.education_criteria.map((edu) => edu.label),
  softSkills: normalized.soft_skills_and_work_traits
});
