import { buildResumeDocument, getMissingParts } from "@/lib/resume-document";
import { useCvStore } from "@/lib/store";

export const CvPreview = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const document = buildResumeDocument(resume);
  const missing = getMissingParts(resume);

  return (
    <aside className="preview-shell max-h-none overflow-visible rounded-[34px_24px_36px_22px] border-2 border-line bg-[#fff0a8] p-4 shadow-panel lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-auto lg:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 text-sm font-black text-ink">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#57443b]">Pratinjau langsung</p>
          <span className="text-lg">Lembar CV kamu</span>
          <p className="mt-1 max-w-md text-xs font-semibold leading-5 text-[#57443b]">
            Lembar ini persis isi berkas yang akan diunduh, termasuk urutan bagian dan judulnya. Judul bagian memakai istilah Inggris (Summary, Experience, Education, Skills) karena itu yang dikenali sistem pembaca lowongan.
          </p>
        </div>
        <span className="rounded-[999px_12px_999px_14px] border-2 border-line bg-white px-3 py-1 text-xs shadow-[2px_3px_0_rgba(37,24,19,0.12)]">Satu kolom</span>
      </div>

      <div className="rounded-[24px_18px_28px_20px] border-2 border-line bg-[#251813] p-3 shadow-[4px_5px_0_rgba(37,24,19,0.12)] sm:p-4">
        {/* Padding 9% meniru margin 0,75 inci pada berkas PDF, jadi lebar teks di
            pratinjau sama dengan lebar teks di dokumen jadi. */}
        <div className="cv-paper mx-auto min-h-[1050px] w-full max-w-[760px] rounded-[12px] border border-[#d7d7d7] p-[9%] shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
          {document.isEmpty ? (
            <p className="text-sm leading-6 text-[#4b5563]">
              Lembar CV masih kosong. Isi data di langkah 1, lalu isinya akan muncul di sini dan ikut terunduh.
            </p>
          ) : (
            <>
              {/* Garis pemisah dan tanggal rata kanan di bawah ini sama persis dengan
                  yang digambar PDF dan DOCX, supaya pratinjau tidak pernah menipu. */}
              {document.name || document.contact ? (
                <header className="border-b-2 border-[#333333] pb-2">
                  {document.name ? (
                    <h2 className="text-[26px] font-bold leading-tight tracking-[0.01em] text-[#111111]">{document.name}</h2>
                  ) : null}
                  {document.contact ? <p className="mt-0.5 text-[12px] text-[#444444]">{document.contact}</p> : null}
                </header>
              ) : null}

              {document.sections.map((section) => (
                <section key={section.heading} className="mt-4">
                  <h3 className="border-b border-[#9AA0A6] pb-1 text-sm font-bold uppercase tracking-[0.06em] text-[#111111]">
                    {section.heading}
                  </h3>

                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="mt-1.5 text-sm leading-6 text-[#111111]">
                      {paragraph}
                    </p>
                  ))}

                  {section.entries.map((entry, index) => (
                    <div key={index} className="mt-2.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        {entry.title ? <h4 className="text-[15px] font-bold text-[#111111]">{entry.title}</h4> : null}
                        {entry.meta ? <p className="text-[12px] text-[#444444]">{entry.meta}</p> : null}
                      </div>
                      {entry.bullets.length ? (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm leading-6 text-[#111111]">
                          {entry.bullets.map((bullet, bulletIndex) => (
                            <li key={bulletIndex}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                      {entry.note ? <p className="mt-1 text-sm text-[#111111]">{entry.note}</p> : null}
                    </div>
                  ))}
                </section>
              ))}
            </>
          )}
        </div>
      </div>

      {missing.length ? (
        <p className="mt-3 rounded-[18px_14px_20px_16px] border-2 border-dashed border-line bg-white p-3 text-xs font-semibold leading-5 text-[#4d3b33]">
          Belum diisi: {missing.join(", ")}. Bagian yang kosong tidak muncul di lembar ini dan tidak ikut terunduh.
        </p>
      ) : (
        <p className="mt-3 rounded-[18px_14px_20px_16px] border-2 border-dashed border-line bg-[#e4f6df] p-3 text-xs font-bold leading-5 text-[#155436]">
          Semua bagian dasar sudah terisi.
        </p>
      )}
    </aside>
  );
};
