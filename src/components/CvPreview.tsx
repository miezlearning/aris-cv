"use client";

import { useState } from "react";
import { ArrowsOutSimple, FileText, MagnifyingGlassPlus, Translate } from "@phosphor-icons/react";
import { computeProfileContentHash } from "@/lib/ats/translator";
import {
  buildResumeDocument,
  estimateA4Pages,
  getMissingParts,
  resolveCvLanguage
} from "@/lib/resume-document";
import { useCvStore, type MasterTab } from "@/lib/store";
import type { CvLanguage } from "@/types/resume";

export const CvPreview = ({
  onOpenModal,
  isModal = false,
  highlightSection
}: {
  onOpenModal?: () => void;
  isModal?: boolean;
  highlightSection?: MasterTab;
}) => {
  const resume = useCvStore((state) => state.resumeProfile);
  const analytics = useCvStore((state) => state.matchAnalytics);
  const cvLanguage = useCvStore((state) => state.cvLanguage);
  const setCvLanguage = useCvStore((state) => state.setCvLanguage);
  const autoTranslateContent = useCvStore((state) => state.autoTranslateContent);
  const setAutoTranslateContent = useCvStore((state) => state.setAutoTranslateContent);
  const aiTranslatedEnProfile = useCvStore((state) => state.aiTranslatedEnProfile);
  const aiTranslatedSourceHash = useCvStore((state) => state.aiTranslatedSourceHash);
  const applyEnglishTranslationToEditor = useCvStore((state) => state.applyEnglishTranslationToEditor);

  const [zoomMode, setZoomMode] = useState<"fit" | "full">("fit");

  const activeLang = resolveCvLanguage(
    cvLanguage,
    analytics.hasAnalyzed ? analytics.detectedLanguage : undefined
  );
  const currentHash = computeProfileContentHash(resume);
  const translatedOverride =
    aiTranslatedEnProfile && aiTranslatedSourceHash === currentHash ? aiTranslatedEnProfile : null;

  const document = buildResumeDocument(resume, activeLang, {
    translateContent: autoTranslateContent,
    translatedOverride
  });
  const pageInfo = estimateA4Pages(document);
  const missing = getMissingParts(resume);

  const isFreshGradOverOnePage =
    !document.isEmpty && resume.experienceLevel === "fresh_graduate" && pageInfo.estimatedPages > 1;

  return (
    <aside
      className={`surface-card flex flex-col ${
        isModal
          ? "h-full border-0 shadow-none p-2 sm:p-4"
          : "h-full max-h-[calc(100dvh-5.5rem)] p-3.5 sm:p-4"
      }`}
    >
      {/* Header Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#D9CEBC] pb-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[#251813] bg-[#FFF0A8] text-[#251813]"
          >
            <FileText size={18} weight="duotone" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#251813]">Lembar CV kamu</h2>
              {!document.isEmpty ? (
                <span className="rounded-md border border-[#D9CEBC] bg-[#FAF5E8] px-2 py-0.5 text-[11px] font-bold text-[#4E3E36]">
                  ~{pageInfo.estimatedPages} hal. A4
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-[#59483F]">Satu kolom linear standar ATS</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Switcher Bahasa Cepat */}
          <div
            role="group"
            aria-label="Bahasa CV"
            className="inline-flex rounded-lg border border-[#D9CEBC] bg-[#F3E7C8] p-0.5 text-[11px] font-bold"
          >
            {(["auto", "id", "en"] as CvLanguage[]).map((langOpt) => (
              <button
                key={langOpt}
                type="button"
                onClick={() => setCvLanguage(langOpt)}
                className={`min-h-[32px] rounded-md px-2 transition-colors ${
                  cvLanguage === langOpt
                    ? "bg-white text-[#251813] shadow-2xs"
                    : "text-[#4E3E36] hover:text-[#251813]"
                }`}
              >
                {langOpt === "auto" ? "Auto" : langOpt.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Kontrol Zoom */}
          <div
            role="group"
            aria-label="Zoom pratinjau"
            className="inline-flex rounded-lg border border-[#D9CEBC] bg-[#F3E7C8] p-0.5 text-[11px] font-bold"
          >
            <button
              type="button"
              onClick={() => setZoomMode("fit")}
              className={`min-h-[32px] rounded-md px-2 transition-colors ${
                zoomMode === "fit" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
              }`}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoomMode("full")}
              className={`inline-flex items-center gap-1 min-h-[32px] rounded-md px-2 transition-colors ${
                zoomMode === "full" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
              }`}
            >
              <MagnifyingGlassPlus size={12} weight="bold" aria-hidden="true" />
              <span>100%</span>
            </button>
          </div>

          {onOpenModal && !isModal ? (
            <button
              type="button"
              onClick={onOpenModal}
              className="flex min-h-[34px] items-center gap-1 rounded-lg border border-[#C2B49E] bg-white px-2.5 py-1 text-xs font-bold text-[#251813] hover:bg-[#FFF8DF] transition-colors"
              title="Buka tampilan layar penuh"
            >
              <ArrowsOutSimple size={13} weight="bold" aria-hidden="true" />
              <span>Perbesar</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Ribbon info terjemahan full-content saat mode EN aktif */}
      {!document.isEmpty && activeLang === "en" ? (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#94D1DF] bg-[#ECF9FC] px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#124959]">
            <Translate size={15} weight="duotone" aria-hidden="true" />
            <span>
              {autoTranslateContent
                ? "Mode ATS English: judul & seluruh isi CV diterjemahkan"
                : "Mode ATS English: hanya judul seksi (isi tetap asli)"}
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoTranslateContent(!autoTranslateContent)}
              className="rounded-md border border-[#94D1DF] bg-white px-2 py-1 text-[11px] font-bold text-[#124959] hover:bg-[#D6F3FA] transition-colors"
            >
              {autoTranslateContent ? "Pakai Teks Asli" : "Terjemahkan Isi"}
            </button>
            {autoTranslateContent ? (
              <button
                type="button"
                onClick={applyEnglishTranslationToEditor}
                title="Salin versi bahasa Inggris ini ke formulir Langkah 1 agar bisa kamu sunting manual"
                className="rounded-md border border-[#1F6B57]/40 bg-[#DFF5DA] px-2 py-1 text-[11px] font-bold text-[#144C32] hover:bg-[#CDECC6] transition-colors"
              >
                Salin ke Editor
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Peringatan batas 1 halaman untuk Fresh Graduate */}
      {isFreshGradOverOnePage ? (
        <div className="mb-2.5 rounded-xl border border-[#DFC25A] bg-[#FFF0A8] px-3 py-2 text-xs font-semibold text-[#4A3A2E]">
          CV diperkirakan melewati 1 halaman A4. Untuk Fresh Graduate, ringkas poin yang kurang relevan agar tetap 1 halaman.
        </div>
      ) : null}

      {/* Frame Kertas CV */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#D9CEBC] bg-[#EDE5D5] p-2.5 sm:p-4 ${
          zoomMode === "full" ? "overflow-x-auto" : "overflow-x-hidden"
        }`}
      >
        <div
          className={`cv-paper relative mx-auto rounded-xs border border-stone-300 bg-white shadow-sm text-black break-words ${
            zoomMode === "full"
              ? "w-[720px] min-h-[1018px] p-10"
              : "w-full max-w-[720px] min-h-[760px] p-5 sm:p-8"
          }`}
        >
          {!document.isEmpty && pageInfo.estimatedPages > 1 ? (
            <div
              aria-hidden="true"
              className="no-print pointer-events-none absolute inset-x-4 top-[980px] border-t-2 border-dashed border-[#E86F4D]/70"
            >
              <span className="inline-block -translate-y-3 bg-[#FFE3D8] px-2 py-0.5 text-[10px] font-bold text-[#7B1F14] rounded">
                Perkiraan batas akhir Halaman 1 (A4)
              </span>
            </div>
          ) : null}

          {document.isEmpty ? (
            <div className="grid place-items-center py-20 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#FFF0A8] text-[#251813] mb-3 border-2 border-[#251813]">
                <FileText size={24} weight="duotone" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-[#251813]">Lembar CV masih kosong</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#59483F]">
                Isi data di <span className="font-bold text-[#251813]">Langkah 1 (Data CV)</span> atau klik{" "}
                <span className="font-bold text-[#251813]">Contoh Fresh Grad</span>. Dokumen akan langsung tersusun di sini.
              </p>
            </div>
          ) : (
            <div className="text-[#000000]">
              <header
                className={`text-center mb-3 rounded transition-colors ${
                  highlightSection === "contact" ? "bg-[#FFF8DF] py-1.5 px-2 -mx-2 ring-1 ring-[#DFC25A]" : ""
                }`}
              >
                {document.name ? (
                  <h1 className="text-lg sm:text-[22px] font-bold tracking-tight text-black leading-tight">
                    {document.name}
                  </h1>
                ) : null}

                {document.headline ? (
                  <p className="mt-1 text-xs sm:text-[12.5px] font-bold text-black">{document.headline}</p>
                ) : null}

                {document.contact ? (
                  <p className="mt-1 text-[10.5px] sm:text-[11px] text-[#222222] leading-relaxed">
                    {document.contact}
                  </p>
                ) : null}
              </header>

              {document.sections.map((section) => {
                const isHighlighted = highlightSection === section.sectionKey;
                return (
                  <section
                    key={section.sectionKey}
                    className={`mt-3.5 rounded transition-colors ${
                      isHighlighted ? "bg-[#FFF8DF]/80 py-1.5 px-2 -mx-2 ring-1 ring-[#DFC25A]" : ""
                    }`}
                  >
                    <div className="border-b border-black pb-0.5 mb-1.5">
                      <h2 className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-black">
                        {section.heading}
                      </h2>
                    </div>

                    {section.paragraphs.map((paragraph, index) => {
                      const colonIndex = paragraph.indexOf(":");
                      if (colonIndex > 0 && colonIndex < 38) {
                        const label = paragraph.slice(0, colonIndex);
                        const rest = paragraph.slice(colonIndex + 1);
                        return (
                          <p key={index} className="text-[11px] sm:text-[11.5px] leading-[1.4] text-black my-0.5">
                            <span className="font-bold">{label}:</span>
                            <span>{rest}</span>
                          </p>
                        );
                      }

                      return (
                        <p key={index} className="text-[11px] sm:text-[11.5px] leading-relaxed text-black my-1">
                          {paragraph}
                        </p>
                      );
                    })}

                    {section.entries.map((entry, index) => {
                      const entryNotes = entry.notes?.length ? entry.notes : entry.note ? [entry.note] : [];
                      return (
                        <div key={index} className="mt-2 mb-1.5">
                          {(entry.title || entry.meta) && (
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                              {entry.title ? (
                                <h3 className="text-[11px] sm:text-[11.5px] font-bold text-black leading-snug">
                                  {entry.title}
                                </h3>
                              ) : null}
                              {entry.meta ? (
                                <span className="text-[10.5px] sm:text-[11px] font-normal text-black shrink-0 text-right">
                                  {entry.meta}
                                </span>
                              ) : null}
                            </div>
                          )}

                          {entryNotes.map((noteLine, nIdx) => {
                            const colonIdx = noteLine.indexOf(":");
                            if (colonIdx > 0 && colonIdx < 28) {
                              const label = noteLine.slice(0, colonIdx);
                              const rest = noteLine.slice(colonIdx + 1);
                              return (
                                <p key={nIdx} className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#222222] leading-snug">
                                  <span className="font-bold text-black">{label}:</span>
                                  <span>{rest}</span>
                                </p>
                              );
                            }
                            return (
                              <p key={nIdx} className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#222222] leading-snug">
                                {noteLine}
                              </p>
                            );
                          })}

                          {entry.bullets.length ? (
                            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 sm:pl-5 text-[11px] sm:text-[11.5px] leading-[1.35] text-black">
                              {entry.bullets.map((bullet, bulletIndex) => (
                                <li key={bulletIndex} className="text-black">
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer status */}
      <div className="mt-3 pt-2 border-t border-[#D9CEBC]">
        {missing.length ? (
          <p className="text-xs font-semibold text-[#7B1F14] leading-snug">
            <span className="font-bold">Perlu dilengkapi:</span> {missing.join(", ")}.
          </p>
        ) : (
          <p className="text-xs font-semibold text-[#144C32]">
            Lembar CV terisi lengkap ({activeLang === "id" ? "Bahasa Indonesia" : "Full ATS English"}), siap diunduh gratis.
          </p>
        )}
      </div>
    </aside>
  );
};
