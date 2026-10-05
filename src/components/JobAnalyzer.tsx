import { useState } from "react";
import { buildAnalysis } from "@/lib/analyzer";
import { useCvStore } from "@/lib/store";
import { Button, Field, SectionCard, Tag, TextArea, TextInput } from "@/components/ui";

export const JobAnalyzer = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const job = useCvStore((state) => state.jobTarget);
  const updateJobTarget = useCvStore((state) => state.updateJobTarget);
  const setAnalytics = useCvStore((state) => state.setAnalytics);
  const setSuggestions = useCvStore((state) => state.setSuggestions);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  const handleAnalyze = () => {
    if (!job.rawDescription.trim()) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    window.setTimeout(() => {
      const result = buildAnalysis(resume, job);
      updateJobTarget(result.enrichedJob);
      setAnalytics(result.analytics);
      setSuggestions(result.suggestions);
      setStatus("success");
    }, 200);
  };

  return (
    <SectionCard
      title="JD extractor dan keyword gap"
      description="Tempel lowongan target. Analyzer lokal menandai hard skills, domain, dan soft skills tanpa mengirim data ke server."
      actions={<Button type="button" onClick={handleAnalyze}>Analisis lowongan</Button>}
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Judul posisi">
            <TextInput value={job.jobTitle} onChange={(event) => updateJobTarget({ jobTitle: event.target.value })} placeholder="Posisi target" />
          </Field>
          <Field label="Perusahaan target">
            <TextInput value={job.companyName} onChange={(event) => updateJobTarget({ companyName: event.target.value })} placeholder="Opsional" />
          </Field>
        </div>
        <Field label="Deskripsi pekerjaan">
          <TextArea rows={10} value={job.rawDescription} onChange={(event) => updateJobTarget({ rawDescription: event.target.value })} placeholder="Tempel kualifikasi, tanggung jawab, dan persyaratan lowongan di sini." />
        </Field>

        {status === "loading" ? <p className="rounded-[18px_14px_20px_16px] border-2 border-line bg-[#e0f6fb] p-3 text-sm font-black text-[#251813]">Menganalisis kata kunci lowongan...</p> : null}
        {status === "error" ? <p className="rounded-[18px_14px_20px_16px] border-2 border-line bg-[#ffe1d6] p-3 text-sm font-black text-[#7b1f14]">Deskripsi pekerjaan perlu diisi sebelum analisis.</p> : null}
        {status === "success" ? <p className="rounded-[18px_14px_20px_16px] border-2 border-line bg-[#e4f6df] p-3 text-sm font-black text-[#155436]">Analisis selesai. Skor dan saran sudah diperbarui.</p> : null}

        <div className="grid gap-3 lg:grid-cols-3">
          <KeywordGroup title="Hard skills" items={job.extractedKeywords.requiredHardSkills} tone="blue" />
          <KeywordGroup title="Domain" items={job.extractedKeywords.domainKeywords} tone="yellow" />
          <KeywordGroup title="Soft skills" items={job.extractedKeywords.softSkills} tone="green" />
        </div>
      </div>
    </SectionCard>
  );
};

const toneClass = {
  blue: "bg-[#e0f6fb]",
  yellow: "bg-[#fff0a8]",
  green: "bg-[#e4f6df]"
};

const KeywordGroup = ({ title, items, tone }: { title: string; items: string[]; tone: keyof typeof toneClass }) => (
  <div className={`rounded-[19px_14px_21px_16px] border-2 border-line p-3 shadow-[3px_4px_0_rgba(37,24,19,0.10)] ${toneClass[tone]}`}>
    <h3 className="text-sm font-black text-ink">{title}</h3>
    <div className="mt-3 flex flex-wrap gap-2">
      {items.length ? items.map((item) => <Tag key={item} tone="neutral">{item}</Tag>) : <p className="text-sm font-semibold text-[#57443b]">Belum ada kata kunci.</p>}
    </div>
  </div>
);
