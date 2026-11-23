"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Briefcase,
  CheckCircle,
  FileArrowUp,
  FileDoc,
  FilePdf,
  FileTxt,
  Student,
  UploadSimple,
  WarningCircle,
  X
} from "@phosphor-icons/react";
import { extractTextFromFile } from "@/lib/file-extractor";
import { parseResumeInput } from "@/lib/importers";
import { sampleDemoProfile, sampleFreshGradProfile } from "@/lib/defaults";
import { useCvStore } from "@/lib/store";
import { Button, TextArea } from "@/components/ui";

const TEMPLATE_LABELS = {
  compact_centered: "ATS Padat (Harvard / Tech)",
  classic_editorial: "ATS Standar (Klasik Lega)",
  executive_left: "ATS Formal (Rata Kiri Serif)"
} as const;

export const ImportPanel = () => {
  const setResumeProfile = useCvStore((state) => state.setResumeProfile);
  const setCvTemplate = useCvStore((state) => state.setCvTemplate);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const applyParsedText = (text: string, sourceLabel?: string) => {
    const result = parseResumeInput(text);
    setResumeProfile(result.profile);
    setCvTemplate(result.recommendedTemplate);
    const styleNote = ` Format disesuaikan otomatis ke gaya ${TEMPLATE_LABELS[result.recommendedTemplate]} (bisa diganti kapan saja di pratinjau atau ekspor).`;
    setMessage(
      sourceLabel
        ? `Berkas "${sourceLabel}" berhasil diimpor. ${result.message}${styleNote}`
        : `${result.message}${styleNote}`
    );
    setErrorMessage("");
    setImportOpen(false);
  };

  const handleImport = () => {
    if (!raw.trim()) return;
    applyParsedText(raw);
  };

  const processSelectedFile = async (file: File) => {
    setReadingFile(true);
    setErrorMessage("");
    setMessage("");
    try {
      const extracted = await extractTextFromFile(file);
      setRaw(extracted.text);
      setUploadedFileName(file.name);
      applyParsedText(extracted.text, file.name);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal membaca berkas. Coba salin teks CV kamu lalu tempel di kolom bawah."
      );
    } finally {
      setReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processSelectedFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processSelectedFile(file);
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
            <p className="text-sm font-bold text-[#251813]">Cara mulai mengisi data CV</p>
            <p className="text-xs sm:text-[13px] text-[#4E3E36] mt-0.5 leading-relaxed">
              Isi langsung dari nol di bawah, unggah CV lama (PDF / Word DOCX / TXT / JSON), atau muat contoh siap edit.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3.5 text-xs sm:text-sm gap-1.5"
            aria-expanded={importOpen}
            onClick={() => setImportOpen((prev) => !prev)}
          >
            <FileArrowUp size={16} weight="duotone" aria-hidden="true" />
            <span>{importOpen ? "Tutup Panel Impor" : "Impor / Unggah CV"}</span>
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
                  accept=".pdf,.docx,.txt,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/json"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="cv-file-upload-input"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#DFC25A] bg-[#FFF8DF] text-[#251813]"
                    >
                      <FileArrowUp size={22} weight="duotone" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#251813]">
                        {readingFile
                          ? "Mengekstrak teks CV di browser..."
                          : "Unggah berkas CV lama kamu (.pdf, .docx, .txt, .json)"}
                      </p>
                      <p className="text-xs text-[#4E3E36] mt-0.5 leading-relaxed">
                        Seret berkas ke area ini atau klik tombol Pilih Berkas. Diproses 100% lokal di perangkatmu tanpa dikirim ke server.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
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
                    <span>{readingFile ? "Membaca..." : "Pilih Berkas CV"}</span>
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
                  <span>Atau tempel teks CV lama / JSON Resume di sini</span>
                  <TextArea
                    rows={5}
                    value={raw}
                    onChange={(event) => setRaw(event.target.value)}
                    placeholder="Salin-tempel seluruh teks dari dokumen PDF/Word atau berkas JSON Resume kamu di sini..."
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button type="button" variant="secondary" onClick={handleImport} disabled={!raw.trim() || readingFile}>
                    Ekstrak & Isi Formulir
                  </Button>
                  {raw ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setRaw("");
                        setUploadedFileName("");
                        setErrorMessage("");
                      }}
                    >
                      Kosongkan
                    </Button>
                  ) : null}
                  <span className="text-xs text-[#59483F]">
                    Mendukung berbagai format ATS: heading pipe (Posisi | Perusahaan), format 2 baris, keahlian per kategori, hingga JSON Resume.
                  </span>
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
              className="min-h-[32px] min-w-[32px] grid place-items-center rounded-lg hover:bg-white/60 shrink-0"
            >
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
