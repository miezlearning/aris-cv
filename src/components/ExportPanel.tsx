"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  ArrowsSplit,
  Check,
  CheckCircle,
  Copy,
  DownloadSimple,
  Export,
  Eye,
  FileDoc,
  FilePdf,
  FileTxt,
  Layout,
  Rows,
  SealCheck,
  ShieldCheck,
  SortDescending,
  TextAlignLeft,
  Translate,
  WarningCircle
} from "@phosphor-icons/react";
import { LiveAtsBar } from "@/components/LiveAtsBar";
import { LocalAiControlPanel } from "@/components/LocalAiControlPanel";
import { TranslationComparePanel } from "@/components/TranslationComparePanel";
import { Button, SectionCard } from "@/components/ui";
import { buildAtsFileName, collectPreExportAtsWarnings } from "@/lib/ats/hygiene";
import { buildPlainTextResume, exportDocx, exportPdf, exportTextFallback } from "@/lib/exporters";
import { useLiveAts } from "@/lib/live-ats";
import { resolveActiveAiConfig } from "@/lib/local-ai/engine";
import { translateProfileWithLocalAi } from "@/lib/local-ai/tasks";
import {
  buildResumeDocument,
  estimateA4Pages
} from "@/lib/resume-document";
import { useCvStore } from "@/lib/store";
import type { CvLanguage, CvTemplate } from "@/types/resume";

const TEMPLATE_OPTIONS: Array<{
  value: CvTemplate;
  label: string;
  badge: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    value: "compact_centered",
    label: "ATS Padat",
    badge: "Muat 1 Hal.",
    hint: "Ringkas untuk pengalaman padat agar muat 1 halaman A4.",
    icon: <Rows size={17} weight="duotone" aria-hidden="true" />
  },
  {
    value: "classic_editorial",
    label: "ATS Standar",
    badge: "Umum",
    hint: "Jarak baris lebih lega dan nyaman dibaca HR.",
    icon: <Layout size={17} weight="duotone" aria-hidden="true" />
  },
  {
    value: "executive_left",
    label: "ATS Formal Serif",
    badge: "Formal",
    hint: "Header rata kiri dengan tipografi Serif klasik.",
    icon: <TextAlignLeft size={17} weight="duotone" aria-hidden="true" />
  }
];

const LANGUAGE_OPTIONS: Array<{ value: CvLanguage; label: string; hint: string }> = [
  {
    value: "auto",
    label: "Sesuai Asli",
    hint: "Ikuti bahasa asli teks CV kamu."
  },
  {
    value: "id",
    label: "Bahasa Indonesia",
    hint: "Judul seksi dan isi CV berbahasa Indonesia."
  },
  {
    value: "en",
    label: "English (ATS)",
    hint: "Terjemahkan CV ke Bahasa Inggris."
  }
];

export const ExportPanel = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const jobTarget = useCvStore((state) => state.jobTarget);
  const sortExperiencesChronologically = useCvStore((state) => state.sortExperiencesChronologically);
  const cvLanguage = useCvStore((state) => state.cvLanguage);
  const setCvLanguage = useCvStore((state) => state.setCvLanguage);
  const cvTemplate = useCvStore((state) => state.cvTemplate);
  const setCvTemplate = useCvStore((state) => state.setCvTemplate);
  const autoTranslateContent = useCvStore((state) => state.autoTranslateContent);
  const setAutoTranslateContent = useCvStore((state) => state.setAutoTranslateContent);
  const setAiTranslatedProfile = useCvStore((state) => state.setAiTranslatedProfile);
  const applyTranslationToEditor = useCvStore((state) => state.applyTranslationToEditor);
  const preTranslationBackup = useCvStore((state) => state.preTranslationBackup);
  const restorePreTranslationBackup = useCvStore((state) => state.restorePreTranslationBackup);

  const aiEnabled = useCvStore((state) => state.aiEnabled);
  const localAiMode = useCvStore((state) => state.localAiMode);
  const localAiStatus = useCvStore((state) => state.localAiStatus);
  const webLlmModelId = useCvStore((state) => state.webLlmModelId);
  const localServerUrl = useCvStore((state) => state.localServerUrl);
  const localServerModel = useCvStore((state) => state.localServerModel);
  const restApiFormat = useCvStore((state) => state.restApiFormat);
  const restApiUrl = useCvStore((state) => state.restApiUrl);
  const restApiModel = useCvStore((state) => state.restApiModel);
  const restApiKey = useCvStore((state) => state.restApiKey);

  const [message, setMessage] = useState("");
  const [translateProgress, setTranslateProgress] = useState("");
  const [busy, setBusy] = useState<"pdf" | "docx" | "txt" | "translate" | "">("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [atsPreviewOpen, setAtsPreviewOpen] = useState(false);
  const [copiedPlainText, setCopiedPlainText] = useState(false);

  const activeLocalConfig = resolveActiveAiConfig({
    aiEnabled,
    localAiStatus,
    localAiMode,
    webLlmModelId,
    localServerUrl,
    localServerModel,
    restApiFormat,
    restApiUrl,
    restApiModel,
    restApiKey
  });

  const {
    activeLang,
    translatedOverride,
    isTranslatedView,
    contentHash: currentHash,
    translationAudit
  } = useLiveAts();

  const buildOptions = {
    template: cvTemplate,
    translateContent: isTranslatedView,
    translatedOverride
  };
  const exportOptions = {
    ...buildOptions,
    targetJobTitle: jobTarget.jobTitle
  };

  const document = buildResumeDocument(resume, activeLang, buildOptions);
  const pageInfo = estimateA4Pages(document);
  const activeTemplateMeta = TEMPLATE_OPTIONS.find((t) => t.value === cvTemplate) ?? TEMPLATE_OPTIONS[0];
  const atsBaseFileName = buildAtsFileName(resume, activeLang, jobTarget.jobTitle);
  const preExportWarnings = document.isEmpty ? [] : collectPreExportAtsWarnings(resume);
  const plainTextSnapshot = atsPreviewOpen && !document.isEmpty ? buildPlainTextResume(resume, activeLang, buildOptions) : "";

  const handleCopyPlainText = async () => {
    if (!plainTextSnapshot || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(plainTextSnapshot);
      setCopiedPlainText(true);
      window.setTimeout(() => setCopiedPlainText(false), 2000);
    } catch {
      setMessage("Gagal menyalin teks ke clipboard. Kamu tetap bisa menyalinnya secara manual atau mengunduh TXT.");
    }
  };

  const runExport = async (kind: "pdf" | "docx" | "txt") => {
    if (document.isEmpty) return;

    try {
      setBusy(kind);
      setMessage("");
      if (kind === "pdf") await exportPdf(resume, activeLang, exportOptions);
      if (kind === "docx") await exportDocx(resume, activeLang, exportOptions);
      if (kind === "txt") exportTextFallback(resume, activeLang, exportOptions);
      setMessage(
        `Berkas ${atsBaseFileName}.${kind} (${activeTemplateMeta.label}, ${
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
    setTranslateProgress("");

    const langLabel = activeLang === "en" ? "English ATS" : "Bahasa Indonesia ATS";

    try {
      if (activeLocalConfig) {
        const localTranslated = await translateProfileWithLocalAi(
          activeLocalConfig,
          resume,
          activeLang,
          (txt) => setTranslateProgress(txt)
        );
        setAiTranslatedProfile(activeLang, localTranslated, currentHash, activeLocalConfig.modelId);
        setCvLanguage(activeLang);
        setAutoTranslateContent(true);
        setMessage(
          `Terjemahan ${langLabel} berhasil diperhalus oleh AI lokal (${activeLocalConfig.modelId}) 100% di perangkatmu.`
        );
        return;
      }

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
        body: JSON.stringify({ resume: anonymizedResume, targetLang: activeLang }),
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
      setAiTranslatedProfile(activeLang, translatedProfile, currentHash, json.data.provider);
      setCvLanguage(activeLang);
      setAutoTranslateContent(true);
      setMessage(
        json.data.provider === "deterministic"
          ? `Terjemahan ${langLabel} lokal aktif (100% di perangkat). Kamu bisa membuka 'Teks Asli vs Translate' untuk suntingan manual atau mengaktifkan Asisten AI.`
          : `Terjemahan ${langLabel} berhasil diperhalus tanpa mengirim identitas pribadimu.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : `Menggunakan terjemahan ${langLabel} lokal secara bawaan.`
      );
    } finally {
      setBusy("");
      setTranslateProgress("");
    }
  };

  return (
    <SectionCard
      title="Unduh CV"
      description="Pilih gaya tata letak, bahasa, lalu unduh berkas langsung di perangkatmu."
      accent="clay"
      icon={<Export size={20} weight="duotone" />}
    >
      <div className="grid gap-5">
        <LiveAtsBar compact />

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
                <h3 className="text-sm font-bold text-[#251813]">Gaya Tata Letak</h3>
                <p className="text-xs text-[#59483F] mt-0.5">Semua gaya memakai layout 1 kolom rapi tanpa tabel.</p>
              </div>
            </div>
            <span className="rounded-lg border border-[#DFC25A] bg-[#FFF8DF] px-2.5 py-1 text-xs font-bold text-[#4A3A2E]">
              {activeTemplateMeta.label}
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
                <h3 className="text-sm font-bold text-[#251813]">Bahasa Dokumen</h3>
                <p className="text-xs text-[#59483F] mt-0.5">Pilih bahasa asli atau terjemahkan otomatis (ID / EN).</p>
              </div>
            </div>
            <span className="rounded-lg border border-[#9FD499] bg-[#DFF5DA] px-2.5 py-1 text-xs font-bold text-[#144C32]">
              Aktif: {activeLang === "id" ? "Indonesia" : "English"}
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

          {/* Kontrol Terjemahan Full-Content 2 Arah (ID <-> EN) */}
          <div className="mt-4 rounded-xl border border-[#94D1DF] card-tint-sky p-3.5 sm:p-4 grid gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer min-h-[40px]">
              <input
                type="checkbox"
                checked={autoTranslateContent}
                onChange={(event) => setAutoTranslateContent(event.target.checked)}
                className="checkbox checkbox-sm border-[#124959]/50 checked:bg-[#1F6B57] checked:border-[#1F6B57]"
              />
              <span className="text-xs sm:text-sm font-semibold text-[#124959]">
                Terjemahkan seluruh isi CV saat mode Indonesia atau English dipilih
              </span>
            </label>

            {translationAudit ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 rounded-lg border border-[#9FD499] bg-white px-2.5 py-1 text-[#144C32]">
                  <CheckCircle size={14} weight="fill" aria-hidden="true" />
                  <span>
                    Cakupan terjemahan: {translationAudit.fullyTranslatedCount}/{translationAudit.totalFields} bagian penuh
                  </span>
                </span>
                {translationAudit.partialCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[#DFC25A] bg-[#FFF0A8] px-2.5 py-1 text-[#4A3A2E]">
                    <WarningCircle size={14} weight="duotone" aria-hidden="true" />
                    <span>{translationAudit.partialCount} bagian perlu dicek</span>
                  </span>
                ) : null}
              </div>
            ) : null}

            {!document.isEmpty && (isTranslatedView || Boolean(preTranslationBackup) || cvLanguage !== "auto" || Boolean(activeLocalConfig)) ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {isTranslatedView || Boolean(preTranslationBackup) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCompareOpen(true)}
                    className="min-h-[44px] text-xs gap-1.5"
                  >
                    <ArrowsSplit size={15} weight="bold" aria-hidden="true" />
                    <span>Buka Teks Asli &amp; Sunting Terjemahan</span>
                  </Button>
                ) : null}

                {autoTranslateContent && (cvLanguage !== "auto" || Boolean(activeLocalConfig)) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={Boolean(busy)}
                    onClick={handleAiTranslatePolish}
                    className="min-h-[44px] text-xs gap-1.5"
                  >
                    <ShieldCheck size={15} weight="duotone" aria-hidden="true" />
                    <span>
                      {busy === "translate"
                        ? translateProgress || "Menerjemahkan..."
                        : activeLocalConfig
                        ? `Perhalus Terjemahan (${activeLocalConfig.modelId})`
                        : "Perhalus Terjemahan (Tanpa PII)"}
                    </span>
                  </Button>
                ) : null}

                {isTranslatedView ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      applyTranslationToEditor(activeLang);
                      setMessage(
                        `Seluruh isi CV versi ${
                          activeLang === "en" ? "English" : "Bahasa Indonesia"
                        } telah disalin ke formulir Langkah 1 (cadangan teks asli otomatis disimpan).`
                      );
                    }}
                    className="min-h-[44px] text-xs gap-1.5"
                  >
                    <ArrowsClockwise size={15} weight="duotone" aria-hidden="true" />
                    <span>
                      Salin Hasil {activeLang === "en" ? "English" : "Indonesia"} ke Editor
                    </span>
                  </Button>
                ) : null}

                {preTranslationBackup ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      restorePreTranslationBackup();
                      setMessage("Teks asli CV sebelum disalin berhasil dikembalikan ke formulir Langkah 1.");
                    }}
                    className="min-h-[44px] text-xs gap-1.5"
                  >
                    <ArrowCounterClockwise size={15} weight="bold" aria-hidden="true" />
                    <span>Kembalikan Teks Asli</span>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Toggle Ringkas Asisten AI untuk Terjemahan */}
        <LocalAiControlPanel compact contextLabel="Terjemahan 2 Arah" />

        {/* Peringatan jika CV masih kosong */}
        {document.isEmpty ? (
          <div className="rounded-xl border border-[#E9A590] bg-[#FFE3D8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#7B1F14]">Data CV masih kosong</p>
              <p className="text-xs text-[#7B1F14] mt-0.5">
                Isi nama dan minimal satu bagian CV di Langkah 1.
              </p>
            </div>
            <Link
              href="/master-cv"
              className="btn doodle-btn shrink-0 bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538] px-4 py-2 text-xs sm:text-sm font-bold"
            >
              Isi Data CV
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-[#9FD499] bg-[#DFF5DA] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <SealCheck size={20} weight="duotone" className="text-[#144C32] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#144C32]">
                  Siap diunduh (~{pageInfo.estimatedPages} hal. A4 &middot; {activeTemplateMeta.label})
                </p>
                <p className="text-xs text-[#144C32]/90 mt-0.5 break-all">
                  Nama berkas: <span className="font-mono font-bold">{atsBaseFileName}.pdf</span>
                </p>
              </div>
            </div>
            {resume.experienceLevel === "fresh_graduate" && pageInfo.estimatedPages > 1 ? (
              <span className="rounded-lg border border-[#DFC25A] bg-[#FFF0A8] px-2.5 py-1 text-xs font-bold text-[#4A3A2E] shrink-0">
                Tip: pilih ATS Padat agar muat 1 halaman
              </span>
            ) : null}
          </div>
        )}

        {/* Guardrail Pemeriksaan Sebelum Unduh (muncul hanya jika ada temuan nyata) */}
        {preExportWarnings.length > 0 ? (
          <div
            role="status"
            className="rounded-xl border border-[#DFC25A] bg-[#FFF8DF] p-4 grid gap-2.5"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#251813]">
              <WarningCircle size={18} weight="duotone" className="shrink-0 text-[#4A3A2E]" aria-hidden="true" />
              <span>Cek cepat sebelum unduh ({preExportWarnings.length} temuan)</span>
            </div>
            <div className="grid gap-2">
              {preExportWarnings.map((warn) => (
                <div
                  key={warn.id}
                  className={`rounded-lg border px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
                    warn.severity === "error"
                      ? "border-[#E9A590] bg-[#FFE3D8] text-[#7B1F14]"
                      : "border-[#DFC25A] bg-white text-[#4A3A2E]"
                  }`}
                >
                  <span className="font-semibold leading-relaxed">{warn.message}</span>
                  {warn.actionKind === "sort_experience" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={sortExperiencesChronologically}
                      className="gap-1.5 text-xs shrink-0"
                    >
                      <SortDescending size={14} weight="bold" aria-hidden="true" />
                      <span>Urutkan Terbaru di Atas</span>
                    </Button>
                  ) : warn.actionKind === "goto_editor" ? (
                    <Link
                      href="/master-cv"
                      className="inline-flex items-center min-h-[44px] rounded-xl border border-[#C2B49E] bg-white px-3 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8] transition-colors shrink-0"
                    >
                      Perbaiki di Langkah 1
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

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
                <span className="text-xs font-bold text-[#144C32]">Siap Kirim</span>
              </div>
              <h3 className="font-bold text-base text-[#251813]">Dokumen PDF (A4)</h3>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                Tata letak rapi 1 kolom dan teks dapat diseleksi.
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
                <span className="text-xs font-semibold text-[#59483F]">Bisa Diedit</span>
              </div>
              <h3 className="font-bold text-base text-[#251813]">Dokumen Word</h3>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                Mudah disesuaikan ulang di Microsoft Word atau Google Docs.
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
                <span className="text-xs font-semibold text-[#59483F]">Teks Polos</span>
              </div>
              <h3 className="font-bold text-base text-[#251813]">Teks Polos (TXT)</h3>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                Praktis untuk disalin ke formulir rekrutmen online.
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

        {/* Simulasi Bacaan ATS (Teks Linear) */}
        {!document.isEmpty ? (
          <div className="rounded-xl border border-[#D9CEBC] bg-white p-3.5 sm:p-4 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#251813]">Simulasi Bacaan ATS (Teks Linear)</p>
                <p className="text-xs text-[#59483F] mt-0.5">
                  Urutan teks mentah persis seperti yang dibaca mesin penyaring ATS.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                aria-expanded={atsPreviewOpen}
                onClick={() => setAtsPreviewOpen((prev) => !prev)}
                className="gap-1.5 text-xs shrink-0"
              >
                <Eye size={15} weight="duotone" aria-hidden="true" />
                <span>{atsPreviewOpen ? "Sembunyikan Simulasi Bacaan ATS" : "Lihat Simulasi Bacaan ATS"}</span>
              </Button>
            </div>

            {atsPreviewOpen ? (
              <div className="grid gap-2 border-t border-[#D9CEBC] pt-3">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCopyPlainText}
                    className="gap-1.5 text-xs"
                  >
                    {copiedPlainText ? (
                      <>
                        <Check size={14} weight="bold" aria-hidden="true" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} weight="duotone" aria-hidden="true" />
                        <span>Salin Teks Polos</span>
                      </>
                    )}
                  </Button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg border border-[#D9CEBC] bg-[#FFFDF8] p-3.5 text-xs leading-relaxed text-[#251813] whitespace-pre-wrap font-mono">
                  {plainTextSnapshot}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Feedback Message */}
        <div role="status" aria-live="polite">
          {message ? (
            <div className="rounded-xl border border-[#9FD499] bg-white p-4 text-xs sm:text-sm font-semibold text-[#144C32]">
              {message}
            </div>
          ) : null}
        </div>
      </div>
      <TranslationComparePanel open={compareOpen} onClose={() => setCompareOpen(false)} />
    </SectionCard>
  );
};
