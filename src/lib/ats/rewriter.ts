import type { MatchAnalytics, ResumeProfile, RewriteSuggestion } from "@/types/resume";
import { createId } from "@/lib/defaults";
import { containsTermBoundary, normalizeForMatch } from "@/lib/ats/synonyms";
import { hasMetric } from "@/lib/ats/scorer";
import { unique } from "@/lib/text";

/** Pembuka pasif yang membuat poin terdengar seperti deskripsi tugas, bukan pencapaian. */
const FILLER_OPENERS = [
  "bertanggung jawab untuk",
  "bertanggung jawab atas",
  "bertanggung jawab dalam",
  "ikut serta dalam",
  "ikut membantu dalam",
  "membantu dalam",
  "membantu untuk",
  "terlibat dalam",
  "berperan dalam",
  "ditugaskan untuk",
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

/** Kata kerja lemah -> kata kerja aksi aktif yang lebih jelas tanpa menambah fakta baru. */
const VERB_UPGRADES: Record<string, string> = {
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
  did: "Executed"
};

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

const looksLikeActionVerb = (word: string) =>
  /^(me|ber|di|ter)[a-z]{3,}$/i.test(word) ||
  /^(developed|built|managed|designed|led|analyzed|implemented|created|improved|coordinated|tested|configured|resolved)$/i.test(
    word
  );

const capitalizeFirst = (value: string) => (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value);

const endSentence = (value: string) => (/[.!?]$/.test(value) ? value : `${value}.`);

const buildContextHint = (sourceType: RewriteSuggestion["sourceType"], hasNumbers: boolean, startsWithVerb: boolean): string => {
  const notes: string[] = [];

  if (!startsWithVerb) {
    notes.push(
      "Kalimat ini belum dibuka dengan kata kerja aktif. Mulai dengan kata kerja seperti Menyusun, Membangun, Mengelola, atau Menguji agar terbaca kuat oleh ATS."
    );
  }

  if (!hasNumbers) {
    if (sourceType === "project") {
      notes.push(
        "Belum ada ukuran hasil. Untuk proyek kuliah atau tugas akhir, kamu bisa menambahkan angka nyata jika ada (misal: jumlah modul, data uji, atau jumlah pengguna uji coba). Jangan mengarang angka."
      );
    } else if (sourceType === "organization") {
      notes.push(
        "Belum ada ukuran skala kegiatan. Jika ada datanya, sebutkan jumlah peserta, anggota panitia, atau frekuensi kegiatan secara jujur."
      );
    } else {
      notes.push(
        "Belum ada ukuran hasil. Tambahkan angka, persentase, atau volume kerja jika datanya memang tersedia. Jangan dikarang."
      );
    }
  }

  return notes.join(" ");
};

const buildDraft = (
  bullet: string,
  sourceType: RewriteSuggestion["sourceType"]
): { suggestion: string; note: string } | null => {
  const stripped = stripBulletMark(bullet);
  if (!stripped) return null;

  const clean = stripFillerOpeners(stripped);
  if (!clean) return null;

  const words = clean.split(/\s+/);
  const first = words[0] ?? "";
  let body = clean;
  let changed = clean !== stripped;
  let startsWithVerb = false;

  const upgraded = VERB_UPGRADES[first.toLowerCase()];
  if (upgraded) {
    body = [upgraded, ...words.slice(1)].join(" ");
    changed = true;
    startsWithVerb = true;
  } else if (looksLikeActionVerb(first)) {
    const cap = capitalizeFirst(first);
    if (cap !== first) changed = true;
    body = [cap, ...words.slice(1)].join(" ");
    startsWithVerb = true;
  } else {
    const cap = capitalizeFirst(clean);
    if (cap !== clean) changed = true;
    body = cap;
  }

  const withPeriod = endSentence(body);
  if (withPeriod !== stripped) changed = true;

  const hasNumbers = hasMetric(withPeriod);
  // Tawarkan saran juga jika kalimat belum memakai kata kerja aksi atau belum memiliki metrik
  if (!changed && startsWithVerb && hasNumbers) return null;

  const note = buildContextHint(sourceType, hasNumbers, startsWithVerb);
  if (!changed && !note) return null;

  return {
    suggestion: withPeriod,
    note: note || "Susunan kalimat sudah lebih ringkas dan diawali kata kerja aksi."
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
      if (!draft) return;

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
      if (!draft) return;

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
      if (!draft) return;

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
