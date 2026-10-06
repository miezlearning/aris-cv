export type Contact = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
};

export type WorkExperience = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bulletPoints: string[];
};

export type Education = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  gpa: string;
  graduationDate: string;
};

export type Skills = {
  hardSkills: string[];
  softSkills: string[];
  tools: string[];
};

export type ResumeProfile = {
  contact: Contact;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skills;
};

export type ExtractedKeywords = {
  requiredHardSkills: string[];
  domainKeywords: string[];
  softSkills: string[];
};

export type JobTarget = {
  jobTitle: string;
  companyName: string;
  rawDescription: string;
  extractedKeywords: ExtractedKeywords;
};

export type KeywordMatch = {
  keyword: string;
  category: keyof ExtractedKeywords;
  status: "matched" | "semantic" | "missing";
  reason: string;
};

export type MatchAnalytics = {
  overallScore: number;
  exactMatchRate: number;
  semanticProximity: number;
  formatQualityScore: number;
  matchedKeywords: string[];
  semanticKeywords: string[];
  missingKeywords: string[];
  formatCheckPassed: boolean;
  keywordMatches: KeywordMatch[];
};

export type RewriteSuggestion = {
  id: string;
  experienceId: string;
  bulletIndex: number;
  original: string;
  suggestion: string;
  /** Catatan pola XYZ untuk poin ini, misalnya belum ada ukuran hasil. */
  note?: string;
  keywordsUsed: string[];
  status: "pending" | "accepted" | "rejected" | "edited";
};


