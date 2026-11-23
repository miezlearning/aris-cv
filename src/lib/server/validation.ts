import type {
  CertificationItem,
  Contact,
  Education,
  ExperienceLevel,
  JobTarget,
  OrganizationItem,
  ProjectItem,
  ResumeProfile,
  Skills,
  WorkExperience
} from "@/types/resume";
import { sanitizeString } from "@/lib/server/security";

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_LEVELS: ExperienceLevel[] = ["fresh_graduate", "early_career", "experienced"];

export const validateAnalyzeRequest = (raw: unknown): ValidationResult<{ resume: ResumeProfile; job: JobTarget }> => {
  const errors: ValidationError[] = [];

  if (!raw || typeof raw !== "object") {
    return { success: false, errors: [{ field: "root", message: "Permintaan harus berupa JSON objek yang valid." }] };
  }

  const payload = raw as Record<string, unknown>;

  // 1. Validate Job Target
  if (!payload.job || typeof payload.job !== "object") {
    errors.push({ field: "job", message: "Data lowongan kerja (job) wajib disertakan." });
  }

  const rawJob = (payload.job ?? {}) as Record<string, unknown>;
  const rawDescription = sanitizeString(rawJob.rawDescription, 30000);

  if (!rawDescription || rawDescription.length < 10) {
    errors.push({
      field: "job.rawDescription",
      message: "Teks deskripsi lowongan kerja minimal 10 karakter."
    });
  }

  const jobTitle = sanitizeString(rawJob.jobTitle, 150);
  const companyName = sanitizeString(rawJob.companyName, 150);

  const cleanJob: JobTarget = {
    jobTitle,
    companyName,
    rawDescription,
    extractedKeywords: {
      requiredHardSkills: [],
      domainKeywords: [],
      softSkills: []
    }
  };

  // 2. Validate Resume Profile (supports PII-stripped requests where contact is empty)
  if (!payload.resume || typeof payload.resume !== "object") {
    errors.push({ field: "resume", message: "Data profil CV (resume) wajib disertakan." });
  }

  const rawResume = (payload.resume ?? {}) as Record<string, unknown>;
  const rawContact = (rawResume.contact ?? {}) as Record<string, unknown>;
  const email = sanitizeString(rawContact.email, 120);

  if (email && !EMAIL_REGEX.test(email)) {
    errors.push({ field: "resume.contact.email", message: "Format alamat email tidak valid." });
  }

  const experienceLevel = VALID_LEVELS.includes(rawResume.experienceLevel as ExperienceLevel)
    ? (rawResume.experienceLevel as ExperienceLevel)
    : "fresh_graduate";

  const cleanContact: Contact = {
    fullName: sanitizeString(rawContact.fullName, 120),
    headline: sanitizeString(rawContact.headline, 200),
    email,
    phone: sanitizeString(rawContact.phone, 50),
    location: sanitizeString(rawContact.location, 120),
    linkedinUrl: sanitizeString(rawContact.linkedinUrl, 250),
    portfolioUrl: sanitizeString(rawContact.portfolioUrl, 250)
  };

  const summary = sanitizeString(rawResume.summary, 3000);

  // Validate work experiences (bounded to max 20)
  const rawExp = Array.isArray(rawResume.workExperience) ? rawResume.workExperience.slice(0, 20) : [];
  const cleanExperience: WorkExperience[] = rawExp.map((expItem, idx) => {
    const item = (expItem && typeof expItem === "object" ? expItem : {}) as Record<string, unknown>;
    const bullets = Array.isArray(item.bulletPoints)
      ? item.bulletPoints
          .slice(0, 15)
          .map((b) => sanitizeString(b, 1000))
          .filter(Boolean)
      : [];

    return {
      id: sanitizeString(item.id, 50) || `exp-${idx + 1}`,
      company: sanitizeString(item.company, 150),
      role: sanitizeString(item.role, 150),
      location: sanitizeString(item.location, 120),
      startDate: sanitizeString(item.startDate, 30),
      endDate: sanitizeString(item.endDate, 30),
      isCurrent: Boolean(item.isCurrent),
      bulletPoints: bullets
    };
  });

  // Validate education (bounded to max 10)
  const rawEdu = Array.isArray(rawResume.education) ? rawResume.education.slice(0, 10) : [];
  const cleanEducation: Education[] = rawEdu.map((eduItem, idx) => {
    const item = (eduItem && typeof eduItem === "object" ? eduItem : {}) as Record<string, unknown>;
    return {
      id: sanitizeString(item.id, 50) || `edu-${idx + 1}`,
      institution: sanitizeString(item.institution, 150),
      degree: sanitizeString(item.degree, 120),
      fieldOfStudy: sanitizeString(item.fieldOfStudy, 120),
      gpa: sanitizeString(item.gpa, 20),
      graduationDate: sanitizeString(item.graduationDate, 30),
      thesisTitle: sanitizeString(item.thesisTitle, 250),
      relevantCoursework: Array.isArray(item.relevantCoursework)
        ? item.relevantCoursework.slice(0, 20).map((c) => sanitizeString(c, 80)).filter(Boolean)
        : [],
      achievements: sanitizeString(item.achievements, 300)
    };
  });

  // Validate projects (bounded to max 15)
  const rawProjects = Array.isArray(rawResume.projects) ? rawResume.projects.slice(0, 15) : [];
  const cleanProjects: ProjectItem[] = rawProjects.map((projItem, idx) => {
    const item = (projItem && typeof projItem === "object" ? projItem : {}) as Record<string, unknown>;
    return {
      id: sanitizeString(item.id, 50) || `proj-${idx + 1}`,
      name: sanitizeString(item.name, 160),
      role: sanitizeString(item.role, 120),
      context: sanitizeString(item.context, 120),
      period: sanitizeString(item.period, 60),
      technologies: Array.isArray(item.technologies)
        ? item.technologies.slice(0, 25).map((t) => sanitizeString(t, 60)).filter(Boolean)
        : [],
      url: sanitizeString(item.url, 250),
      bulletPoints: Array.isArray(item.bulletPoints)
        ? item.bulletPoints.slice(0, 12).map((b) => sanitizeString(b, 1000)).filter(Boolean)
        : []
    };
  });

  // Validate organizations (bounded to max 15)
  const rawOrgs = Array.isArray(rawResume.organizations) ? rawResume.organizations.slice(0, 15) : [];
  const cleanOrganizations: OrganizationItem[] = rawOrgs.map((orgItem, idx) => {
    const item = (orgItem && typeof orgItem === "object" ? orgItem : {}) as Record<string, unknown>;
    return {
      id: sanitizeString(item.id, 50) || `org-${idx + 1}`,
      organization: sanitizeString(item.organization, 160),
      role: sanitizeString(item.role, 120),
      period: sanitizeString(item.period, 60),
      bulletPoints: Array.isArray(item.bulletPoints)
        ? item.bulletPoints.slice(0, 12).map((b) => sanitizeString(b, 1000)).filter(Boolean)
        : []
    };
  });

  // Validate certifications
  const rawCertItems = Array.isArray(rawResume.certificationItems) ? rawResume.certificationItems.slice(0, 20) : [];
  const cleanCertificationItems: CertificationItem[] = rawCertItems.map((certItem, idx) => {
    const item = (certItem && typeof certItem === "object" ? certItem : {}) as Record<string, unknown>;
    return {
      id: sanitizeString(item.id, 50) || `cert-${idx + 1}`,
      name: sanitizeString(item.name, 180),
      issuer: sanitizeString(item.issuer, 120),
      year: sanitizeString(item.year, 20)
    };
  });

  // Validate skills
  const rawSkills = (rawResume.skills && typeof rawResume.skills === "object" ? rawResume.skills : {}) as Record<string, unknown>;
  const cleanSkills: Skills = {
    hardSkills: Array.isArray(rawSkills.hardSkills)
      ? rawSkills.hardSkills.slice(0, 60).map((s) => sanitizeString(s, 160)).filter(Boolean)
      : [],
    softSkills: Array.isArray(rawSkills.softSkills)
      ? rawSkills.softSkills.slice(0, 60).map((s) => sanitizeString(s, 160)).filter(Boolean)
      : [],
    tools: Array.isArray(rawSkills.tools)
      ? rawSkills.tools.slice(0, 60).map((s) => sanitizeString(s, 160)).filter(Boolean)
      : []
  };

  const legacyCerts = Array.isArray(rawResume.certifications)
    ? rawResume.certifications.slice(0, 20).map((c) => sanitizeString(c, 300)).filter(Boolean)
    : [];

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const cleanResume: ResumeProfile = {
    experienceLevel,
    contact: cleanContact,
    summary,
    workExperience: cleanExperience,
    education: cleanEducation,
    projects: cleanProjects,
    organizations: cleanOrganizations,
    certificationItems: cleanCertificationItems,
    skills: cleanSkills,
    certifications: legacyCerts
  };

  return {
    success: true,
    data: {
      resume: cleanResume,
      job: cleanJob
    }
  };
};

export type CleanRewritePayload = {
  bullet: string;
  role?: string;
  jobTitle?: string;
  targetKeywords?: string[];
};

export const validateRewriteRequest = (raw: unknown): ValidationResult<CleanRewritePayload> => {
  if (!raw || typeof raw !== "object") {
    return { success: false, errors: [{ field: "root", message: "Permintaan harus berupa JSON objek yang valid." }] };
  }

  const payload = raw as Record<string, unknown>;
  const bullet = sanitizeString(payload.bullet, 1500);

  if (!bullet || bullet.length < 5) {
    return {
      success: false,
      errors: [{ field: "bullet", message: "Poin pengalaman kerja (bullet) minimal 5 karakter." }]
    };
  }

  const role = sanitizeString(payload.role, 120) || undefined;
  const jobTitle = sanitizeString(payload.jobTitle, 120) || undefined;
  const targetKeywords = Array.isArray(payload.targetKeywords)
    ? payload.targetKeywords.slice(0, 10).map((kw) => sanitizeString(kw, 60)).filter(Boolean)
    : undefined;

  return {
    success: true,
    data: {
      bullet,
      role,
      jobTitle,
      targetKeywords
    }
  };
};
