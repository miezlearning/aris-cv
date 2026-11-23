import type { ExtractedKeywords, JobTarget, ResumeProfile } from "@/types/resume";
import {
  detectLanguage,
  normalizeJobDescription,
  toLegacyExtractedKeywords
} from "@/lib/ats/normalizer";
import {
  analyzeMatch,
  describeKeywordAction,
  evaluateFormatQuality,
  hasMetric
} from "@/lib/ats/scorer";
import { FRESH_GRAD_XYZ_EXAMPLES, generateRewriteSuggestions } from "@/lib/ats/rewriter";
import { compact } from "@/lib/text";

export {
  analyzeMatch,
  describeKeywordAction,
  detectLanguage,
  evaluateFormatQuality,
  FRESH_GRAD_XYZ_EXAMPLES,
  generateRewriteSuggestions,
  hasMetric,
  normalizeJobDescription,
  toLegacyExtractedKeywords
};

export const extractKeywords = (rawDescription: string, jobTitle = ""): ExtractedKeywords => {
  const normalized = normalizeJobDescription(rawDescription, jobTitle);
  return toLegacyExtractedKeywords(normalized);
};

export const buildAnalysis = (resume: ResumeProfile, job: JobTarget) => {
  const normalized = normalizeJobDescription(job.rawDescription, job.jobTitle);
  const extractedKeywords = toLegacyExtractedKeywords(normalized);
  const enrichedJob: JobTarget = { ...job, extractedKeywords, normalized };
  const analytics = analyzeMatch(resume, enrichedJob);
  const suggestions = generateRewriteSuggestions(resume, analytics);

  return { enrichedJob, analytics, suggestions };
};

/**
 * Menghitung persentase kelengkapan CV secara adaptif mengikuti level pengalaman.
 * Fresh graduate bisa mencapai 100% melalui Pendidikan + Proyek/Magang/Organisasi + Keahlian
 * tanpa dipaksa mengisi pengalaman kerja penuh waktu.
 */
export const getResumeCompleteness = (resume: ResumeProfile): number => {
  const contactPoints = compact([
    resume.contact?.fullName,
    resume.contact?.email,
    resume.contact?.phone
  ]).length; // max 3

  const summaryPoints = (resume.summary ?? "").trim().length >= 30 ? 1 : 0; // max 1

  const eduPoints = Math.min(
    3,
    compact(
      (resume.education ?? []).flatMap((item) => [
        item.institution,
        item.degree || item.fieldOfStudy,
        item.gpa || item.graduationDate
      ])
    ).length
  ); // max 3

  const workPoints = compact(
    (resume.workExperience ?? []).flatMap((item) => [
      item.company,
      item.role,
      ...(item.bulletPoints ?? [])
    ])
  ).length;

  const projectPoints = compact(
    (resume.projects ?? []).flatMap((item) => [item.name, item.role, ...(item.bulletPoints ?? [])])
  ).length;

  const orgPoints = compact(
    (resume.organizations ?? []).flatMap((item) => [
      item.organization,
      item.role,
      ...(item.bulletPoints ?? [])
    ])
  ).length;

  const activityScore =
    resume.experienceLevel === "fresh_graduate"
      ? Math.min(4, workPoints + projectPoints + orgPoints)
      : Math.min(4, workPoints) + Math.min(1, projectPoints + orgPoints);

  const skillCount = compact([
    ...(resume.skills?.hardSkills ?? []),
    ...(resume.skills?.tools ?? []),
    ...(resume.skills?.softSkills ?? [])
  ]).length;
  const skillPoints = Math.min(3, skillCount);

  const certBonus =
    (resume.certificationItems ?? []).some((c) => c.name.trim()) ||
    (resume.certifications ?? []).some((c) => c.trim())
      ? 1
      : 0;

  const total = contactPoints + summaryPoints + eduPoints + activityScore + skillPoints + certBonus;
  const denominator = resume.experienceLevel === "fresh_graduate" ? 14 : 15;

  return Math.min(100, Math.round((total / denominator) * 100));
};
