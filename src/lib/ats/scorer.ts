import type {
  DetectedLanguage,
  EducationCriterion,
  FormatCheckItem,
  JobTarget,
  KeywordMatch,
  LanguageAlignmentInfo,
  MatchAnalytics,
  QualificationMatchItem,
  ResumeProfile,
  ScoreBreakdown
} from "@/types/resume";
import { normalizeJobDescription, toLegacyExtractedKeywords } from "@/lib/ats/normalizer";
import { containsTermBoundary, findSynonymMatch, getRelatedTerms, normalizeForMatch } from "@/lib/ats/synonyms";
import {
  hasFirstPersonPronoun,
  hasInvertedWorkDateRange,
  hasUnfilledPlaceholder
} from "@/lib/ats/hygiene";
import { isWorkExperienceChronological } from "@/lib/chronology";
import { detectResumeProseLanguage } from "@/lib/resume-document";
import { compact, toPercent } from "@/lib/text";

export type AnalyzeMatchOptions = {
  activeOutputLanguage?: "id" | "en";
  effectiveProseLanguage?: DetectedLanguage;
  translationCoverage?: number;
};

type ResumeCorpus = {
  full: string;
  sections: Array<{ label: string; text: string }>;
};

export const hasMetric = (value: string) => /\d|%|rp\s?\d/i.test(value);

/** Pembuka pasif yang membuat poin terdengar seperti deskripsi tugas, bukan pencapaian. */
export const FILLER_OPENERS = [
  "bertanggung jawab untuk",
  "bertanggung jawab atas",
  "bertanggung jawab dalam",
  "bertanggung jawab",
  "ikut membantu dalam",
  "ikut membantu",
  "ikut serta dalam",
  "ikut serta",
  "membantu dalam",
  "membantu untuk",
  "terlibat dalam",
  "berperan dalam",
  "ditugaskan untuk",
  "ditugaskan",
  "tugas saya adalah",
  "tugas saya",
  "job desc",
  "jobdesk",
  "responsible for",
  "helped with",
  "assisted with",
  "assisted in",
  "worked on",
  "tasked with"
];

/** Kata kerja lemah yang perlu ditingkatkan ke kata kerja aksi spesifik. */
export const WEAK_VERB_MAP: Record<string, string> = {
  membuat: "Menyusun",
  buat: "Menyusun",
  bikin: "Menyusun",
  mengurus: "Mengelola",
  mengatur: "Mengelola",
  membantu: "Mendukung",
  menolong: "Mendukung",
  mengecek: "Memeriksa",
  memberi: "Memberikan",
  melakukan: "Menjalankan",
  melaksanakan: "Menjalankan",
  mengerjakan: "Menyelesaikan",
  bantu: "Mendukung",
  helped: "Supported",
  assisted: "Supported",
  made: "Built",
  created: "Developed",
  handled: "Managed",
  did: "Executed",
  worked: "Collaborated",
  participated: "Contributed"
};

const STRONG_ENGLISH_VERBS = new Set([
  "developed",
  "built",
  "engineered",
  "designed",
  "architected",
  "implemented",
  "integrated",
  "managed",
  "led",
  "coordinated",
  "optimized",
  "analyzed",
  "configured",
  "automated",
  "resolved",
  "streamlined",
  "delivered",
  "authored",
  "prepared",
  "compiled",
  "executed",
  "tested",
  "monitored",
  "maintained",
  "facilitated",
  "organized",
  "presented",
  "reduced",
  "improved",
  "increased",
  "processed",
  "supported",
  "guided",
  "trained",
  "supervised",
  "audited",
  "tracked",
  "collaborated",
  "contributed",
  "cut",
  "launched",
  "published",
  "consolidated"
]);

export const isStrongActionVerbToken = (word: string): boolean => {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean || clean.length < 3) return false;
  if (WEAK_VERB_MAP[clean]) return false;
  if (STRONG_ENGLISH_VERBS.has(clean)) return true;
  // Kata kerja aktif berimbuhan me-/meng-/mem-/men-/meny-/ber- dalam Bahasa Indonesia
  if (/^(?:meng|meny|mem|men|me|ber)[a-z]{3,}$/.test(clean) && !WEAK_VERB_MAP[clean]) {
    return true;
  }
  return false;
};

export const analyzeBulletSignals = (
  bullet: string
): { startsWithVerb: boolean; hasFiller: boolean; hasNumbers: boolean } => {
  const stripped = bullet.trim().replace(/^[-•*\u2022\s]+/, "").trim();
  const lower = stripped.toLowerCase();
  const hasFiller = FILLER_OPENERS.some((opener) => lower.startsWith(opener));
  const firstWord = stripped.split(/\s+/)[0] ?? "";
  const startsWithVerb = !hasFiller && isStrongActionVerbToken(firstWord);
  const hasNumbers = hasMetric(stripped);
  return { startsWithVerb, hasFiller, hasNumbers };
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
  "HIGH SCHOOL": 1,
  D1: 2,
  D2: 2,
  D3: 3,
  DIPLOMA: 3,
  ASSOCIATE: 3,
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

const MAJOR_TRANSLATION_EQUIVALENTS: Record<string, string[]> = {
  "Teknik Informatika": ["teknik informatika", "informatics engineering", "informatics"],
  "Ilmu Komputer": ["ilmu komputer", "computer science"],
  "Sistem Informasi": ["sistem informasi", "information systems"],
  "Teknologi Informasi": ["teknologi informasi", "information technology"],
  "Rekayasa Perangkat Lunak": ["rekayasa perangkat lunak", "software engineering"],
  "Teknik Komputer & Jaringan (TKJ)": [
    "teknik komputer dan jaringan",
    "computer & network engineering",
    "computer network engineering",
    "computer engineering",
    "teknik komputer"
  ],
  Akuntansi: ["akuntansi", "accounting"],
  "Manajemen / Bisnis": ["manajemen bisnis", "administrasi bisnis", "manajemen", "business management", "business administration", "management"],
  "Ekonomi / Keuangan": ["ekonomi", "ekonomi pembangunan", "keuangan dan perbankan", "economics", "finance"],
  "Administrasi Perkantoran": ["administrasi perkantoran", "office administration"],
  "Desain Komunikasi Visual (DKV)": ["desain komunikasi visual", "dkv", "visual communication design", "graphic design"],
  "Ilmu Komunikasi": ["ilmu komunikasi", "communication science"],
  "Rekam Medis & Informasi Kesehatan": ["rekam medis dan informasi kesehatan", "medical records & health information", "medical records"]
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

const hasLanguageMismatch = (jobLanguage: DetectedLanguage, effectiveProseLanguage: DetectedLanguage): boolean => {
  if (jobLanguage === "mixed" || effectiveProseLanguage === "mixed") return false;
  return jobLanguage !== effectiveProseLanguage;
};

const evaluateEducationCriterion = (
  criterion: EducationCriterion,
  resume: ResumeProfile,
  corpus: ResumeCorpus,
  jobLanguage: DetectedLanguage,
  effectiveProseLanguage: DetectedLanguage
): QualificationMatchItem => {
  const eduSectionText = corpus.sections.find((s) => s.label === "Pendidikan")?.text ?? "";
  const hasEduFilled = (resume.education ?? []).some((e) => e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim());

  if (!hasEduFilled) {
    return {
      term: criterion.label,
      category: "education_criteria",
      status: "gap",
      matchKind: "gap",
      guidance: "Lengkapi bagian Pendidikan (jenjang, jurusan, institusi, dan IPK) di Langkah 1 agar sistem dapat mencocokkannya."
    };
  }

  const requiredRanks = criterion.levels
    .map((lvl) => LEVEL_RANK[lvl.toUpperCase()] ?? 0)
    .filter((rank) => rank > 0);
  const minRequiredRank = requiredRanks.length ? Math.min(...requiredRanks) : 0;
  const userRank = parseHighestUserDegreeRank(resume);
  const levelOk = minRequiredRank === 0 || userRank >= minRequiredRank;

  const userGpa = parseUserGpa(resume);
  const gpaOk = criterion.minGpa === undefined || (userGpa !== undefined && userGpa >= criterion.minGpa);

  let majorStatus: "matched" | "partial" | "gap" | "not_required" = criterion.majors.length ? "gap" : "not_required";
  let matchedMajorVia: string | undefined;

  if (criterion.majors.length) {
    for (const major of criterion.majors) {
      const directEquivs = MAJOR_TRANSLATION_EQUIVALENTS[major] ?? [major];
      const exactOrTranslatedHit = directEquivs.some((eq) => containsTermBoundary(eduSectionText, eq));
      if (exactOrTranslatedHit) {
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

  const mismatch = hasLanguageMismatch(jobLanguage, effectiveProseLanguage);

  if (levelOk && gpaOk && (majorStatus === "matched" || majorStatus === "not_required")) {
    if (mismatch) {
      return {
        term: criterion.label,
        category: "education_criteria",
        status: "partial",
        matchKind: "cross_language",
        matchedVia: `Pendidikan sesuai (beda bahasa CV: ${effectiveProseLanguage.toUpperCase()} vs Iklan: ${jobLanguage.toUpperCase()})`,
        evidenceLocation: "Pendidikan",
        guidance: "Jenjang & jurusanmu cocok, tetapi masih berbeda bahasa dengan iklan lowongan. Terjemahkan CV agar terbaca langsung oleh ATS."
      };
    }

    return {
      term: criterion.label,
      category: "education_criteria",
      status: "matched",
      matchKind: "exact",
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
      matchKind: mismatch ? "cross_language" : "synonym",
      matchedVia: matchedMajorVia,
      evidenceLocation: "Pendidikan",
      guidance: `${note} Tonjolkan tugas akhir atau mata kuliah yang relevan dengan posisi ini.`
    };
  }

  return {
    term: criterion.label,
    category: "education_criteria",
    status: "gap",
    matchKind: "gap",
    guidance:
      "Jika jurusan berbeda, kamu tetap dapat menonjolkan proyek, mata kuliah relevan, atau sertifikasi yang membuktikan kesiapanmu pada posisi ini."
  };
};

const evaluateTermMatch = (
  term: string,
  category: "explicit_hard_skills_and_tools" | "soft_skills_and_work_traits",
  corpus: ResumeCorpus,
  experienceLevel: ResumeProfile["experienceLevel"],
  jobLanguage: DetectedLanguage,
  effectiveProseLanguage: DetectedLanguage
): QualificationMatchItem => {
  if (containsTermBoundary(corpus.full, term)) {
    const location = findEvidenceSection(corpus, term) ?? "CV";
    return {
      term,
      category,
      status: "matched",
      matchKind: "exact",
      evidenceLocation: location,
      guidance: `Sudah terbaca langsung di bagian ${location}.`
    };
  }

  const syn = findSynonymMatch(corpus.full, term);
  if (syn) {
    const location = findEvidenceSection(corpus, syn.matchedTerm) ?? "CV";
    const mismatch = hasLanguageMismatch(jobLanguage, effectiveProseLanguage);
    const isCrossLang = syn.kind === "cross_language" && mismatch;
    const relationText = isCrossLang ? "Padanan lintas bahasa" : "Sinonim istilah";
    return {
      term,
      category,
      status: "partial",
      matchKind: isCrossLang ? "cross_language" : "synonym",
      matchedVia: `${relationText}: ${syn.matchedTerm}`,
      evidenceLocation: location,
      guidance: isCrossLang
        ? `Ditemukan padanan "${syn.matchedTerm}" di bagian ${location} (berbeda bahasa dengan iklan). Terjemahkan CV atau tambahkan istilah "${term}".`
        : `Ditemukan padanan "${syn.matchedTerm}" di bagian ${location}. Jika sesuai, kamu bisa menambahkan istilah "${term}".`
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
      matchKind: "gap",
      guidance: `${freshNote} Jangan mencantumkan keahlian yang belum pernah kamu praktikkan.`
    };
  }

  return {
    term,
    category,
    status: "gap",
    matchKind: "gap",
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
    (w) =>
      isValidDateToken(w.startDate) &&
      (w.isCurrent || isValidDateToken(w.endDate)) &&
      !hasInvertedWorkDateRange(w)
  );
  const allProseTexts = [resume.summary ?? "", ...allBullets];
  const hasFirstPerson = allProseTexts.some(hasFirstPersonPronoun);
  const hasPlaceholders = allProseTexts.some(hasUnfilledPlaceholder);

  const groupedSkillItems = (resume.skills?.groups ?? []).flatMap((group) => group.items ?? []).filter((s) => s.trim());
  const flatSkillCount =
    (resume.skills?.hardSkills ?? []).filter((s) => s.trim()).length +
    (resume.skills?.tools ?? []).filter((s) => s.trim()).length;
  const skillCount = Math.max(flatSkillCount, groupedSkillItems.length);

  const hasEducation = (resume.education ?? []).some((e) => e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim());
  const hasGpaOrThesis = (resume.education ?? []).some((e) => Boolean(e.gpa?.trim() || e.thesisTitle?.trim()));

  const bulletSignals = allBullets.map(analyzeBulletSignals);
  const strongVerbBullets = bulletSignals.filter((s) => s.startsWithVerb).length;
  const metricBullets = bulletSignals.filter((s) => s.hasNumbers).length;
  const activeVerbRatio = allBullets.length ? strongVerbBullets / allBullets.length : 0;
  const metricRatio = allBullets.length
    ? Math.min(1, metricBullets / Math.max(1, Math.ceil(allBullets.length * 0.6)))
    : 0;

  const structuralChecks: FormatCheckItem[] = [
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
      id: "skills-minimum",
      label: "Daftar keahlian teknis / alat kerja minimal 3 item",
      passed: skillCount >= 3,
      tip: "Isi minimal 3 keahlian teknis atau software yang benar-benar kamu kuasai di tab Keahlian."
    },
    {
      id: "dates-consistent",
      label: "Format tanggal konsisten (MM/YYYY atau Bulan YYYY)",
      passed: hasValidDates,
      tip: "Gunakan format seragam seperti '08/2024' atau 'Agu 2024' dan 'Present'/'Sekarang'. Pastikan juga tanggal selesai tidak lebih awal dari tanggal mulai."
    },
    {
      id: "no-first-person",
      label: "Gaya bahasa profesional tanpa kata ganti orang pertama (Saya/Aku/I)",
      passed: !hasFirstPerson,
      tip: "Hindari kata 'Saya', 'Aku', atau 'I' di ringkasan dan poin pengalaman; langsung awali dengan peran atau kata kerja aktif."
    },
    ...(hasPlaceholders
      ? [
          {
            id: "no-placeholders",
            label: "Tidak ada placeholder [...] yang belum diisi",
            passed: false,
            tip: "Masih ada tanda kurung seperti [isi jumlah] yang belum diganti dengan angka nyata atau dihapus."
          }
        ]
      : []),
    ...((resume.workExperience ?? []).length >= 2
      ? [
          {
            id: "experience-chronological",
            label: "Urutan pengalaman kerja dari terbaru ke terlama",
            passed: isWorkExperienceChronological(resume.workExperience ?? []),
            tip: "Standar ATS menempatkan pengalaman aktif (Sekarang/Present) dan terbaru di paling atas. Gunakan tombol 'Urutkan Terbaru' di Langkah 1."
          }
        ]
      : [])
  ];

  const impactChecks: FormatCheckItem[] = [
    {
      id: "active-action-verbs",
      label: `Poin diawali kata kerja aksi aktif (${strongVerbBullets}/${allBullets.length} poin)`,
      passed: allBullets.length > 0 && activeVerbRatio >= 0.75,
      tip: "Ganti pembuka pasif seperti 'Bertanggung jawab...' atau 'Membantu...' di Langkah 3 agar skor langsung naik."
    },
    {
      id: "impact-metric",
      label: `Poin memuat ukuran hasil nyata (${metricBullets}/${allBullets.length} poin)`,
      passed: metricRatio >= 0.65 && metricBullets >= 1,
      tip: "Jika datanya ada, tambahkan angka nyata (jumlah modul, pengguna, %, atau waktu) di beberapa poin utama."
    }
  ];

  const checks = [...structuralChecks, ...impactChecks];
  const structuralPassed = structuralChecks.filter((c) => c.passed).length;
  const structuralRatio = structuralChecks.length ? structuralPassed / structuralChecks.length : 0;

  const continuousScore = structuralRatio * 0.55 + activeVerbRatio * 0.25 + metricRatio * 0.2;

  return {
    score: Math.max(0, Math.min(1, continuousScore)),
    checks
  };
};

const evaluateLanguageAlignment = (
  resume: ResumeProfile,
  jobLanguage: DetectedLanguage,
  options?: AnalyzeMatchOptions
): LanguageAlignmentInfo => {
  const effectiveProse = options?.effectiveProseLanguage ?? detectResumeProseLanguage(resume);
  const activeOutputLanguage: "id" | "en" =
    options?.activeOutputLanguage ?? (effectiveProse === "en" ? "en" : "id");
  const coverage = Math.max(0, Math.min(1, options?.translationCoverage ?? 1));

  if (jobLanguage === "mixed") {
    return {
      score: 92,
      cvLanguage: effectiveProse,
      activeOutputLanguage,
      jobLanguage,
      status: "aligned",
      note: "Iklan bersifat dwibahasa (ID-EN); bahasa CV kamu kompatibel dengan posisi ini."
    };
  }

  if (jobLanguage === "en") {
    if (effectiveProse === "en" && activeOutputLanguage === "en") {
      const score = Math.round(75 + 25 * coverage);
      return {
        score,
        cvLanguage: effectiveProse,
        activeOutputLanguage,
        jobLanguage,
        status: coverage >= 0.85 ? "aligned" : "partial",
        note:
          coverage >= 0.85
            ? "Bahasa isi CV dan judul seksi sudah selaras dengan iklan berbahasa Inggris."
            : "Bahasa utama CV sudah English, masih ada beberapa frasa yang perlu diperiksa di modal Teks Asli vs Translate."
      };
    }

    if (effectiveProse === "mixed") {
      const score = Math.round(52 + 28 * coverage);
      return {
        score,
        cvLanguage: effectiveProse,
        activeOutputLanguage,
        jobLanguage,
        status: "partial",
        note: "Sebagian isi CV masih berbahasa Indonesia untuk lowongan English. Perhalus atau sunting frasa yang tertinggal agar skor naik maksimal."
      };
    }

    const score = activeOutputLanguage === "en" ? 35 : 20;
    return {
      score,
      cvLanguage: effectiveProse,
      activeOutputLanguage,
      jobLanguage,
      status: "mismatch",
      note: "Iklan lowongan berbahasa Inggris, sedangkan isi CV saat ini berbahasa Indonesia. Ubah bahasa CV ke EN (English ATS) agar terbaca optimal oleh sistem ATS."
    };
  }

  // jobLanguage === "id"
  if (effectiveProse === "id" && activeOutputLanguage === "id") {
    const score = Math.round(75 + 25 * coverage);
    return {
      score,
      cvLanguage: effectiveProse,
      activeOutputLanguage,
      jobLanguage,
      status: coverage >= 0.85 ? "aligned" : "partial",
      note:
        coverage >= 0.85
          ? "Bahasa isi CV dan judul seksi selaras dengan iklan lowongan berbahasa Indonesia."
          : "Bahasa utama sudah Indonesia, periksa beberapa istilah asing yang belum diterjemahkan."
    };
  }

  if (effectiveProse === "mixed") {
    const score = Math.round(55 + 25 * coverage);
    return {
      score,
      cvLanguage: effectiveProse,
      activeOutputLanguage,
      jobLanguage,
      status: "partial",
      note: "Isi CV campuran ID-EN pada lowongan berbahasa Indonesia."
    };
  }

  const score = activeOutputLanguage === "id" ? 55 : 45;
  return {
    score,
    cvLanguage: effectiveProse,
    activeOutputLanguage,
    jobLanguage,
    status: "mismatch",
    note: "Iklan lowongan berbahasa Indonesia, sedangkan isi CV masih berbahasa Inggris."
  };
};

const ratioForMatches = (items: QualificationMatchItem[]): number | null => {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => {
    if (item.status === "matched") return sum + 1.0;
    if (item.matchKind === "cross_language") return sum + 0.45;
    if (item.status === "partial") return sum + 0.8;
    return sum;
  }, 0);
  return total / items.length;
};

export const analyzeMatch = (
  resume: ResumeProfile,
  job: JobTarget,
  options?: AnalyzeMatchOptions
): MatchAnalytics => {
  const normalized =
    job.normalized ?? normalizeJobDescription(job.rawDescription, job.jobTitle);
  const corpus = buildResumeCorpus(resume);
  const effectiveProseLanguage = options?.effectiveProseLanguage ?? detectResumeProseLanguage(resume);

  const hardMatches: QualificationMatchItem[] = normalized.explicit_hard_skills_and_tools.map((term) =>
    evaluateTermMatch(
      term,
      "explicit_hard_skills_and_tools",
      corpus,
      resume.experienceLevel,
      normalized.detectedLanguage,
      effectiveProseLanguage
    )
  );
  const eduMatches: QualificationMatchItem[] = normalized.education_criteria.map((criterion) =>
    evaluateEducationCriterion(
      criterion,
      resume,
      corpus,
      normalized.detectedLanguage,
      effectiveProseLanguage
    )
  );
  const softMatches: QualificationMatchItem[] = normalized.soft_skills_and_work_traits.map((term) =>
    evaluateTermMatch(
      term,
      "soft_skills_and_work_traits",
      corpus,
      resume.experienceLevel,
      normalized.detectedLanguage,
      effectiveProseLanguage
    )
  );

  const qualificationMatches = [...hardMatches, ...eduMatches, ...softMatches];
  const formatEval = evaluateFormatQuality(resume);
  const languageAlignment = evaluateLanguageAlignment(resume, normalized.detectedLanguage, {
    ...options,
    effectiveProseLanguage
  });

  // Kalibrasi skor berbobot dengan re-normalisasi dinamis
  const rawHard = ratioForMatches(hardMatches);
  const rawEdu = ratioForMatches(eduMatches);
  const rawSoft = ratioForMatches(softMatches);
  const rawFormat = formatEval.score;
  const rawLang = languageAlignment.score / 100;

  const activeComponents: Array<{
    key: "hardSkills" | "educationAndDomain" | "structureAndImpact" | "languageAlignment" | "softSkills";
    baseWeight: number;
    score: number;
  }> = [
    { key: "structureAndImpact", baseWeight: 0.2, score: rawFormat },
    { key: "languageAlignment", baseWeight: 0.1, score: rawLang }
  ];

  if (rawHard !== null) activeComponents.push({ key: "hardSkills", baseWeight: 0.45, score: rawHard });
  if (rawEdu !== null) activeComponents.push({ key: "educationAndDomain", baseWeight: 0.2, score: rawEdu });
  if (rawSoft !== null) activeComponents.push({ key: "softSkills", baseWeight: 0.05, score: rawSoft });

  const totalBaseWeight = activeComponents.reduce((sum, item) => sum + item.baseWeight, 0) || 1;
  const weights = {
    hardSkills: 0,
    educationAndDomain: 0,
    structureAndImpact: 0,
    languageAlignment: 0,
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
    languageAlignmentScore: languageAlignment.score,
    softSkillsScore: rawSoft !== null ? toPercent(rawSoft) : 0,
    weights
  };

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
    languageAlignment,
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
export const compactTokens = compact;
