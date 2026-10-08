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
          <h2 className="text-base sm:text-lg font-bold text-ink">Lembar CV kamu</h2>
          <p className="mt-0.5 text-xs text-[#57443b]">Format A4 bersih, linear satu kolom, ramah mesin saringan ATS</p>
        </div>

        {onOpenModal && !isModal ? (
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1.5 rounded-xl border border-line/40 bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-2xs hover:bg-[#fff0a8]/60 transition-colors"
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

      {/* CV Paper Workspace Frame (Clean White ATS Sheet) */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border-2 border-line/20 bg-[#f4ece1]/80 p-2 sm:p-4">
        <div className="cv-paper mx-auto w-full max-w-[760px] min-h-[960px] rounded-sm border border-stone-300 bg-white p-7 sm:p-11 shadow-md text-black break-words font-sans">
          {document.isEmpty ? (
            <div className="grid place-items-center py-20 text-center">
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
                Isi data di <span className="font-bold text-ink">Langkah 1 (Data CV)</span> atau klik muat contoh CV. Dokumen akan langsung tersusun rapi secara real-time.
              </p>
            </div>
          ) : (
            <div className="text-[#000000]">
              {/* Centered ATS Header: Name, Headline, Contact (Sesuai Referensi) */}
              <header className="text-center mb-3">
                {document.name ? (
                  <h1 className="text-xl sm:text-[24px] font-bold tracking-tight text-black leading-tight">
                    {document.name}
                  </h1>
                ) : null}

                {document.headline ? (
                  <p className="mt-1 text-xs sm:text-[12.5px] font-bold text-black tracking-normal">
                    {document.headline}
                  </p>
                ) : null}

                {document.contact ? (
                  <p className="mt-1 text-[10.5px] sm:text-[11.5px] text-[#222222] leading-relaxed">
                    {document.contact}
                  </p>
                ) : null}
              </header>

              {/* Sections with full-width underline */}
              {document.sections.map((section) => (
                <section key={section.heading} className="mt-3.5">
                  {/* Uppercase Heading with crisp horizontal rule */}
                  <div className="border-b border-black pb-0.5 mb-1.5">
                    <h2 className="text-[11.5px] sm:text-[12.5px] font-bold uppercase tracking-wider text-black">
                      {section.heading}
                    </h2>
                  </div>

                  {/* Section Paragraphs (Summary, Categorized Skills, Certifications) */}
                  {section.paragraphs.map((paragraph, index) => {
                    const colonIndex = paragraph.indexOf(":");
                    // If paragraph has label like "Programming: Python, SQL"
                    if (colonIndex > 0 && colonIndex < 35) {
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
                      <p key={index} className="text-[11px] sm:text-[11.5px] leading-relaxed text-black my-1 text-justify sm:text-left">
                        {paragraph}
                      </p>
                    );
                  })}

                  {/* Entries (Work Experience, Education) */}
                  {section.entries.map((entry, index) => (
                    <div key={index} className="mt-2 mb-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        {entry.title ? (
                          <h3 className="text-[11.5px] sm:text-[12px] font-bold text-black leading-snug">
                            {entry.title}
                          </h3>
                        ) : null}
                        {entry.meta ? (
                          <span className="text-[11px] sm:text-[11.5px] font-normal text-black shrink-0 text-right">
                            {entry.meta}
                          </span>
                        ) : null}
                      </div>

                      {entry.bullets.length ? (
                        <ul className="mt-0.5 list-disc space-y-0.5 pl-4 sm:pl-5 text-[11px] sm:text-[11.5px] leading-[1.35] text-black">
                          {entry.bullets.map((bullet, bulletIndex) => (
                            <li key={bulletIndex} className="text-black">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {entry.note ? (
                        <p className="mt-0.5 text-[11px] text-[#333333]">{entry.note}</p>
                      ) : null}
                    </div>
                  ))}
                </section>
              ))}
            </div>
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
          <p className="text-[11px] font-semibold text-[#155436]">
            Lembar CV terisi lengkap, bebas tanda air dan siap diunduh gratis.
          </p>
        )}
      </div>
    </aside>
  );
};
