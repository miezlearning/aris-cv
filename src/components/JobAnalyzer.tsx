import { useState } from "react";
import { buildAnalysis } from "@/lib/analyzer";
import { useCvStore } from "@/lib/store";
import { Button, Field, SectionCard, Tag, TextArea, TextInput } from "@/components/ui";

const toneClass = {
  blue: "bg-[#e0f6fb]",
  yellow: "bg-[#fff0a8]",
  green: "bg-[#e4f6df]"
};

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

  const statusMessage = {
    idle: "",
    loading: "Sedang membaca kata kunci dari iklan ini.",
    error: "Isi iklan lowongan belum diisi. Tempel dulu teksnya, lalu coba lagi.",
    success: "Selesai. Skor kecocokan ada di bawah. Buka langkah 3 untuk memperbaiki kalimat pengalaman."
  }[status];

  const statusTone = {
    idle: "",
    loading: "bg-[#e0f6fb] text-[#251813]",
    error: "bg-[#ffe1d6] text-[#7b1f14]",
    success: "bg-[#e4f6df] text-[#155436]"
  }[status];

  return (
    <SectionCard
      title="Kata kunci dari lowongan"
      description="Tempel seluruh isi iklan lowongan. Sistem membaca kata kunci yang diminta dan membandingkannya dengan isi CV kamu. Semua diproses di perangkat ini dan tidak dikirim ke server."
      actions={
        <Button type="button" onClick={handleAnalyze} disabled={status === "loading"}>
          {status === "loading" ? "Sedang membaca..." : "Cocokkan dengan CV saya"}
        </Button>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Judul posisi">
            <TextInput value={job.jobTitle} onChange={(event) => updateJobTarget({ jobTitle: event.target.value })} placeholder="Contoh: Data Analyst" />
          </Field>
          <Field label="Nama perusahaan" hint="Opsional.">
            <TextInput value={job.companyName} onChange={(event) => updateJobTarget({ companyName: event.target.value })} placeholder="Nama perusahaan" />
          </Field>
        </div>
        <Field label="Isi iklan lowongan" hint="Salin dari judul sampai persyaratan terakhir. Makin lengkap, makin akurat hasilnya.">
          <TextArea
            rows={10}
            value={job.rawDescription}
            onChange={(event) => updateJobTarget({ rawDescription: event.target.value })}
            placeholder="Tempel kualifikasi, tanggung jawab, dan persyaratan lowongan di sini."
          />
        </Field>

        <div role="status" aria-live="polite">
          {statusMessage ? (
            <p className={`rounded-[18px_14px_20px_16px] border-2 border-line p-3 text-sm font-black ${statusTone}`}>{statusMessage}</p>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <KeywordGroup title="Keahlian teknis" items={job.extractedKeywords.requiredHardSkills} tone="blue" />
          <KeywordGroup title="Bidang dan tanggung jawab" items={job.extractedKeywords.domainKeywords} tone="yellow" />
          <KeywordGroup title="Sikap kerja" items={job.extractedKeywords.softSkills} tone="green" />
        </div>
      </div>
    </SectionCard>
  );
};

const KeywordGroup = ({ title, items, tone }: { title: string; items: string[]; tone: keyof typeof toneClass }) => (
  <div className={`rounded-[19px_14px_21px_16px] border-2 border-line p-3 shadow-[3px_4px_0_rgba(37,24,19,0.10)] ${toneClass[tone]}`}>
    <h3 className="text-sm font-black text-ink">{title}</h3>
    <div className="mt-3 flex flex-wrap gap-2">
      {items.length ? (
        items.map((item) => <Tag key={item} tone="neutral">{item}</Tag>)
      ) : (
        <p className="text-sm font-semibold text-[#57443b]">Belum ada kata kunci.</p>
      )}
    </div>
  </div>
);
