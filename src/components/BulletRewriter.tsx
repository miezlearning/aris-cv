"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsClockwise,
  CaretDown,
  CheckCircle,
  Lightbulb,
  PencilLine,
  Sparkle,
  XCircle
} from "@phosphor-icons/react";
import { LocalAiControlPanel } from "@/components/LocalAiControlPanel";
import { Button, EmptyState, SectionCard, Tag, TextArea } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { FRESH_GRAD_XYZ_EXAMPLES } from "@/lib/analyzer";
import { resolveActiveAiConfig } from "@/lib/local-ai/engine";
import { rewriteBulletWithLocalAi, tailorSummaryWithLocalAi } from "@/lib/local-ai/tasks";
import { resolveCvLanguage } from "@/lib/resume-document";
import { useCvStore } from "@/lib/store";

const statusLabels = {
  pending: "Menunggu keputusan",
  accepted: "Diterapkan ke CV",
  edited: "Diterapkan dengan editanmu",
  rejected: "Dilewati"
} as const;

const sourceTypeLabels = {
  work: "Pengalaman Kerja",
  project: "Proyek / Skripsi",
  organization: "Organisasi"
} as const;

export const BulletRewriter = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const suggestions = useCvStore((state) => state.suggestions);
  const analytics = useCvStore((state) => state.matchAnalytics);
  const applySuggestion = useCvStore((state) => state.applySuggestion);
  const rejectSuggestion = useCvStore((state) => state.rejectSuggestion);
  const updateSuggestion = useCvStore((state) => state.updateSuggestion);
  const updateSummary = useCvStore((state) => state.updateSummary);
  const job = useCvStore((state) => state.jobTarget);
  const cvLanguage = useCvStore((state) => state.cvLanguage);

  const aiEnabled = useCvStore((state) => state.aiEnabled);
  const localAiMode = useCvStore((state) => state.localAiMode);
  const localAiStatus = useCvStore((state) => state.localAiStatus);
  const webLlmModelId = useCvStore((state) => state.webLlmModelId);
  const localServerUrl = useCvStore((state) => state.localServerUrl);
  const localServerModel = useCvStore((state) => state.localServerModel);
  const restApiFormat = useCvStore((state) => state.restApiFormat);
  const restApiUrl = useCvStore((state) => state.restApiUrl);
  const restApiModel = useCvStore((state) => state.restApiModel);
  const restApiKey = useCvStore((state) => state.restApiKey);

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiMessage, setAiMessage] = useState<Record<string, string>>({});
  const [examplesOpen, setExamplesOpen] = useState(false);

  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState("");
  const [batchProgress, setBatchProgress] = useState("");

  const activeLocalConfig = resolveActiveAiConfig({
    aiEnabled,
    localAiStatus,
    localAiMode,
    webLlmModelId,
    localServerUrl,
    localServerModel,
    restApiFormat,
    restApiUrl,
    restApiModel,
    restApiKey
  });

  const targetLang = resolveCvLanguage(
    cvLanguage,
    analytics.hasAnalyzed ? analytics.detectedLanguage : undefined,
    resume
  );

  const handleAiRewrite = async (suggestionId: string, originalText: string, sourceLabel: string) => {
    setAiLoading((prev) => ({ ...prev, [suggestionId]: true }));
    setAiMessage((prev) => ({ ...prev, [suggestionId]: "" }));

    const keywords = job.extractedKeywords.requiredHardSkills.slice(0, 5);

    try {
      if (activeLocalConfig) {
        const localResult = await rewriteBulletWithLocalAi(activeLocalConfig, {
          bullet: originalText,
          role: sourceLabel,
          jobTitle: job.jobTitle,
          jobDescription: job.rawDescription,
          targetKeywords: keywords,
          targetLang
        });

        setEdits((prev) => ({ ...prev, [suggestionId]: localResult.suggestion }));
        updateSuggestion(suggestionId, {
          suggestion: localResult.suggestion,
          note: localResult.note
        });
        setAiMessage((prev) => ({
          ...prev,
          [suggestionId]: `Disusun ulang oleh AI lokal (${activeLocalConfig.modelId}) selaras lowongan Langkah 2.`
        }));
        return;
      }

      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet: originalText,
          role: sourceLabel,
          jobTitle: job.jobTitle,
          targetKeywords: keywords
        }),
        signal: AbortSignal.timeout(15000)
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal memproses perbaikan kalimat.");
      }

      const { suggestion: aiText, note: aiNote, provider } = json.data;
      setEdits((prev) => ({ ...prev, [suggestionId]: aiText }));
      updateSuggestion(suggestionId, {
        suggestion: aiText,
        note: aiNote || "Disusun ulang dengan pola Google XYZ."
      });
      setAiMessage((prev) => ({
        ...prev,
        [suggestionId]:
          provider === "deterministic"
            ? "Disusun ulang dengan mesin aturan lokal (mode standar). Aktifkan model WebLLM atau Ollama di atas untuk penyesuaian kontekstual AI."
            : "Berhasil direkonstruksi oleh AI tanpa menambah fakta fiktif."
      }));
    } catch (err) {
      setAiMessage((prev) => ({
        ...prev,
        [suggestionId]: err instanceof Error ? err.message : "Kendala saat memproses perbaikan."
      }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [suggestionId]: false }));
    }
  };

  const handleTailorSummary = async () => {
    if (!resume.summary.trim()) return;
    if (!activeLocalConfig) {
      setSummaryStatus("Aktifkan terlebih dahulu model AI lokal di panel atas (WebLLM atau Ollama) untuk menyesuaikan ringkasan otomatis.");
      return;
    }

    setSummaryBusy(true);
    setSummaryStatus("");
    try {
      const tailored = await tailorSummaryWithLocalAi(activeLocalConfig, {
        summary: resume.summary,
        headline: resume.contact.headline ?? "",
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        matchedKeywords: [...(analytics.matchedKeywords ?? []), ...(analytics.semanticKeywords ?? [])],
        targetLang
      });
      setSummaryDraft(tailored);
      setSummaryStatus(`Ringkasan berhasil diselaraskan dengan ${activeLocalConfig.modelId}. Periksa lalu terapkan jika cocok.`);
    } catch (err) {
      setSummaryStatus(err instanceof Error ? err.message : "Gagal menyesuaikan ringkasan profil.");
    } finally {
      setSummaryBusy(false);
    }
  };

  const handleBatchAiRewrite = async () => {
    if (!activeLocalConfig) return;
    const pendingList = suggestions.filter((s) => s.status === "pending");
    for (let i = 0; i < pendingList.length; i += 1) {
      const item = pendingList[i];
      setBatchProgress(`Menyesuaikan poin ${i + 1} dari ${pendingList.length}...`);
      await handleAiRewrite(item.id, item.original, item.sourceLabel);
    }
    setBatchProgress("");
  };

  const totalBullets =
    (resume.workExperience ?? []).reduce((sum, item) => sum + item.bulletPoints.filter((b) => b.trim()).length, 0) +
    (resume.projects ?? []).reduce((sum, item) => sum + item.bulletPoints.filter((b) => b.trim()).length, 0) +
    (resume.organizations ?? []).reduce((sum, item) => sum + item.bulletPoints.filter((b) => b.trim()).length, 0);

  const untouched = Math.max(0, totalBullets - suggestions.length);

  return (
    <SectionCard
      title="Optimasi Kalimat Pengalaman, Proyek, & Organisasi"
      description="Setiap saran hanya menyusun ulang kata-katamu sendiri memakai pola Google XYZ / STAR (Tindakan + Konteks/Alat + Ukuran Hasil). Sistem tidak pernah mengarang angka atau keahlian baru."
      accent="sage"
      icon={<PencilLine size={20} weight="duotone" />}
    >
      {/* Slim Toggle Asisten AI & Ringkasan */}
      <div className="mb-4 grid gap-2.5">
        <LocalAiControlPanel contextLabel="Optimasi Kalimat" />

        {analytics.hasAnalyzed && resume.summary.trim() ? (
          <div className="rounded-xl border border-[#D9CEBC] bg-white px-3.5 py-2.5 grid gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#251813]">
                  Selaraskan Ringkasan Profil dengan{" "}
                  <span className="text-[#144C32]">{job.jobTitle || "Lowongan Langkah 2"}</span>
                </p>
                <p className="text-xs text-[#59483F]">
                  Menonjolkan keahlian aslimu tanpa mengarang pengalaman baru.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={summaryBusy}
                onClick={handleTailorSummary}
                className="min-h-[38px] text-xs gap-1.5"
              >
                <Sparkle size={14} weight="duotone" aria-hidden="true" />
                <span>{summaryBusy ? "Menyusun..." : "Sesuaikan Ringkasan"}</span>
              </Button>
            </div>

            {summaryStatus ? (
              <p className="rounded-lg border border-[#94D1DF] bg-[#ECF9FC] px-3 py-1.5 text-xs font-semibold text-[#124959]">
                {summaryStatus}
              </p>
            ) : null}

            {summaryDraft ? (
              <div className="grid gap-2 pt-0.5">
                <TextArea
                  rows={3}
                  value={summaryDraft}
                  onChange={(event) => setSummaryDraft(event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      updateSummary(summaryDraft);
                      setSummaryDraft("");
                      setSummaryStatus("Ringkasan profil berhasil diperbarui di CV kamu.");
                    }}
                    className="min-h-[38px] text-xs gap-1.5"
                  >
                    <CheckCircle size={14} weight="duotone" aria-hidden="true" />
                    <span>Terapkan ke Ringkasan CV</span>
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setSummaryDraft("")}>
                    Batal
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Panduan Google XYZ / STAR Ringkas */}
        <div className="rounded-xl border border-[#D9CEBC] bg-[#FAF5E8] px-3.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} weight="duotone" className="text-[#4A3A2E] shrink-0" aria-hidden="true" />
              <p className="text-xs sm:text-[13px] font-semibold text-[#251813]">
                Pola Google XYZ: Kata kerja aktif + ruang lingkup + alat + hasil terukur nyata
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExamplesOpen((prev) => !prev)}
              aria-expanded={examplesOpen}
              className="inline-flex items-center gap-1 min-h-[34px] rounded-lg border border-[#D9CEBC] bg-white px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF8DF]"
            >
              <span>{examplesOpen ? "Tutup Contoh" : "Lihat Contoh"}</span>
              <CaretDown
                size={13}
                weight="bold"
                className={`transition-transform duration-200 ${examplesOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {examplesOpen ? (
              <motion.div
                key="rewriter-examples"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 grid gap-2.5 border-t border-[#D9CEBC] pt-2.5 sm:grid-cols-2">
                  {FRESH_GRAD_XYZ_EXAMPLES.map((ex) => (
                    <div key={ex.category} className="rounded-lg border border-[#D9CEBC] bg-white p-2.5 text-xs grid gap-1">
                      <p className="font-bold text-[#144C32]">{ex.category}</p>
                      <p className="text-[#7B1F14]">
                        <span className="font-bold">Sebelum:</span> {ex.weak}
                      </p>
                      <p className="text-[#251813] leading-relaxed">
                        <span className="font-bold text-[#144C32]">Sesudah:</span> {ex.strong}
                      </p>
                      <p className="text-[#59483F]">{ex.formulaNote}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {suggestions.length ? (
        <div className="grid gap-4">
          {activeLocalConfig && suggestions.some((s) => s.status === "pending") ? (
            <div className="rounded-xl border border-[#DFC25A] bg-[#FFF8DF] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-[#4A3A2E]">
                {batchProgress || `AI Lokal siap (${activeLocalConfig.modelId}). Kamu bisa menyusun ulang semua poin yang tertunda sekaligus.`}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(batchProgress)}
                onClick={handleBatchAiRewrite}
                className="gap-1.5 min-h-[40px] text-xs"
              >
                <Sparkle size={14} weight="duotone" aria-hidden="true" />
                <span>{batchProgress ? "Memproses..." : "Optimasi Semua Poin dengan AI Lokal"}</span>
              </Button>
            </div>
          ) : null}

          {untouched > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#9FD499] bg-[#DFF5DA] px-4 py-3 text-xs sm:text-sm font-semibold text-[#144C32]">
              <CheckCircle size={17} weight="duotone" className="shrink-0" aria-hidden="true" />
              <span>
                {untouched} poin lainnya di CV kamu sudah dibuka dengan kata kerja aktif dan memiliki ukuran hasil.
              </span>
            </div>
          ) : null}

          {suggestions.map((suggestion, index) => {
            const draft = edits[suggestion.id] ?? suggestion.suggestion;
            const decided = suggestion.status !== "pending";
            const changed = draft.trim() !== suggestion.suggestion.trim();

            return (
              <Reveal key={suggestion.id} delay={Math.min(index, 4) * 40}>
                <article
                  className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                    decided
                      ? "border-[#D9CEBC] bg-white/80"
                      : "border-[#C2B49E] bg-white shadow-2xs"
                  }`}
                >
                  <div className="grid gap-4">
                    {/* Header & Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9CEBC] pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                          Saran #{index + 1}
                        </span>
                        <span className="rounded-md border border-[#D9CEBC] bg-[#FAF5E8] px-2 py-0.5 text-xs font-semibold text-[#251813]">
                          {sourceTypeLabels[suggestion.sourceType ?? "work"]}: {suggestion.sourceLabel}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          suggestion.status === "pending"
                            ? "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]"
                            : suggestion.status === "rejected"
                            ? "bg-[#F3E7C8] text-[#4E3E36] border-[#D9CEBC]"
                            : "bg-[#DFF5DA] text-[#144C32] border-[#9FD499]"
                        }`}
                      >
                        {statusLabels[suggestion.status]}
                      </span>
                    </div>

                    {/* Original vs Suggested */}
                    <div className="grid gap-4 md:grid-cols-2 items-start">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#59483F] mb-1.5">
                          Kalimat aslimu
                        </p>
                        <div className="rounded-xl border border-[#D9CEBC] bg-[#FAF5E8] p-3.5 text-sm leading-relaxed text-[#251813]">
                          {suggestion.original}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#144C32] mb-1.5 flex items-center justify-between">
                          <span>Kalimat perbaikan</span>
                          <span className="text-[11px] font-normal text-[#59483F]">Bisa langsung kamu sunting</span>
                        </p>
                        <TextArea
                          rows={3}
                          value={draft}
                          disabled={decided}
                          onChange={(event) =>
                            setEdits((current) => ({ ...current, [suggestion.id]: event.target.value }))
                          }
                          placeholder="Sunting kalimat saran di sini..."
                        />
                      </div>
                    </div>

                    {suggestion.note ? (
                      <p className="rounded-xl border border-dashed border-[#C2B49E] bg-[#FFFDF8] p-3 text-xs sm:text-[13px] leading-relaxed text-[#4E3E36]">
                        <span className="font-bold text-[#251813]">Panduan jujur: </span>
                        {suggestion.note}
                      </p>
                    ) : null}

                    {/* Keywords tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#59483F] mr-1">Kata kunci terbaca:</span>
                      {suggestion.keywordsUsed.length ? (
                        suggestion.keywordsUsed.map((keyword) => (
                          <Tag key={keyword} tone="match">
                            {keyword}
                          </Tag>
                        ))
                      ) : (
                        <Tag tone="neutral">Perbaikan struktur kalimat</Tag>
                      )}
                    </div>

                    {aiMessage[suggestion.id] ? (
                      <p className="rounded-xl bg-[#D6F3FA] border border-[#94D1DF] px-3 py-2 text-xs font-semibold text-[#124959]">
                        {aiMessage[suggestion.id]}
                      </p>
                    ) : null}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D9CEBC]">
                      {decided ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => updateSuggestion(suggestion.id, { status: "pending" })}
                          className="gap-1.5"
                        >
                          <ArrowsClockwise size={15} weight="duotone" aria-hidden="true" />
                          <span>Ubah Keputusan</span>
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            onClick={() => applySuggestion(suggestion.id, changed ? draft : undefined)}
                            className="gap-1.5"
                          >
                            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
                            <span>Pakai Kalimat Ini ke CV</span>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={Boolean(aiLoading[suggestion.id])}
                            onClick={() =>
                              handleAiRewrite(suggestion.id, suggestion.original, suggestion.sourceLabel)
                            }
                            className="gap-1.5"
                          >
                            <ArrowsClockwise size={15} weight="duotone" aria-hidden="true" />
                            <span>{aiLoading[suggestion.id] ? "Menyusun..." : "Susun Ulang Alternatif"}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => rejectSuggestion(suggestion.id)}
                            className="gap-1.5"
                          >
                            <XCircle size={15} weight="duotone" aria-hidden="true" />
                            <span>Lewati</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      ) : !analytics.hasAnalyzed ? (
        <EmptyState
          title="Belum ada analisis lowongan"
          description="Jalankan pencocokan lowongan di Langkah 2 terlebih dahulu. Setelah itu, semua poin dari Pengalaman, Proyek Kuliah/Skripsi, maupun Organisasi yang bisa diperkuat akan tampil di sini."
          icon={<PencilLine size={20} weight="duotone" />}
          action={
            <Link
              className="btn doodle-btn bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538] px-4 py-2 text-sm font-bold"
              href="/lowongan"
            >
              Buka Langkah 2: Lowongan
            </Link>
          }
        />
      ) : totalBullets === 0 ? (
        <EmptyState
          title="Belum ada poin pengalaman atau proyek yang tertulis"
          description="Isi minimal satu poin di bagian Proyek / Skripsi, Pengalaman Magang/Kerja, atau Organisasi pada Langkah 1 agar bisa dioptimalkan dengan pola Google XYZ."
          icon={<PencilLine size={20} weight="duotone" />}
          action={
            <Link
              className="btn doodle-btn bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538] px-4 py-2 text-sm font-bold"
              href="/master-cv"
            >
              Lengkapi di Langkah 1: Data CV
            </Link>
          }
        />
      ) : (
        <EmptyState
          title="Semua poin kalimatmu sudah kuat"
          description={`Seluruh ${totalBullets} poin pada CV kamu sudah dibuka dengan kata kerja aktif dan dilengkapi ukuran hasil. Kamu bisa langsung memeriksa pratinjau dan mengunduh CV di Langkah 4.`}
          icon={<CheckCircle size={20} weight="duotone" />}
          action={
            <Link
              className="btn doodle-btn bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538] px-4 py-2 text-sm font-bold"
              href="/export"
            >
              Lanjut ke Langkah 4: Unduh
            </Link>
          }
        />
      )}
    </SectionCard>
  );
};
