import type { MatchAnalytics, ResumeProfile, RewriteSuggestion } from "@/types/resume";
import { createId } from "@/lib/defaults";
import { containsTermBoundary, normalizeForMatch } from "@/lib/ats/synonyms";
import {
  analyzeBulletSignals,
  FILLER_OPENERS,
  hasMetric,
  WEAK_VERB_MAP
} from "@/lib/ats/scorer";
import { unique } from "@/lib/text";

export const STRONG_VERB_CYCLES_ID = [
  "Merancang",
  "Mengembangkan",
  "Membangun",
  "Mengelola",
  "Mengoptimalkan",
  "Mengkoordinasikan",
  "Mengimplementasikan",
  "Menganalisis",
  "Mengotomatiskan"
];

export const STRONG_VERB_CYCLES_EN = [
  "Engineered",
  "Developed",
  "Built",
  "Managed",
  "Optimized",
  "Coordinated",
  "Implemented",
  "Analyzed",
  "Streamlined"
];

const stripBulletMark = (value: string) => value.trim().replace(/^[-•*\u2022\s]+/, "").trim();

const stripFillerOpeners = (value: string) => {
  let text = value;
  let changed = true;

  while (changed) {
    changed = false;
    const lower = text.toLowerCase();
    const opener = FILLER_OPENERS.find((item) => lower.startsWith(item));
    if (opener) {
      text = text.slice(opener.length).replace(/^[\s:,]+/, "").trim();
      changed = true;
    }
  }

  return text;
};

const capitalizeFirst = (value: string) => (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value);

const lowercaseFirst = (value: string) => (value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value);

const endSentence = (value: string) => (/[.!?]$/.test(value) ? value : `${value}.`);

const buildContextHint = (
  sourceType: RewriteSuggestion["sourceType"],
  hasNumbers: boolean,
  startsWithVerb: boolean
): string => {
  const notes: string[] = [];

  if (!startsWithVerb) {
    notes.push(
      "Kalimat ini belum dibuka dengan kata kerja aktif yang kuat. Klik 'Ganti Kata Kerja Aktif' agar terbuka lebih tegas untuk ATS."
    );
  }

  if (!hasNumbers) {
    if (sourceType === "project") {
      notes.push(
        "Belum ada ukuran hasil. Untuk proyek kuliah atau tugas akhir, kamu bisa menambahkan angka nyata (misal jumlah modul, data uji, atau peserta). Jangan mengarang angka."
      );
    } else if (sourceType === "organization") {
      notes.push(
        "Belum ada ukuran skala kegiatan. Jika ada datanya, sebutkan jumlah peserta, anggota panitia, atau frekuensi kegiatan secara jujur."
      );
    } else {
      notes.push(
        "Belum ada ukuran hasil. Tambahkan angka, persentase, atau volume kerja nyata jika tersedia. Jangan dikarang."
      );
    }
  }

  return notes.join(" ");
};

const buildDraft = (
  bullet: string,
  sourceType: RewriteSuggestion["sourceType"]
): { suggestion: string; note: string; needsImprovement: boolean } | null => {
  const stripped = stripBulletMark(bullet);
  if (!stripped) return null;

  const clean = stripFillerOpeners(stripped);
  if (!clean) return null;

  const words = clean.split(/\s+/);
  const first = words[0] ?? "";
  let body = clean;
  let changed = clean !== stripped;

  const upgraded = WEAK_VERB_MAP[first.toLowerCase()];
  if (upgraded) {
    body = [upgraded, ...words.slice(1)].join(" ");
    changed = true;
  } else {
    body = capitalizeFirst(clean);
  }

  const withPeriod = endSentence(body);
  if (withPeriod !== stripped) changed = true;

  const signals = analyzeBulletSignals(withPeriod);
  const needsImprovement = changed || !signals.startsWithVerb || !signals.hasNumbers;
  const note =
    buildContextHint(sourceType, signals.hasNumbers, signals.startsWithVerb) ||
    "Susunan kalimat sudah kuat (kata kerja aktif dan ukuran hasil tercantum).";

  return {
    suggestion: withPeriod,
    note,
    needsImprovement
  };
};

const keywordsInBullet = (analytics: MatchAnalytics, bullet: string): string[] => {
  const normBullet = normalizeForMatch(bullet);
  return unique([...analytics.matchedKeywords, ...analytics.semanticKeywords])
    .filter((keyword) => containsTermBoundary(normBullet, keyword))
    .slice(0, 4);
};

export const generateRewriteSuggestions = (resume: ResumeProfile, analytics: MatchAnalytics): RewriteSuggestion[] => {
  const items: RewriteSuggestion[] = [];

  for (const exp of resume.workExperience ?? []) {
    const label = [exp.role.trim(), exp.company.trim()].filter(Boolean).join(" - ") || "Pengalaman Kerja";
    (exp.bulletPoints ?? []).forEach((bullet, bulletIndex) => {
      const draft = buildDraft(bullet, "work");
      if (!draft || !draft.needsImprovement) return;

      items.push({
        id: createId(),
        sourceType: "work",
        sourceId: exp.id,
        sourceLabel: label,
        experienceId: exp.id,
        bulletIndex,
        original: bullet,
        suggestion: draft.suggestion,
        note: draft.note,
        keywordsUsed: keywordsInBullet(analytics, bullet),
        status: "pending"
      });
    });
  }

  for (const project of resume.projects ?? []) {
    const label = project.name.trim() || project.context.trim() || "Proyek & Studi Kasus";
    (project.bulletPoints ?? []).forEach((bullet, bulletIndex) => {
      const draft = buildDraft(bullet, "project");
      if (!draft || !draft.needsImprovement) return;

      items.push({
        id: createId(),
        sourceType: "project",
        sourceId: project.id,
        sourceLabel: `Proyek: ${label}`,
        experienceId: project.id,
        bulletIndex,
        original: bullet,
        suggestion: draft.suggestion,
        note: draft.note,
        keywordsUsed: keywordsInBullet(analytics, bullet),
        status: "pending"
      });
    });
  }

  for (const org of resume.organizations ?? []) {
    const label = [org.role.trim(), org.organization.trim()].filter(Boolean).join(" - ") || "Organisasi";
    (org.bulletPoints ?? []).forEach((bullet, bulletIndex) => {
      const draft = buildDraft(bullet, "organization");
      if (!draft || !draft.needsImprovement) return;

      items.push({
        id: createId(),
        sourceType: "organization",
        sourceId: org.id,
        sourceLabel: `Organisasi: ${label}`,
        experienceId: org.id,
        bulletIndex,
        original: bullet,
        suggestion: draft.suggestion,
        note: draft.note,
        keywordsUsed: keywordsInBullet(analytics, bullet),
        status: "pending"
      });
    });
  }

  return items;
};

export type ResumeBulletRecord = {
  id: string;
  sourceType: "work" | "project" | "organization";
  sourceId: string;
  sourceLabel: string;
  bulletIndex: number;
  text: string;
  keywordsUsed: string[];
  analysis: {
    startsWithVerb: boolean;
    hasFiller: boolean;
    hasNumbers: boolean;
    needsImprovement: boolean;
  };
  suggestedDraft: string;
  note: string;
};

/**
 * Mengekstrak seluruh poin kalimat hidup dari Pengalaman, Proyek, dan Organisasi
 * untuk panel Hybrid Optimasi di Langkah 3 agar pengguna dapat mengedit poin mana saja.
 */
export const extractAllResumeBullets = (
  resume: ResumeProfile,
  analytics: MatchAnalytics
): ResumeBulletRecord[] => {
  const records: ResumeBulletRecord[] = [];

  const pushBullet = (
    sourceType: ResumeBulletRecord["sourceType"],
    sourceId: string,
    sourceLabel: string,
    bulletIndex: number,
    raw: string
  ) => {
    const clean = raw.trim();
    if (!clean) return;
    const signals = analyzeBulletSignals(clean);
    const draft = buildDraft(clean, sourceType);
    const needsImprovement = !signals.startsWithVerb || signals.hasFiller || !signals.hasNumbers;

    records.push({
      id: `${sourceType}:${sourceId}:${bulletIndex}`,
      sourceType,
      sourceId,
      sourceLabel,
      bulletIndex,
      text: raw,
      keywordsUsed: keywordsInBullet(analytics, raw),
      analysis: {
        ...signals,
        needsImprovement
      },
      suggestedDraft: draft?.suggestion ?? clean,
      note:
        draft?.note ??
        "Poin kalimat sudah diawali kata kerja aksi aktif dan dilengkapi ukuran hasil."
    });
  };

  for (const exp of resume.workExperience ?? []) {
    const label = [exp.role.trim(), exp.company.trim()].filter(Boolean).join(" - ") || "Pengalaman Kerja";
    (exp.bulletPoints ?? []).forEach((bullet, idx) => pushBullet("work", exp.id, label, idx, bullet));
  }

  for (const proj of resume.projects ?? []) {
    const label = proj.name.trim() || proj.context.trim() || "Proyek & Studi Kasus";
    (proj.bulletPoints ?? []).forEach((bullet, idx) => pushBullet("project", proj.id, label, idx, bullet));
  }

  for (const org of resume.organizations ?? []) {
    const label = [org.role.trim(), org.organization.trim()].filter(Boolean).join(" - ") || "Organisasi";
    (org.bulletPoints ?? []).forEach((bullet, idx) => pushBullet("organization", org.id, label, idx, bullet));
  }

  return records;
};

const looksLikeGenericVerb = (word: string, targetLang: "id" | "en"): boolean => {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return false;
  if (WEAK_VERB_MAP[clean]) return true;
  if (targetLang === "en") {
    return STRONG_VERB_CYCLES_EN.some((v) => v.toLowerCase() === clean) || /^[a-z]+ed$/.test(clean);
  }
  return (
    STRONG_VERB_CYCLES_ID.some((v) => v.toLowerCase() === clean) ||
    /^(?:meng|meny|mem|men|me)[a-z]{3,}$/.test(clean)
  );
};

/** Quick Action instan (tanpa AI): mengganti / menguatkan pembuka kata kerja aksi secara berotasi. */
export const cycleStrongActionVerb = (bullet: string, targetLang: "id" | "en", step = 0): string => {
  const stripped = stripFillerOpeners(stripBulletMark(bullet));
  if (!stripped) return bullet;

  const pool = targetLang === "en" ? STRONG_VERB_CYCLES_EN : STRONG_VERB_CYCLES_ID;
  const words = stripped.split(/\s+/);
  const first = words[0] ?? "";
  const firstLower = first.toLowerCase();

  const currentIdx = pool.findIndex((v) => v.toLowerCase() === firstLower);
  let chosenVerb = pool[Math.abs(step) % pool.length];
  if (currentIdx >= 0) {
    chosenVerb = pool[(currentIdx + 1) % pool.length];
  } else if (chosenVerb.toLowerCase() === firstLower) {
    chosenVerb = pool[(Math.abs(step) + 1) % pool.length];
  }

  let nextText: string;
  if (looksLikeGenericVerb(first, targetLang) || currentIdx >= 0) {
    nextText = [chosenVerb, ...words.slice(1)].join(" ");
  } else {
    nextText = `${chosenVerb} ${lowercaseFirst(stripped)}`;
  }

  return endSentence(capitalizeFirst(nextText.replace(/\s+/g, " ").trim()));
};

/** Quick Action instan (tanpa AI): menyisipkan slot ukuran hasil jujur jika belum ada angka. */
export const appendMetricTemplate = (
  bullet: string,
  sourceType: ResumeBulletRecord["sourceType"],
  targetLang: "id" | "en"
): string => {
  const clean = stripBulletMark(bullet).replace(/[.!?]+$/, "").trim();
  if (!clean || hasMetric(clean)) return bullet;

  if (targetLang === "en") {
    if (sourceType === "project") {
      return `${clean}, tested across [insert count] modules/scenarios.`;
    }
    if (sourceType === "organization") {
      return `${clean} alongside [insert count] team members for [insert count] participants.`;
    }
    return `${clean}, handling [insert count] items and reducing turnaround time by [insert %].`;
  }

  if (sourceType === "project") {
    return `${clean} dengan [isi jumlah] modul/skenario uji nyata.`;
  }
  if (sourceType === "organization") {
    return `${clean} bersama [isi jumlah] anggota untuk [isi jumlah] peserta.`;
  }
  return `${clean} yang melayani [isi jumlah] item/pengguna per minggu.`;
};

/** Quick Action instan (tanpa AI): menyelipkan kata kunci lowongan secara rapi ke poin kalimat. */
export const insertKeywordIntoBullet = (bullet: string, keyword: string, targetLang: "id" | "en"): string => {
  const cleanKw = keyword.trim();
  const cleanBullet = bullet.trim();
  if (!cleanKw || !cleanBullet) return bullet;
  if (containsTermBoundary(normalizeForMatch(cleanBullet), cleanKw)) return bullet;

  const base = cleanBullet.replace(/[.!?]+$/, "").trim();
  const connector = targetLang === "en" ? "using" : "menggunakan";
  if (/\b(?:menggunakan|memakai|using|with)\b/i.test(base)) {
    return `${base} (${cleanKw}).`;
  }
  return `${base} ${connector} ${cleanKw}.`;
};

/** Quick Action instan (tanpa AI): menyelaraskan Ringkasan Profil tanpa mengarang fakta baru. */
export const tailorSummaryDeterministic = (params: {
  summary: string;
  jobTitle: string;
  matchedKeywords: string[];
  targetLang: "id" | "en";
  mode?: "align_role" | "highlight_skills" | "polish_ats";
}): string => {
  const clean = params.summary
    .trim()
    .replace(/\b(?:saya adalah|aku adalah|i am an?|i'm an?|saya|aku)\s+/gi, "")
    .replace(/\s+/g, " ");
  if (!clean) return clean;

  const mode = params.mode ?? "align_role";
  const topKeywords = unique(params.matchedKeywords)
    .filter((kw) => !containsTermBoundary(normalizeForMatch(clean), kw))
    .slice(0, 3);
  const role = params.jobTitle.trim();

  if (params.targetLang === "en") {
    let result = capitalizeFirst(clean.replace(/[.!?]*$/, ""));
    if (mode === "align_role" && role && !containsTermBoundary(normalizeForMatch(result), role)) {
      result = `${result}. Focused on contributing effectively to ${role} responsibilities`;
    } else if (mode === "highlight_skills" && topKeywords.length > 0) {
      result = `${result}. Verified strengths include ${topKeywords.join(", ")}`;
    } else if (topKeywords.length > 0) {
      result = `${result}, with practical foundation in ${topKeywords.join(", ")}`;
    }
    return endSentence(result);
  }

  let result = capitalizeFirst(clean.replace(/[.!?]*$/, ""));
  if (mode === "align_role" && role && !containsTermBoundary(normalizeForMatch(result), role)) {
    result = `${result}. Berfokus untuk memberikan kontribusi optimal pada posisi ${role}`;
  } else if (mode === "highlight_skills" && topKeywords.length > 0) {
    result = `${result}. Keahlian relevan yang telah diterapkan meliputi ${topKeywords.join(", ")}`;
  } else if (topKeywords.length > 0) {
    result = `${result}, dengan pengalaman praktik pada ${topKeywords.join(", ")}`;
  }
  return endSentence(result);
};

export type FreshGradExample = {
  category: string;
  weak: string;
  strong: string;
  formulaNote: string;
};

export const FRESH_GRAD_XYZ_EXAMPLES: FreshGradExample[] = [
  {
    category: "Skripsi / Tugas Akhir",
    weak: "Membuat website sistem informasi klinik untuk tugas akhir.",
    strong:
      "Membangun sistem informasi antrean dan rekam medis klinik berbasis web menggunakan Next.js dan PostgreSQL yang diuji pada 30 skenario alur pasien.",
    formulaNote: "Tindakan (Membangun sistem...) + Alat (Next.js, PostgreSQL) + Ukuran (30 skenario uji)."
  },
  {
    category: "Proyek Kuliah / Praktikum",
    weak: "Membantu tugas kelompok analisis data penjualan dengan Excel.",
    strong:
      "Mengolah 1.200 baris data transaksi menggunakan Microsoft Excel (PivotTable dan VLOOKUP) untuk menyusun ringkasan tren produk mingguan bagi presentasi kelas.",
    formulaNote: "Hindari pembuka 'Membantu'. Langsung sebut tindakan + volume data + alat."
  },
  {
    category: "Magang / MSIB",
    weak: "Bertanggung jawab mengurus data stok barang di gudang.",
    strong:
      "Melaksanakan pencatatan keluar-masuk dan stock opname mingguan untuk 250+ SKU barang di spreadsheet sehingga selisih pencatatan berkurang signifikan.",
    formulaNote: "Ganti 'Bertanggung jawab mengurus' dengan kata kerja aksi dan skala item."
  },
  {
    category: "Organisasi / Kepanitiaan",
    weak: "Ikut serta sebagai panitia acara seminar mahasiswa.",
    strong:
      "Mengkoordinasikan registrasi dan publikasi daring untuk seminar kampus yang dihadiri 180 peserta bersama tim divisi acara beranggotakan 6 orang.",
    formulaNote: "Sebutkan peran spesifikmu, jumlah peserta, dan kerja sama tim."
  }
];
