import type {
  CertificationItem,
  CvTemplate,
  Education,
  ExperienceLevel,
  OrganizationItem,
  ProjectItem,
  ResumeProfile,
  SkillGroup,
  WorkExperience,
  WorkType
} from "@/types/resume";
import { createId, emptyResumeProfile } from "@/lib/defaults";
import { splitList, unique } from "@/lib/text";

export type ImportStats = {
  work: number;
  education: number;
  projects: number;
  organizations: number;
  skillGroups: number;
  skills: number;
  certifications: number;
};

export type ParsedResumeResult = {
  profile: ResumeProfile;
  message: string;
  stats: ImportStats;
  recommendedTemplate: CvTemplate;
};

const firstValue = (...values: Array<unknown>) =>
  values.find((value) => typeof value === "string" && value.trim()) as string | undefined;

const computeStats = (profile: ResumeProfile): ImportStats => {
  const work = profile.workExperience.filter((item) => item.role.trim() || item.company.trim()).length;
  const education = profile.education.filter((item) => item.institution.trim() || item.degree.trim()).length;
  const projects = profile.projects.filter((item) => item.name.trim()).length;
  const organizations = profile.organizations.filter(
    (item) => item.organization.trim() || item.role.trim()
  ).length;
  const skillGroups = (profile.skills.groups ?? []).filter((grp) => grp.items.length > 0).length;
  const skills = unique([
    ...profile.skills.hardSkills,
    ...profile.skills.tools,
    ...profile.skills.softSkills,
    ...(profile.skills.groups ?? []).flatMap((grp) => grp.items)
  ]).length;
  const certifications = profile.certificationItems.filter((item) => item.name.trim()).length;

  return { work, education, projects, organizations, skillGroups, skills, certifications };
};

const formatStatsSummary = (stats: ImportStats): string => {
  const parts: string[] = [];
  if (stats.work) parts.push(`${stats.work} pengalaman`);
  if (stats.organizations) parts.push(`${stats.organizations} organisasi`);
  if (stats.projects) parts.push(`${stats.projects} proyek`);
  if (stats.education) parts.push(`${stats.education} pendidikan`);
  if (stats.skillGroups) {
    parts.push(`${stats.skillGroups} kategori keahlian`);
  } else if (stats.skills) {
    parts.push(`${stats.skills} keahlian`);
  }
  if (stats.certifications) parts.push(`${stats.certifications} sertifikasi`);
  return parts.length
    ? `CV berhasil diekstrak (${parts.join(", ")}). Periksa hasilnya di tab formulir di bawah.`
    : "Teks CV berhasil dimasukkan. Periksa tiap tab di bawah untuk melengkapi detail yang kurang.";
};

export const parseResumeInput = (raw: string): ParsedResumeResult => {
  const value = raw.trim();
  if (!value) {
    const empty = emptyResumeProfile();
    return {
      profile: empty,
      message: "Belum ada teks yang ditempel.",
      stats: computeStats(empty),
      recommendedTemplate: "classic_editorial"
    };
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed.resumeProfile) {
      const profile = normalizeProfile(parsed.resumeProfile);
      const stats = computeStats(profile);
      return {
        profile,
        message: "Data dari berkas QuickTailor berhasil dimasukkan. Periksa hasilnya di formulir di bawah.",
        stats,
        recommendedTemplate: (profile.skills.groups?.length ?? 0) > 0 ? "compact_centered" : "classic_editorial"
      };
    }

    const profile = fromJsonResume(parsed);
    const stats = computeStats(profile);
    return {
      profile,
      message: "Data dari berkas JSON Resume berhasil dimasukkan. Periksa hasilnya di formulir di bawah.",
      stats,
      recommendedTemplate: "classic_editorial"
    };
  } catch {
    const profile = fromStructuredText(value);
    const stats = computeStats(profile);
    const recommendedTemplate: CvTemplate =
      stats.skillGroups > 0 || stats.work >= 4 || stats.organizations > 0
        ? "compact_centered"
        : "classic_editorial";
    return {
      profile,
      message: formatStatsSummary(stats),
      stats,
      recommendedTemplate
    };
  }
};

const normalizeProfile = (input: Partial<ResumeProfile>): ResumeProfile => {
  const empty = emptyResumeProfile();
  const workExperience = input.workExperience?.length
    ? input.workExperience.map((item) => ({
        id: item.id ?? createId(),
        company: item.company ?? "",
        role: item.role ?? "",
        type: item.type,
        location: item.location ?? "",
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? "",
        isCurrent: Boolean(item.isCurrent),
        bulletPoints: item.bulletPoints?.length ? item.bulletPoints : [""]
      }))
    : [];

  return {
    experienceLevel: input.experienceLevel ?? (workExperience.length >= 2 ? "experienced" : "fresh_graduate"),
    contact: { ...empty.contact, ...input.contact },
    summary: input.summary ?? "",
    workExperience,
    education: input.education?.length
      ? input.education.map((item) => ({
          id: item.id ?? createId(),
          institution: item.institution ?? "",
          degree: item.degree ?? "",
          fieldOfStudy: item.fieldOfStudy ?? "",
          gpa: item.gpa ?? "",
          graduationDate: item.graduationDate ?? "",
          thesisTitle: item.thesisTitle ?? "",
          relevantCoursework: item.relevantCoursework ?? [],
          achievements: item.achievements ?? ""
        }))
      : empty.education,
    projects: input.projects?.length
      ? input.projects.map((item) => ({
          id: item.id ?? createId(),
          name: item.name ?? "",
          role: item.role ?? "",
          context: item.context ?? "",
          period: item.period ?? "",
          technologies: item.technologies ?? [],
          url: item.url ?? "",
          bulletPoints: item.bulletPoints?.length ? item.bulletPoints : [""]
        }))
      : [],
    organizations: input.organizations?.length
      ? input.organizations.map((item) => ({
          id: item.id ?? createId(),
          organization: item.organization ?? "",
          role: item.role ?? "",
          period: item.period ?? "",
          bulletPoints: item.bulletPoints?.length ? item.bulletPoints : [""]
        }))
      : [],
    certificationItems: input.certificationItems?.length ? input.certificationItems : [],
    skills: {
      hardSkills: input.skills?.hardSkills ?? [],
      softSkills: input.skills?.softSkills ?? [],
      tools: input.skills?.tools ?? [],
      groups: input.skills?.groups ?? []
    },
    certifications: []
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromJsonResume = (json: Record<string, any>): ResumeProfile => {
  const basics = json.basics ?? {};
  const profile = emptyResumeProfile();

  const workExperience =
    Array.isArray(json.work) && json.work.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.work.map((item: any) => ({
          id: createId(),
          company: item.name ?? item.company ?? "",
          role: item.position ?? "",
          startDate: toMonthYear(item.startDate),
          endDate: item.endDate ? toMonthYear(item.endDate) : "Present",
          isCurrent: !item.endDate,
          bulletPoints: item.highlights?.length ? item.highlights : [item.summary ?? ""].filter(Boolean)
        }))
      : [];

  const projects =
    Array.isArray(json.projects) && json.projects.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.projects.map((item: any) => ({
          id: createId(),
          name: item.name ?? "",
          role: Array.isArray(item.roles) ? item.roles.join(", ") : "",
          context: item.entity ?? "Proyek",
          period: [item.startDate, item.endDate].filter(Boolean).join(" - "),
          technologies: Array.isArray(item.keywords) ? item.keywords : [],
          url: item.url ?? "",
          bulletPoints: item.highlights?.length ? item.highlights : [item.description ?? ""].filter(Boolean)
        }))
      : [];

  const organizations =
    Array.isArray(json.volunteer) && json.volunteer.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.volunteer.map((item: any) => ({
          id: createId(),
          organization: item.organization ?? "",
          role: item.position ?? "",
          period: [item.startDate, item.endDate].filter(Boolean).join(" - "),
          bulletPoints: item.highlights?.length ? item.highlights : [item.summary ?? ""].filter(Boolean)
        }))
      : [];

  const certificationItems =
    Array.isArray(json.certificates) && json.certificates.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.certificates.map((item: any) => ({
          id: createId(),
          name: item.name ?? "",
          issuer: item.issuer ?? "",
          year: item.date ? String(item.date).slice(0, 4) : ""
        }))
      : [];

  return {
    ...profile,
    experienceLevel: workExperience.length >= 2 ? "experienced" : workExperience.length === 1 ? "early_career" : "fresh_graduate",
    contact: {
      fullName: basics.name ?? "",
      headline: basics.label ?? "",
      email: basics.email ?? "",
      phone: basics.phone ?? "",
      location: firstValue(basics.location?.city, basics.location?.address, basics.location?.region) ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      linkedinUrl: basics.profiles?.find((item: any) => String(item.network).toLowerCase().includes("linkedin"))?.url ?? "",
      portfolioUrl: basics.url ?? ""
    },
    summary: basics.summary ?? "",
    workExperience,
    education:
      Array.isArray(json.education) && json.education.length
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          json.education.map((item: any) => ({
            id: createId(),
            institution: item.institution ?? "",
            degree: item.studyType ?? "",
            fieldOfStudy: item.area ?? "",
            gpa: item.score ?? "",
            graduationDate: item.endDate ? String(item.endDate).slice(0, 4) : "",
            thesisTitle: "",
            relevantCoursework: Array.isArray(item.courses) ? item.courses : [],
            achievements: ""
          }))
        : profile.education,
    projects,
    organizations,
    certificationItems,
    skills: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hardSkills: Array.isArray(json.skills) ? json.skills.flatMap((skill: any) => skill.keywords ?? []).filter(Boolean) : [],
      softSkills: [],
      tools: [],
      groups: []
    }
  };
};

const toMonthYear = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

type SectionName =
  | "header"
  | "summary"
  | "experience"
  | "projects"
  | "organizations"
  | "education"
  | "skills"
  | "certifications";

const BULLET_PREFIX_RE = /^(?:[•●▪◦‣*]|\u2013\s+|\d+[.)]\s+|-\s+)/;

const MONTH_TOKEN =
  "(?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust)?|Agu(?:stus)?|Agust|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)";
const DATE_POINT = `(?:${MONTH_TOKEN}\\.?\\s+(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])\\/(?:19|20)\\d{2})`;
const PRESENT_TOKEN = "(?:Present|Current|Now|Ongoing|Sekarang|Saat ini|Hingga saat ini)";
const RANGE_JOINER = "(?:[-\\u2013\\u2014]|to|s\\.?d\\.?|sampai|hingga)";
const YEAR_POINT = `(?:${DATE_POINT}|(?:19|20)\\d{2})`;

const TRAILING_RANGE_RE = new RegExp(
  `(?:\\s+|\\s*\\()((?:${YEAR_POINT})\\s*${RANGE_JOINER}\\s*(?:${YEAR_POINT}|${PRESENT_TOKEN}))\\)?\\s*$`,
  "i"
);
const TRAILING_MONTH_YEAR_RE = new RegExp(`(?:\\s+|\\s*\\()(${DATE_POINT})\\)?\\s*$`, "i");
const TRAILING_SPACED_YEAR_RE = /(?:[|,\s]{2,}|\s*\()((?:19|20)\d{2})\)?\s*$/;
const JOINER_SPLIT_RE = new RegExp(`\\s*${RANGE_JOINER}\\s*`, "i");
const PRESENT_RE = new RegExp(`^${PRESENT_TOKEN}$`, "i");

type ExtractedDate = {
  textWithoutDate: string;
  startDate: string;
  endDate: string;
  period: string;
  isCurrent: boolean;
};

const stripTrailingDateRange = (line: string): ExtractedDate | null => {
  const clean = line.trim();
  const rangeMatch = clean.match(TRAILING_RANGE_RE) ?? clean.match(TRAILING_MONTH_YEAR_RE);
  if (rangeMatch && rangeMatch.index !== undefined && rangeMatch.index > 2) {
    const rawPeriod = rangeMatch[1].trim();
    const textWithoutDate = clean.slice(0, rangeMatch.index).replace(/[\s|,\u2013\u2014-]+$/, "").trim();
    const parts = rawPeriod.split(JOINER_SPLIT_RE).map((part) => part.trim()).filter(Boolean);
    const startDate = parts[0] ?? rawPeriod;
    const rawEnd = parts[1] ?? "";
    const isCurrent = Boolean(rawEnd && PRESENT_RE.test(rawEnd));
    const endDate = isCurrent ? (/sekarang|saat ini/i.test(rawEnd) ? "Sekarang" : "Present") : rawEnd;
    const period = endDate ? `${startDate} - ${endDate}` : startDate;
    return { textWithoutDate, startDate, endDate, period, isCurrent };
  }

  const yearMatch = clean.match(TRAILING_SPACED_YEAR_RE);
  if (yearMatch && yearMatch.index !== undefined && yearMatch.index > 3) {
    const rawYear = yearMatch[1].trim();
    const textWithoutDate = clean.slice(0, yearMatch.index).replace(/[\s|,\u2013\u2014-]+$/, "").trim();
    return {
      textWithoutDate,
      startDate: rawYear,
      endDate: "",
      period: rawYear,
      isCurrent: false
    };
  }

  return null;
};

const SECTION_HEADINGS: Array<{ section: Exclude<SectionName, "header">; regex: RegExp }> = [
  {
    section: "summary",
    regex:
      /^(ringkasan|ringkasan profil|profil|profil singkat|tentang saya|summary|professional summary|career summary|profile|about|about me|objective|career objective|executive summary)$/i
  },
  {
    section: "experience",
    regex:
      /^(pengalaman kerja|pengalaman kerja & magang|pengalaman profesional|pengalaman|riwayat pekerjaan|magang|kerja & magang|work experience|professional experience|experience|employment|employment history|work history|career history|internship|internships|internship experience)$/i
  },
  {
    section: "projects",
    regex:
      /^(proyek|proyek & studi kasus|portofolio|studi kasus|proyek akademik|projects|project|projects & case studies|personal projects|academic projects|selected projects|key projects|portfolio|case studies)$/i
  },
  {
    section: "organizations",
    regex:
      /^(organisasi|organisasi & kepanitiaan|kepanitiaan|pengalaman organisasi|aktivitas|kegiatan|relawan|leadership|leadership & organizations|leadership experience|organizations|organization|organizations & leadership|extracurricular|extracurricular activities|activities|volunteer|volunteering|community)$/i
  },
  {
    section: "education",
    regex:
      /^(pendidikan|riwayat pendidikan|latar belakang pendidikan|akademik|education|academic background|educational background)$/i
  },
  {
    section: "skills",
    regex:
      /^(keahlian|keterampilan|kemampuan|keahlian & alat|kompetensi|skills|technical skills|core competencies|competencies|skills & tools|technologies|tech stack)$/i
  },
  {
    section: "certifications",
    regex:
      /^(sertifikasi|pelatihan|pelatihan & sertifikasi|sertifikasi & pelatihan|lisensi|kursus|certifications|certification|certificates|licenses & certifications|certifications & training|training|courses|awards & certifications)$/i
  }
];

const splitIntoSections = (raw: string): Record<SectionName, string[]> => {
  const sections: Record<SectionName, string[]> = {
    header: [],
    summary: [],
    experience: [],
    projects: [],
    organizations: [],
    education: [],
    skills: [],
    certifications: []
  };

  let current: SectionName = "header";
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    const candidate = line
      .replace(/[:\s]+$/, "")
      .replace(/^[-•*\s]+/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (candidate.length > 0 && candidate.length < 56) {
      const matched = SECTION_HEADINGS.find((item) => item.regex.test(candidate));
      if (matched) {
        current = matched.section;
        continue;
      }
    }

    sections[current].push(line);
  }

  return sections;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|]+/i;
const URL_TOKEN_RE = /(?:https?:\/\/[^\s|]+|(?:github|gitlab|behance|dribbble|medium|vercel|netlify)\.(?:com|net|app|io)\/[^\s|]+|\b[a-z0-9-]+\.(?:dev|io|me|id|app|tech|xyz|co)\b(?:\/[^\s|]*)?)/i;

const hasContactToken = (line: string): boolean =>
  EMAIL_RE.test(line) ||
  LINKEDIN_RE.test(line) ||
  URL_TOKEN_RE.test(line) ||
  (/(?:\+62|08\d|0\d{2}[-\s]?\d{4})/.test(line) && PHONE_RE.test(line));

const parseHeaderLines = (headerLines: string[]) => {
  const contact = emptyResumeProfile().contact;
  const leftoverSummary: string[] = [];

  for (let i = 0; i < headerLines.length; i += 1) {
    const line = headerLines[i].trim();
    if (!line) continue;

    if (i === 0 && !hasContactToken(line) && line.length <= 80 && !/[.]\s/.test(line)) {
      contact.fullName = line;
      continue;
    }

    if (hasContactToken(line)) {
      const tokens = line
        .split(/\s*[|•·]\s*|\s{3,}/)
        .map((t) => t.trim())
        .filter(Boolean);

      const locationParts: string[] = [];

      for (const token of tokens) {
        if (!contact.email && EMAIL_RE.test(token)) {
          contact.email = token.match(EMAIL_RE)?.[0] ?? token;
        } else if (!contact.linkedinUrl && LINKEDIN_RE.test(token)) {
          contact.linkedinUrl = (token.match(LINKEDIN_RE)?.[0] ?? token)
            .replace(/^https?:\/\//i, "")
            .replace(/^www\./i, "");
        } else if (!contact.portfolioUrl && URL_TOKEN_RE.test(token) && !EMAIL_RE.test(token)) {
          contact.portfolioUrl = token.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        } else if (!contact.phone && PHONE_RE.test(token) && token.replace(/\D/g, "").length >= 8) {
          contact.phone = token;
        } else if (token.length <= 90) {
          locationParts.push(token);
        }
      }

      if (!contact.location && locationParts.length) {
        contact.location = locationParts.join(", ");
      }
      continue;
    }

    if (!contact.headline && line.length <= 115) {
      contact.headline = line;
    } else {
      leftoverSummary.push(line);
    }
  }

  return { contact, leftoverSummary };
};

const splitCompanyLocation = (raw: string): { company: string; location: string } => {
  const clean = raw.trim();
  const lastComma = clean.lastIndexOf(",");
  if (lastComma <= 0) return { company: clean, location: "" };
  const left = clean.slice(0, lastComma).trim();
  const right = clean.slice(lastComma + 1).trim();
  if (!right || right.length > 42 || /^(inc|ltd|llc|tbk|pte|corp|gmbh|cv|pt)\.?$/i.test(right)) {
    return { company: clean, location: "" };
  }
  if (right.split(/\s+/).length > 4) return { company: clean, location: "" };
  return { company: left, location: right };
};

const inferWorkType = (role: string): WorkType => {
  if (/\b(intern|internship|magang|msib|pkl|co-?op|trainee)\b/i.test(role)) return "internship";
  if (/\b(freelance|lepas|contractor)\b/i.test(role)) return "freelance";
  if (/\b(part[- ]?time|paruh waktu)\b/i.test(role)) return "parttime";
  return "fulltime";
};

const splitPipeOrDashPair = (text: string): [string, string] | null => {
  if (text.includes("|")) {
    const parts = text.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(" | ")];
    }
  }
  const atMatch = text.match(/^(.{2,65}?)\s+(?:at|@)\s+(.{2,80})$/i);
  if (atMatch) return [atMatch[1].trim(), atMatch[2].trim()];

  const dashMatch = text.match(/^(.{2,65}?)\s+[-\u2013\u2014]\s+(.{2,80})$/);
  if (dashMatch) return [dashMatch[1].trim(), dashMatch[2].trim()];

  return null;
};

const looksLikeEntryHeader = (line: string): boolean => {
  if (BULLET_PREFIX_RE.test(line)) return false;
  if (stripTrailingDateRange(line)) return true;
  if (line.includes("|") && line.length <= 125) {
    const pair = splitPipeOrDashPair(line);
    if (pair && pair[0].length <= 68 && pair[1].length <= 75) return true;
  }
  return false;
};

const parseExperienceSection = (lines: string[]): WorkExperience[] => {
  const entries: WorkExperience[] = [];
  let current: WorkExperience | null = null;
  let expectingSecondHeaderLine = false;

  const flush = () => {
    if (!current) return;
    const cleanBullets = current.bulletPoints.map((b) => b.trim()).filter(Boolean);
    entries.push({
      ...current,
      bulletPoints: cleanBullets.length ? cleanBullets : [""]
    });
    current = null;
    expectingSecondHeaderLine = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (BULLET_PREFIX_RE.test(line)) {
      const bulletText = line.replace(BULLET_PREFIX_RE, "").trim();
      if (!current) {
        current = {
          id: createId(),
          company: "",
          role: "Pengalaman",
          type: "fulltime",
          location: "",
          startDate: "",
          endDate: "",
          isCurrent: false,
          bulletPoints: []
        };
      }
      expectingSecondHeaderLine = false;
      if (bulletText) current.bulletPoints.push(bulletText);
      continue;
    }

    const dateInfo = stripTrailingDateRange(line);
    const hasPipeHeader = !dateInfo && looksLikeEntryHeader(line);

    if (dateInfo || hasPipeHeader) {
      flush();
      const headText = dateInfo ? dateInfo.textWithoutDate : line;
      const pair = splitPipeOrDashPair(headText);
      let role = headText;
      let company = "";
      let location = "";

      if (pair) {
        role = pair[0];
        const compLoc = splitCompanyLocation(pair[1]);
        company = compLoc.company;
        location = compLoc.location;
        expectingSecondHeaderLine = false;
      } else {
        expectingSecondHeaderLine = true;
      }

      current = {
        id: createId(),
        role,
        company,
        type: inferWorkType(role),
        location,
        startDate: dateInfo?.startDate ?? "",
        endDate: dateInfo?.endDate ?? "",
        isCurrent: dateInfo?.isCurrent ?? false,
        bulletPoints: []
      };
      continue;
    }

    if (current && expectingSecondHeaderLine && !current.company && current.bulletPoints.length === 0 && line.length <= 95 && !/[.]$/.test(line)) {
      const compLoc = splitCompanyLocation(line);
      current.company = compLoc.company;
      current.location = compLoc.location;
      expectingSecondHeaderLine = false;
      continue;
    }

    if (current && current.bulletPoints.length > 0) {
      const lastIdx = current.bulletPoints.length - 1;
      current.bulletPoints[lastIdx] = `${current.bulletPoints[lastIdx]} ${line}`.replace(/\s+/g, " ").trim();
      continue;
    }

    if (current) {
      current.bulletPoints.push(line);
    }
  }

  flush();
  return entries;
};

const parseOrganizationsSection = (lines: string[]): OrganizationItem[] => {
  const entries: OrganizationItem[] = [];
  let current: OrganizationItem | null = null;
  let expectingSecondLine = false;

  const flush = () => {
    if (!current) return;
    const cleanBullets = current.bulletPoints.map((b) => b.trim()).filter(Boolean);
    entries.push({
      ...current,
      bulletPoints: cleanBullets.length ? cleanBullets : [""]
    });
    current = null;
    expectingSecondLine = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (BULLET_PREFIX_RE.test(line)) {
      const bulletText = line.replace(BULLET_PREFIX_RE, "").trim();
      if (!current) {
        current = {
          id: createId(),
          organization: "",
          role: "Pengurus / Anggota",
          period: "",
          bulletPoints: []
        };
      }
      expectingSecondLine = false;
      if (bulletText) current.bulletPoints.push(bulletText);
      continue;
    }

    const dateInfo = stripTrailingDateRange(line);
    const hasPipeHeader = !dateInfo && looksLikeEntryHeader(line);

    if (dateInfo || hasPipeHeader) {
      flush();
      const headText = dateInfo ? dateInfo.textWithoutDate : line;
      const pair = splitPipeOrDashPair(headText);
      let role = headText;
      let organization = "";

      if (pair) {
        role = pair[0];
        organization = pair[1];
        expectingSecondLine = false;
      } else {
        expectingSecondLine = true;
      }

      current = {
        id: createId(),
        role,
        organization,
        period: dateInfo?.period ?? "",
        bulletPoints: []
      };
      continue;
    }

    if (current && expectingSecondLine && !current.organization && current.bulletPoints.length === 0 && line.length <= 95) {
      current.organization = line;
      expectingSecondLine = false;
      continue;
    }

    if (current && current.bulletPoints.length > 0) {
      const lastIdx = current.bulletPoints.length - 1;
      current.bulletPoints[lastIdx] = `${current.bulletPoints[lastIdx]} ${line}`.replace(/\s+/g, " ").trim();
      continue;
    }

    if (current) {
      current.bulletPoints.push(line);
    }
  }

  flush();
  return entries;
};

const parseProjectsSection = (lines: string[]): ProjectItem[] => {
  const entries: ProjectItem[] = [];
  let current: ProjectItem | null = null;

  const flush = () => {
    if (!current) return;
    const cleanBullets = current.bulletPoints.map((b) => b.trim()).filter(Boolean);
    entries.push({
      ...current,
      bulletPoints: cleanBullets.length ? cleanBullets : [""]
    });
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (BULLET_PREFIX_RE.test(line)) {
      const bulletText = line.replace(BULLET_PREFIX_RE, "").trim();
      if (!current) {
        current = {
          id: createId(),
          name: "Proyek dari Impor CV",
          role: "",
          context: "Proyek",
          period: "",
          technologies: [],
          url: "",
          bulletPoints: []
        };
      }
      if (/^(?:tech\s*stack|technologies|teknologi)\s*:/i.test(bulletText)) {
        const rhs = bulletText.slice(bulletText.indexOf(":") + 1);
        current.technologies.push(...splitList(rhs));
      } else if (bulletText) {
        current.bulletPoints.push(bulletText);
      }
      continue;
    }

    const techMatch = line.match(/^(?:tech\s*stack|technologies|teknologi)\s*:\s*(.+)$/i);
    if (techMatch && current) {
      current.technologies.push(...splitList(techMatch[1]));
      continue;
    }

    const linkMatch = line.match(/^(?:link|url|tautan|repository|repo)\s*:\s*(.+)$/i);
    if (linkMatch && current) {
      current.url = linkMatch[1].trim();
      continue;
    }

    const dateInfo = stripTrailingDateRange(line);
    const hasPipeHeader = !dateInfo && looksLikeEntryHeader(line);

    if (dateInfo || hasPipeHeader) {
      flush();
      const headText = dateInfo ? dateInfo.textWithoutDate : line;
      const pair = splitPipeOrDashPair(headText);
      let name = headText;
      let role = "";
      let context = "Proyek";

      if (pair) {
        name = pair[0];
        role = pair[1];
        if (/skripsi|tugas akhir|kuliah|akademik|thesis|capstone/i.test(headText)) {
          context = "Proyek Akademik";
        }
      }

      current = {
        id: createId(),
        name,
        role,
        context,
        period: dateInfo?.period ?? "",
        technologies: [],
        url: "",
        bulletPoints: []
      };
      continue;
    }

    if (current && current.bulletPoints.length > 0) {
      const lastIdx = current.bulletPoints.length - 1;
      current.bulletPoints[lastIdx] = `${current.bulletPoints[lastIdx]} ${line}`.replace(/\s+/g, " ").trim();
      continue;
    }

    if (current) {
      current.bulletPoints.push(line);
    } else {
      current = {
        id: createId(),
        name: line,
        role: "",
        context: "Proyek",
        period: "",
        technologies: [],
        url: "",
        bulletPoints: []
      };
    }
  }

  flush();
  return entries;
};

const INSTITUTION_HINT_RE =
  /\b(universitas|university|institut|institute|politeknik|polytechnic|smk|smkn|sma|sman|sekolah|stmik|stie|college|academy|school|campus|kampus)\b/i;

const DEGREE_HINT_RE =
  /\b(bachelor|master|doctor|phd|diploma|associate|sarjana|magister|doktor|vocational|s\.?kom|s\.?t|s\.?e|s\.?si|s1|s2|d3|d4|smk|sma)\b/i;

const splitDegreeAndMajor = (raw: string): { degree: string; fieldOfStudy: string } => {
  const clean = raw.trim();
  const dashSplit = clean.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
  if (dashSplit) {
    return { degree: dashSplit[1].trim(), fieldOfStudy: dashSplit[2].trim() };
  }
  const commaSplit = clean.match(/^([^,]+),\s*(.+)$/);
  if (commaSplit) {
    return { degree: commaSplit[1].trim(), fieldOfStudy: commaSplit[2].trim() };
  }
  return { degree: clean, fieldOfStudy: "" };
};

const parseEducationSection = (lines: string[]): Education[] => {
  const entries: Education[] = [];
  let current: Education | null = null;

  const flush = () => {
    if (current && (current.institution || current.degree || current.fieldOfStudy)) {
      entries.push(current);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(BULLET_PREFIX_RE, "").trim();
    if (!line) continue;

    const gpaLineMatch = line.match(/^(?:IPK|GPA)\s*:?\s*([0-4](?:[.,]\d{1,2})?(?:\s*\/\s*4(?:[.,]00?)?)?)/i);
    if (gpaLineMatch && current) {
      current.gpa = gpaLineMatch[1].replace(/\s+/g, "");
      continue;
    }

    const thesisMatch = line.match(/^(?:Tugas Akhir|Skripsi|Thesis)\s*:\s*(.+)$/i);
    if (thesisMatch && current) {
      current.thesisTitle = thesisMatch[1].trim();
      continue;
    }

    const courseMatch = line.match(/^(?:Mata Kuliah(?: Relevan)?|Relevant Coursework|Coursework)\s*:\s*(.+)$/i);
    if (courseMatch && current) {
      current.relevantCoursework = splitList(courseMatch[1]);
      continue;
    }

    const achMatch = line.match(/^(?:Prestasi|Penghargaan|Achievements?|Honors?)\s*:\s*(.+)$/i);
    if (achMatch && current) {
      current.achievements = achMatch[1].trim();
      continue;
    }

    const dateInfo = stripTrailingDateRange(line);
    const hasPipe = line.includes("|");

    if (hasPipe || dateInfo) {
      flush();
      const headText = dateInfo ? dateInfo.textWithoutDate : line;
      let institution = "";
      let degree = "";
      let fieldOfStudy = "";

      if (headText.includes("|")) {
        const [left, right] = headText.split("|").map((p) => p.trim());
        const leftHasDeg = DEGREE_HINT_RE.test(left);
        const rightHasDeg = DEGREE_HINT_RE.test(right ?? "");
        const leftIsInst =
          (INSTITUTION_HINT_RE.test(left) && !INSTITUTION_HINT_RE.test(right ?? "") && !leftHasDeg) ||
          (!leftHasDeg && rightHasDeg);
        if (leftIsInst) {
          institution = left;
          const degMaj = splitDegreeAndMajor(right ?? "");
          degree = degMaj.degree;
          fieldOfStudy = degMaj.fieldOfStudy;
        } else {
          institution = right ?? "";
          const degMaj = splitDegreeAndMajor(left ?? "");
          degree = degMaj.degree;
          fieldOfStudy = degMaj.fieldOfStudy;
        }
      } else if (INSTITUTION_HINT_RE.test(headText)) {
        institution = headText;
      } else {
        const degMaj = splitDegreeAndMajor(headText);
        degree = degMaj.degree;
        fieldOfStudy = degMaj.fieldOfStudy;
      }

      current = {
        id: createId(),
        institution,
        degree,
        fieldOfStudy,
        gpa: line.match(/(?:IPK|GPA)\s*:?\s*([0-4](?:[.,]\d{1,2})?(?:\/4(?:[.,]00?)?)?)/i)?.[1] ?? "",
        graduationDate: dateInfo?.period ?? "",
        thesisTitle: "",
        relevantCoursework: [],
        achievements: ""
      };
      continue;
    }

    if (!current) {
      const isInst = INSTITUTION_HINT_RE.test(line);
      const degMaj = isInst ? { degree: "", fieldOfStudy: "" } : splitDegreeAndMajor(line);
      current = {
        id: createId(),
        institution: isInst ? line : "",
        degree: degMaj.degree,
        fieldOfStudy: degMaj.fieldOfStudy,
        gpa: "",
        graduationDate: "",
        thesisTitle: "",
        relevantCoursework: [],
        achievements: ""
      };
    } else if (!current.degree && !current.fieldOfStudy) {
      const degMaj = splitDegreeAndMajor(line);
      current.degree = degMaj.degree;
      current.fieldOfStudy = degMaj.fieldOfStudy;
    } else if (!current.institution) {
      current.institution = line;
    } else {
      current.achievements = current.achievements ? `${current.achievements}; ${line}` : line;
    }
  }

  flush();
  return entries.length ? entries : emptyResumeProfile().education;
};

const parseSkillsSection = (lines: string[]) => {
  const mergedLines: string[] = [];
  const categoryLineRe = /^([A-Za-z0-9 &/+()-]{2,36}):\s*(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine.replace(BULLET_PREFIX_RE, "").trim();
    if (!line) continue;

    if (categoryLineRe.test(line) || mergedLines.length === 0) {
      mergedLines.push(line);
    } else {
      const prev = mergedLines[mergedLines.length - 1];
      if (categoryLineRe.test(prev)) {
        const sep = /[,;]\s*$/.test(prev) ? " " : ", ";
        mergedLines[mergedLines.length - 1] = `${prev}${sep}${line}`;
      } else {
        mergedLines.push(line);
      }
    }
  }

  const groups: SkillGroup[] = [];
  const hardSkills: string[] = [];
  const tools: string[] = [];
  const softSkills: string[] = [];

  for (const line of mergedLines) {
    const match = line.match(categoryLineRe);
    if (match) {
      const category = match[1].trim();
      const items = unique(splitList(match[2]));
      if (items.length) {
        groups.push({ id: createId(), category, items });
        if (/tool|framework|librar|database|software|platform|alat/i.test(category)) {
          tools.push(...items);
        } else if (/soft|interpersonal|bahasa|language|karakter|sikap/i.test(category)) {
          softSkills.push(...items);
        } else {
          hardSkills.push(...items);
        }
      }
    } else {
      hardSkills.push(...splitList(line));
    }
  }

  return {
    hardSkills: unique(hardSkills),
    tools: unique(tools),
    softSkills: unique(softSkills),
    groups
  };
};

const parseCertificationsSection = (lines: string[]): CertificationItem[] => {
  const mergedLines: string[] = [];
  const issuerListRe = /^([^:]{2,60}):\s*(.+)$/;

  for (const rawLine of lines) {
    const clean = rawLine.replace(BULLET_PREFIX_RE, "").trim();
    if (!clean) continue;

    if (issuerListRe.test(clean) || mergedLines.length === 0 || BULLET_PREFIX_RE.test(rawLine)) {
      mergedLines.push(clean);
    } else {
      mergedLines[mergedLines.length - 1] = `${mergedLines[mergedLines.length - 1]} ${clean}`
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  const items: CertificationItem[] = [];

  for (const line of mergedLines) {
    const colonMatch = line.match(issuerListRe);
    if (colonMatch) {
      const issuer = colonMatch[1].trim();
      const rhs = colonMatch[2].trim();
      const entries = rhs
        .split(/\s*;\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

      for (const entry of entries) {
        const yearMatch = entry.match(/\(((?:19|20)\d{2})\)\s*$/);
        const name = yearMatch ? entry.slice(0, yearMatch.index).trim() : entry;
        items.push({
          id: createId(),
          name,
          issuer,
          year: yearMatch?.[1] ?? ""
        });
      }
      continue;
    }

    if (line.includes("|")) {
      const [name, issuer = "", year = ""] = line.split("|").map((p) => p.trim());
      if (name) items.push({ id: createId(), name, issuer, year });
      continue;
    }

    const parenMatch = line.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    if (parenMatch) {
      const name = parenMatch[1].trim();
      const meta = parenMatch[2].trim();
      const yearMatch = meta.match(/\b((?:19|20)\d{2})\b/);
      const issuer = yearMatch
        ? meta.replace(yearMatch[0], "").replace(/^[\s,/-]+|[\s,/-]+$/g, "").trim()
        : meta;
      items.push({ id: createId(), name, issuer, year: yearMatch?.[1] ?? "" });
      continue;
    }

    const yearMatch = line.match(/\b((?:19|20)\d{2})\b\s*$/);
    const name = yearMatch ? line.slice(0, yearMatch.index).replace(/[\s,-]+$/, "").trim() : line;
    items.push({ id: createId(), name, issuer: "", year: yearMatch?.[1] ?? "" });
  }

  return items;
};

const inferExperienceLevel = (
  workExperience: WorkExperience[],
  headline: string,
  summary: string
): ExperienceLevel => {
  if (workExperience.length === 0) return "fresh_graduate";

  const combinedMeta = `${headline} ${summary}`.toLowerCase();
  if (/\b(fresh\s*graduate|graduate|lulusan baru|mahasiswa)\b/.test(combinedMeta)) {
    return "early_career";
  }

  const internCount = workExperience.filter((w) => w.type === "internship").length;
  if (workExperience.length >= 3 && internCount <= workExperience.length / 2) {
    return "experienced";
  }

  return workExperience.length >= 2 ? "early_career" : "fresh_graduate";
};

const fromStructuredText = (raw: string): ResumeProfile => {
  const profile = emptyResumeProfile();
  const sections = splitIntoSections(raw);
  const { contact, leftoverSummary } = parseHeaderLines(sections.header);

  const summary = [...leftoverSummary, ...sections.summary].join(" ").replace(/\s+/g, " ").trim();
  const workExperience = parseExperienceSection(sections.experience);
  const organizations = parseOrganizationsSection(sections.organizations);
  const projects = parseProjectsSection(sections.projects);
  const education = parseEducationSection(sections.education);
  const skills = parseSkillsSection(sections.skills);
  const certificationItems = parseCertificationsSection(sections.certifications);

  const experienceLevel = inferExperienceLevel(workExperience, contact.headline ?? "", summary);

  return {
    ...profile,
    experienceLevel,
    contact,
    summary,
    workExperience,
    education,
    projects,
    organizations,
    certificationItems,
    skills
  };
};
