import type { Contact, Education, ExtractedKeywords, JobTarget, ResumeProfile, Skills, WorkExperience } from "@/types/resume";
import { sanitizeString } from "@/lib/server/security";

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // 2. Validate Resume Profile
  if (!payload.resume || typeof payload.resume !== "object") {
    errors.push({ field: "resume", message: "Data profil CV (resume) wajib disertakan." });
  }

  const rawResume = (payload.resume ?? {}) as Record<string, unknown>;
  const rawContact = (rawResume.contact ?? {}) as Record<string, unknown>;
  const email = sanitizeString(rawContact.email, 120);

  if (email && !EMAIL_REGEX.test(email)) {
    errors.push({ field: "resume.contact.email", message: "Format alamat email tidak valid." });
  }

  const cleanContact: Contact = {
    fullName: sanitizeString(rawContact.fullName, 120),
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
      graduationDate: sanitizeString(item.graduationDate, 30)
    };
  });

  // Validate skills
  const rawSkills = (rawResume.skills && typeof rawResume.skills === "object" ? rawResume.skills : {}) as Record<string, unknown>;
  const cleanSkills: Skills = {
    hardSkills: Array.isArray(rawSkills.hardSkills)
      ? rawSkills.hardSkills.slice(0, 50).map((s) => sanitizeString(s, 60)).filter(Boolean)
      : [],
    softSkills: Array.isArray(rawSkills.softSkills)
      ? rawSkills.softSkills.slice(0, 50).map((s) => sanitizeString(s, 60)).filter(Boolean)
      : [],
    tools: Array.isArray(rawSkills.tools)
      ? rawSkills.tools.slice(0, 50).map((s) => sanitizeString(s, 60)).filter(Boolean)
      : []
  };

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const cleanResume: ResumeProfile = {
    contact: cleanContact,
    summary,
    workExperience: cleanExperience,
    education: cleanEducation,
    skills: cleanSkills
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
