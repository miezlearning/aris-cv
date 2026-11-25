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

  const workExperience: WorkExperience[] = positionRows
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
    .filter((w): w is WorkExperience => w !== null);

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
