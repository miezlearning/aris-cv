import type {
  CvLanguage,
  DetectedLanguage,
  JobTarget,
  MatchAnalytics,
  ResumeProfile
} from "@/types/resume";
import { analyzeMatch } from "@/lib/ats/scorer";
import { normalizeForMatch } from "@/lib/ats/synonyms";
import {
  auditTranslation,
  computeProfileContentHash,
  translateProfileDeterministic,
  type TranslationAuditSummary
} from "@/lib/ats/translator";
import {
  detectResumeLanguage,
  detectResumeProseLanguage,
  resolveCvLanguage
} from "@/lib/resume-document";

export type CachedTranslationEntry = {
  profile: ResumeProfile;
  sourceHash: string;
  providerLabel: string;
};

export type EffectiveResumeResolution = {
  sourceLang: "id" | "en";
  sourceProseLang: DetectedLanguage;
  activeLang: "id" | "en";
  effectiveProseLang: DetectedLanguage;
  effectiveResume: ResumeProfile;
  translatedOverride: ResumeProfile | null;
  isTranslatedView: boolean;
  translationSourceLabel: string | null;
  contentHash: string;
  translationAudit: TranslationAuditSummary | null;
  analytics: MatchAnalytics;
};

export const hasSkillInProfile = (resume: ResumeProfile, term: string): boolean => {
  const normTarget = normalizeForMatch(term).trim();
  if (!normTarget) return false;
  const allSkills = [
    ...(resume.skills?.hardSkills ?? []),
    ...(resume.skills?.tools ?? []),
    ...(resume.skills?.softSkills ?? []),
    ...(resume.skills?.groups ?? []).flatMap((g) => g.items ?? [])
  ];
  return allSkills.some((item) => normalizeForMatch(item) === normTarget);
};

export const resolveEffectiveResumeState = (params: {
  resumeProfile: ResumeProfile;
  jobTarget: JobTarget;
  matchAnalytics: MatchAnalytics;
  cvLanguage: CvLanguage;
  autoTranslateContent: boolean;
  aiTranslatedProfiles: Partial<Record<"id" | "en", CachedTranslationEntry>>;
}): EffectiveResumeResolution => {
  const {
    resumeProfile,
    jobTarget,
    matchAnalytics,
    cvLanguage,
    autoTranslateContent,
    aiTranslatedProfiles
  } = params;

  const sourceLang = detectResumeLanguage(resumeProfile);
  const sourceProseLang = detectResumeProseLanguage(resumeProfile);
  const activeLang = resolveCvLanguage(
    cvLanguage,
    matchAnalytics.hasAnalyzed ? matchAnalytics.detectedLanguage : undefined,
    resumeProfile
  );

  const contentHash = computeProfileContentHash(resumeProfile);
  const cached = aiTranslatedProfiles[activeLang];
  const translatedOverride =
    cached && cached.sourceHash === contentHash ? cached.profile : null;

  const isExplicitLanguageOverride = cvLanguage === "id" || cvLanguage === "en";
  const shouldTranslateContent =
    autoTranslateContent &&
    isExplicitLanguageOverride &&
    (sourceProseLang !== activeLang || Boolean(translatedOverride) || activeLang !== sourceLang);

  const effectiveResume = shouldTranslateContent
    ? translatedOverride ?? translateProfileDeterministic(resumeProfile, activeLang)
    : resumeProfile;

  const effectiveProseLang = detectResumeProseLanguage(effectiveResume);
  const isTranslatedView =
    shouldTranslateContent ||
    (autoTranslateContent && (activeLang !== sourceLang || Boolean(translatedOverride)));

  const translationAudit = isTranslatedView
    ? auditTranslation(resumeProfile, effectiveResume, activeLang)
    : null;

  const translationSourceLabel = isTranslatedView
    ? translatedOverride
      ? cached?.providerLabel ?? "AI / Suntingan"
      : "Kamus ATS Lokal"
    : null;

  const analytics =
    matchAnalytics.hasAnalyzed && jobTarget.rawDescription.trim()
      ? analyzeMatch(effectiveResume, jobTarget, {
          activeOutputLanguage: activeLang,
          effectiveProseLanguage: effectiveProseLang,
          translationCoverage: translationAudit?.coverageRatio
        })
      : matchAnalytics;

  return {
    sourceLang,
    sourceProseLang,
    activeLang,
    effectiveProseLang,
    effectiveResume,
    translatedOverride,
    isTranslatedView,
    translationSourceLabel,
    contentHash,
    translationAudit,
    analytics
  };
};
