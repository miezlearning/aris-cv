export type ExperienceLevel = "fresh_graduate" | "early_career" | "experienced";
export type CvLanguage = "auto" | "id" | "en";
export type DetectedLanguage = "id" | "en" | "mixed";
export type WorkType = "fulltime" | "internship" | "parttime" | "freelance";

export type Contact = {
  fullName: string;
  headline?: string;
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
  type?: WorkType;
  location?: string;
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
  thesisTitle?: string;
  relevantCoursework?: string[];
  achievements?: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  role: string;
  context: string;
  period: string;
  technologies: string[];
  url?: string;
  bulletPoints: string[];
};

export type OrganizationItem = {
  id: string;
  organization: string;
  role: string;
  period: string;
  bulletPoints: string[];
};

export type CertificationItem = {
  id: string;
  name: string;
  issuer: string;
  year: string;
};

export type Skills = {
  hardSkills: string[];
  softSkills: string[];
  tools: string[];
};

export type ResumeProfile = {
  experienceLevel: ExperienceLevel;
  contact: Contact;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  projects: ProjectItem[];
  organizations: OrganizationItem[];
  certificationItems: CertificationItem[];
  skills: Skills;
  /** Kompatibilitas mundur dengan profil lama yang hanya menyimpan array string. */
  certifications?: string[];
};

export type ExtractedKeywords = {
  requiredHardSkills: string[];
  domainKeywords: string[];
  softSkills: string[];
};

export type AdministrativeItem = {
  id: string;
  label: string;
  subType: "document" | "demographic" | "physical" | "logistics";
  rawSnippet: string;
};

export type EducationCriterion = {
  id: string;
  levels: string[];
  majors: string[];
  minGpa?: number;
  rawSnippet: string;
  label: string;
};

export type ImplicitCompetency = {
  id: string;
  skill: string;
  domain: string;
  reason: string;
};

export type NormalizedJobQualifications = {
  detectedLanguage: DetectedLanguage;
  detectedDomains: string[];
  administrative_requirements: AdministrativeItem[];
  education_criteria: EducationCriterion[];
  explicit_hard_skills_and_tools: string[];
  implicit_domain_competencies: ImplicitCompetency[];
  soft_skills_and_work_traits: string[];
};

export type JobTarget = {
  jobTitle: string;
  companyName: string;
  rawDescription: string;
  extractedKeywords: ExtractedKeywords;
  normalized?: NormalizedJobQualifications;
};

export type KeywordMatch = {
  keyword: string;
  category: keyof ExtractedKeywords;
  status: "matched" | "semantic" | "missing";
  reason: string;
};

export type QualificationMatchStatus = "matched" | "partial" | "gap" | "administrative";

export type QualificationMatchItem = {
  term: string;
  category: "explicit_hard_skills_and_tools" | "education_criteria" | "soft_skills_and_work_traits";
  status: Exclude<QualificationMatchStatus, "administrative">;
  matchedVia?: string;
  evidenceLocation?: string;
  guidance: string;
};

export type FormatCheckItem = {
  id: string;
  label: string;
  passed: boolean;
  tip: string;
};

export type ScoreBreakdown = {
  hardSkillsScore: number;
  educationAndDomainScore: number;
  structureAndImpactScore: number;
  softSkillsScore: number;
  weights: {
    hardSkills: number;
    educationAndDomain: number;
    structureAndImpact: number;
    softSkills: number;
  };
};

export type MatchAnalytics = {
  hasAnalyzed: boolean;
  detectedLanguage: DetectedLanguage;
  overallScore: number;
  exactMatchRate: number;
  semanticProximity: number;
  formatQualityScore: number;
  matchedKeywords: string[];
  semanticKeywords: string[];
  missingKeywords: string[];
  formatCheckPassed: boolean;
  keywordMatches: KeywordMatch[];
  breakdown: ScoreBreakdown;
  qualificationMatches: QualificationMatchItem[];
  administrativeItems: AdministrativeItem[];
  implicitSuggestions: ImplicitCompetency[];
  formatChecks: FormatCheckItem[];
};

export type RewriteSuggestion = {
  id: string;
  sourceType: "work" | "project" | "organization";
  sourceId: string;
  sourceLabel: string;
  /** Disimpan sinkron dengan sourceId untuk kompatibilitas mundur. */
  experienceId: string;
  bulletIndex: number;
  original: string;
  suggestion: string;
  /** Catatan pola XYZ/STAR untuk poin ini, misalnya belum ada ukuran hasil. */
  note?: string;
  keywordsUsed: string[];
  status: "pending" | "accepted" | "rejected" | "edited";
};
