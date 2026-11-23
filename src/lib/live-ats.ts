"use client";

import { useMemo } from "react";
import {
  hasSkillInProfile,
  resolveEffectiveResumeState,
  type EffectiveResumeResolution
} from "@/lib/ats/effective-resume";
import { useCvStore } from "@/lib/store";

export { hasSkillInProfile, resolveEffectiveResumeState, type EffectiveResumeResolution };

export const useLiveAts = (): EffectiveResumeResolution => {
  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const jobTarget = useCvStore((state) => state.jobTarget);
  const matchAnalytics = useCvStore((state) => state.matchAnalytics);
  const cvLanguage = useCvStore((state) => state.cvLanguage);
  const autoTranslateContent = useCvStore((state) => state.autoTranslateContent);
  const aiTranslatedProfiles = useCvStore((state) => state.aiTranslatedProfiles);

  return useMemo(
    () =>
      resolveEffectiveResumeState({
        resumeProfile,
        jobTarget,
        matchAnalytics,
        cvLanguage,
        autoTranslateContent,
        aiTranslatedProfiles
      }),
    [
      resumeProfile,
      jobTarget,
      matchAnalytics,
      cvLanguage,
      autoTranslateContent,
      aiTranslatedProfiles
    ]
  );
};
