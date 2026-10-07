"use client";

import { buildResumeDocument, getMissingParts } from "@/lib/resume-document";
import { useCvStore } from "@/lib/store";

export const CvPreview = ({
  onOpenModal,
  isModal = false
}: {
  onOpenModal?: () => void;
  isModal?: boolean;
}) => {
  const resume = useCvStore((state) => state.resumeProfile);
  const document = buildResumeDocument(resume);
  const missing = getMissingParts(resume);

  return (
    <aside
      className={`doodle-card bg-[var(--paper-strong)] flex flex-col ${
        isModal
          ? "h-full border-0 shadow-none p-2 sm:p-4"
          : "h-full max-h-[calc(100dvh-5.25rem)] p-4 sm:p-5"
      }`}
    >
      {/* Header bar of preview */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-line/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-ink">Lembar CV kamu</h2>
            <span className="rounded-full border border-line/30 bg-[#e4f6df] px-2.5 py-0.5 text-[11px] font-bold text-[#155436]">
              Standar ATS
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#57443b]">Format 1 kolom linear (Summary, Experience, Education, Skills)</p>
        </div>

        {onOpenModal && !isModal ? (
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1.5 rounded-xl border border-line/40 bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-2xs hover:bg-[#fff0a8]/60 transition"
            title="Buka tampilan layar penuh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <span>Perbesar</span>
          </button>
        ) : null}
      </div>

      {/* CV Paper Workspace Frame (Scrollable vertically with sleek bar, zero horizontal scroll) */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border-2 border-line/20 bg-[#f4ece1]/80 p-2 sm:p-4">
        <div className="cv-paper mx-auto w-full max-w-[720px] min-h-[720px] rounded-lg border border-stone-300 bg-white p-6 sm:p-9 shadow-md text-ink break-words">
          {document.isEmpty ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#fff0a8] text-ink mb-3 border border-line/30">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p className="text-base font-bold text-ink">Lembar CV masih kosong</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#6b584d]">
                Isi data di <span className="font-bold text-ink">Langkah 1 (Data CV)</span>. Teks akan langsung muncul di lembar ini secara real-time.
              </p>
            </div>
          ) : (
            <>
              {/* Header: Name and Contact */}
              {document.name || document.contact ? (
                <header className="border-b-2 border-[#222222] pb-2.5">
                  {document.name ? (
                    <h1 className="text-2xl sm:text-[26px] font-bold leading-tight tracking-[0.01em] text-[#111111]">
                      {document.name}
                    </h1>
                  ) : null}
                  {document.contact ? (
                    <p className="mt-1 text-xs sm:text-[12px] text-[#444444] leading-relaxed">
                      {document.contact}
                    </p>
                  ) : null}
                </header>
              ) : null}

              {/* Sections */}
              {document.sections.map((section) => (
                <section key={section.heading} className="mt-4">
                  <h2 className="border-b border-[#888888] pb-1 text-xs sm:text-sm font-bold uppercase tracking-[0.06em] text-[#111111]">
                    {section.heading}
                  </h2>

                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#111111]">
                      {paragraph}
                    </p>
                  ))}

                  {section.entries.map((entry, index) => (
                    <div key={index} className="mt-2.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        {entry.title ? (
                          <h3 className="text-xs sm:text-[14px] font-bold text-[#111111]">{entry.title}</h3>
                        ) : null}
                        {entry.meta ? (
                          <p className="text-[11px] sm:text-[12px] text-[#555555]">{entry.meta}</p>
                        ) : null}
                      </div>
                      {entry.bullets.length ? (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 sm:pl-5 text-xs sm:text-sm leading-relaxed text-[#111111]">
                          {entry.bullets.map((bullet, bulletIndex) => (
                            <li key={bulletIndex}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                      {entry.note ? (
                        <p className="mt-1 text-xs text-[#444444]">{entry.note}</p>
                      ) : null}
                    </div>
                  ))}
                </section>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Footer status summary */}
      <div className="mt-3 pt-2 border-t border-line/10">
        {missing.length ? (
          <p className="text-[11px] font-semibold text-[#8a3319] leading-snug">
            <span className="font-bold">Perlu dilengkapi:</span> {missing.join(", ")}.
          </p>
        ) : (
          <p className="text-[11px] font-bold text-[#155436] flex items-center gap-1">
            <span>✓</span> Semua bagian dasar sudah terisi dan siap diekspor.
          </p>
        )}
      </div>
    </aside>
  );
};
