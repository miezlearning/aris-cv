"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowsClockwise,
  DownloadSimple,
  Export,
  FileDoc,
  FilePdf,
  FileTxt,
  Layout,
  Rows,
  SealCheck,
  ShieldCheck,
  TextAlignLeft,
  Translate
} from "@phosphor-icons/react";
import { Button, SectionCard } from "@/components/ui";
import { computeProfileContentHash } from "@/lib/ats/translator";
import { exportDocx, exportPdf, exportTextFallback } from "@/lib/exporters";
import { buildResumeDocument, estimateA4Pages, resolveCvLanguage } from "@/lib/resume-document";
import { useCvStore } from "@/lib/store";
import type { CvLanguage, CvTemplate } from "@/types/resume";

const kindLabels = { pdf: "PDF", docx: "DOCX", txt: "TXT" } as const;

const TEMPLATE_OPTIONS: Array<{
  value: CvTemplate;
  label: string;
  badge: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    value: "compact_centered",
    label: "ATS Padat (Harvard / Tech)",
    badge: "Muat 1 Halaman",
    hint: "Header rata tengah, baris Posisi | Instansi dalam satu baris dengan tanggal di kanan, ideal untuk pengalaman padat agar tetap 1 halaman A4.",
    icon: <Rows size={17} weight="duotone" aria-hidden="true" />
  },
  {
    value: "classic_editorial",
    label: "ATS Standar (Klasik Lega)",
    badge: "Umum & BUMN",
    hint: "Header rata tengah dengan tipografi dan jarak antar-baris lebih lega. Nyaman dibaca HR korporat lokal, instansi, dan pelamar umum.",
    icon: <Layout size={17} weight="duotone" aria-hidden="true" />
  },
  {
    value: "executive_left",
    label: "ATS Formal (Rata Kiri Serif)",
    badge: "Klasik 2 Baris",
    hint: "Header rata kiri bergaris tegas dengan font Serif formal serta format posisi dan instansi bertingkat. Cocok untuk keuangan, konsultan, dan akademik.",
    icon: <TextAlignLeft size={17} weight="duotone" aria-hidden="true" />
  }
];

const LANGUAGE_OPTIONS: Array<{ value: CvLanguage; label: string; hint: string }> = [
  {
    value: "auto",
    label: "Otomatis (Ikuti Lowongan)",
    hint: "Mengikuti bahasa iklan lowongan yang dianalisis di Langkah 2."
  },
  {
    value: "id",
    label: "Bahasa Indonesia",
    hint: "Judul dan isi tetap dalam Bahasa Indonesia (RINGKASAN PROFIL, PENDIDIKAN, KEAHLIAN)."
  },
  {
    value: "en",
    label: "English (ATS Full Translation)",
    hint: "Judul seksi dan seluruh isi CV otomatis diterjemahkan ke bahasa Inggris standar ATS."
  }
];

export const ExportPanel = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const analytics = useCvStore((state) => state.matchAnalytics);
  const cvLanguage = useCvStore((state) => state.cvLanguage);
  const setCvLanguage = useCvStore((state) => state.setCvLanguage);
  const cvTemplate = useCvStore((state) => state.cvTemplate);
  const setCvTemplate = useCvStore((state) => state.setCvTemplate);
  const autoTranslateContent = useCvStore((state) => state.autoTranslateContent);
  const setAutoTranslateContent = useCvStore((state) => state.setAutoTranslateContent);
  const aiTranslatedEnProfile = useCvStore((state) => state.aiTranslatedEnProfile);
  const aiTranslatedSourceHash = useCvStore((state) => state.aiTranslatedSourceHash);
  const setAiTranslatedEn = useCvStore((state) => state.setAiTranslatedEn);
  const applyEnglishTranslationToEditor = useCvStore((state) => state.applyEnglishTranslationToEditor);

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"pdf" | "docx" | "txt" | "translate" | "">("");

  const activeLang = resolveCvLanguage(
    cvLanguage,
    analytics.hasAnalyzed ? analytics.detectedLanguage : undefined
  );
  const currentHash = computeProfileContentHash(resume);
  const translatedOverride =
    aiTranslatedEnProfile && aiTranslatedSourceHash === currentHash ? aiTranslatedEnProfile : null;
  const buildOptions = {
    template: cvTemplate,
    translateContent: autoTranslateContent,
    translatedOverride
  };

  const document = buildResumeDocument(resume, activeLang, buildOptions);
  const pageInfo = estimateA4Pages(document);
  const activeTemplateMeta = TEMPLATE_OPTIONS.find((t) => t.value === cvTemplate) ?? TEMPLATE_OPTIONS[0];

  const runExport = async (kind: "pdf" | "docx" | "txt") => {
    if (document.isEmpty) return;

    try {
      setBusy(kind);
      setMessage("");
      if (kind === "pdf") await exportPdf(resume, activeLang, buildOptions);
      if (kind === "docx") await exportDocx(resume, activeLang, buildOptions);
      if (kind === "txt") exportTextFallback(resume, activeLang, buildOptions);
      setMessage(
        `Berkas ${kindLabels[kind]} (${activeTemplateMeta.label}, ${
          activeLang === "id" ? "Bahasa Indonesia" : "Full ATS English"
        }) berhasil diunduh ke perangkatmu.`
      );
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Berkas gagal dibuat.";
      setMessage(`${fallback} Coba unduh versi TXT sebagai cadangan.`);
    } finally {
      setBusy("");
    }
  };

  const handleAiTranslatePolish = async () => {
    if (document.isEmpty) return;
    setBusy("translate");
    setMessage("");

    try {
      const anonymizedResume = {
        ...resume,
        contact: {
          fullName: "",
          headline: resume.contact.headline ?? "",
          email: "",
          phone: "",
          location: "",
          linkedinUrl: "",
          portfolioUrl: ""
        }
      };

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: anonymizedResume }),
        signal: AbortSignal.timeout(15000)
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal memperhalus terjemahan.");
      }

      const translatedProfile = {
        ...json.data.profile,
        contact: {
          ...resume.contact,
          headline: json.data.profile?.contact?.headline ?? resume.contact.headline
        }
      };
      setAiTranslatedEn(translatedProfile, currentHash);
      setCvLanguage("en");
      setAutoTranslateContent(true);
      setMessage(
        json.data.provider === "deterministic"
          ? "Terjemahan English ATS lokal aktif (100% di perangkat, tanpa kunci AI eksternal)."
          : "Terjemahan English standar ATS berhasil diperhalus tanpa mengirim identitas pribadimu."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Menggunakan terjemahan English ATS lokal secara bawaan."
      );
    } finally {
      setBusy("");
    }
  };

  return (
    <SectionCard
      title="Unduh CV Siap Kirim (100% Gratis & Privat)"
      description="Berkas disusun langsung di browser perangkatmu tanpa dikirim ke server mana pun. Pilih jenis gaya tata letak ATS, bahasa, lalu unduh sebagai PDF, Word DOCX, atau TXT."
      accent="clay"
      icon={<Export size={20} weight="duotone" />}
    >
      <div className="grid gap-5">
        {/* Pilihan Jenis / Gaya Format ATS */}
        <div className="rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#DFC25A] bg-[#FFF0A8] text-[#4A3A2E]"
              >
                <Layout size={18} weight="duotone" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#251813]">Jenis Tata Letak ATS</h3>
                <p className="text-xs text-[#59483F] mt-0.5">
                  Ketiganya 100% satu kolom linear tanpa tabel agar lolos mesin ATS sekaligus sesuai preferensi industrimu.
                </p>
              </div>
            </div>
            <span className="rounded-lg border border-[#DFC25A] bg-[#FFF8DF] px-2.5 py-1 text-xs font-bold text-[#4A3A2E]">
              Dipilih: {activeTemplateMeta.label}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Pilih jenis tata letak ATS">
            {TEMPLATE_OPTIONS.map((opt) => {
              const selected = cvTemplate === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCvTemplate(opt.value)}
                  className={`text-left rounded-xl p-3.5 transition-all cursor-pointer min-h-[44px] flex flex-col justify-between ${
                    selected
                      ? "border-2 border-[#251813] bg-[#FFF8DF] shadow-[2px_3px_0_rgba(37,24,19,0.12)]"
                      : "border border-[#D9CEBC] bg-[#FFFDF8] hover:border-[#251813]/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#251813]/20 bg-white text-[#251813]">
                        {opt.icon}
                      </span>
                      <span className="rounded-md border border-[#D9CEBC] bg-white px-2 py-0.5 text-[10.5px] font-bold text-[#4E3E36]">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#251813]">{opt.label}</p>
                    <p className="mt-1 text-xs text-[#4E3E36] leading-relaxed">{opt.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pilihan Bahasa CV */}
        <div className="rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#94D1DF] bg-[#D6F3FA] text-[#124959]"
              >
                <Translate size={18} weight="duotone" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#251813]">Bahasa Judul & Isi Dokumen CV</h3>
                <p className="text-xs text-[#59483F] mt-0.5">
                  Mode English otomatis menerjemahkan judul seksi maupun seluruh isi CV ke bahasa Inggris standar industri ATS.
                </p>
              </div>
            </div>
            <span className="rounded-lg border border-[#9FD499] bg-[#DFF5DA] px-2.5 py-1 text-xs font-bold text-[#144C32]">
              Aktif: {activeLang === "id" ? "Bahasa Indonesia" : "English (ATS)"}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {LANGUAGE_OPTIONS.map((opt) => {
              const selected = cvLanguage === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCvLanguage(opt.value)}
                  aria-pressed={selected}
                  className={`text-left rounded-xl p-3 transition-all cursor-pointer min-h-[44px] ${
                    selected
                      ? "border-2 border-[#251813] bg-[#FFF8DF] shadow-[2px_3px_0_rgba(37,24,19,0.12)]"
                      : "border border-[#D9CEBC] bg-[#FFFDF8] hover:border-[#251813]/40"
                  }`}
                >
                  <p className="text-xs sm:text-sm font-bold text-[#251813]">{opt.label}</p>
                  <p className="mt-1 text-xs text-[#4E3E36] leading-relaxed">{opt.hint}</p>
                </button>
              );
            })}
          </div>

          {/* Kontrol Terjemahan Full-Content ketika mode English aktif */}
          {activeLang === "en" ? (
            <div className="mt-4 rounded-xl border border-[#94D1DF] card-tint-sky p-3.5 sm:p-4 grid gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={autoTranslateContent}
                  onChange={(event) => setAutoTranslateContent(event.target.checked)}
                  className="checkbox checkbox-sm mt-0.5 border-[#124959]/50 checked:bg-[#1F6B57] checked:border-[#1F6B57]"
                />
                <span className="text-xs sm:text-sm font-semibold text-[#124959] leading-relaxed">
                  Terjemahkan seluruh isi CV (Ringkasan, Pendidikan, Proyek, Pengalaman, Organisasi, & Keahlian) ke English standar industri ATS
                </span>
              </label>

              {autoTranslateContent && !document.isEmpty ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={Boolean(busy)}
                    onClick={handleAiTranslatePolish}
                    className="min-h-[44px] text-xs gap-1.5"
                  >
                    <ShieldCheck size={15} weight="duotone" aria-hidden="true" />
                    <span>
                      {busy === "translate" ? "Memproses..." : "Perhalus Terjemahan (Tanpa PII)"}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      applyEnglishTranslationToEditor();
                      setMessage("Seluruh isi CV versi English telah disalin ke formulir Langkah 1 untuk disunting.");
                    }}
                    className="min-h-[44px] text-xs gap-1.5"
                  >
                    <ArrowsClockwise size={15} weight="duotone" aria-hidden="true" />
                    <span>Salin Hasil English ke Editor</span>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Peringatan jika CV masih kosong */}
        {document.isEmpty ? (
          <div className="rounded-xl border border-[#E9A590] bg-[#FFE3D8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#7B1F14]">Data CV masih kosong</p>
              <p className="text-xs sm:text-sm text-[#7B1F14] mt-0.5">
                Isi minimal nama dan satu bagian CV (Pendidikan, Proyek, atau Pengalaman) di Langkah 1 sebelum mengunduh.
              </p>
            </div>
            <Link
              href="/master-cv"
              className="btn doodle-btn shrink-0 bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538] px-4 py-2 text-xs sm:text-sm font-bold"
            >
              Isi Data CV Dulu
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-[#9FD499] bg-[#DFF5DA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <SealCheck size={22} weight="duotone" className="text-[#144C32] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-[#144C32]">
                  Dokumen siap diunduh (Estimasi {pageInfo.estimatedPages} halaman A4, gaya {activeTemplateMeta.label})
                </p>
                <p className="text-xs text-[#144C32] mt-0.5">
                  100% gratis, tanpa tanda air (watermark), dan 100% teks linear yang bisa diseleksi.
                </p>
              </div>
            </div>
            {resume.experienceLevel === "fresh_graduate" && pageInfo.estimatedPages > 1 ? (
              <span className="rounded-lg border border-[#DFC25A] bg-[#FFF0A8] px-3 py-1.5 text-xs font-bold text-[#4A3A2E]">
                Tips: pilih gaya ATS Padat agar ringkas 1 halaman A4
              </span>
            ) : null}
          </div>
        )}

        {/* Export Formats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* PDF Format Card */}
          <div className="rounded-xl border border-[#D9CEBC] bg-white p-5 flex flex-col justify-between hover:border-[#251813]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex h-11 min-w-[3.75rem] items-center justify-center gap-1 rounded-xl bg-[#FFE3D8] px-2.5 text-[#7B1F14] font-black text-xs border-2 border-[#251813]">
                  <FilePdf size={16} weight="duotone" aria-hidden="true" />
                  <span>PDF</span>
                </span>
                <span className="text-xs font-bold text-[#144C32]">Format Utama</span>
              </div>
              <h3 className="font-bold text-base text-[#251813]">Dokumen PDF (A4)</h3>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                Tata letak tetap satu kolom, teks murni bisa di-select, bebas tabel dan ikon grafis yang mengganggu parser ATS.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#D9CEBC]">
              <Button
                type="button"
                className="w-full justify-center gap-1.5"
                disabled={Boolean(busy) || document.isEmpty}
                onClick={() => runExport("pdf")}
              >
                <DownloadSimple size={16} weight="bold" aria-hidden="true" />
                <span>{busy === "pdf" ? "Memproses PDF..." : "Unduh PDF"}</span>
              </Button>
            </div>
          </div>

          {/* Word DOCX Format Card */}
          <div className="rounded-xl border border-[#D9CEBC] bg-white p-5 flex flex-col justify-between hover:border-[#251813]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex h-11 min-w-[4.25rem] items-center justify-center gap-1 rounded-xl bg-[#D6F3FA] px-3 text-[#124959] font-black text-xs border-2 border-[#251813]">
                  <FileDoc size={16} weight="duotone" aria-hidden="true" />
                  <span>DOCX</span>
                </span>
                <span className="text-xs font-semibold text-[#59483F]">Dapat Diedit</span>
              </div>
              <h3 className="font-bold text-base text-[#251813]">Dokumen Word (DOCX)</h3>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                Bisa diedit bebas di Word atau Google Docs. Memakai Heading semantik dan daftar poin asli untuk portal ATS korporat.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#D9CEBC]">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center gap-1.5"
                disabled={Boolean(busy) || document.isEmpty}
                onClick={() => runExport("docx")}
              >
                <DownloadSimple size={16} weight="duotone" aria-hidden="true" />
                <span>{busy === "docx" ? "Memproses DOCX..." : "Unduh DOCX"}</span>
              </Button>
            </div>
          </div>

          {/* TXT Format Card */}
          <div className="rounded-xl border border-[#D9CEBC] bg-white p-5 flex flex-col justify-between hover:border-[#251813]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex h-11 min-w-[3.75rem] items-center justify-center gap-1 rounded-xl bg-[#FFF0A8] px-2.5 text-[#4A3A2E] font-black text-xs border-2 border-[#251813]">
                  <FileTxt size={16} weight="duotone" aria-hidden="true" />
                  <span>TXT</span>
                </span>
                <span className="text-xs font-semibold text-[#59483F]">Teks Salin</span>
              </div>
              <h3 className="font-bold text-base text-[#251813]">Teks Polos (TXT)</h3>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                Format teks murni untuk memeriksa urutan baca mesin ATS atau disalin ke formulir rekrutmen online.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#D9CEBC]">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center gap-1.5"
                disabled={Boolean(busy) || document.isEmpty}
                onClick={() => runExport("txt")}
              >
                <DownloadSimple size={16} weight="duotone" aria-hidden="true" />
                <span>{busy === "txt" ? "Menyiapkan TXT..." : "Unduh TXT"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        <div role="status" aria-live="polite">
          {message ? (
            <div className="rounded-xl border border-[#9FD499] bg-white p-4 text-xs sm:text-sm font-semibold text-[#144C32]">
              {message}
            </div>
          ) : null}
        </div>

        {/* ATS Compliance Checklist */}
        <div className="rounded-xl border border-[#D9CEBC] bg-[#FAF5E8] p-4 sm:p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#59483F] mb-3">
            Standar Ekspor ATS-Safe yang Terpenuhi
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2 text-xs sm:text-[13px] text-[#4E3E36]">
            <li>&bull; 100% tata letak satu kolom linear tanpa tabel atau kotak teks mengambang</li>
            <li>&bull; Seluruh teks PDF bisa diseleksi dan diekstrak secara berurutan</li>
            <li>&bull; 3 pilihan gaya tata letak ATS (Padat 1 halaman, Standar Lega, & Formal Serif)</li>
            <li>&bull; Bahasa judul & isi CV otomatis diterjemahkan saat memilih mode English</li>
            <li>&bull; Tanpa ikon grafis atau bar persentase di dalam file dokumen</li>
            <li>&bull; Dikompilasi 100% di browser perangkatmu untuk menjaga privasi data</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
};
