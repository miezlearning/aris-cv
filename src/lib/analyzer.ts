import type { ExtractedKeywords, JobTarget, KeywordMatch, MatchAnalytics, ResumeProfile, RewriteSuggestion } from "@/types/resume";
import { createId } from "@/lib/defaults";
import { compact, normalizeText, toPercent, unique } from "@/lib/text";

const hardSkillDictionary = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "python",
  "java",
  "sql",
  "postgresql",
  "mysql",
  "mongodb",
  "excel",
  "power bi",
  "tableau",
  "figma",
  "seo",
  "search engine optimization",
  "sem",
  "google analytics",
  "looker studio",
  "digital marketing",
  "content marketing",
  "copywriting",
  "social media",
  "crm",
  "salesforce",
  "hubspot",
  "project management",
  "scrum",
  "agile",
  "qa",
  "quality assurance",
  "api",
  "rest api",
  "graphql",
  "git",
  "docker",
  "aws",
  "gcp",
  "azure",
  "machine learning",
  "data analysis",
  "data visualization",
  "ui/ux",
  "user research",
  "wireframe",
  "prototype",
  "accounting",
  "financial reporting",
  "tax",
  "recruitment",
  "talent acquisition",
  "hris",
  "customer service",
  "operational excellence"
];

const softSkillDictionary = [
  "communication",
  "komunikasi",
  "leadership",
  "kepemimpinan",
  "collaboration",
  "kolaborasi",
  "teamwork",
  "problem solving",
  "pemecahan masalah",
  "analytical thinking",
  "critical thinking",
  "adaptability",
  "adaptif",
  "attention to detail",
  "teliti",
  "time management",
  "manajemen waktu",
  "ownership",
  "inisiatif",
  "stakeholder management",
  "negotiation",
  "presentasi"
];

const domainDictionary = [
  "market research",
  "campaign",
  "kampanye",
  "customer acquisition",
  "retention",
  "conversion",
  "product development",
  "business process",
  "operational",
  "finance",
  "akuntansi",
  "human resources",
  "supply chain",
  "logistics",
  "e-commerce",
  "edtech",
  "fintech",
  "healthcare",
  "education",
  "risk management",
  "compliance",
  "customer experience",
  "msib",
  "kampus merdeka",
  "organisasi mahasiswa",
  "bumN".toLowerCase(),
  "kpi",
  "okr",
  "sla",
  "dashboard",
  "reporting",
  "analytics"
];

const synonymGroups = [
  ["seo", "search engine optimization", "optimasi mesin pencari"],
  ["sem", "search engine marketing", "paid search"],
  ["communication", "komunikasi", "presentasi"],
  ["leadership", "kepemimpinan", "team lead", "koordinator"],
  ["collaboration", "kolaborasi", "teamwork", "kerja sama"],
  ["data analysis", "analisis data", "analytics"],
  ["power bi", "dashboard", "data visualization", "visualisasi data"],
  ["recruitment", "talent acquisition", "hiring"],
  ["customer service", "customer support", "layanan pelanggan"],
  ["project management", "manajemen proyek", "scrum", "agile"]
];

const stopWords = new Set([
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "dalam",
  "dari",
  "pada",
  "sebagai",
  "akan",
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "role",
  "job",
  "candidate",
  "responsibilities",
  "requirements",
  "minimum",
  "maksimal",
  "pengalaman",
  "memiliki",
  "mampu",
  "lebih",
  "baik"
]);

const categoryWeights: Record<keyof ExtractedKeywords, number> = {
  requiredHardSkills: 0.5,
  domainKeywords: 0.3,
  softSkills: 0.2
};

const containsTerm = (body: string, term: string) => {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  return body.includes(normalizedTerm);
};

const makeResumeText = (resume: ResumeProfile) =>
  normalizeText(
    [
      resume.contact.fullName,
      resume.contact.location,
      resume.summary,
      ...resume.skills.hardSkills,
      ...resume.skills.softSkills,
      ...resume.skills.tools,
      ...resume.workExperience.flatMap((item) => [item.company, item.role, ...item.bulletPoints]),
      ...resume.education.flatMap((item) => [item.institution, item.degree, item.fieldOfStudy, item.gpa, item.graduationDate])
    ].join(" ")
  );

const getSynonyms = (keyword: string) => {
  const normalized = normalizeText(keyword);
  const group = synonymGroups.find((items) => items.some((item) => normalizeText(item) === normalized));
  return group ? group.filter((item) => normalizeText(item) !== normalized) : [];
};

const findDictionaryHits = (text: string, dictionary: string[]) => dictionary.filter((keyword) => containsTerm(text, keyword));

const extractCapitalizedTechnicalTerms = (raw: string) => {
  const matches = raw.match(/\b[A-Z][A-Za-z0-9+#.]{1,}(?:\s+[A-Z][A-Za-z0-9+#.]{1,}){0,2}\b/g) ?? [];
  return matches
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !["PT", "CV", "HR", "ID"].includes(item));
};

const extractRepeatedPhrases = (text: string) => {
  const words = normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 3 && !stopWords.has(word));
  const counts = new Map<string, number>();

  for (let index = 0; index < words.length - 1; index += 1) {
    const phrase = `${words[index]} ${words[index + 1]}`;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([phrase]) => phrase)
    .slice(0, 8);
};

export const extractKeywords = (rawDescription: string): ExtractedKeywords => {
  const normalized = normalizeText(rawDescription);
  const hardSkills = unique([
    ...findDictionaryHits(normalized, hardSkillDictionary),
    ...extractCapitalizedTechnicalTerms(rawDescription)
  ]).slice(0, 24);
  const domainKeywords = unique([
    ...findDictionaryHits(normalized, domainDictionary),
    ...extractRepeatedPhrases(rawDescription)
  ]).slice(0, 18);
  const softSkills = unique(findDictionaryHits(normalized, softSkillDictionary)).slice(0, 14);

  return {
    requiredHardSkills: hardSkills,
    domainKeywords,
    softSkills
  };
};

const getKeywordMatches = (resume: ResumeProfile, extracted: ExtractedKeywords) => {
  const resumeText = makeResumeText(resume);
  const matches: KeywordMatch[] = [];

  (Object.keys(extracted) as Array<keyof ExtractedKeywords>).forEach((category) => {
    extracted[category].forEach((keyword) => {
      if (containsTerm(resumeText, keyword)) {
        matches.push({ keyword, category, status: "matched", reason: "Ada kecocokan langsung di CV." });
        return;
      }

      const synonym = getSynonyms(keyword).find((item) => containsTerm(resumeText, item));
      if (synonym) {
        matches.push({ keyword, category, status: "semantic", reason: `Padanan ditemukan: ${synonym}.` });
        return;
      }

      matches.push({ keyword, category, status: "missing", reason: "Belum ditemukan di ringkasan, pengalaman, atau skills." });
    });
  });

  return matches;
};

const weightedRate = (matches: KeywordMatch[], status: "matched" | "semantic") => {
  const totalWeight = matches.reduce((sum, item) => sum + categoryWeights[item.category], 0);
  if (!totalWeight) return 0;
  const score = matches.reduce((sum, item) => (item.status === status ? sum + categoryWeights[item.category] : sum), 0);
  return score / totalWeight;
};

const formatQuality = (resume: ResumeProfile) => {
  const checks = [
    Boolean(resume.contact.fullName && resume.contact.email && resume.contact.phone),
    /.+@.+\..+/.test(resume.contact.email),
    resume.workExperience.every((item) => /^(0[1-9]|1[0-2])\/\d{4}$/.test(item.startDate) || item.startDate === ""),
    resume.workExperience.every((item) => item.isCurrent || /^(0[1-9]|1[0-2])\/\d{4}$/.test(item.endDate) || item.endDate === ""),
    resume.workExperience.some((item) => item.bulletPoints.some((bullet) => /\d/.test(bullet))),
    resume.summary.trim().length >= 80,
    resume.skills.hardSkills.length + resume.skills.tools.length >= 3,
    resume.education.some((item) => item.institution || item.degree)
  ];

  const passed = checks.filter(Boolean).length;
  return passed / checks.length;
};

export const analyzeMatch = (resume: ResumeProfile, job: JobTarget): MatchAnalytics => {
  const extracted = job.extractedKeywords.requiredHardSkills.length || job.extractedKeywords.domainKeywords.length || job.extractedKeywords.softSkills.length
    ? job.extractedKeywords
    : extractKeywords(job.rawDescription);
  const keywordMatches = getKeywordMatches(resume, extracted);
  const exactMatchRate = weightedRate(keywordMatches, "matched");
  const semanticProximity = weightedRate(keywordMatches, "semantic");
  const formatQualityScore = formatQuality(resume);
  const overallScore = 0.5 * exactMatchRate + 0.3 * semanticProximity + 0.2 * formatQualityScore;

  return {
    overallScore: toPercent(overallScore),
    exactMatchRate: toPercent(exactMatchRate),
    semanticProximity: toPercent(semanticProximity),
    formatQualityScore: toPercent(formatQualityScore),
    matchedKeywords: keywordMatches.filter((item) => item.status === "matched").map((item) => item.keyword),
    semanticKeywords: keywordMatches.filter((item) => item.status === "semantic").map((item) => item.keyword),
    missingKeywords: keywordMatches.filter((item) => item.status === "missing").map((item) => item.keyword),
    formatCheckPassed: formatQualityScore >= 0.75,
    keywordMatches
  };
};

const pickSafeKeywords = (resume: ResumeProfile, analytics: MatchAnalytics, bullet: string) => {
  const resumeText = makeResumeText(resume);
  const bulletText = normalizeText(bullet);
  return unique([...analytics.matchedKeywords, ...analytics.semanticKeywords])
    .filter((keyword) => containsTerm(resumeText, keyword) || containsTerm(bulletText, keyword))
    .slice(0, 2);
};

const hasMetric = (value: string) => /\d|%|rp\s?\d/i.test(value);

const buildSuggestion = (bullet: string, role: string, keywords: string[]) => {
  const clean = bullet.trim().replace(/^[-•]\s*/, "");
  const keywordPhrase = keywords.length ? ` dengan konteks ${keywords.join(" dan ")}` : "";

  if (!clean) return "";

  if (hasMetric(clean)) {
    return `Meningkatkan kontribusi pada ${role || "peran terkait"}${keywordPhrase} melalui ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
  }

  return `Menangani ${role || "tanggung jawab utama"}${keywordPhrase} dengan menjalankan ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
};

export const generateRewriteSuggestions = (resume: ResumeProfile, analytics: MatchAnalytics): RewriteSuggestion[] => {
  return resume.workExperience.flatMap((experience) => {
    const items: RewriteSuggestion[] = [];

    experience.bulletPoints.forEach((bullet, bulletIndex) => {
      const keywordsUsed = pickSafeKeywords(resume, analytics, bullet);
      const suggestion = buildSuggestion(bullet, experience.role, keywordsUsed);
      if (!suggestion || suggestion === bullet) return;

      items.push({
        id: createId(),
        experienceId: experience.id,
        bulletIndex,
        original: bullet,
        suggestion,
        keywordsUsed,
        status: "pending"
      });
    });

    return items;
  });
};

export const buildAnalysis = (resume: ResumeProfile, job: JobTarget) => {
  const extractedKeywords = extractKeywords(job.rawDescription);
  const enrichedJob = { ...job, extractedKeywords };
  const analytics = analyzeMatch(resume, enrichedJob);
  const suggestions = generateRewriteSuggestions(resume, analytics);

  return { enrichedJob, analytics, suggestions };
};

export const getResumeCompleteness = (resume: ResumeProfile) => {
  const filled = compact([
    resume.contact.fullName,
    resume.contact.email,
    resume.contact.phone,
    resume.summary,
    ...resume.workExperience.flatMap((item) => [item.company, item.role, ...item.bulletPoints]),
    ...resume.education.flatMap((item) => [item.institution, item.degree]),
    ...resume.skills.hardSkills,
    ...resume.skills.tools
  ]).length;

  return Math.min(100, Math.round((filled / 16) * 100));
};
