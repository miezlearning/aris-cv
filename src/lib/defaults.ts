import type { ResumeProfile, JobTarget, MatchAnalytics } from "@/types/resume";

export const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const emptyResumeProfile = (): ResumeProfile => ({
  contact: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    portfolioUrl: ""
  },
  summary: "",
  workExperience: [
    {
      id: createId(),
      company: "",
      role: "",
      startDate: "",
      endDate: "Present",
      isCurrent: true,
      bulletPoints: [""]
    }
  ],
  education: [
    {
      id: createId(),
      institution: "",
      degree: "",
      fieldOfStudy: "",
      gpa: "",
      graduationDate: ""
    }
  ],
  skills: {
    hardSkills: [],
    softSkills: [],
    tools: []
  }
});

export const emptyJobTarget = (): JobTarget => ({
  jobTitle: "",
  companyName: "",
  rawDescription: "",
  extractedKeywords: {
    requiredHardSkills: [],
    domainKeywords: [],
    softSkills: []
  }
});

export const emptyAnalytics = (): MatchAnalytics => ({
  overallScore: 0,
  exactMatchRate: 0,
  semanticProximity: 0,
  formatQualityScore: 0,
  matchedKeywords: [],
  semanticKeywords: [],
  missingKeywords: [],
  formatCheckPassed: false,
  keywordMatches: []
});
