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
  const [errorMessage, setErrorMessage] = useState("");
  const [providerUsed, setProviderUsed] = useState<string>("");

  const handleAnalyze = async () => {
    if (!job.rawDescription.trim()) {
      setStatus("error");
      setErrorMessage("Teks iklan lowongan masih kosong. Tempel dulu teksnya, lalu tekan Cocokkan dengan CV saya.");
      return;
    }

    if (job.rawDescription.trim().length < 10) {
      setStatus("error");
      setErrorMessage("Teks iklan lowongan terlalu pendek (minimal 10 karakter). Tempel deskripsi kualifikasi yang lebih lengkap.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, job }),
        signal: AbortSignal.timeout(15000)
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const serverError = json?.error?.message || "Gagal memproses analisis lowongan di server.";
        throw new Error(serverError);
      }

      const { enrichedJob, analytics, suggestions, provider } = json.data;
      updateJobTarget(enrichedJob);
      setAnalytics(analytics);
      setSuggestions(suggestions);
      setProviderUsed(provider === "gemini" ? "Google Gemini AI" : provider === "openrouter" ? "OpenRouter AI" : "Engine Analitik Lokal");
      setStatus("success");
    } catch (err) {
      // Standar Resiliensi: Jika backend offline atau terkendala, otomatis fallback ke engine analitik lokal
      try {
        const localResult = buildAnalysis(resume, job);
        updateJobTarget(localResult.enrichedJob);
        setAnalytics(localResult.analytics);
        setSuggestions(localResult.suggestions);
        setProviderUsed("Engine Analitik Lokal (Mode Mandiri)");
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data.");
      }
    }
  };


  return (
    <SectionCard
      title="Kata kunci dari lowongan"
      description="Tempel seluruh isi iklan lowongan kerja. Sistem membaca kata kunci kualifikasi dan membandingkannya dengan isi CV kamu secara aman dengan perlindungan privasi data."
      actions={
        <Button type="button" onClick={handleAnalyze} disabled={status === "loading"}>
          {status === "loading" ? "Sedang menganalisis..." : "Cocokkan dengan CV saya"}
        </Button>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul posisi atau jabatan">
            <TextInput value={job.jobTitle} onChange={(event) => updateJobTarget({ jobTitle: event.target.value })} placeholder="Contoh: Frontend Developer, Data Analyst" />
          </Field>
          <Field label="Nama perusahaan" hint="Opsional, membantu konteks analisis.">
            <TextInput value={job.companyName} onChange={(event) => updateJobTarget({ companyName: event.target.value })} placeholder="Nama perusahaan atau agensi" />
          </Field>
        </div>

        <Field label="Isi lengkap iklan lowongan" hint="Salin seluruh teks lowongan: tanggung jawab, persyaratan wajib, kualifikasi, dan alat yang digunakan.">
          <TextArea
            rows={8}
            value={job.rawDescription}
            onChange={(event) => updateJobTarget({ rawDescription: event.target.value })}
            placeholder="Tempel seluruh isi iklan lowongan dari LinkedIn, Jobstreet, Glints, atau portal kerja lainnya..."
          />
        </Field>

        <div role="status" aria-live="polite">
          {status === "loading" && (
            <p className="rounded-xl border-2 p-4 text-sm font-bold bg-[#e0f6fb] text-[#1a4a58] border-[#7bc7d8]">
              Sedang membaca dan menganalisis kata kunci dari iklan lowongan ini...
            </p>
          )}
          {status === "error" && (
            <p className="rounded-xl border-2 p-4 text-sm font-bold bg-[#ffe1d6] text-[#7b1f14] border-[#e86f4d]">
              {errorMessage || "Terjadi kesalahan saat memproses data lowongan."}
            </p>
          )}
          {status === "success" && (
            <div className="rounded-xl border-2 p-4 text-sm font-bold bg-[#e4f6df] text-[#155436] border-[#1f6b57] flex flex-wrap items-center justify-between gap-2">
              <span>Analisis selesai. Skor kecocokan telah diperbarui. Buka Langkah 3 untuk memperbaiki butir pengalaman.</span>
              {providerUsed && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-[#1f6b57]/40 text-[#155436]">
                  {providerUsed}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Extracted Keyword Groups */}
        <div>
          <h3 className="text-sm font-bold text-ink mb-3">Kata kunci yang diekstraksi dari iklan:</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <KeywordGroup title="Keahlian teknis (Hard Skills)" items={job.extractedKeywords.requiredHardSkills} tone="blue" />
            <KeywordGroup title="Bidang & tanggung jawab" items={job.extractedKeywords.domainKeywords} tone="yellow" />
            <KeywordGroup title="Sikap kerja (Soft Skills)" items={job.extractedKeywords.softSkills} tone="green" />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

const KeywordGroup = ({ title, items, tone }: { title: string; items: string[]; tone: keyof typeof toneClass }) => (
  <div className={`rounded-2xl border-2 border-line p-4 sm:p-5 shadow-[2px_3px_0_rgba(37,24,19,0.08)] ${toneClass[tone]}`}>
    <h4 className="text-sm font-bold text-ink">{title}</h4>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.length ? (
        items.map((item) => <Tag key={item} tone="neutral">{item}</Tag>)
      ) : (
        <p className="text-xs text-[#57443b]">Belum ada kata kunci.</p>
      )}
    </div>
  </div>
);
