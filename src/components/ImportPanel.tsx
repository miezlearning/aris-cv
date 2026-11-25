"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsMerge,
  Briefcase,
  CaretDown,
  CheckCircle,
  FileArchive,
  FileArrowUp,
  FileCsv,
  FileDoc,
  FilePdf,
  FileTxt,
  Info,
  LinkedinLogo,
  Student,
  UploadSimple,
  WarningCircle,
  X
} from "@phosphor-icons/react";
import { extractLinkedInFiles } from "@/lib/file-extractor";
import {
  looksLikeLinkedInText,
  mergeResumeProfiles,
  parseLinkedInCsvArchive,
  parseLinkedInText,
  parseResumeInput
} from "@/lib/importers";
import { sampleDemoProfile, sampleFreshGradProfile } from "@/lib/defaults";
import { useCvStore } from "@/lib/store";
import { Button, TextArea, TextInput } from "@/components/ui";
import type { CvTemplate, ResumeProfile } from "@/types/resume";

type ImportTabMode = "cv" | "linkedin";
type ApplyImportMode = "replace" | "merge";

const TEMPLATE_LABELS = {
  compact_centered: "ATS Padat (Harvard / Tech)",
  classic_editorial: "ATS Standar (Klasik Lega)",
  executive_left: "ATS Formal (Rata Kiri Serif)"
} as const;

export const ImportPanel = () => {
  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const setResumeProfile = useCvStore((state) => state.setResumeProfile);
  const setCvTemplate = useCvStore((state) => state.setCvTemplate);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportTabMode>("cv");
  const [applyMode, setApplyMode] = useState<ApplyImportMode>("replace");
  const [showLinkedInGuide, setShowLinkedInGuide] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [raw, setRaw] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const applyResolvedProfile = (
    incomingProfile: ResumeProfile,
    summaryMessage: string,
    recommendedTemplate: CvTemplate,
    sourceLabel?: string
  ) => {
    const nextProfile =
      applyMode === "merge"
        ? mergeResumeProfiles(resumeProfile, incomingProfile)
        : incomingProfile;

    setResumeProfile(nextProfile);
    if (applyMode === "replace") {
      setCvTemplate(recommendedTemplate);
    }

    const modeNote =
      applyMode === "merge"
        ? " Item baru digabungkan ke data CV."
        : ` Gaya tampilan diset ke ${TEMPLATE_LABELS[recommendedTemplate]}.`;

    setMessage(
      sourceLabel
        ? `File "${sourceLabel}" berhasil diimpor. ${summaryMessage}${modeNote}`
        : `${summaryMessage}${modeNote}`
    );
    setErrorMessage("");
    setImportOpen(false);
  };

  const applyParsedText = (
    text: string,
    sourceLabel?: string,
    forceLinkedInHint = false
  ) => {
    const cleanUrl = linkedInUrl.trim();
    if (forceLinkedInHint || looksLikeLinkedInText(text)) {
      const parsed = parseLinkedInText(text, cleanUrl);
      applyResolvedProfile(
        parsed.profile,
        parsed.message,
        parsed.recommendedTemplate,
        sourceLabel
      );
      return;
    }

    const result = parseResumeInput(text);
    const enrichedProfile =
      cleanUrl && !result.profile.contact.linkedinUrl
        ? {
            ...result.profile,
            contact: { ...result.profile.contact, linkedinUrl: cleanUrl }
          }
        : result.profile;

    applyResolvedProfile(
      enrichedProfile,
      result.message,
      result.recommendedTemplate,
      sourceLabel
    );
  };

  const handleImport = () => {
    if (!raw.trim()) return;
    applyParsedText(raw, undefined, activeTab === "linkedin" && looksLikeLinkedInText(raw));
  };

  const processSelectedFiles = async (files: FileList | File[]) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;

    setReadingFile(true);
    setErrorMessage("");
    setMessage("");

    const label =
      list.length === 1
        ? list[0].name
        : `${list.length} berkas CSV (${list[0].name}, ...)`;

    try {
      const extracted = await extractLinkedInFiles(list);
      setUploadedFileName(label);

      if (extracted.linkedInCsvFiles && Object.keys(extracted.linkedInCsvFiles).length > 0) {
        const parsed = parseLinkedInCsvArchive(
          extracted.linkedInCsvFiles,
          linkedInUrl.trim()
        );
        setRaw("");
        applyResolvedProfile(
          parsed.profile,
          parsed.message,
          parsed.recommendedTemplate,
          label
        );
        return;
      }

      setRaw(extracted.text);
      const isLinkedInSource =
        extracted.detectedSource === "linkedin_pdf" || looksLikeLinkedInText(extracted.text);
      applyParsedText(extracted.text, label, isLinkedInSource);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal membaca berkas. Coba salin teks profil/CV kamu lalu tempel di kolom bawah."
      );
    } finally {
      setReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      void processSelectedFiles(event.target.files);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      void processSelectedFiles(event.dataTransfer.files);
    }
  };

  const openModeDrawer = (targetTab: ImportTabMode) => {
    setErrorMessage("");
    if (importOpen && activeTab === targetTab) {
      setImportOpen(false);
      return;
    }
    setActiveTab(targetTab);
    setImportOpen(true);
  };

  const handleLoadFreshGrad = () => {
    setResumeProfile(sampleFreshGradProfile());
    setCvTemplate("classic_editorial");
    setUploadedFileName("");
    setErrorMessage("");
    setMessage("Contoh profil Fresh Graduate (S1, Magang MSIB, Proyek Tugas Akhir, dan Organisasi) berhasil dimuat.");
    setImportOpen(false);
  };

  const handleLoadExperienced = () => {
    setResumeProfile(sampleDemoProfile());
    setCvTemplate("classic_editorial");
    setUploadedFileName("");
    setErrorMessage("");
    setMessage("Contoh profil Berpengalaman berhasil dimuat ke formulir.");
    setImportOpen(false);
  };

  return (
    <div className="surface-card card-tint-butter p-4 sm:p-5">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-[#251813] bg-white text-[#251813] shadow-[2px_2px_0_rgba(37,24,19,0.12)]"
          >
            <UploadSimple size={19} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#251813]">Mulai dari berkas, LinkedIn, atau contoh</p>
            <p className="text-xs text-[#4E3E36] mt-0.5">
              Atau langsung isi formulir di bawah dari awal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3.5 text-xs sm:text-sm gap-1.5"
            aria-expanded={importOpen && activeTab === "cv"}
            onClick={() => openModeDrawer("cv")}
          >
            <FileArrowUp size={16} weight="duotone" aria-hidden="true" />
            <span>{importOpen && activeTab === "cv" ? "Tutup Panel CV" : "Impor / Unggah CV"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3.5 text-xs sm:text-sm gap-1.5 bg-[#D6F3FA] border-[#94D1DF] text-[#124959] hover:bg-[#C3EBF5]"
            aria-expanded={importOpen && activeTab === "linkedin"}
            onClick={() => openModeDrawer("linkedin")}
          >
            <LinkedinLogo size={16} weight="duotone" aria-hidden="true" />
            <span>
              {importOpen && activeTab === "linkedin" ? "Tutup Panel LinkedIn" : "Impor dari LinkedIn"}
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3.5 text-xs sm:text-sm gap-1.5 bg-[#DFF5DA] border-[#9FD499] text-[#144C32] hover:bg-[#CDECC6]"
            onClick={handleLoadFreshGrad}
          >
            <Student size={15} weight="duotone" aria-hidden="true" />
            <span>Contoh Fresh Grad</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3 text-xs sm:text-sm gap-1.5"
            onClick={handleLoadExperienced}
          >
            <Briefcase size={15} weight="duotone" aria-hidden="true" />
            <span>Contoh Umum</span>
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {importOpen ? (
          <motion.div
            key="import-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-[#D9CEBC] pt-4 grid gap-4">
              {/* Tab Pemilih Sumber & Mode Penerapan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div
                  role="tablist"
                  aria-label="Sumber impor data"
                  className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-[#C2B49E] bg-[#FFF8DF] p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "cv"}
                    onClick={() => {
                      setActiveTab("cv");
                      setErrorMessage("");
                    }}
                    className={`min-h-[44px] px-3 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors ${
                      activeTab === "cv"
                        ? "bg-[#251813] text-[#FFFDF8]"
                        : "text-[#4A3A2E] hover:bg-white/80"
                    }`}
                  >
                    <FileArrowUp size={15} weight="duotone" aria-hidden="true" />
                    <span>Berkas / Teks CV</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "linkedin"}
                    onClick={() => {
                      setActiveTab("linkedin");
                      setErrorMessage("");
                    }}
                    className={`min-h-[44px] px-3 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors ${
                      activeTab === "linkedin"
                        ? "bg-[#124959] text-[#FFFDF8]"
                        : "text-[#4A3A2E] hover:bg-white/80"
                    }`}
                  >
                    <LinkedinLogo size={15} weight="duotone" aria-hidden="true" />
                    <span>Resource LinkedIn</span>
                  </button>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Cara menerapkan data impor"
                  className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-[#C2B49E] bg-white p-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={applyMode === "replace"}
                    onClick={() => setApplyMode("replace")}
                    className={`min-h-[44px] px-3 rounded-lg text-xs font-bold transition-colors ${
                      applyMode === "replace"
                        ? "bg-[#FFF0A8] border border-[#DFC25A] text-[#251813]"
                        : "text-[#59483F] hover:bg-[#FFF8DF]"
                    }`}
                  >
                    Ganti CV saat ini
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={applyMode === "merge"}
                    onClick={() => setApplyMode("merge")}
                    className={`min-h-[44px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                      applyMode === "merge"
                        ? "bg-[#DFF5DA] border border-[#9FD499] text-[#144C32]"
                        : "text-[#59483F] hover:bg-[#FFF8DF]"
                    }`}
                  >
                    <ArrowsMerge size={14} weight="bold" aria-hidden="true" />
                    <span>Gabungkan ke CV yang ada</span>
                  </button>
                </div>
              </div>

              {applyMode === "merge" ? (
                <p className="text-xs text-[#144C32] bg-[#DFF5DA]/70 border border-[#9FD499] rounded-xl px-3 py-2 font-medium">
                  Mode Gabung: item baru ditambahkan tanpa menghapus kontak, ringkasan, atau proyek yang sudah ada.
                </p>
              ) : null}

              {activeTab === "linkedin" ? (
                <div className="grid gap-3 rounded-xl border border-[#94D1DF] bg-[#D6F3FA]/45 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#124959]">
                      <LinkedinLogo size={18} weight="duotone" aria-hidden="true" />
                      <span>Dukung PDF, arsip .zip / .csv, atau salinan teks profil</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLinkedInGuide((prev) => !prev)}
                      aria-expanded={showLinkedInGuide}
                      className="min-h-[44px] px-3 rounded-lg border border-[#94D1DF] bg-white text-xs font-bold text-[#124959] hover:bg-[#F1FBFE] inline-flex items-center gap-1.5"
                    >
                      <Info size={15} weight="duotone" aria-hidden="true" />
                      <span>{showLinkedInGuide ? "Tutup Panduan" : "Cara Ekspor dari LinkedIn"}</span>
                      <CaretDown
                        size={13}
                        weight="bold"
                        aria-hidden="true"
                        className={`transition-transform ${showLinkedInGuide ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {showLinkedInGuide ? (
                      <motion.ol
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden grid gap-1.5 text-xs text-[#251813] bg-white/90 border border-[#94D1DF] rounded-xl p-3 list-decimal list-inside leading-relaxed"
                      >
                        <li>
                          <strong>Save to PDF:</strong> Profil LinkedIn -&gt; <strong>More / Lainnya</strong> -&gt; <strong>Save to PDF</strong>.
                        </li>
                        <li>
                          <strong>Arsip Data (.zip / .csv):</strong> Settings -&gt; Data privacy -&gt; Get a copy of your data.
                        </li>
                        <li>
                          <strong>Salin Teks:</strong> Salin teks profil LinkedIn lalu tempel di kolom di bawah.
                        </li>
                      </motion.ol>
                    ) : null}
                  </AnimatePresence>

                  <label className="grid gap-1 text-xs font-semibold text-[#124959]">
                    <span>Tautan profil LinkedIn (opsional)</span>
                    <TextInput
                      type="url"
                      value={linkedInUrl}
                      onChange={(event) => setLinkedInUrl(event.target.value)}
                      placeholder="https://www.linkedin.com/in/username"
                      className="bg-white"
                    />
                  </label>
                </div>
              ) : null}

              {/* Dropzone Unggah Berkas */}
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-4 sm:p-5 transition-colors ${
                  isDragging
                    ? "border-[#1F6B57] bg-[#DFF5DA]/70"
                    : "border-[#C2B49E] bg-white hover:border-[#251813]/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.zip,.csv,.txt,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,text/csv,text/plain,application/json"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="cv-file-upload-input"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-[#251813] ${
                        activeTab === "linkedin"
                          ? "border-[#94D1DF] bg-[#D6F3FA] text-[#124959]"
                          : "border-[#DFC25A] bg-[#FFF8DF]"
                      }`}
                    >
                      {activeTab === "linkedin" ? (
                        <LinkedinLogo size={22} weight="duotone" />
                      ) : (
                        <FileArrowUp size={22} weight="duotone" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#251813]">
                        {readingFile
                          ? "Membaca file..."
                          : activeTab === "linkedin"
                          ? "Unggah Profile.pdf, arsip .zip, atau file .csv LinkedIn"
                          : "Unggah berkas CV (.pdf, .docx, .txt, .json)"}
                      </p>
                      <p className="text-xs text-[#4E3E36] mt-0.5 leading-relaxed">
                        Seret file ke sini atau klik Pilih File. Diproses lokal di perangkatmu.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        {activeTab === "linkedin" ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#E9A590] bg-[#FFE3D8] px-2 py-0.5 text-[#7B1F14]">
                              <FilePdf size={13} weight="duotone" aria-hidden="true" />
                              <span>Save to PDF</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#94D1DF] bg-[#D6F3FA] px-2 py-0.5 text-[#124959]">
                              <FileArchive size={13} weight="duotone" aria-hidden="true" />
                              <span>Arsip .ZIP</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#9FD499] bg-[#DFF5DA] px-2 py-0.5 text-[#144C32]">
                              <FileCsv size={13} weight="duotone" aria-hidden="true" />
                              <span>Multi .CSV</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#E9A590] bg-[#FFE3D8] px-2 py-0.5 text-[#7B1F14]">
                              <FilePdf size={13} weight="duotone" aria-hidden="true" />
                              <span>PDF Teks</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#94D1DF] bg-[#D6F3FA] px-2 py-0.5 text-[#124959]">
                              <FileDoc size={13} weight="duotone" aria-hidden="true" />
                              <span>Word .DOCX</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#DFC25A] bg-[#FFF0A8] px-2 py-0.5 text-[#4A3A2E]">
                              <FileTxt size={13} weight="duotone" aria-hidden="true" />
                              <span>TXT / JSON</span>
                            </span>
                          </>
                        )}
                        {uploadedFileName ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#9FD499] bg-[#DFF5DA] px-2 py-0.5 text-[#144C32]">
                            Terakhir: {uploadedFileName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={readingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 min-h-[44px] gap-1.5"
                  >
                    <FileArrowUp size={16} weight="bold" aria-hidden="true" />
                    <span>
                      {readingFile
                        ? "Membaca..."
                        : activeTab === "linkedin"
                        ? "Pilih Resource LinkedIn"
                        : "Pilih Berkas CV"}
                    </span>
                  </Button>
                </div>
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-xl border border-[#E9A590] bg-[#FFE3D8] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#7B1F14] flex items-start gap-2"
                >
                  <WarningCircle size={18} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              {/* Atau Tempel Teks Manual */}
              <div className="grid gap-2">
                <label className="grid gap-1.5 text-sm font-semibold text-[#251813]">
                  <span>
                    {activeTab === "linkedin"
                      ? "Atau tempel teks profil LinkedIn"
                      : "Atau tempel teks CV"}
                  </span>
                  <TextArea
                    rows={5}
                    value={raw}
                    onChange={(event) => setRaw(event.target.value)}
                    placeholder={
                      activeTab === "linkedin"
                        ? "Tempel isi profil LinkedIn (Tentang, Pengalaman, Pendidikan, Keahlian)..."
                        : "Tempel teks dari PDF, Word, atau JSON Resume di sini..."
                    }
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleImport}
                    disabled={!raw.trim() || readingFile}
                    className="min-h-[44px]"
                  >
                    {applyMode === "merge"
                      ? "Ekstrak & Gabungkan ke CV"
                      : "Ekstrak & Isi Formulir"}
                  </Button>
                  {raw || linkedInUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[44px]"
                      onClick={() => {
                        setRaw("");
                        setLinkedInUrl("");
                        setUploadedFileName("");
                        setErrorMessage("");
                      }}
                    >
                      Kosongkan
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div role="status" aria-live="polite">
        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-xl border border-[#9FD499] bg-[#DFF5DA] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#144C32] flex items-center justify-between gap-2"
          >
            <span className="flex items-start gap-2">
              <CheckCircle size={16} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{message}</span>
            </span>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Tutup pemberitahuan"
              className="min-h-[44px] min-w-[44px] grid place-items-center rounded-lg hover:bg-white/60 shrink-0"
            >
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
