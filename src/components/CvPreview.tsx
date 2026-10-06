import { compact } from "@/lib/text";
import { useCvStore } from "@/lib/store";

export const CvPreview = ({ watermarked = true }: { watermarked?: boolean }) => {
  const resume = useCvStore((state) => state.resumeProfile);

  return (
    <aside className="preview-shell max-h-none overflow-visible rounded-[34px_24px_36px_22px] border-2 border-line bg-[#fff0a8] p-4 shadow-panel lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-auto lg:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 text-sm font-black text-ink">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#57443b]">Pratinjau langsung</p>
          <span className="text-lg">Lembar CV kamu</span>
          <p className="mt-1 max-w-md text-xs font-semibold leading-5 text-[#57443b]">
            Lembar ini ikut berubah setiap kali kamu mengetik. Judul bagian sengaja memakai istilah Inggris (Summary, Experience, Education, Skills) karena itu yang dicari sistem pembaca lowongan.
          </p>
        </div>
        <span className="rounded-[999px_12px_999px_14px] border-2 border-line bg-white px-3 py-1 text-xs shadow-[2px_3px_0_rgba(37,24,19,0.12)]">Satu kolom</span>
      </div>
      <div className="rounded-[24px_18px_28px_20px] border-2 border-line bg-[#251813] p-3 shadow-[4px_5px_0_rgba(37,24,19,0.12)] sm:p-4">
        <div className={`cv-paper mx-auto min-h-[980px] w-full max-w-[760px] rounded-[12px] border border-[#d7d7d7] p-7 shadow-[0_12px_32px_rgba(0,0,0,0.16)] sm:p-9 ${watermarked ? "preview-watermark" : ""}`}>
          <header className="border-b border-[#d6d6d6] pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-[#101513]">{resume.contact.fullName || "Nama lengkap"}</h2>
            <p className="mt-2 text-sm text-[#26302d]">
              {compact([
                resume.contact.email || "email@example.com",
                resume.contact.phone || "Nomor telepon",
                resume.contact.location || "Domisili",
                resume.contact.linkedinUrl,
                resume.contact.portfolioUrl
              ]).join(" | ")}
            </p>
          </header>

          <PreviewSection title="Summary">
            <p>{resume.summary || "Ringkasan profesional akan tampil di sini."}</p>
          </PreviewSection>

          <PreviewSection title="Experience">
            <div className="grid gap-5">
              {resume.workExperience.map((experience) => (
                <div key={experience.id}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <h4 className="font-bold">{compact([experience.role || "Peran", experience.company || "Perusahaan"]).join(", ")}</h4>
                    <p className="text-sm text-[#4b5563]">{compact([experience.startDate || "MM/YYYY", experience.endDate || "Present"]).join(" - ")}</p>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {experience.bulletPoints.filter(Boolean).length ? (
                      experience.bulletPoints.filter(Boolean).map((bullet, index) => <li key={index}>{bullet}</li>)
                    ) : (
                      <li>Poin pengalaman akan tampil di sini.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </PreviewSection>

          <PreviewSection title="Education">
            <div className="grid gap-3">
              {resume.education.map((education) => (
                <div key={education.id}>
                  <h4 className="font-bold">{compact([education.degree || "Jenjang", education.fieldOfStudy || "Bidang studi"]).join(", ")}</h4>
                  <p className="text-sm text-[#4b5563]">{compact([education.institution || "Institusi", education.graduationDate || "Tahun lulus"]).join(", ")}</p>
                  {education.gpa ? <p className="text-sm">GPA/IPK: {education.gpa}</p> : null}
                </div>
              ))}
            </div>
          </PreviewSection>

          <PreviewSection title="Skills">
            <div className="grid gap-1">
              {resume.skills.hardSkills.length ? <p><strong>Hard Skills:</strong> {resume.skills.hardSkills.join(", ")}</p> : null}
              {resume.skills.tools.length ? <p><strong>Tools:</strong> {resume.skills.tools.join(", ")}</p> : null}
              {resume.skills.softSkills.length ? <p><strong>Soft Skills:</strong> {resume.skills.softSkills.join(", ")}</p> : null}
              {!resume.skills.hardSkills.length && !resume.skills.tools.length && !resume.skills.softSkills.length ? <p>Daftar keahlian akan tampil di sini.</p> : null}
            </div>
          </PreviewSection>
        </div>
      </div>
    </aside>
  );
};

const PreviewSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-[#101513]">{title}</h3>
    <div className="text-sm leading-6 text-[#101513]">{children}</div>
  </section>
);
