import type {
  EducationCriterion,
  FormatCheckItem,
  JobTarget,
  KeywordMatch,
  MatchAnalytics,
  QualificationMatchItem,
  ResumeProfile,
  ScoreBreakdown
} from "@/types/resume";
import { normalizeJobDescription, toLegacyExtractedKeywords } from "@/lib/ats/normalizer";
import { containsTermBoundary, findSynonymMatch, getRelatedTerms, normalizeForMatch } from "@/lib/ats/synonyms";
import { compact, toPercent } from "@/lib/text";

type ResumeCorpus = {
  full: string;
  sections: Array<{ label: string; text: string }>;
};

const buildResumeCorpus = (resume: ResumeProfile): ResumeCorpus => {
  const summaryText = normalizeForMatch(resume.summary || "");
  const skillsText = normalizeForMatch(
    [
      ...(resume.skills?.hardSkills ?? []),
      ...(resume.skills?.tools ?? []),
      ...(resume.skills?.softSkills ?? []),
      ...(resume.skills?.groups ?? []).flatMap((group) => group.items ?? [])
    ].join(" ")
  );
  const workText = normalizeForMatch(
    (resume.workExperience ?? [])
      .flatMap((item) => [item.company, item.role, item.location ?? "", ...(item.bulletPoints ?? [])])
      .join(" ")
  );
  const projectText = normalizeForMatch(
    (resume.projects ?? [])
      .flatMap((item) => [item.name, item.role, item.context, ...(item.technologies ?? []), ...(item.bulletPoints ?? [])])
      .join(" ")
  );
  const orgText = normalizeForMatch(
    (resume.organizations ?? [])
      .flatMap((item) => [item.organization, item.role, ...(item.bulletPoints ?? [])])
      .join(" ")
  );
  const eduText = normalizeForMatch(
    (resume.education ?? [])
      .flatMap((item) => [
        item.institution,
        item.degree,
        item.fieldOfStudy,
        item.thesisTitle ?? "",
        ...(item.relevantCoursework ?? []),
        item.achievements ?? ""
      ])
      .join(" ")
  );
  const certText = normalizeForMatch(
    [
      ...(resume.certificationItems ?? []).flatMap((item) => [item.name, item.issuer]),
      ...(resume.certifications ?? [])
    ].join(" ")
  );

  const sections = [
    { label: "Keahlian", text: skillsText },
    { label: "Pengalaman Kerja", text: workText },
    { label: "Proyek & Studi Kasus", text: projectText },
    { label: "Organisasi", text: orgText },
    { label: "Ringkasan Profil", text: summaryText },
    { label: "Pendidikan", text: eduText },
    { label: "Sertifikasi", text: certText }
  ];

  const full = normalizeForMatch(
    [
      resume.contact?.headline ?? "",
      resume.contact?.location ?? "",
      ...sections.map((section) => section.text)
    ].join(" ")
  );

  return { full, sections };
};

const findEvidenceSection = (corpus: ResumeCorpus, term: string): string | undefined => {
  const hit = corpus.sections.find((section) => section.text && containsTermBoundary(section.text, term));
  return hit?.label;
};

const LEVEL_RANK: Record<string, number> = {
  "SMA/SMK": 1,
  SMK: 1,
  SMA: 1,
  D1: 2,
  D2: 2,
  D3: 3,
  DIPLOMA: 3,
  D4: 4,
  S1: 4,
  SARJANA: 4,
  BACHELOR: 4,
  "S.KOM": 4,
  "S.T": 4,
  "S.E": 4,
  "S.SI": 4,
  "S.SOS": 4,
  "S.PD": 4,
  "S.PSI": 4,
  "S.KM": 4,
  S2: 5,
  MAGISTER: 5,
  MASTER: 5
};

const parseHighestUserDegreeRank = (resume: ResumeProfile): number => {
  let highest = 0;
  for (const edu of resume.education ?? []) {
    const combined = normalizeForMatch(`${edu.degree} ${edu.fieldOfStudy}`);
    for (const [token, rank] of Object.entries(LEVEL_RANK)) {
      if (containsTermBoundary(combined, token)) {
        highest = Math.max(highest, rank);
      }
    }
  }
  return highest;
};

const parseUserGpa = (resume: ResumeProfile): number | undefined => {
  for (const edu of resume.education ?? []) {
    const match = (edu.gpa || "").match(/([0-4](?:[.,]\d{1,2})?)/);
    if (match) {
      const parsed = Number(match[1].replace(",", "."));
      if (!Number.isNaN(parsed) && parsed <= 4.0) return parsed;
    }
  }
  return undefined;
};

const evaluateEducationCriterion = (
  criterion: EducationCriterion,
  resume: ResumeProfile,
  corpus: ResumeCorpus
): QualificationMatchItem => {
  const eduSectionText = corpus.sections.find((s) => s.label === "Pendidikan")?.text ?? "";
  const hasEduFilled = (resume.education ?? []).some((e) => e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim());

  if (!hasEduFilled) {
    return {
      term: criterion.label,
      category: "education_criteria",
      status: "gap",
      guidance: "Lengkapi bagian Pendidikan (jenjang, jurusan, institusi, dan IPK) di Langkah 1 agar sistem dapat mencocokkannya."
    };
  }

  // Check degree level
  const requiredRanks = criterion.levels
    .map((lvl) => LEVEL_RANK[lvl.toUpperCase()] ?? 0)
    .filter((rank) => rank > 0);
  const minRequiredRank = requiredRanks.length ? Math.min(...requiredRanks) : 0;
  const userRank = parseHighestUserDegreeRank(resume);
  const levelOk = minRequiredRank === 0 || userRank >= minRequiredRank;

  // Check GPA if specified
  const userGpa = parseUserGpa(resume);
  const gpaOk = criterion.minGpa === undefined || (userGpa !== undefined && userGpa >= criterion.minGpa);

  // Check majors (exact or cluster synonym)
  let majorStatus: "matched" | "partial" | "gap" | "not_required" = criterion.majors.length ? "gap" : "not_required";
  let matchedMajorVia: string | undefined;

  if (criterion.majors.length) {
    for (const major of criterion.majors) {
      if (containsTermBoundary(eduSectionText, major)) {
        majorStatus = "matched";
        matchedMajorVia = major;
        break;
      }
      const syn = findSynonymMatch(eduSectionText, major);
      if (syn) {
        majorStatus = "partial";
        matchedMajorVia = `Rumpun jurusan serumpun (${syn.matchedTerm})`;
        break;
      }
    }
  }

  if (levelOk && gpaOk && (majorStatus === "matched" || majorStatus === "not_required")) {
    return {
      term: criterion.label,
      category: "education_criteria",
      status: "matched",
      evidenceLocation: "Pendidikan",
      guidance: "Latar belakang pendidikan di CV sudah memenuhi kualifikasi lowongan."
    };
  }

  if (levelOk && (majorStatus === "partial" || !gpaOk)) {
    const note = !gpaOk
      ? `IPK minimal yang diminta ${criterion.minGpa?.toFixed(2)}. Pastikan IPK tertulis jelas jika memenuhi.`
      : `${matchedMajorVia ?? "Jenjang pendidikan sesuai"}.`;
    return {
      term: criterion.label,
      category: "education_criteria",
      status: "partial",
      matchedVia: matchedMajorVia,
      evidenceLocation: "Pendidikan",
      guidance: `${note} Tonjolkan tugas akhir atau mata kuliah yang relevan dengan posisi ini.`
    };
  }

  return {
    term: criterion.label,
    category: "education_criteria",
    status: "gap",
    guidance:
      "Jika jurusan berbeda, kamu tetap dapat menonjolkan proyek, mata kuliah relevan, atau sertifikasi yang membuktikan kesiapanmu pada posisi ini."
  };
};

const evaluateTermMatch = (
  term: string,
  category: "explicit_hard_skills_and_tools" | "soft_skills_and_work_traits",
  corpus: ResumeCorpus,
  experienceLevel: ResumeProfile["experienceLevel"]
): QualificationMatchItem => {
  if (containsTermBoundary(corpus.full, term)) {
    const location = findEvidenceSection(corpus, term) ?? "CV";
    return {
      term,
      category,
      status: "matched",
      evidenceLocation: location,
      guidance: `Sudah terbaca langsung di bagian ${location}.`
    };
  }

  // Cek sinonim / singkatan / lintas bahasa (ID <-> EN)
  const syn = findSynonymMatch(corpus.full, term);
  if (syn) {
    const location = findEvidenceSection(corpus, syn.matchedTerm) ?? "CV";
    const relationText = syn.kind === "cross_language" ? "Padanan lintas bahasa" : "Sinonim istilah";
    return {
      term,
      category,
      status: "partial",
      matchedVia: `${relationText}: ${syn.matchedTerm}`,
      evidenceLocation: location,
      guidance: `Ditemukan padanan "${syn.matchedTerm}" di bagian ${location}. Jika sesuai dengan bahasamu, kamu bisa menambahkan istilah "${term}" secara berdampingan.`
    };
  }

  const related = getRelatedTerms(term).slice(0, 2);
  const relatedHint = related.length ? ` (istilah terkait: ${related.join(", ")})` : "";

  if (category === "explicit_hard_skills_and_tools") {
    const freshNote =
      experienceLevel === "fresh_graduate"
        ? `Jika kamu pernah mempelajarinya di kuliah, skripsi, proyek, atau pelatihan${relatedHint}, cantumkan di Keahlian & jelaskan pemakaiannya di Proyek.`
        : `Jika kamu benar-benar menguasainya${relatedHint}, masukkan ke Keahlian teknis dan buktikan di salah satu poin pengalaman.`;
    return {
      term,
      category,
      status: "gap",
      guidance: `${freshNote} Jangan mencantumkan keahlian yang belum pernah kamu praktikkan.`
    };
  }

  return {
    term,
    category,
    status: "gap",
    guidance: `Tunjukkan karakter kerja "${term}" melalui tindakan nyata di poin pengalaman, proyek, atau organisasi (bukan sekadar daftar kata sifat).`
  };
};

/** Validasi tanggal yang fleksibel: menerima MM/YYYY, Bulan YYYY, YYYY, Present, Sekarang. */
const isValidDateToken = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^(present|sekarang|saat ini)$/i.test(trimmed)) return true;
  if (/^(0[1-9]|1[0-2])\/\d{4}$/.test(trimmed)) return true;
  if (/^(jan|feb|mar|apr|may|mei|jun|jul|aug|agu|sep|oct|okt|nov|dec|des)[a-z]*\s+\d{4}$/i.test(trimmed)) return true;
  if (/^\d{4}$/.test(trimmed)) return true;
  return false;
};

export const evaluateFormatQuality = (resume: ResumeProfile): { score: number; checks: FormatCheckItem[] } => {
  const isFresh = resume.experienceLevel === "fresh_graduate";
  const allBullets = [
    ...(resume.workExperience ?? []).flatMap((w) => w.bulletPoints ?? []),
    ...(resume.projects ?? []).flatMap((p) => p.bulletPoints ?? []),
    ...(resume.organizations ?? []).flatMap((o) => o.bulletPoints ?? [])
  ]
    .map((b) => b.trim())
    .filter(Boolean);

  const hasActivities =
    (resume.workExperience ?? []).some((w) => w.company.trim() || w.role.trim() || w.bulletPoints.some((b) => b.trim())) ||
    (resume.projects ?? []).some((p) => p.name.trim() || p.bulletPoints.some((b) => b.trim())) ||
    (resume.organizations ?? []).some((o) => o.organization.trim() || o.bulletPoints.some((b) => b.trim()));

  const hasValidDates = (resume.workExperience ?? []).every(
    (w) => isValidDateToken(w.startDate) && (w.isCurrent || isValidDateToken(w.endDate))
  );

  const groupedSkillItems = (resume.skills?.groups ?? []).flatMap((group) => group.items ?? []).filter((s) => s.trim());
  const flatSkillCount =
    (resume.skills?.hardSkills ?? []).filter((s) => s.trim()).length +
    (resume.skills?.tools ?? []).filter((s) => s.trim()).length;
  const skillCount = Math.max(flatSkillCount, groupedSkillItems.length);

  const hasEducation = (resume.education ?? []).some((e) => e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim());
  const hasGpaOrThesis = (resume.education ?? []).some((e) => Boolean(e.gpa?.trim() || e.thesisTitle?.trim()));

  const checks: FormatCheckItem[] = [
    {
      id: "contact-complete",
      label: "Kontak utama lengkap (Nama, Email valid, Telepon)",
      passed: Boolean(
        resume.contact?.fullName?.trim() &&
          /.+@.+\..+/.test(resume.contact?.email?.trim() ?? "") &&
          resume.contact?.phone?.trim()
      ),
      tip: "Pastikan nama lengkap, alamat email aktif, dan nomor telepon terisi di bagian Kontak."
    },
    {
      id: "summary-length",
      label: "Ringkasan profil informatif (minimal 60 karakter)",
      passed: (resume.summary ?? "").trim().length >= 60,
      tip: "Tulis 2-4 kalimat ringkas mengenai latar belakang, fokus keahlian, dan nilai tambahmu."
    },
    {
      id: "education-present",
      label: isFresh ? "Riwayat pendidikan & IPK/tugas akhir tercantum" : "Riwayat pendidikan tercantum",
      passed: isFresh ? hasEducation && hasGpaOrThesis : hasEducation,
      tip: isFresh
        ? "Untuk Fresh Graduate, mencantumkan jurusan dan IPK/judul tugas akhir membantu saringan awal."
        : "Cantumkan minimal nama institusi, jenjang, dan program studi."
    },
    {
      id: "activity-bullets",
      label: isFresh
        ? "Memiliki poin aktivitas (Proyek, Magang, Kerja, atau Organisasi)"
        : "Memiliki poin pengalaman kerja tertulis",
      passed: hasActivities && allBullets.length >= 2,
      tip: isFresh
        ? "Belum pernah kerja bukan masalah: isi Proyek Kuliah, Skripsi, Magang, atau Organisasi minimal 2 poin."
        : "Tambahkan minimal 2 poin pencapaian pada pengalaman kerja."
    },
    {
      id: "impact-metric",
      label: "Ada ukuran hasil terukur (angka, %, atau jumlah) di poin CV",
      passed: allBullets.some((b) => /\d/.test(b)),
      tip: "Jika memang ada datanya, tambahkan angka nyata seperti jumlah peserta, waktu, atau persentase."
    },
    {
      id: "skills-minimum",
      label: "Daftar keahlian teknis / alat kerja minimal 3 item",
      passed: skillCount >= 3,
      tip: "Isi minimal 3 keahlian teknis atau software yang benar-benar kamu kuasai di tab Keahlian."
    },
    {
      id: "dates-consistent",
      label: "Format tanggal konsisten (MM/YYYY atau Bulan YYYY)",
      passed: hasValidDates,
      tip: "Gunakan format seragam seperti '08/2024' atau 'Agu 2024' dan 'Present'/'Sekarang'."
    }
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    score: checks.length ? passedCount / checks.length : 0,
    checks
  };
};

const ratioForMatches = (items: QualificationMatchItem[]): number | null => {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => {
    if (item.status === "matched") return sum + 1.0;
    if (item.status === "partial") return sum + 0.75;
    return sum;
  }, 0);
  return total / items.length;
};

export const analyzeMatch = (resume: ResumeProfile, job: JobTarget): MatchAnalytics => {
  const normalized =
    job.normalized ?? normalizeJobDescription(job.rawDescription, job.jobTitle);
  const corpus = buildResumeCorpus(resume);

  const hardMatches: QualificationMatchItem[] = normalized.explicit_hard_skills_and_tools.map((term) =>
    evaluateTermMatch(term, "explicit_hard_skills_and_tools", corpus, resume.experienceLevel)
  );
  const eduMatches: QualificationMatchItem[] = normalized.education_criteria.map((criterion) =>
    evaluateEducationCriterion(criterion, resume, corpus)
  );
  const softMatches: QualificationMatchItem[] = normalized.soft_skills_and_work_traits.map((term) =>
    evaluateTermMatch(term, "soft_skills_and_work_traits", corpus, resume.experienceLevel)
  );

  const qualificationMatches = [...hardMatches, ...eduMatches, ...softMatches];
  const formatEval = evaluateFormatQuality(resume);

  // Kalibrasi skor berbobot dengan re-normalisasi dinamis jika salah satu kategori kosong di iklan
  const rawHard = ratioForMatches(hardMatches);
  const rawEdu = ratioForMatches(eduMatches);
  const rawSoft = ratioForMatches(softMatches);
  const rawFormat = formatEval.score;

  const activeComponents: Array<{
    key: "hardSkills" | "educationAndDomain" | "structureAndImpact" | "softSkills";
    baseWeight: number;
    score: number;
  }> = [{ key: "structureAndImpact", baseWeight: 0.15, score: rawFormat }];

  if (rawHard !== null) activeComponents.push({ key: "hardSkills", baseWeight: 0.55, score: rawHard });
  if (rawEdu !== null) activeComponents.push({ key: "educationAndDomain", baseWeight: 0.25, score: rawEdu });
  if (rawSoft !== null) activeComponents.push({ key: "softSkills", baseWeight: 0.05, score: rawSoft });

  const totalBaseWeight = activeComponents.reduce((sum, item) => sum + item.baseWeight, 0) || 1;
  const weights = {
    hardSkills: 0,
    educationAndDomain: 0,
    structureAndImpact: 0,
    softSkills: 0
  };

  let overallFraction = 0;
  for (const item of activeComponents) {
    const normalizedWeight = item.baseWeight / totalBaseWeight;
    weights[item.key] = Math.round(normalizedWeight * 100) / 100;
    overallFraction += normalizedWeight * item.score;
  }

  const breakdown: ScoreBreakdown = {
    hardSkillsScore: rawHard !== null ? toPercent(rawHard) : 0,
    educationAndDomainScore: rawEdu !== null ? toPercent(rawEdu) : 0,
    structureAndImpactScore: toPercent(rawFormat),
    softSkillsScore: rawSoft !== null ? toPercent(rawSoft) : 0,
    weights
  };

  // Hitung metrik kompatibilitas untuk UI / dashboard lama
  const matchedKeywords = qualificationMatches.filter((m) => m.status === "matched").map((m) => m.term);
  const semanticKeywords = qualificationMatches.filter((m) => m.status === "partial").map((m) => m.term);
  const missingKeywords = qualificationMatches.filter((m) => m.status === "gap").map((m) => m.term);

  const keywordMatches: KeywordMatch[] = qualificationMatches.map((item) => ({
    keyword: item.term,
    category:
      item.category === "explicit_hard_skills_and_tools"
        ? "requiredHardSkills"
        : item.category === "education_criteria"
        ? "domainKeywords"
        : "softSkills",
    status: item.status === "matched" ? "matched" : item.status === "partial" ? "semantic" : "missing",
    reason: item.matchedVia ? `${item.matchedVia}. ${item.guidance}` : item.guidance
  }));

  const totalItems = qualificationMatches.length || 1;
  const exactMatchRate = toPercent(matchedKeywords.length / totalItems);
  const semanticProximity = toPercent(
    (matchedKeywords.length + semanticKeywords.length * 0.75) / totalItems
  );

  // Filter implicit domain suggestions jika user sudah punya di CV
  const implicitSuggestions = normalized.implicit_domain_competencies.filter((comp) => {
    if (containsTermBoundary(corpus.full, comp.skill)) return false;
    return !findSynonymMatch(corpus.full, comp.skill);
  });

  return {
    hasAnalyzed: true,
    detectedLanguage: normalized.detectedLanguage,
    overallScore: toPercent(overallFraction),
    exactMatchRate,
    semanticProximity,
    formatQualityScore: toPercent(rawFormat),
    matchedKeywords,
    semanticKeywords,
    missingKeywords,
    formatCheckPassed: rawFormat >= 0.75,
    keywordMatches,
    breakdown,
    qualificationMatches,
    administrativeItems: normalized.administrative_requirements,
    implicitSuggestions,
    formatChecks: formatEval.checks
  };
};

export const describeKeywordAction = (match: KeywordMatch): string => {
  if (match.status === "matched") return "Sudah terbaca langsung di CV.";
  if (match.status === "semantic") return match.reason;
  if (match.category === "requiredHardSkills") {
    return "Jika benar-benar dikuasai, cantumkan di Keahlian dan jelaskan pemakaiannya pada Proyek atau Pengalaman.";
  }
  if (match.category === "domainKeywords") {
    return "Perjelas pada bagian Pendidikan, Tugas Akhir, atau Ringkasan Profil.";
  }
  return "Tunjukkan melalui contoh tindakan nyata pada Proyek, Organisasi, atau Pengalaman.";
};

export { toLegacyExtractedKeywords };
export const hasMetric = (value: string) => /\d|%|rp\s?\d/i.test(value);
export const compactTokens = compact;
