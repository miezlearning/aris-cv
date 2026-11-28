"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Database,
  DownloadSimple,
  Layout,
  Rows,
  ShieldCheck,
  SlidersHorizontal,
  TextAlignLeft,
  Translate,
  Trash,
  UploadSimple,
  WarningCircle
} from "@phosphor-icons/react";
import { LocalAiControlPanel } from "@/components/LocalAiControlPanel";
import { Button, SectionCard } from "@/components/ui";
import { getResumeCompleteness } from "@/lib/analyzer";
import { parseResumeInput } from "@/lib/importers";
import { useLiveAts } from "@/lib/live-ats";
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

export const SettingsPanel = () => {
  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const jobTarget = useCvStore((state) => state.jobTarget);
  const historyPast = useCvStore((state) => state.historyPast);
  const cvTemplate = useCvStore((state) => state.cvTemplate);
  const setCvTemplate = useCvStore((state) => state.setCvTemplate);
  const cvLanguage = useCvStore((state) => state.cvLanguage);
  const setCvLanguage = useCvStore((state) => state.setCvLanguage);
  const autoTranslateContent = useCvStore((state) => state.autoTranslateContent);
  const setAutoTranslateContent = useCvStore((state) => state.setAutoTranslateContent);
  const previewOpenDesktop = useCvStore((state) => state.previewOpenDesktop);
  const setPreviewOpenDesktop = useCvStore((state) => state.setPreviewOpenDesktop);
  const setResumeProfile = useCvStore((state) => state.setResumeProfile);
  const resetAll = useCvStore((state) => state.resetAll);

  const { activeLang } = useLiveAts();
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const [confirmReset, setConfirmReset] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const [dataError, setDataError] = useState("");

  const completeness = getResumeCompleteness(resumeProfile);

  const handleDownloadBackup = () => {
    setDataError("");
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        resumeProfile
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `quicktailor-cv-backup-${today}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setDataMessage(`Cadangan JSON (${anchor.download}) berhasil diunduh ke perangkatmu.`);
    } catch {
      setDataError("Gagal membuat berkas cadangan JSON. Coba lagi.");
    }
  };

  const handleRestoreFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDataError("");
    setDataMessage("");

    try {
      const rawText = await file.text();
      JSON.parse(rawText);
      const parsed = parseResumeInput(rawText);
      setResumeProfile(parsed.profile);
      setDataMessage(`Cadangan "${file.name}" berhasil dipulihkan ke Data CV.`);
    } catch {
      setDataError("Berkas JSON tidak valid atau formatnya tidak dikenali. Pilih berkas cadangan QuickTailor (.json).");
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };

  const handleConfirmResetAll = () => {
    resetAll();
    setConfirmReset(false);
    setDataError("");
    setDataMessage("Seluruh data CV, target lowongan, dan riwayat di browser ini telah dikosongkan.");
  };

  return (
    <div className="grid gap-6">
      {/* Header Pengaturan + Navigasi Lompat Cepat */}
      <div className="doodle-card card-tint-butter p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#251813]">
              Pengaturan
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#4E3E36] leading-relaxed">
              Atur asisten AI, tampilan dokumen default, dan cadangan data lokal.
            </p>
          </div>

          <Link
            href="/"
            prefetch={true}
            className="btn doodle-btn shrink-0 min-h-[44px] bg-white text-[#251813] border border-[#C2B49E] hover:bg-[#FFF8DF] px-4 text-xs sm:text-sm font-bold gap-1.5"
          >
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            <span>Kembali ke Ringkasan</span>
          </Link>
        </div>

        <nav aria-label="Kategori pengaturan" className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href="#ai"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#C2B49E] bg-white px-3.5 text-xs font-bold text-[#251813] hover:bg-[#ECF9FC] transition-colors"
          >
            <SlidersHorizontal size={15} weight="duotone" aria-hidden="true" />
            <span>Asisten AI</span>
          </a>
          <a
            href="#dokumen"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#C2B49E] bg-white px-3.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8] transition-colors"
          >
            <Layout size={15} weight="duotone" aria-hidden="true" />
            <span>Dokumen &amp; Tampilan</span>
          </a>
          <a
            href="#data"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#C2B49E] bg-white px-3.5 text-xs font-bold text-[#251813] hover:bg-[#FFE3D8] transition-colors"
          >
            <Database size={15} weight="duotone" aria-hidden="true" />
            <span>Data &amp; Privasi</span>
          </a>
        </nav>
      </div>

      {/* Seksi 1: Asisten AI */}
      <div id="ai" className="scroll-mt-24">
        <SectionCard
          title="Asisten AI (Opsional)"
          description="Pilih model browser offline, endpoint REST API, atau server lokal (Ollama / LM Studio) untuk membantu menulis ulang poin dan menerjemahkan CV."
          accent="sky"
          icon={<SlidersHorizontal size={20} weight="duotone" />}
        >
          <LocalAiControlPanel mode="full" contextLabel="Optimasi & Terjemahan" />
        </SectionCard>
      </div>

      {/* Seksi 2: Dokumen & Tampilan Ruang Kerja */}
      <div id="dokumen" className="scroll-mt-24">
        <SectionCard
          title="Dokumen & Tampilan Ruang Kerja"
          description="Atur gaya tata letak, bahasa default CV, dan tata letak editor di layar desktop."
          accent="butter"
          icon={<Layout size={20} weight="duotone" />}
        >
          <div className="grid gap-6">
            {/* Gaya Tata Letak Default */}
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#251813]">Gaya Tata Letak CV Default</h3>
                  <p className="text-xs text-[#59483F] mt-0.5">
                    Semua gaya memakai struktur 1 kolom linear yang ramah mesin penyaring ATS.
                  </p>
                </div>
                <span className="rounded-lg border border-[#DFC25A] bg-[#FFF8DF] px-2.5 py-1 text-xs font-bold text-[#4A3A2E]">
                  {TEMPLATE_OPTIONS.find((t) => t.value === cvTemplate)?.label ?? "ATS Padat"}
                </span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Pilih gaya tata letak default">
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

            {/* Bahasa Dokumen Default */}
            <div className="grid gap-3 border-t border-[#D9CEBC] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#94D1DF] bg-[#D6F3FA] text-[#124959]"
                  >
                    <Translate size={16} weight="duotone" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#251813]">Bahasa Dokumen Default</h3>
                    <p className="text-xs text-[#59483F] mt-0.5">
                      Bahasa yang digunakan pada pratinjau langsung dan saat mengunduh CV.
                    </p>
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

              <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px] rounded-xl border border-[#94D1DF] card-tint-sky px-3.5 py-2.5">
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
            </div>

            {/* Tampilan Editor Desktop */}
            <div className="border-t border-[#D9CEBC] pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#251813]">
                  Tampilkan Pratinjau CV berdampingan di desktop
                </h3>
                <p className="text-xs text-[#59483F] mt-0.5">
                  Matikan jika layar laptop terasa sempit agar area mengetik lebih luas.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={previewOpenDesktop}
                aria-label="Tampilkan Pratinjau CV berdampingan di desktop"
                onClick={() => setPreviewOpenDesktop((prev) => !prev)}
                className={`inline-flex items-center justify-center gap-2 min-h-[44px] shrink-0 rounded-full border px-3.5 transition-colors ${
                  previewOpenDesktop
                    ? "border-[#144C32] bg-[#1F6B57] text-white"
                    : "border-[#C2B49E] bg-[#F3E7C8] text-[#4E3E36]"
                }`}
              >
                <span className="text-xs font-bold">{previewOpenDesktop ? "Aktif" : "Mati"}</span>
                <span
                  aria-hidden="true"
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-2xs transition-transform ${
                    previewOpenDesktop ? "translate-x-0.5" : "-translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Seksi 3: Data Lokal, Cadangan & Privasi */}
      <div id="data" className="scroll-mt-24">
        <SectionCard
          title="Data Lokal, Cadangan & Privasi"
          description="Kelola data CV yang tersimpan di perangkat ini, buat berkas cadangan JSON, atau bersihkan ruang kerja."
          accent="clay"
          icon={<ShieldCheck size={20} weight="duotone" />}
        >
          <div className="grid gap-5">
            {/* Ringkasan Data Tersimpan */}
            <div className="rounded-xl border border-[#D9CEBC] bg-[#FFFDF8] p-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#D9CEBC] bg-white p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#59483F]">
                    Kelengkapan Data CV
                  </p>
                  <p className="mt-1 text-lg font-black text-[#251813]">{completeness}%</p>
                </div>
                <div className="rounded-lg border border-[#D9CEBC] bg-white p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#59483F]">
                    Lowongan Target
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#251813] truncate">
                    {jobTarget.jobTitle || "Belum ada lowongan target"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#D9CEBC] bg-white p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#59483F]">
                    Riwayat Undo Sesi Ini
                  </p>
                  <p className="mt-1 text-lg font-black text-[#251813]">{historyPast.length} langkah</p>
                </div>
              </div>

              <p className="text-xs text-[#4E3E36] leading-relaxed">
                Seluruh data CV dan hasil analisis tersimpan lokal di browser ini melalui IndexedDB. Jika memakai REST API AI, API key hanya disimpan sementara di memori sesi tab browser.
              </p>
            </div>

            {/* Cadangan & Pulihkan Data CV (JSON) */}
            <div className="rounded-xl border border-[#D9CEBC] bg-white p-4 grid gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#251813]">Cadangan &amp; Pulihkan Data CV (JSON)</h3>
                <p className="text-xs text-[#59483F] mt-0.5">
                  Simpan salinan profil CV kamu ke berkas JSON sebelum pindah perangkat atau membersihkan browser.
                </p>
              </div>

              <input
                ref={restoreInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFileChange}
                className="sr-only"
                id="settings-restore-json-input"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="button" onClick={handleDownloadBackup} className="min-h-[44px] gap-1.5 text-xs sm:text-sm">
                  <DownloadSimple size={16} weight="bold" aria-hidden="true" />
                  <span>Unduh Cadangan (.json)</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => restoreInputRef.current?.click()}
                  className="min-h-[44px] gap-1.5 text-xs sm:text-sm"
                >
                  <UploadSimple size={16} weight="duotone" aria-hidden="true" />
                  <span>Pulihkan dari JSON</span>
                </Button>
              </div>

              {dataMessage ? (
                <p
                  role="status"
                  className="rounded-lg border border-[#9FD499] bg-[#DFF5DA] px-3 py-2 text-xs font-semibold text-[#144C32] flex items-center gap-2"
                >
                  <CheckCircle size={15} weight="duotone" className="shrink-0" aria-hidden="true" />
                  <span>{dataMessage}</span>
                </p>
              ) : null}

              {dataError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-[#E9A590] bg-[#FFE3D8] px-3 py-2 text-xs font-semibold text-[#7B1F14] flex items-center gap-2"
                >
                  <WarningCircle size={15} weight="duotone" className="shrink-0" aria-hidden="true" />
                  <span>{dataError}</span>
                </p>
              ) : null}
            </div>

            {/* Zona Hapus Data */}
            <div className="rounded-xl border border-[#E9A590] bg-[#FFF5F1] p-4 grid gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#7B1F14]">Zona Hapus Data Lokal</h3>
                <p className="text-xs text-[#59483F] mt-0.5">
                  Kosongkan semua data CV, analisis lowongan, dan riwayat tersimpan di browser ini. Sebaiknya unduh cadangan JSON lebih dulu jika masih diperlukan.
                </p>
              </div>

              {confirmReset ? (
                <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#E9A590] bg-[#FFE3D8] p-3">
                  <span className="text-xs sm:text-sm font-bold text-[#7B1F14]">
                    Yakin hapus semua data CV, lowongan, dan riwayat di browser ini?
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmResetAll}
                      className="min-h-[44px] rounded-xl bg-[#7B1F14] px-4 text-xs font-black text-white hover:bg-[#5E160D] transition-colors cursor-pointer"
                    >
                      Ya, Hapus Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="min-h-[44px] rounded-xl border border-[#C2B49E] bg-white px-4 text-xs font-bold text-[#251813] hover:bg-[#FFF8DF] transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setConfirmReset(true)}
                    className="min-h-[44px] gap-1.5 text-xs sm:text-sm"
                  >
                    <Trash size={16} weight="duotone" aria-hidden="true" />
                    <span>Hapus Semua Data CV</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
