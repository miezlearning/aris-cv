"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowCounterClockwise, CheckCircle, Translate, WarningCircle, X } from "@phosphor-icons/react";
import { applyTranslatedFieldEdit, auditTranslation, type TranslatedFieldPath } from "@/lib/ats/translator";
import { useLiveAts } from "@/lib/live-ats";
import { useCvStore } from "@/lib/store";
import { Button, TextArea } from "@/components/ui";

export const TranslationComparePanel = ({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const resume = useCvStore((state) => state.resumeProfile);
  const setResumeProfile = useCvStore((state) => state.setResumeProfile);
  const updateTranslatedField = useCvStore((state) => state.updateTranslatedField);
  const applyTranslationToEditor = useCvStore((state) => state.applyTranslationToEditor);
  const preTranslationBackup = useCvStore((state) => state.preTranslationBackup);
  const restorePreTranslationBackup = useCvStore((state) => state.restorePreTranslationBackup);
  const setCvLanguage = useCvStore((state) => state.setCvLanguage);
  const setAutoTranslateContent = useCvStore((state) => state.setAutoTranslateContent);

  const { activeLang, isTranslatedView, translationAudit } = useLiveAts();
  const [filterMode, setFilterMode] = useState<"all" | "partial">("all");
  const [statusNotice, setStatusNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const comparingBackup = Boolean(!isTranslatedView && preTranslationBackup);
  const activeAudit = comparingBackup && preTranslationBackup
    ? auditTranslation(preTranslationBackup.profile, resume, preTranslationBackup.targetLang)
    : translationAudit;

  const targetLang = comparingBackup && preTranslationBackup ? preTranslationBackup.targetLang : activeLang;
  const items = activeAudit?.items ?? [];
  const filteredItems =
    filterMode === "partial" ? items.filter((item) => item.status !== "translated") : items;

  const handleFieldChange = (path: TranslatedFieldPath, value: string) => {
    if (comparingBackup) {
      setResumeProfile(applyTranslatedFieldEdit(resume, path, value));
      return;
    }
    updateTranslatedField(targetLang, path, value);
  };

  return createPortal(
    <div
      className="no-print fixed inset-0 z-[100] bg-[#251813]/70 p-2 sm:p-5 flex items-center justify-center"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="translation-compare-title"
        className="w-full max-w-4xl max-h-[90dvh] rounded-2xl border-2 border-[#251813] bg-[#FFFDF8] flex flex-col overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#D9CEBC] bg-[#FAF5E8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#94D1DF] bg-[#D6F3FA] text-[#124959]"
            >
              <Translate size={18} weight="duotone" />
            </span>
            <div>
              <h2 id="translation-compare-title" className="text-sm sm:text-base font-extrabold text-[#251813]">
                Bandingkan & Sunting Terjemahan ({targetLang === "en" ? "English" : "Indonesia"})
              </h2>
              <p className="text-xs text-[#4E3E36]">
                Sunting langsung kalimat terjemahan yang dirasa kurang pas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pembanding terjemahan"
            className="inline-flex items-center gap-1 min-h-[40px] rounded-xl border border-[#C2B49E] bg-white px-3 text-xs font-bold text-[#251813] hover:bg-[#FFE3D8]"
          >
            <X size={15} weight="bold" aria-hidden="true" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Summary & Controls */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#D9CEBC] bg-white grid gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {activeAudit ? (
                <>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[#9FD499] bg-[#DFF5DA] px-2.5 py-1 text-[#144C32]">
                    <CheckCircle size={14} weight="fill" aria-hidden="true" />
                    <span>
                      {activeAudit.fullyTranslatedCount}/{activeAudit.totalFields} bagian terjemahan penuh
                    </span>
                  </span>
                  {activeAudit.partialCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-[#DFC25A] bg-[#FFF0A8] px-2.5 py-1 text-[#4A3A2E]">
                      <WarningCircle size={14} weight="duotone" aria-hidden="true" />
                      <span>{activeAudit.partialCount} bagian perlu dicek</span>
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-bold ${
                  filterMode === "all"
                    ? "border-[#251813] bg-[#FFF0A8] text-[#251813]"
                    : "border-[#D9CEBC] bg-[#FAF5E8] text-[#4E3E36]"
                }`}
              >
                Semua ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("partial")}
                className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-bold ${
                  filterMode === "partial"
                    ? "border-[#251813] bg-[#FFF0A8] text-[#251813]"
                    : "border-[#D9CEBC] bg-[#FAF5E8] text-[#4E3E36]"
                }`}
              >
                Perlu Dicek ({activeAudit?.partialCount ?? 0})
              </button>
            </div>
          </div>

          {preTranslationBackup ? (
            <div className="rounded-xl border border-[#DFC25A] bg-[#FFF8DF] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#4A3A2E]">
                Cadangan teks asli sebelum kamu menekan &ldquo;Salin ke Editor&rdquo; tersimpan aman.
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  restorePreTranslationBackup();
                  onClose();
                }}
                className="min-h-[38px] text-xs gap-1.5"
              >
                <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />
                <span>Kembalikan Teks Asli ke Editor</span>
              </Button>
            </div>
          ) : !comparingBackup ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4E3E36]">
              <span>
                Semua suntingan di sini langsung memperbarui Pratinjau CV, Ekspor, dan Skor ATS Live.
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAutoTranslateContent(false);
                    setCvLanguage("auto");
                    onClose();
                  }}
                  className="min-h-[36px] rounded-lg border border-[#C2B49E] bg-[#FAF5E8] px-2.5 font-bold text-[#251813] hover:bg-[#FFF0A8]"
                >
                  Kembali ke Teks Asli
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyTranslationToEditor(targetLang);
                    setStatusNotice("Terjemahan disalin ke Langkah 1 (cadangan teks asli tersimpan otomatis).");
                  }}
                  className="min-h-[36px] rounded-lg border border-[#144C32] bg-[#DFF5DA] px-2.5 font-bold text-[#144C32] hover:bg-[#CDECC6]"
                >
                  Salin ke Editor Langkah 1
                </button>
              </div>
            </div>
          ) : null}

          {statusNotice ? (
            <p className="rounded-lg border border-[#9FD499] bg-[#EEF9EB] px-3 py-1.5 text-xs font-bold text-[#144C32]">
              {statusNotice}
            </p>
          ) : null}
        </div>

        {/* Comparison List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid gap-3.5">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#C2B49E] bg-white p-8 text-center">
              <p className="text-sm font-bold text-[#144C32]">
                {items.length === 0
                  ? "Belum ada teks untuk dibandingkan."
                  : "Semua bagian sudah diterjemahkan penuh tanpa kata sumber yang tertinggal."}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3.5 grid gap-2.5 ${
                  item.status === "translated"
                    ? "border-[#D9CEBC] bg-white"
                    : "border-[#DFC25A] bg-[#FFFDF5]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE7D6] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#FAF5E8] border border-[#D9CEBC] px-2 py-0.5 text-[11px] font-bold text-[#251813]">
                      {item.section}
                    </span>
                    <span className="text-xs font-bold text-[#4E3E36]">{item.label}</span>
                  </div>
                  {item.untranslatedWords.length > 0 ? (
                    <span className="rounded-md border border-[#DFC25A] bg-[#FFF0A8] px-2 py-0.5 text-[11px] font-bold text-[#4A3A2E]">
                      Kata belum diterjemahkan: {item.untranslatedWords.join(", ")}
                    </span>
                  ) : (
                    <span className="rounded-md border border-[#9FD499] bg-[#EEF9EB] px-2 py-0.5 text-[11px] font-bold text-[#144C32]">
                      Siap ATS
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2 items-start">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#59483F] mb-1">
                      Teks Asli
                    </p>
                    <div className="rounded-xl border border-[#D9CEBC] bg-[#FAF5E8] p-2.5 text-xs sm:text-[13px] leading-relaxed text-[#251813] break-words">
                      {item.original}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#144C32] mb-1">
                      Terjemahan
                    </p>
                    <TextArea
                      rows={item.original.length > 100 ? 3 : 2}
                      value={item.translated}
                      onChange={(event) => handleFieldChange(item.path, event.target.value)}
                      className="text-xs sm:text-[13px]"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-5 border-t border-[#D9CEBC] bg-[#FAF5E8] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#59483F]">
            Pratinjau & unduhan memakai teks hasil suntingan terbarumu.
          </span>
          <Button type="button" onClick={onClose} className="min-h-[42px]">
            Selesai & Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
