"use client";

import { useState } from "react";
import { Code, FileMagnifyingGlass, FirstAidKit, GraduationCap, MagnifyingGlass, ShieldCheck, UsersThree, Wrench } from "@phosphor-icons/react";
import { buildAnalysis } from "@/lib/analyzer";
import { useCvStore } from "@/lib/store";
import { Button, Field, SectionCard, Tag, TextArea, TextInput } from "@/components/ui";

const SAMPLE_JOBS = [
  {
    id: "it-rs",
    label: "Contoh: IT Rumah Sakit (ID)",
    icon: "hospital" as const,
    jobTitle: "Staf IT Rumah Sakit",
    companyName: "RS Harapan Medika",
    rawDescription: `Dibutuhkan segera Staf IT Rumah Sakit.
Persyaratan:
- Pria/Wanita, usia maksimal 27 tahun, belum menikah.
- Pendidikan minimal D3 / S1 Komputer atau Teknik Informatika (IPK min. 3.00).
- Menguasai Ms. Office (Excel, Word), jaringan LAN/WAN, troubleshooting hardware & printer, serta memahami dasar SQL dan SIMRS.
- Komunikatif, teliti, cekatan, dan mampu kerja tim maupun bersedia kerja shift.
- Domisili Semarang dan sekitarnya, memiliki SIM C.
Melampirkan berkas: Surat lamaran, CV terbaru, FC KTP, KK, SKCK aktif, NPWP, FC Ijazah, Transkrip Nilai, dan Pas Foto berwarna 4x6.`
  },
  {
    id: "fe-en",
    label: "Contoh: Junior Frontend (EN)",
    icon: "code" as const,
    jobTitle: "Junior Frontend Developer",
    companyName: "Nusa Tech Labs",
    rawDescription: `We are looking for a Junior Frontend Developer to join our product engineering team.
Requirements:
- Bachelor's degree in Computer Science or Informatics (Fresh Graduates with internship or strong portfolio projects are welcome).
- Hands-on experience with React.js, TypeScript, HTML, CSS, and Tailwind CSS.
- Familiar with RESTful API integration and Git version control.
- Good communication skills, strong teamwork, and attention to detail.`
  }
];

export const JobAnalyzer = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const job = useCvStore((state) => state.jobTarget);
  const updateJobTarget = useCvStore((state) => state.updateJobTarget);
  const setAnalytics = useCvStore((state) => state.setAnalytics);
  const setSuggestions = useCvStore((state) => state.setSuggestions);

  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [modeNote, setModeNote] = useState("");

  const runLocalAnalysis = (targetJob = job) => {
    if (!targetJob.rawDescription.trim()) {
      setStatus("error");
      setErrorMessage("Teks iklan lowongan masih kosong. Tempel dulu teks iklannya lalu tekan Cocokkan dengan CV saya.");
      return;
    }

    if (targetJob.rawDescription.trim().length < 10) {
      setStatus("error");
      setErrorMessage("Teks iklan lowongan terlalu pendek (minimal 10 karakter).");
      return;
    }

    const result = buildAnalysis(resume, targetJob);
    updateJobTarget(result.enrichedJob);
    setAnalytics(result.analytics);
    setSuggestions(result.suggestions);
    setModeNote("Analisis Lokal di Browser (100% Privat)");
    setStatus("success");
  };

  const handleAiAssist = async () => {
    if (!job.rawDescription.trim() || job.rawDescription.trim().length < 10) {
      setStatus("error");
      setErrorMessage("Tempel deskripsi lowongan minimal 10 karakter terlebih dahulu.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const anonymizedResume = {
        ...resume,
        contact: {
          fullName: "",
          headline: "",
          email: "",
          phone: "",
          location: "",
          linkedinUrl: "",
          portfolioUrl: ""
        }
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: anonymizedResume, job }),
        signal: AbortSignal.timeout(15000)
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal memproses analisis.");
      }

      const { enrichedJob, provider } = json.data;
      const localCheck = buildAnalysis(resume, enrichedJob);
      updateJobTarget(enrichedJob);
      setAnalytics(localCheck.analytics);
      setSuggestions(localCheck.suggestions);
      setModeNote(
        provider === "gemini"
          ? "Diperkaya Google Gemini AI (Tanpa PII)"
          : provider === "openrouter"
          ? "Diperkaya OpenRouter AI (Tanpa PII)"
          : "Engine Lokal Deterministik (100% Privat)"
      );
      setStatus("success");
    } catch {
      runLocalAnalysis();
    }
  };

  const normalized = job.normalized;
  const hardSkills = normalized?.explicit_hard_skills_and_tools ?? job.extractedKeywords.requiredHardSkills;
  const eduCriteria = normalized?.education_criteria ?? [];
  const softSkills = normalized?.soft_skills_and_work_traits ?? job.extractedKeywords.softSkills;
  const adminCount = normalized?.administrative_requirements.length ?? 0;

  return (
    <SectionCard
      title="Target Lowongan"
      description="Tempel deskripsi lowongan untuk melihat kecocokan skill. Syarat berkas (KTP, SKCK, usia) dipisahkan otomatis."
      accent="sky"
      icon={<FileMagnifyingGlass size={20} weight="duotone" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => runLocalAnalysis()}
            disabled={status === "loading" || !job.rawDescription.trim()}
            className="gap-1.5"
          >
            <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
            <span>Cek Kecocokan</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAiAssist}
            disabled={status === "loading" || !job.rawDescription.trim()}
            title="Opsional: analisis istilah tambahan tanpa mengirim nama atau kontak"
            className="gap-1.5"
          >
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            <span>{status === "loading" ? "Memproses..." : "Analisis Lanjutan"}</span>
          </Button>
        </div>
      }
    >
      <div className="min-w-0 grid gap-5">
        {/* Tombol cepat contoh lowongan */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#59483F]">Coba contoh:</span>
          {SAMPLE_JOBS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => {
                const nextJob = {
                  ...job,
                  jobTitle: sample.jobTitle,
                  companyName: sample.companyName,
                  rawDescription: sample.rawDescription
                };
                updateJobTarget(nextJob);
                runLocalAnalysis(nextJob);
              }}
              className="inline-flex items-center gap-1.5 min-h-[44px] max-w-full rounded-xl border border-[#D9CEBC] bg-[#FAF5E8] px-3 py-1.5 text-left text-xs font-semibold text-[#251813] hover:bg-[#FFF0A8] hover:border-[#251813]/40 transition-colors"
            >
              {sample.icon === "hospital" ? (
                <FirstAidKit size={15} weight="duotone" className="shrink-0 text-[#7B1F14]" aria-hidden="true" />
              ) : (
                <Code size={15} weight="duotone" className="shrink-0 text-[#124959]" aria-hidden="true" />
              )}
              <span>{sample.label}</span>
            </button>
          ))}
        </div>

        <div className="min-w-0 grid gap-4 sm:grid-cols-2 items-start">
          <Field label="Judul posisi">
            <TextInput
              value={job.jobTitle}
              onChange={(event) => updateJobTarget({ jobTitle: event.target.value })}
              placeholder="Contoh: Staf IT / Junior Frontend"
            />
          </Field>
          <Field label="Perusahaan (opsional)">
            <TextInput
              value={job.companyName}
              onChange={(event) => updateJobTarget({ companyName: event.target.value })}
              placeholder="Nama perusahaan atau instansi"
            />
          </Field>
        </div>

        <Field label="Deskripsi & kualifikasi lowongan">
          <TextArea
            rows={7}
            value={job.rawDescription}
            onChange={(event) => updateJobTarget({ rawDescription: event.target.value })}
            placeholder="Tempel kualifikasi, tanggung jawab, dan syarat lowongan di sini..."
          />
        </Field>

        <div role="status" aria-live="polite">
          {status === "loading" && (
            <p className="rounded-xl border border-[#94D1DF] bg-[#D6F3FA] p-3.5 text-sm font-bold text-[#124959]">
              Mencocokkan syarat lowongan dengan CV kamu...
            </p>
          )}
          {status === "error" && (
            <p className="rounded-xl border border-[#E9A590] bg-[#FFE3D8] p-3.5 text-sm font-bold text-[#7B1F14]">
              {errorMessage}
            </p>
          )}
          {status === "success" && (
            <div className="rounded-xl border border-[#9FD499] bg-[#DFF5DA] p-3.5 text-sm font-bold text-[#144C32] flex flex-wrap items-center justify-between gap-2">
              <span>Analisis selesai. Cek hasil di bawah atau lanjut ke Langkah 3.</span>
              {modeNote ? (
                <span className="rounded-lg border border-[#9FD499] bg-white px-2.5 py-1 text-xs font-bold text-[#144C32]">
                  {modeNote}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Ringkasan Ekstraksi Terklasifikasi */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-[#251813]">Kata Kunci Terdeteksi</h3>
            {adminCount > 0 ? (
              <span className="max-w-full rounded-lg border border-[#94D1DF] bg-[#D6F3FA] px-2.5 py-1 text-xs font-bold text-[#124959] break-words">
                {adminCount} syarat berkas dipisah
              </span>
            ) : null}
          </div>

          <div className="min-w-0 grid gap-3.5 sm:grid-cols-3">
            <div className="min-w-0 rounded-xl border border-[#94D1DF] bg-[#ECF9FC] p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#124959]">
                <Wrench size={14} weight="duotone" aria-hidden="true" />
                <span>Keahlian Teknis ({hardSkills.length})</span>
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5 min-w-0">
                {hardSkills.length ? (
                  hardSkills.map((item) => (
                    <Tag key={item} tone="neutral">
                      {item}
                    </Tag>
                  ))
                ) : (
                  <p className="text-xs text-[#4E3E36]">Belum ada keahlian eksplisit.</p>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-[#DFC25A] bg-[#FFF8DF] p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4A3A2E]">
                <GraduationCap size={14} weight="duotone" aria-hidden="true" />
                <span>Pendidikan ({eduCriteria.length})</span>
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5 min-w-0">
                {eduCriteria.length ? (
                  eduCriteria.map((item) => (
                    <Tag key={item.id} tone="neutral">
                      {item.label}
                    </Tag>
                  ))
                ) : job.extractedKeywords.domainKeywords.length ? (
                  job.extractedKeywords.domainKeywords.map((item) => (
                    <Tag key={item} tone="neutral">
                      {item}
                    </Tag>
                  ))
                ) : (
                  <p className="text-xs text-[#4E3E36]">Tidak tercantum syarat khusus.</p>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-[#9FD499] bg-[#EEF9EB] p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#144C32]">
                <UsersThree size={14} weight="duotone" aria-hidden="true" />
                <span>Karakter Kerja ({softSkills.length})</span>
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5 min-w-0">
                {softSkills.length ? (
                  softSkills.map((item) => (
                    <Tag key={item} tone="neutral">
                      {item}
                    </Tag>
                  ))
                ) : (
                  <p className="text-xs text-[#4E3E36]">Belum ada karakter kerja terdeteksi.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
