import type {
  CertificationItem,
  CvTemplate,
  Education,
  OrganizationItem,
  ProjectItem,
  ResumeProfile,
  SkillGroup,
  WorkExperience,
  WorkType
} from "@/types/resume";
import { createId, emptyResumeProfile } from "@/lib/defaults";
import { sortWorkExperienceDesc } from "@/lib/chronology";
import { unique } from "@/lib/text";

export type LinkedInImportStats = {
  work: number;
  education: number;
  projects: number;
  organizations: number;
  skills: number;
  certifications: number;
  sourceKind: "linkedin_archive" | "linkedin_profile";
};

export type LinkedInParseResult = {
  profile: ResumeProfile;
  stats: LinkedInImportStats;
  message: string;
  recommendedTemplate: CvTemplate;
};

const TOOL_KEYWORD_RE =
  /\b(excel|word|powerpoint|office|figma|git|github|gitlab|docker|kubernetes|aws|gcp|azure|mysql|postgresql|postgres|mongodb|redis|laravel|react|next\.js|vue|node\.js|tailwind|flutter|django|fastapi|flask|spring|jira|trello|notion|sap|erp|wms|tableau|power bi|looker|spss|vs code|android studio|linux|mikrotik|cisco)\b/i;

const SOFT_SKILL_KEYWORD_RE =
  /\b(communication|komunikasi|komunikatif|teamwork|kerja tim|kerjasama|collaboration|kolaborasi|leadership|kepemimpinan|problem solving|pemecahan masalah|time management|manajemen waktu|adaptability|adaptif|attention to detail|teliti|critical thinking|public speaking|negotiation|negosiasi|project management|manajemen proyek|mentoring|analytical|bahasa)\b/i;

const inferWorkType = (text: string): WorkType => {
  if (/\b(intern|internship|magang|msib|pkl|co-?op|trainee)\b/i.test(text)) return "internship";
  if (/\b(freelance|lepas|contractor|contract|kontrak)\b/i.test(text)) return "freelance";
  if (/\b(part[- ]?time|paruh waktu)\b/i.test(text)) return "parttime";
  return "fulltime";
};

const classifyLinkedInSkills = (items: string[]) => {
  const hardSkills: string[] = [];
  const tools: string[] = [];
  const softSkills: string[] = [];

  for (const raw of unique(items)) {
    const clean = raw.replace(/\s*\(\d+\s*endorsements?\)/i, "").trim();
    if (!clean || clean.length > 80) continue;
    if (TOOL_KEYWORD_RE.test(clean)) {
      tools.push(clean);
    } else if (SOFT_SKILL_KEYWORD_RE.test(clean)) {
      softSkills.push(clean);
    } else {
      hardSkills.push(clean);
    }
  }

  return {
    hardSkills: unique(hardSkills),
    tools: unique(tools),
    softSkills: unique(softSkills),
    groups: [] as SkillGroup[]
  };
};

const splitDescriptionToBullets = (raw: string): string[] => {
  const clean = (raw || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [""];

  const lines = clean
    .split("\n")
    .map((line) => line.replace(/^(?:[•●▪◦‣*]|\d+[.)]\s+|-\s+)/, "").trim())
    .filter((line) => line && !/^skills?\s*:/i.test(line));

  if (lines.length >= 2) return lines;

  // If a single long paragraph has multiple sentences, split cleanly while keeping abbreviations/decimals safe
  const single = lines[0] ?? "";
  if (single.length > 140) {
    const protectedText = single
      .replace(/(\d)\.(\d)/g, "$1_DOT_$2")
      .replace(/\.js\b/gi, "_DOT_js")
      .replace(/\b(e\.g|i\.e|vs|no|min|maks|mr|ms|dr)\./gi, "$1_DOT_");
    const sentences = protectedText
      .split(/\.\s+/)
      .map((s) => s.replace(/_DOT_/g, ".").trim())
      .filter(Boolean)
      .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));
    if (sentences.length >= 2) return sentences;
  }

  return single ? [single] : [""];
};

const cleanLinkedInWebsites = (raw: string): { linkedinUrl: string; portfolioUrl: string } => {
  const tokens = raw
    .replace(/\[[^\]:]+:\s*([^\]]+)\]/g, "$1")
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => /^(?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(t));

  let linkedinUrl = "";
  let portfolioUrl = "";

  for (const tok of tokens) {
    const clean = tok.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
    if (!linkedinUrl && /linkedin\.com\//i.test(clean)) {
      linkedinUrl = clean;
    } else if (!portfolioUrl && clean) {
      portfolioUrl = clean;
    }
  }

  return { linkedinUrl, portfolioUrl };
};

const MONTH_TOKEN =
  "(?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust)?|Agu(?:stus)?|Agust|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)";
const DATE_POINT = `(?:${MONTH_TOKEN}\\.?\\s+(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])\\/(?:19|20)\\d{2}|(?:19|20)\\d{2})`;
const PRESENT_WORD = "(?:Present|Current|Now|Ongoing|Sekarang|Saat ini|Hingga saat ini)";
const RANGE_JOINER = "(?:[-\\u2013\\u2014]|to|s\\.?d\\.?|sampai|hingga)";

const LINKEDIN_DATE_RANGE_LINE_RE = new RegExp(
  `^(${DATE_POINT})\\s*(?:${RANGE_JOINER}\\s*(${DATE_POINT}|${PRESENT_WORD}))?(?:\\s*(?:[·•]|\\()\\s*[^)\\n]+\\)?)?\\s*$`,
  "i"
);

const LINKEDIN_TOTAL_DURATION_RE =
  /^(?:\d+\s+(?:yrs?|years?|tahun|thn)(?:\s+\d+\s+(?:mos?|months?|bulan|bln))?|\d+\s+(?:mos?|months?|bulan|bln))$/i;

const cleanDateString = (value: string): { text: string; isCurrent: boolean } => {
  const clean = value.trim();
  if (!clean) return { text: "", isCurrent: false };
  if (new RegExp(`^${PRESENT_WORD}$`, "i").test(clean)) {
    return { text: /sekarang|saat ini/i.test(clean) ? "Sekarang" : "Present", isCurrent: true };
  }
  return { text: clean, isCurrent: false };
};

const parseLinkedInDateRange = (
  rawLine: string
): { startDate: string; endDate: string; period: string; isCurrent: boolean } | null => {
  const trimmed = rawLine.trim();
  const match = trimmed.match(LINKEDIN_DATE_RANGE_LINE_RE);
  if (!match) return null;

  const startDate = match[1].trim();
  const endParsed = match[2] ? cleanDateString(match[2]) : { text: "", isCurrent: false };
  const period = endParsed.text ? `${startDate} - ${endParsed.text}` : startDate;

  return {
    startDate,
    endDate: endParsed.text,
    period,
    isCurrent: endParsed.isCurrent
  };
};

// --- 1. RFC 4180 CSV Parser for LinkedIn Data Export Archive ---

export const parseCsvRecords = (csvText: string): Array<Record<string, string>> => {
  const input = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!input.trim()) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      currentRow.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      currentRow.push(field.trim());
      if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || currentRow.length > 0) {
    currentRow.push(field.trim());
    if (currentRow.some((cell) => cell !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  // LinkedIn sometimes prepends a note row above the actual CSV header (e.g., Connections.csv Notes).
  // Locate the most likely header row near top of file.
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(rows.length - 1, 4); r += 1) {
    const nonEmptyCols = rows[r].filter(Boolean).length;
    const nextNonEmptyCols = rows[r + 1].filter(Boolean).length;
    if (nonEmptyCols === 1 && nextNonEmptyCols >= 2) {
      headerRowIdx = r + 1;
    } else {
      break;
    }
  }

  const headers = rows[headerRowIdx].map((h) => h.trim());
  const records: Array<Record<string, string>> = [];

  for (let r = headerRowIdx + 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row.some(Boolean)) continue;
    const rec: Record<string, string> = {};
    headers.forEach((hdr, idx) => {
      if (hdr) rec[hdr] = (row[idx] ?? "").trim();
    });
    records.push(rec);
  }

  return records;
};

const splitDegreeFieldCsv = (raw: string): { degree: string; fieldOfStudy: string } => {
  const clean = raw.trim();
  if (!clean) return { degree: "", fieldOfStudy: "" };
  const dashSplit = clean.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
  if (dashSplit) return { degree: dashSplit[1].trim(), fieldOfStudy: dashSplit[2].trim() };
  const commaSplit = clean.match(/^([^,]+),\s*(.+)$/);
  if (commaSplit) return { degree: commaSplit[1].trim(), fieldOfStudy: commaSplit[2].trim() };
  const inMatch = clean.match(/^(Bachelor(?:'s)?(?:\s+of)?|Master(?:'s)?(?:\s+of)?|Associate(?:'s)?|S1|D3|D4|S2)\s+(?:in|of)\s+(.+)$/i);
  if (inMatch) return { degree: inMatch[1].trim(), fieldOfStudy: inMatch[2].trim() };
  return { degree: clean, fieldOfStudy: "" };
};

const extractYear = (raw?: string): string => {
  const m = (raw ?? "").match(/\b((?:19|20)\d{2})\b/);
  return m ? m[1] : "";
};

const findCsvTable = (filesByName: Record<string, string>, candidates: string[]): Array<Record<string, string>> => {
  for (const [fileName, content] of Object.entries(filesByName)) {
    const base = fileName.split(/[\\/]/).pop()?.toLowerCase().trim() ?? "";
    if (candidates.some((cand) => base === cand || base.endsWith(`_${cand}`))) {
      return parseCsvRecords(content);
    }
  }
  return [];
};

const readCell = (row: Record<string, string>, keys: string[]): string => {
  for (const k of keys) {
    if (typeof row[k] === "string" && row[k].trim()) return row[k].trim();
  }
  const lowerMap = new Map(Object.entries(row).map(([rk, rv]) => [rk.toLowerCase(), rv]));
  for (const k of keys) {
    const hit = lowerMap.get(k.toLowerCase());
    if (typeof hit === "string" && hit.trim()) return hit.trim();
  }
  return "";
};

export const parseLinkedInCsvArchive = (
  filesByName: Record<string, string>,
  overrideLinkedinUrl?: string
): LinkedInParseResult => {
  const profile = emptyResumeProfile();

  const profileRows = findCsvTable(filesByName, ["profile.csv"]);
  const emailRows = findCsvTable(filesByName, ["email addresses.csv", "emails.csv"]);
  const phoneRows = findCsvTable(filesByName, ["phonenumbers.csv", "phone numbers.csv"]);
  const positionRows = findCsvTable(filesByName, ["positions.csv"]);
  const eduRows = findCsvTable(filesByName, ["education.csv"]);
  const skillRows = findCsvTable(filesByName, ["skills.csv"]);
  const certRows = findCsvTable(filesByName, ["certifications.csv"]);
  const projectRows = findCsvTable(filesByName, ["projects.csv"]);
  const volunteerRows = findCsvTable(filesByName, ["volunteering.csv", "volunteer.csv"]);
  const languageRows = findCsvTable(filesByName, ["languages.csv"]);
  const honorRows = findCsvTable(filesByName, ["honors.csv"]);

  if (profileRows.length > 0) {
    const p0 = profileRows[0];
    const first = readCell(p0, ["First Name"]);
    const last = readCell(p0, ["Last Name"]);
    profile.contact.fullName = [first, last].filter(Boolean).join(" ").trim();
    profile.contact.headline = readCell(p0, ["Headline"]);
    profile.contact.location = readCell(p0, ["Geo Location", "Address"]);
    profile.summary = readCell(p0, ["Summary"]);

    const webLinks = cleanLinkedInWebsites(readCell(p0, ["Websites"]));
    if (webLinks.linkedinUrl) profile.contact.linkedinUrl = webLinks.linkedinUrl;
    if (webLinks.portfolioUrl) profile.contact.portfolioUrl = webLinks.portfolioUrl;
  }

  if (overrideLinkedinUrl?.trim()) {
    profile.contact.linkedinUrl = overrideLinkedinUrl
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "");
  }

  if (emailRows.length > 0) {
    const primaryRow =
      emailRows.find((r) => /^(yes|true|1)$/i.test(readCell(r, ["Primary", "Is primary", "Is Primary"]))) ??
      emailRows.find((r) => /^(yes|true|1)$/i.test(readCell(r, ["Confirmed"]))) ??
      emailRows[0];
    const email = readCell(primaryRow, ["Email Address", "Email"]);
    if (email) profile.contact.email = email;
  }

  if (phoneRows.length > 0) {
    const num = readCell(phoneRows[0], ["Number", "Phone Number"]);
    if (num) profile.contact.phone = num;
  }

  const workExperience: WorkExperience[] = sortWorkExperienceDesc(
    positionRows
      .map((row): WorkExperience | null => {
        const company = readCell(row, ["Company Name", "Company"]);
        const role = readCell(row, ["Title", "Position", "Role"]);
        if (!company && !role) return null;
        const startDate = readCell(row, ["Started On", "Start Date"]);
        const rawEnd = readCell(row, ["Finished On", "End Date"]);
        const isCurrent = !rawEnd;
        const description = readCell(row, ["Description"]);
        return {
          id: createId(),
          company,
          role,
          type: inferWorkType(`${role} ${description}`),
          location: readCell(row, ["Location"]),
          startDate,
          endDate: isCurrent ? "Present" : rawEnd,
          isCurrent,
          bulletPoints: splitDescriptionToBullets(description)
        };
      })
      .filter((w): w is WorkExperience => w !== null)
  );

  const educationList: Education[] = eduRows
    .map((row): Education | null => {
      const institution = readCell(row, ["School Name", "School", "Institution"]);
      const degreeName = readCell(row, ["Degree Name", "Degree"]);
      const notes = readCell(row, ["Notes"]);
      const activities = readCell(row, ["Activities"]);
      if (!institution && !degreeName) return null;
      const parsedDeg = splitDegreeFieldCsv(degreeName);
      const gpaHit = `${notes} ${activities}`.match(/(?:IPK|GPA|Grade|Nilai)\s*:?\s*([0-4](?:[.,]\d{1,2})?(?:\s*\/\s*4(?:[.,]00?)?)?)/i);
      const start = readCell(row, ["Start Date"]);
      const end = readCell(row, ["End Date"]);
      const graduationDate = [start, end].filter(Boolean).join(" - ");

      return {
        id: createId(),
        institution,
        degree: parsedDeg.degree,
        fieldOfStudy: parsedDeg.fieldOfStudy,
        gpa: gpaHit ? gpaHit[1].replace(/\s+/g, "") : "",
        graduationDate,
        thesisTitle: "",
        relevantCoursework: [],
        achievements: [activities, gpaHit ? notes.replace(gpaHit[0], "").trim() : notes]
          .filter(Boolean)
          .join("; ")
      };
    })
    .filter((e): e is Education => e !== null);

  if (honorRows.length > 0 && educationList.length > 0) {
    const honorSummary = honorRows
      .map((h) => readCell(h, ["Title"]))
      .filter(Boolean)
      .slice(0, 3)
      .join("; ");
    if (honorSummary) {
      educationList[0].achievements = [educationList[0].achievements, honorSummary]
        .filter(Boolean)
        .join("; ");
    }
  }

  const projects: ProjectItem[] = projectRows
    .map((row): ProjectItem | null => {
      const name = readCell(row, ["Title", "Name"]);
      if (!name) return null;
      const start = readCell(row, ["Started On", "Start Date"]);
      const end = readCell(row, ["Finished On", "End Date"]);
      return {
        id: createId(),
        name,
        role: "",
        context: "Proyek LinkedIn",
        period: [start, end || (start ? "Present" : "")].filter(Boolean).join(" - "),
        technologies: [],
        url: readCell(row, ["Url"]),
        bulletPoints: splitDescriptionToBullets(readCell(row, ["Description"]))
      };
    })
    .filter((p): p is ProjectItem => p !== null);

  const organizations: OrganizationItem[] = volunteerRows
    .map((row): OrganizationItem | null => {
      const organization = readCell(row, ["Company Name", "Organization"]);
      const role = readCell(row, ["Role", "Title"]);
      if (!organization && !role) return null;
      const start = readCell(row, ["Started On", "Start Date"]);
      const end = readCell(row, ["Finished On", "End Date"]);
      const desc = readCell(row, ["Description"]);
      const cause = readCell(row, ["Cause"]);
      return {
        id: createId(),
        organization,
        role: role || cause || "Volunteer",
        period: [start, end || (start ? "Present" : "")].filter(Boolean).join(" - "),
        bulletPoints: splitDescriptionToBullets(desc)
      };
    })
    .filter((o): o is OrganizationItem => o !== null);

  const certificationItems: CertificationItem[] = certRows
    .map((row): CertificationItem | null => {
      const name = readCell(row, ["Name", "Title"]);
      if (!name) return null;
      return {
        id: createId(),
        name,
        issuer: readCell(row, ["Authority", "Issuer"]),
        year: extractYear(readCell(row, ["Started On", "Finished On"]))
      };
    })
    .filter((c): c is CertificationItem => c !== null);

  const rawSkills = skillRows.map((row) => readCell(row, ["Name", "Skill"])).filter(Boolean);
  const rawLanguages = languageRows
    .map((row) => {
      const name = readCell(row, ["Name", "Language"]);
      const prof = readCell(row, ["Proficiency"]);
      return name ? (prof ? `${name} (${prof})` : name) : "";
    })
    .filter(Boolean);

  const classifiedSkills = classifyLinkedInSkills([...rawSkills, ...rawLanguages]);

  const internCount = workExperience.filter((w) => w.type === "internship").length;
  const experienceLevel =
    workExperience.length >= 3 && internCount <= workExperience.length / 2
      ? "experienced"
      : workExperience.length >= 1
      ? "early_career"
      : "fresh_graduate";

  const finalProfile: ResumeProfile = {
    ...profile,
    experienceLevel,
    workExperience,
    education: educationList.length ? educationList : profile.education,
    projects,
    organizations,
    certificationItems,
    skills: classifiedSkills
  };

  const stats: LinkedInImportStats = {
    work: workExperience.length,
    education: educationList.length,
    projects: projects.length,
    organizations: organizations.length,
    skills: unique([...classifiedSkills.hardSkills, ...classifiedSkills.tools, ...classifiedSkills.softSkills]).length,
    certifications: certificationItems.length,
    sourceKind: "linkedin_archive"
  };

  const recommendedTemplate: CvTemplate =
    stats.work >= 4 || stats.organizations > 0 || stats.projects >= 2 ? "compact_centered" : "classic_editorial";

  return {
    profile: finalProfile,
    stats,
    message: buildLinkedInStatsMessage(stats),
    recommendedTemplate
  };
};

// --- 2. LinkedIn Profile PDF ("Save to PDF") & Web Copy-Paste Parser ---

type LinkedInSectionKey =
  | "header"
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects"
  | "organizations"
  | "languages"
  | "honors";

const LINKEDIN_SECTION_HEADINGS: Array<{ key: LinkedInSectionKey; regex: RegExp }> = [
  { key: "contact", regex: /^(contact|kontak|hubungi|contact info|info kontak|informasi kontak)$/i },
  {
    key: "summary",
    regex: /^(summary|about|tentang|tentang saya|ringkasan|ringkasan profil|profil)$/i
  },
  {
    key: "experience",
    regex: /^(experience|pengalaman|pengalaman kerja|work experience|riwayat pekerjaan)$/i
  },
  {
    key: "education",
    regex: /^(education|pendidikan|riwayat pendidikan)$/i
  },
  {
    key: "skills",
    regex: /^(top skills|skills|keahlian teratas|keahlian utama|keterampilan utama|keahlian|keterampilan)$/i
  },
  {
    key: "certifications",
    regex: /^(certifications|licenses & certifications|licenses and certifications|lisensi & sertifikasi|lisensi dan sertifikasi|sertifikasi|kursus|courses)$/i
  },
  {
    key: "projects",
    regex: /^(projects|proyek|proyek & publikasi|publications|publikasi)$/i
  },
  {
    key: "organizations",
    regex: /^(volunteering|volunteer experience|kegiatan sukarela|kesukarelawanan|pengalaman sukarela|organizations|organisasi)$/i
  },
  { key: "languages", regex: /^(languages|bahasa)$/i },
  { key: "honors", regex: /^(honors-awards|honors & awards|honors and awards|penghargaan|penghargaan & kehormatan)$/i }
];

const LINKEDIN_NOISE_RE =
  /^(?:page\s+\d+\s+of\s+\d+|halaman\s+\d+\s+dari\s+\d+|show all\s+\d+.*|tampilkan semua.*|see all\s+\d+.*|see more|lihat lebih banyak|\.\.\.more|show credential|tampilkan kredensial|connect|message|ikutilah|ikuti|terhubung|open to work|500\+\s+connections|\d+\s+(?:connections|koneksi|followers|pengikut)|\d+(?:st|nd|rd|th)?\s+degree connection|activity|aktivitas|featured|unggulan|recommendations|rekomendasi)$/i;

const LINKEDIN_SUBMETA_RE =
  /^(?:credential id\b.*|id kredensial\b.*|issued\s+.*|diterbitkan\s+.*|endorsed by\s+.*|disetujui oleh\s+.*|\d+\s+endorsements?)$/i;

export const looksLikeLinkedInText = (raw: string): boolean => {
  const clean = raw.trim();
  if (!clean) return false;
  let signals = 0;

  if (
    /\b(?:top skills|keahlian teratas|keahlian utama|keterampilan utama|licenses\s*&\s*certifications|lisensi\s*&\s*sertifikasi)\b/i.test(
      clean
    )
  ) {
    signals += 2;
  }
  if (/linkedin\.com\/in\/[^\s|]+\s*\(LinkedIn\)/i.test(clean) || /^\(LinkedIn\)$/im.test(clean)) {
    signals += 2;
  }
  if (/^(?:page\s+\d+\s+of\s+\d+|halaman\s+\d+\s+dari\s+\d+)\s*$/im.test(clean)) signals += 2;
  if (/\(\s*\d+\s+(?:yrs?|years?|mos?|months?|tahun|bulan|thn|bln)[^)]*\)/i.test(clean)) signals += 2;
  if (/·\s*(?:\d+\s+(?:yrs?|mos?|thn|bln)|full-time|internship|part-time|on-site|hybrid|remote|purnawaktu|magang)/i.test(clean)) {
    signals += 2;
  }
  if (
    /^(?:summary|ringkasan|about|experience|pengalaman|education|pendidikan|top skills|keahlian teratas|contact|hubungi)$/im.test(
      clean
    ) &&
    !clean.includes("|")
  ) {
    signals += 1;
  }

  return signals >= 2;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const LINKEDIN_URL_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[^\s|()]+/i;
const URL_TOKEN_RE = /(?:https?:\/\/[^\s|()]+|(?:github|gitlab|behance|dribbble|medium|vercel|netlify)\.(?:com|net|app|io)\/[^\s|()]+|\b[a-z0-9-]+\.(?:dev|io|me|id|app|tech|xyz|co)\b(?:\/[^\s|()]*)?)/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;

const WORK_TYPE_SUFFIX_RE =
  /\s*[·•]\s*(full[- ]?time|part[- ]?time|internship|freelance|contract|self-employed|purnawaktu|paruh waktu|magang|lepas|kontrak)\s*$/i;

const LOCATION_SUFFIX_RE =
  /\s*[·•]\s*(on[- ]?site|hybrid|remote|di lokasi|hibrida|jarak jauh)\s*$/i;

const looksLikeLocationLine = (line: string): boolean => {
  const clean = line.replace(LOCATION_SUFFIX_RE, "").trim();
  if (!clean || clean.length > 72 || /[.!?]$/.test(clean)) return false;
  if (LOCATION_SUFFIX_RE.test(line)) return true;
  if (/^(remote|jakarta|bandung|surabaya|semarang|yogyakarta|jogja|medan|bekasi|tangerang|depok|bogor|malang|solo|surakarta|bali|denpasar|makassar|singapore|indonesia)\b/i.test(clean)) {
    return true;
  }
  if (/^[A-Za-z\s.-]+,\s*[A-Za-z\s.-]+(?:,\s*[A-Za-z\s.-]+)?$/.test(clean) && clean.split(/\s+/).length <= 7) {
    return true;
  }
  return false;
};

const extractLocationAndTypeFromLine = (
  raw: string
): { cleanName: string; workType?: WorkType } => {
  const match = raw.match(WORK_TYPE_SUFFIX_RE);
  if (!match) return { cleanName: raw.trim() };
  return {
    cleanName: raw.slice(0, match.index).trim(),
    workType: inferWorkType(match[1])
  };
};

const parseLinkedInExperienceLines = (
  lines: string[]
): { entries: WorkExperience[]; inlineSkills: string[] } => {
  const inlineSkills: string[] = [];
  // Pre-filter duplicate adjacent identical company lines produced by LinkedIn Web DOM copy-paste
  const cleaned: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || LINKEDIN_NOISE_RE.test(line)) continue;
    const inlineSkillMatch = line.match(/^(?:Skills|Keahlian)\s*:\s*(.+)$/i);
    if (inlineSkillMatch) {
      inlineSkillMatch[1]
        .split(/\s*[·•,]\s*/)
        .map((s) => s.trim())
        .filter((s) => s && !/^and\s+\+\d+\s+skills?$/i.test(s))
        .forEach((s) => inlineSkills.push(s));
      continue;
    }
    if (cleaned.length > 0 && cleaned[cleaned.length - 1] === line && line.length <= 70) {
      continue;
    }
    cleaned.push(line);
  }

  // Locate every anchor date range line inside experience
  const dateAnchors: number[] = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    if (parseLinkedInDateRange(cleaned[i])) {
      dateAnchors.push(i);
    }
  }

  if (dateAnchors.length === 0) {
    return { entries: [], inlineSkills };
  }

  const entries: WorkExperience[] = [];
  let groupedCompany = "";
  let prevBodyEnd = 0;

  for (let aIdx = 0; aIdx < dateAnchors.length; aIdx += 1) {
    const anchor = dateAnchors[aIdx];
    const nextAnchor = dateAnchors[aIdx + 1] ?? cleaned.length;
    const dateInfo = parseLinkedInDateRange(cleaned[anchor])!;

    // Look backward in [prevBodyEnd .. anchor - 1] for Role & Company
    const preSlice = cleaned.slice(prevBodyEnd, anchor).filter((l) => l.trim().length > 0);
    let company = "";
    let role = "";
    let explicitType: WorkType | undefined;

    if (preSlice.length >= 3) {
      // Check for grouped multi-role header: Company \n Total Duration \n Role
      const maybeDurationIdx = preSlice.findIndex((l) => LINKEDIN_TOTAL_DURATION_RE.test(l));
      if (maybeDurationIdx > 0) {
        const compInfo = extractLocationAndTypeFromLine(preSlice[maybeDurationIdx - 1]);
        company = compInfo.cleanName;
        groupedCompany = company;
        explicitType = compInfo.workType;
        role = preSlice.slice(maybeDurationIdx + 1).join(" ").trim();
      } else {
        const lastTwo = preSlice.slice(-2);
        const info0 = extractLocationAndTypeFromLine(lastTwo[0]);
        const info1 = extractLocationAndTypeFromLine(lastTwo[1]);
        if (info1.workType) {
          // Web Copy-Paste style: Role \n Company · Full-time
          role = info0.cleanName;
          company = info1.cleanName;
          explicitType = info1.workType;
        } else {
          // Standard LinkedIn PDF: Company \n Role
          company = info0.cleanName;
          role = info1.cleanName;
        }
        groupedCompany = company;
      }
    } else if (preSlice.length === 2) {
      const info0 = extractLocationAndTypeFromLine(preSlice[0]);
      const info1 = extractLocationAndTypeFromLine(preSlice[1]);
      if (LINKEDIN_TOTAL_DURATION_RE.test(info0.cleanName)) {
        company = groupedCompany;
        role = info1.cleanName;
        explicitType = info1.workType;
      } else if (info1.workType) {
        role = info0.cleanName;
        company = info1.cleanName;
        explicitType = info1.workType;
        groupedCompany = company;
      } else {
        company = info0.cleanName;
        role = info1.cleanName;
        groupedCompany = company;
      }
    } else if (preSlice.length === 1) {
      const info0 = extractLocationAndTypeFromLine(preSlice[0]);
      role = info0.cleanName;
      explicitType = info0.workType;
      company = groupedCompany;
    }

    // Look forward until next entry's header starts
    let bodyStop = nextAnchor;
    if (aIdx + 1 < dateAnchors.length) {
      // Keep at most 2 header lines (or 3 if total duration line exists) right before nextAnchor
      let headerLinesCount = 2;
      if (nextAnchor - 2 >= anchor + 1 && LINKEDIN_TOTAL_DURATION_RE.test(cleaned[nextAnchor - 2])) {
        headerLinesCount = 3;
      } else if (nextAnchor - 1 >= anchor + 1 && !cleaned[nextAnchor - 2]) {
        headerLinesCount = 1;
      }
      // If previous entry shares groupedCompany (no company change line), header might only be 1 line
      const candidateTwoBack = (cleaned[nextAnchor - 2] ?? "").trim();
      const candidateOneBack = (cleaned[nextAnchor - 1] ?? "").trim();
      const twoBackWordCount = candidateTwoBack ? candidateTwoBack.split(/\s+/).length : 0;
      const twoBackLooksLikeProse = Boolean(
        candidateTwoBack &&
          (/^(?:[•●▪◦‣*]|\d+[.)]\s+|-\s+)/.test(candidateTwoBack) ||
            (candidateTwoBack.length > 68 && !/[·•|]/.test(candidateTwoBack)) ||
            (/[.!]$/.test(candidateTwoBack) &&
              !/\b(?:inc|ltd|llc|corp|co|pte|tbk|bhd|sdn|pt|cv)\.?$/i.test(candidateTwoBack) &&
              twoBackWordCount >= 4) ||
            (twoBackWordCount >= 6 &&
              !/\b(?:pt|cv|university|universitas|institut|institute|bank|group|corp|inc|ltd|tbk|studio|agency|foundation|ministry|kementerian|dinas)\b/i.test(
                candidateTwoBack
              )))
      );
      if (nextAnchor - anchor <= 2 || twoBackLooksLikeProse) {
        headerLinesCount = candidateOneBack ? 1 : 0;
      }
      bodyStop = Math.max(anchor + 1, nextAnchor - headerLinesCount);
    }

    let bodyCursor = anchor + 1;
    let location = "";
    if (bodyCursor < bodyStop && looksLikeLocationLine(cleaned[bodyCursor])) {
      location = cleaned[bodyCursor].replace(LOCATION_SUFFIX_RE, "").trim();
      bodyCursor += 1;
    }

    const bodyLines = cleaned.slice(bodyCursor, bodyStop);
    const bulletPoints = bodyLines.length
      ? splitDescriptionToBullets(bodyLines.join("\n"))
      : [""];

    entries.push({
      id: createId(),
      company,
      role: role || "Pengalaman",
      type: explicitType ?? inferWorkType(`${role} ${bodyLines.join(" ")}`),
      location,
      startDate: dateInfo.startDate,
      endDate: dateInfo.endDate,
      isCurrent: dateInfo.isCurrent,
      bulletPoints
    });

    prevBodyEnd = bodyStop;
  }

  return { entries, inlineSkills };
};

const INSTITUTION_HINT_RE =
  /\b(?:universit(?:as|y)|institut(?:e)?|sekolah|sma|sman|smk|smkn|smp|smpn|sdn|politeknik|akademi|college|school|faculty|fakultas|stikom|binus)\b/i;

const parseLinkedInEducationLines = (lines: string[]): Education[] => {
  const entries: Education[] = [];
  let current: Education | null = null;

  const flush = () => {
    if (current && (current.institution || current.degree || current.fieldOfStudy)) {
      entries.push(current);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      LINKEDIN_NOISE_RE.test(line) ||
      EMAIL_RE.test(line) ||
      LINKEDIN_URL_RE.test(line) ||
      /^(?:\(LinkedIn\)|hubungi|contact|kontak)$/i.test(line)
    ) {
      continue;
    }

    // LinkedIn PDF: "Bachelor's degree, Computer Science · (2021 - 2025)"
    const pdfDegPeriodMatch = line.match(
      /^(.+?)\s*[·•]\s*\(\s*([^)]+)\s*\)\s*$/
    );
    if (pdfDegPeriodMatch && current) {
      const parsedDeg = splitDegreeFieldCsv(pdfDegPeriodMatch[1]);
      if (!current.degree) current.degree = parsedDeg.degree;
      if (!current.fieldOfStudy) current.fieldOfStudy = parsedDeg.fieldOfStudy;
      if (!current.graduationDate) current.graduationDate = pdfDegPeriodMatch[2].trim();
      continue;
    }

    const gradeMatch = line.match(/^(?:Grade|Nilai|IPK|GPA)\s*:?\s*([0-4](?:[.,]\d{1,2})?(?:\s*\/\s*4(?:[.,]00?)?)?)/i);
    if (gradeMatch && current) {
      current.gpa = gradeMatch[1].replace(/\s+/g, "");
      continue;
    }

    const actMatch = line.match(/^(?:Activities and societies|Aktivitas dan organisasi|Activities)\s*:\s*(.+)$/i);
    if (actMatch && current) {
      current.achievements = actMatch[1].trim();
      continue;
    }

    const dateInfo = parseLinkedInDateRange(line);
    if (dateInfo && current) {
      current.graduationDate = dateInfo.period;
      continue;
    }

    const parenRangeMatch = line.match(/\(\s*((?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Sekarang))\s*\)/i);
    if (parenRangeMatch && current && !current.graduationDate) {
      current.graduationDate = parenRangeMatch[1].trim();
      const remainder = line
        .replace(parenRangeMatch[0], "")
        .replace(/[·•,\-\s]+$/, "")
        .trim();
      if (remainder && !current.degree && !current.fieldOfStudy) {
        const parsedDeg = splitDegreeFieldCsv(remainder);
        current.degree = parsedDeg.degree;
        current.fieldOfStudy = parsedDeg.fieldOfStudy;
      }
      continue;
    }

    if (
      !current ||
      (current.institution &&
        ((current.degree || current.graduationDate) && !line.includes(",") ||
          INSTITUTION_HINT_RE.test(line)))
    ) {
      flush();
      current = {
        id: createId(),
        institution: line,
        degree: "",
        fieldOfStudy: "",
        gpa: "",
        graduationDate: "",
        thesisTitle: "",
        relevantCoursework: [],
        achievements: ""
      };
    } else if (!current.degree && !current.fieldOfStudy) {
      const parsedDeg = splitDegreeFieldCsv(line);
      current.degree = parsedDeg.degree;
      current.fieldOfStudy = parsedDeg.fieldOfStudy;
    } else if (!current.achievements) {
      current.achievements = line;
    }
  }

  flush();
  return entries.length ? entries : emptyResumeProfile().education;
};

const parseLinkedInCertificationLines = (lines: string[]): CertificationItem[] => {
  const cleanLines = lines
    .map((l) => l.trim())
    .filter((l) => l && !LINKEDIN_NOISE_RE.test(l));

  const items: CertificationItem[] = [];
  for (const line of cleanLines) {
    const issuedYearMatch = line.match(/^(?:issued|diterbitkan)\s+.*?\b((?:19|20)\d{2})\b/i);
    if (issuedYearMatch) {
      if (items.length > 0 && !items[items.length - 1].year) {
        items[items.length - 1].year = issuedYearMatch[1];
      }
      continue;
    }
    if (LINKEDIN_SUBMETA_RE.test(line)) continue;
    const parenMatch = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (parenMatch && items.length > 0 && /^(?:19|20)\d{2}$/.test(parenMatch[2].trim())) {
      items[items.length - 1].year = parenMatch[2].trim();
      continue;
    }
    const yearMatch = line.match(/\b((?:19|20)\d{2})\b/);
    // Heuristic: short organization names following an un-issued cert row attach as issuer
    if (
      items.length > 0 &&
      !items[items.length - 1].issuer &&
      !/[.;:]/.test(line) &&
      line.split(/\s+/).length <= 5 &&
      /(?:dicoding|google|aws|amazon|microsoft|coursera|udemy|bnsp|kominfo|cisco|oracle|meta|ibm|alibaba|ruangguru|revou|myskill|hacktiv)/i.test(
        line
      )
    ) {
      items[items.length - 1].issuer = line;
      continue;
    }
    items.push({
      id: createId(),
      name: line,
      issuer: "",
      year: yearMatch?.[1] ?? ""
    });
  }
  return items;
};

const parseLinkedInOrganizationLines = (lines: string[]): OrganizationItem[] => {
  const { entries } = parseLinkedInExperienceLines(lines);
  return entries.map((e) => ({
    id: createId(),
    organization: e.company,
    role: e.role,
    period: [e.startDate, e.endDate].filter(Boolean).join(" - "),
    bulletPoints: e.bulletPoints
  }));
};

const parseLinkedInProjectLines = (lines: string[]): ProjectItem[] => {
  const { entries } = parseLinkedInExperienceLines(lines);
  if (entries.length > 0) {
    return entries.map((e) => ({
      id: createId(),
      name: e.company || e.role,
      role: e.company ? e.role : "",
      context: "Proyek LinkedIn",
      period: [e.startDate, e.endDate].filter(Boolean).join(" - "),
      technologies: [],
      url: "",
      bulletPoints: e.bulletPoints
    }));
  }

  const projects: ProjectItem[] = [];
  for (const line of lines.filter((l) => l.trim() && !LINKEDIN_NOISE_RE.test(l))) {
    projects.push({
      id: createId(),
      name: line.trim(),
      role: "",
      context: "Proyek LinkedIn",
      period: "",
      technologies: [],
      url: "",
      bulletPoints: [""]
    });
  }
  return projects;
};

const unwrapSidebarContactLines = (lines: string[]): string[] => {
  const result: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i].trim();
    if (!line) continue;

    while (
      /(?:linkedin\.com\/|https?:\/\/|www\.)\S*$/i.test(line) &&
      !/\(LinkedIn\)$/i.test(line) &&
      i + 1 < lines.length
    ) {
      const next = lines[i + 1].trim();
      if (/^\(LinkedIn\)$/i.test(next)) {
        line = `${line} (LinkedIn)`;
        i += 1;
        break;
      }
      if (
        next &&
        !EMAIL_RE.test(next) &&
        /^[a-z0-9._/?=&%+-]+(?:\s*\(LinkedIn\))?$/i.test(next)
      ) {
        line = `${line}${next}`;
        i += 1;
        if (/\(LinkedIn\)$/i.test(next)) break;
      } else {
        break;
      }
    }

    result.push(line);
  }
  return result;
};

export const parseLinkedInText = (
  raw: string,
  overrideLinkedinUrl?: string
): LinkedInParseResult => {
  const sections: Record<LinkedInSectionKey, string[]> = {
    header: [],
    contact: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    organizations: [],
    languages: [],
    honors: []
  };

  let current: LinkedInSectionKey = "header";
  const allLines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter((line) => Boolean(line) && !LINKEDIN_NOISE_RE.test(line));

  for (const line of allLines) {
    const candidate = line
      .replace(/[:\s]+$/, "")
      .replace(/^[-•*\s]+/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (candidate.length > 0 && candidate.length < 48) {
      const matched = LINKEDIN_SECTION_HEADINGS.find((h) => h.regex.test(candidate));
      if (matched) {
        current = matched.key;
        continue;
      }
    }

    sections[current].push(line);
  }

  const profile = emptyResumeProfile();

  // Parse header (Name, Headline, Location) + Contact sidebar
  const unwrappedContactLines = unwrapSidebarContactLines(sections.contact);
  const contactSource = [...sections.header, ...unwrappedContactLines];
  const headerTextLines: string[] = [];

  for (const line of contactSource) {
    const cleanLine = line.replace(/\s*\(LinkedIn\)\s*/gi, " ").trim();
    if (EMAIL_RE.test(cleanLine) && !profile.contact.email) {
      profile.contact.email = cleanLine.match(EMAIL_RE)?.[0] ?? "";
    }
    if (LINKEDIN_URL_RE.test(cleanLine) && !profile.contact.linkedinUrl) {
      profile.contact.linkedinUrl = (cleanLine.match(LINKEDIN_URL_RE)?.[0] ?? "")
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "");
    }
    if (URL_TOKEN_RE.test(cleanLine) && !EMAIL_RE.test(cleanLine) && !LINKEDIN_URL_RE.test(cleanLine) && !profile.contact.portfolioUrl) {
      profile.contact.portfolioUrl = (cleanLine.match(URL_TOKEN_RE)?.[0] ?? "")
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "");
    }
    if (PHONE_RE.test(cleanLine) && !profile.contact.phone && cleanLine.replace(/\D/g, "").length >= 8 && !EMAIL_RE.test(cleanLine)) {
      profile.contact.phone = cleanLine;
    }

    if (
      sections.header.includes(line) &&
      !EMAIL_RE.test(line) &&
      !LINKEDIN_URL_RE.test(line) &&
      !URL_TOKEN_RE.test(line)
    ) {
      headerTextLines.push(cleanLine);
    }
  }

  // Fallback scan across all unwrapped lines if contact heading was missing or split
  if (!profile.contact.email || !profile.contact.linkedinUrl) {
    for (const line of unwrapSidebarContactLines(allLines)) {
      const cleanLine = line.replace(/\s*\(LinkedIn\)\s*/gi, " ").trim();
      if (!profile.contact.email && EMAIL_RE.test(cleanLine)) {
        profile.contact.email = cleanLine.match(EMAIL_RE)?.[0] ?? "";
      }
      if (!profile.contact.linkedinUrl && LINKEDIN_URL_RE.test(cleanLine)) {
        profile.contact.linkedinUrl = (cleanLine.match(LINKEDIN_URL_RE)?.[0] ?? "")
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "");
      }
    }
  }

  if (headerTextLines.length > 0) {
    profile.contact.fullName = headerTextLines[0];
  }
  if (headerTextLines.length >= 2) {
    const lastLine = headerTextLines[headerTextLines.length - 1];
    if (headerTextLines.length >= 3 && looksLikeLocationLine(lastLine)) {
      profile.contact.location = lastLine;
      profile.contact.headline = headerTextLines.slice(1, -1).join(" ");
    } else if (looksLikeLocationLine(lastLine)) {
      profile.contact.location = lastLine;
    } else {
      profile.contact.headline = headerTextLines.slice(1).join(" ");
    }
  }

  if (overrideLinkedinUrl?.trim()) {
    profile.contact.linkedinUrl = overrideLinkedinUrl
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "");
  }

  profile.summary = sections.summary.join(" ").replace(/\s+/g, " ").trim();

  const { entries: rawWorkExperience, inlineSkills } = parseLinkedInExperienceLines(sections.experience);
  const workExperience = sortWorkExperienceDesc(rawWorkExperience);
  const education = parseLinkedInEducationLines(sections.education);
  const certificationItems = parseLinkedInCertificationLines(sections.certifications);
  const organizations = parseLinkedInOrganizationLines(sections.organizations);
  const projects = parseLinkedInProjectLines(sections.projects);

  const skillItemsFromSection = sections.skills
    .flatMap((line) => line.split(/[·•,;]+/))
    .map((s) => s.trim())
    .filter((s) => s && !LINKEDIN_SUBMETA_RE.test(s));

  const languageItems = sections.languages
    .map((l) => l.trim())
    .filter((l) => l && !LINKEDIN_NOISE_RE.test(l));

  const skills = classifyLinkedInSkills([...skillItemsFromSection, ...inlineSkills, ...languageItems]);

  if (sections.honors.length > 0 && education.length > 0) {
    const honorsText = sections.honors.slice(0, 3).join("; ");
    education[0].achievements = [education[0].achievements, honorsText].filter(Boolean).join("; ");
  }

  const internCount = workExperience.filter((w) => w.type === "internship").length;
  const experienceLevel =
    workExperience.length >= 3 && internCount <= workExperience.length / 2
      ? "experienced"
      : workExperience.length >= 1
      ? "early_career"
      : "fresh_graduate";

  const finalProfile: ResumeProfile = {
    ...profile,
    experienceLevel,
    workExperience,
    education,
    projects,
    organizations,
    certificationItems,
    skills
  };

  const stats: LinkedInImportStats = {
    work: workExperience.length,
    education: education.filter((e) => e.institution.trim() || e.degree.trim()).length,
    projects: projects.length,
    organizations: organizations.length,
    skills: unique([...skills.hardSkills, ...skills.tools, ...skills.softSkills]).length,
    certifications: certificationItems.length,
    sourceKind: "linkedin_profile"
  };

  const recommendedTemplate: CvTemplate =
    stats.work >= 4 || stats.organizations > 0 || stats.projects >= 2 ? "compact_centered" : "classic_editorial";

  return {
    profile: finalProfile,
    stats,
    message: buildLinkedInStatsMessage(stats),
    recommendedTemplate
  };
};

export const buildLinkedInStatsMessage = (stats: LinkedInImportStats): string => {
  const parts: string[] = [];
  if (stats.work) parts.push(`${stats.work} pengalaman`);
  if (stats.education) parts.push(`${stats.education} pendidikan`);
  if (stats.projects) parts.push(`${stats.projects} proyek`);
  if (stats.organizations) parts.push(`${stats.organizations} organisasi/sukarela`);
  if (stats.skills) parts.push(`${stats.skills} keahlian`);
  if (stats.certifications) parts.push(`${stats.certifications} sertifikasi`);

  const sourceLabel =
    stats.sourceKind === "linkedin_archive"
      ? "Arsip Data LinkedIn (ZIP/CSV)"
      : "Profil LinkedIn (PDF/Teks)";

  return parts.length
    ? `${sourceLabel} berhasil diimpor (${parts.join(", ")}). Periksa hasilnya di tab formulir di bawah.`
    : `${sourceLabel} berhasil dibaca. Lengkapi detail yang masih kosong di tab formulir di bawah.`;
};

/**
 * Menggabungkan data baru dari LinkedIn ke profil CV yang sudah ada tanpa menimpa kontak,
 * ringkasan, maupun entri unik yang sudah ditulis pengguna.
 */
export const mergeResumeProfiles = (base: ResumeProfile, incoming: ResumeProfile): ResumeProfile => {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

  const existingWorkKeys = new Set(
    (base.workExperience ?? []).map((w) => `${norm(w.role)}|${norm(w.company)}|${norm(w.startDate)}`)
  );
  const mergedWork = [
    ...(base.workExperience ?? []),
    ...(incoming.workExperience ?? []).filter((w) => {
      const key = `${norm(w.role)}|${norm(w.company)}|${norm(w.startDate)}`;
      if (!w.role.trim() && !w.company.trim()) return false;
      if (existingWorkKeys.has(key)) return false;
      existingWorkKeys.add(key);
      return true;
    })
  ];

  const baseNonBlankEdu = (base.education ?? []).filter(
    (e) => e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim()
  );
  const existingEduKeys = new Set(
    baseNonBlankEdu.map((e) => `${norm(e.institution)}|${norm(e.degree)}`)
  );
  const incomingNonBlankEdu = (incoming.education ?? []).filter(
    (e) => e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim()
  );
  const mergedEdu = [
    ...baseNonBlankEdu,
    ...incomingNonBlankEdu.filter((e) => {
      const key = `${norm(e.institution)}|${norm(e.degree)}`;
      if (existingEduKeys.has(key)) return false;
      existingEduKeys.add(key);
      return true;
    })
  ];

  const existingProjKeys = new Set((base.projects ?? []).map((p) => norm(p.name)));
  const mergedProjects = [
    ...(base.projects ?? []),
    ...(incoming.projects ?? []).filter((p) => p.name.trim() && !existingProjKeys.has(norm(p.name)))
  ];

  const existingOrgKeys = new Set(
    (base.organizations ?? []).map((o) => `${norm(o.role)}|${norm(o.organization)}`)
  );
  const mergedOrgs = [
    ...(base.organizations ?? []),
    ...(incoming.organizations ?? []).filter((o) => {
      const key = `${norm(o.role)}|${norm(o.organization)}`;
      return (o.organization.trim() || o.role.trim()) && !existingOrgKeys.has(key);
    })
  ];

  const existingCertKeys = new Set((base.certificationItems ?? []).map((c) => norm(c.name)));
  const mergedCerts = [
    ...(base.certificationItems ?? []),
    ...(incoming.certificationItems ?? []).filter((c) => c.name.trim() && !existingCertKeys.has(norm(c.name)))
  ];

  const mergedHard = unique([...(base.skills?.hardSkills ?? []), ...(incoming.skills?.hardSkills ?? [])]);
  const mergedTools = unique([...(base.skills?.tools ?? []), ...(incoming.skills?.tools ?? [])]);
  const mergedSoft = unique([...(base.skills?.softSkills ?? []), ...(incoming.skills?.softSkills ?? [])]);

  let mergedGroups = base.skills?.groups ?? [];
  if (mergedGroups.length > 0) {
    const existingGroupItems = new Set(mergedGroups.flatMap((g) => g.items.map(norm)));
    const newExtras = [...mergedHard, ...mergedTools, ...mergedSoft].filter((s) => !existingGroupItems.has(norm(s)));
    if (newExtras.length > 0) {
      mergedGroups = [
        ...mergedGroups,
        { id: createId(), category: "Dari LinkedIn", items: newExtras }
      ];
    }
  }

  return {
    ...base,
    experienceLevel:
      mergedWork.length >= 3
        ? "experienced"
        : mergedWork.length >= 1
        ? "early_career"
        : base.experienceLevel,
    contact: {
      fullName: base.contact.fullName.trim() || incoming.contact.fullName,
      headline: base.contact.headline?.trim() || incoming.contact.headline || "",
      email: base.contact.email.trim() || incoming.contact.email,
      phone: base.contact.phone.trim() || incoming.contact.phone,
      location: base.contact.location.trim() || incoming.contact.location,
      linkedinUrl: base.contact.linkedinUrl.trim() || incoming.contact.linkedinUrl,
      portfolioUrl: base.contact.portfolioUrl.trim() || incoming.contact.portfolioUrl
    },
    summary: base.summary.trim() || incoming.summary,
    workExperience: mergedWork,
    education: mergedEdu.length ? mergedEdu : emptyResumeProfile().education,
    projects: mergedProjects,
    organizations: mergedOrgs,
    certificationItems: mergedCerts,
    skills: {
      hardSkills: mergedHard,
      tools: mergedTools,
      softSkills: mergedSoft,
      groups: mergedGroups
    }
  };
};
