"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  CaretDown,
  CheckCircle,
  Lightbulb,
  Lightning,
  PencilLine,
  PlusCircle,
  Sparkle,
  WarningCircle
} from "@phosphor-icons/react";
import { GapTogglePanel } from "@/components/GapTogglePanel";
import { LiveAtsBar } from "@/components/LiveAtsBar";
import { LocalAiControlPanel } from "@/components/LocalAiControlPanel";
import { Reveal } from "@/components/Reveal";
import { Button, EmptyState, SectionCard, Tag, TextArea } from "@/components/ui";
import { FRESH_GRAD_XYZ_EXAMPLES } from "@/lib/analyzer";
import {
  appendMetricTemplate,
  cycleStrongActionVerb,
  extractAllResumeBullets,
  insertKeywordIntoBullet,
  tailorSummaryDeterministic,
  type ResumeBulletRecord
} from "@/lib/ats/rewriter";
import { hasMetric } from "@/lib/ats/scorer";
import { containsTermBoundary, normalizeForMatch } from "@/lib/ats/synonyms";
import { hasSkillInProfile, useLiveAts } from "@/lib/live-ats";
import { resolveActiveAiConfig } from "@/lib/local-ai/engine";
import { rewriteBulletWithLocalAi, tailorSummaryWithLocalAi } from "@/lib/local-ai/tasks";
import { useCvStore } from "@/lib/store";
import { unique } from "@/lib/text";

const sourceTypeLabels = {
  work: "Pengalaman Kerja",
  project: "Proyek / Skripsi",
  organization: "Organisasi"
} as const;

export const BulletRewriter = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const suggestions = useCvStore((state) => state.suggestions);
  const excludedGapTerms = useCvStore((state) => state.excludedGapTerms);
  const applyOptimizedBullet = useCvStore((state) => state.applyOptimizedBullet);
  const applyOptimizedSummary = useCvStore((state) => state.applyOptimizedSummary);
  const updateSuggestion = useCvStore((state) => state.updateSuggestion);
  const job = useCvStore((state) => state.jobTarget);

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

  const { analytics, activeLang: targetLang } = useLiveAts();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sessionOriginals, setSessionOriginals] = useState<Record<string, string>>({});
  const [verbSteps, setVerbSteps] = useState<Record<string, number>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [cardMessage, setCardMessage] = useState<Record<string, string>>({});
  const [cardInventedWarning, setCardInventedWarning] = useState<Record<string, string[]>>({});
  const [filterMode, setFilterMode] = useState<"weak" | "all">("weak");
  const [examplesOpen, setExamplesOpen] = useState(false);

  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryEditorOpen, setSummaryEditorOpen] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState("");
  const [summaryInventedWarning, setSummaryInventedWarning] = useState<string[]>([]);
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

  const allBullets = extractAllResumeBullets(resume, analytics);
  const weakBullets = allBullets.filter((b) => b.analysis.needsImprovement);
  const strongCount = allBullets.length - weakBullets.length;
  const activeFilter: "weak" | "all" =
    filterMode === "weak" && weakBullets.length > 0 ? "weak" : "all";
  const visibleBullets = activeFilter === "weak" ? weakBullets : allBullets;

  const excludedSet = new Set(excludedGapTerms.map(normalizeForMatch));
  const verifiedTargetKeywords = unique([
    ...(analytics.matchedKeywords ?? []),
    ...(analytics.semanticKeywords ?? [])
  ])
    .filter((kw) => !excludedSet.has(normalizeForMatch(kw)))
    .slice(0, 8);

  const forbiddenSkills = unique([
    ...(analytics.missingKeywords ?? []),
    ...excludedGapTerms
  ])
    .filter((kw) => !hasSkillInProfile(resume, kw))
    .slice(0, 12);

  const rememberOriginal = (record: ResumeBulletRecord) => {
    setSessionOriginals((prev) => (prev[record.id] !== undefined ? prev : { ...prev, [record.id]: record.text }));
  };

  const getDraftValue = (record: ResumeBulletRecord): string => {
    if (drafts[record.id] !== undefined) return drafts[record.id];
    if (record.suggestedDraft.trim() !== record.text.trim()) return record.suggestedDraft;
    return record.text;
  };

  const writeBulletToStore = (record: ResumeBulletRecord, nextValue: string) => {
    rememberOriginal(record);
    applyOptimizedBullet(
      record.sourceType,
      record.sourceId,
      record.bulletIndex,
      nextValue,
      "Terapkan poin optimasi"
    );

    const matchingSuggestion = suggestions.find(
      (s) =>
        (s.sourceId || s.experienceId) === record.sourceId && s.bulletIndex === record.bulletIndex
    );
    if (matchingSuggestion) {
      updateSuggestion(matchingSuggestion.id, {
        status: nextValue.trim() === record.text.trim() ? "accepted" : "edited",
        suggestion: nextValue
      });
    }
  };

  const handleApplyBullet = (record: ResumeBulletRecord) => {
    const nextValue = getDraftValue(record).trim();
    if (!nextValue) return;
    writeBulletToStore(record, nextValue);
    setDrafts((prev) => ({ ...prev, [record.id]: nextValue }));
    setCardMessage((prev) => ({
      ...prev,
      [record.id]: "Tersimpan ke CV."
    }));
  };

  const handleRestoreOriginal = (record: ResumeBulletRecord) => {
    const original = sessionOriginals[record.id] ?? record.text;
    writeBulletToStore(record, original);
    setDrafts((prev) => ({ ...prev, [record.id]: original }));
    setCardInventedWarning((prev) => ({ ...prev, [record.id]: [] }));
    setCardMessage((prev) => ({
      ...prev,
      [record.id]: "Dikembalikan ke teks awal."
    }));
  };

  const handleQuickActionVerb = (record: ResumeBulletRecord) => {
    const current = getDraftValue(record);
    const step = verbSteps[record.id] ?? 0;
    const updated = cycleStrongActionVerb(current, targetLang, step);
    setVerbSteps((prev) => ({ ...prev, [record.id]: step + 1 }));
    setDrafts((prev) => ({ ...prev, [record.id]: updated }));
    setCardMessage((prev) => ({
      ...prev,
      [record.id]: "Kata kerja pembuka diganti."
    }));
  };

  const handleQuickAddMetricSlot = (record: ResumeBulletRecord) => {
    const current = getDraftValue(record);
    const updated = appendMetricTemplate(current, record.sourceType, targetLang);
    setDrafts((prev) => ({ ...prev, [record.id]: updated }));
    setCardMessage((prev) => ({
      ...prev,
      [record.id]: "Slot angka ditambahkan. Isi teks di dalam [...]."
    }));
  };

  const handleQuickInsertKeyword = (record: ResumeBulletRecord, keyword: string) => {
    const current = getDraftValue(record);
    const updated = insertKeywordIntoBullet(current, keyword, targetLang);
    setDrafts((prev) => ({ ...prev, [record.id]: updated }));
    setCardMessage((prev) => ({
      ...prev,
      [record.id]: `'${keyword}' ditambahkan ke draft.`
    }));
  };

  const handleAiRewrite = async (record: ResumeBulletRecord) => {
    if (!activeLocalConfig) {
      setCardMessage((prev) => ({
        ...prev,
        [record.id]:
          "Asisten AI sedang nonaktif. Pakai tombol cepat atau aktifkan lewat Pengaturan (tombol Atur AI di atas)."
      }));
      return;
    }

    setAiLoading((prev) => ({ ...prev, [record.id]: true }));
    setCardMessage((prev) => ({ ...prev, [record.id]: "" }));
    setCardInventedWarning((prev) => ({ ...prev, [record.id]: [] }));

    try {
      const localResult = await rewriteBulletWithLocalAi(activeLocalConfig, {
        bullet: getDraftValue(record),
        role: record.sourceLabel,
        jobTitle: job.jobTitle,
        jobDescription: job.rawDescription,
        verifiedKeywords: verifiedTargetKeywords.slice(0, 6),
        forbiddenSkills,
        targetLang
      });

      setDrafts((prev) => ({ ...prev, [record.id]: localResult.suggestion }));
      setCardInventedWarning((prev) => ({ ...prev, [record.id]: localResult.inventedSkills }));
      setCardMessage((prev) => ({
        ...prev,
        [record.id]:
          localResult.inventedSkills.length > 0
            ? `Periksa dulu: AI sempat menyertakan ${localResult.inventedSkills.join(", ")} yang belum ada di CV kamu.`
            : `Disusun ulang oleh AI (${activeLocalConfig.modelId}). Periksa teksnya lalu klik 'Terapkan ke CV'.`
      }));
    } catch (err) {
      setCardMessage((prev) => ({
        ...prev,
        [record.id]: err instanceof Error ? err.message : "Kendala saat memproses polesan AI."
      }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const handleOpenOrTailorSummary = async (
    mode: "align_role" | "highlight_skills" | "polish_ats" = "align_role",
    preferAi = false
  ) => {
    const baseText = (summaryDraft || resume.summary).trim();
    if (!baseText) return;

    if (preferAi && activeLocalConfig) {
      setSummaryBusy(true);
      setSummaryStatus("");
      setSummaryInventedWarning([]);
      setSummaryEditorOpen(true);
      try {
        const result = await tailorSummaryWithLocalAi(activeLocalConfig, {
          summary: resume.summary,
          headline: resume.contact.headline ?? "",
          jobTitle: job.jobTitle,
          companyName: job.companyName,
          matchedKeywords: verifiedTargetKeywords,
          forbiddenSkills,
          targetLang
        });
        setSummaryDraft(result.summary);
        setSummaryInventedWarning(result.inventedSkills);
        setSummaryStatus(
          result.inventedSkills.length > 0
            ? `Periksa dulu: AI sempat menyebut ${result.inventedSkills.join(", ")} yang belum ada di CV kamu.`
            : `Ringkasan diselaraskan oleh AI (${activeLocalConfig.modelId}). Sunting jika perlu lalu klik Terapkan.`
        );
      } catch (err) {
        setSummaryStatus(err instanceof Error ? err.message : "Gagal menyelaraskan ringkasan dengan AI.");
      } finally {
        setSummaryBusy(false);
      }
      return;
    }

    if (preferAi && !activeLocalConfig) {
      setSummaryEditorOpen(true);
      setSummaryStatus(
        "Asisten AI sedang nonaktif. Pakai tombol cepat atau aktifkan lewat Pengaturan (tombol Atur AI di atas)."
      );
      return;
    }

    const instantDraft = tailorSummaryDeterministic({
      summary: resume.summary,
      jobTitle: job.jobTitle,
      matchedKeywords: [...(analytics.matchedKeywords ?? []), ...(analytics.semanticKeywords ?? [])],
      targetLang,
      mode
    });
    setSummaryDraft(instantDraft);
    setSummaryEditorOpen(true);
    setSummaryStatus(
      "Draft ringkasan langsung disiapkan (mode cepat tanpa AI). Kamu bebas menyuntingnya lalu klik 'Terapkan ke Ringkasan CV'."
    );
  };

  const handleBatchQuickFixWeak = () => {
    for (const record of weakBullets) {
      const nextVal =
        record.suggestedDraft.trim() !== record.text.trim()
          ? record.suggestedDraft
          : cycleStrongActionVerb(record.text, targetLang, 0);
      writeBulletToStore(record, nextVal);
      setDrafts((prev) => ({ ...prev, [record.id]: nextVal }));
      setCardMessage((prev) => ({
        ...prev,
        [record.id]: "Kata pembuka diperkuat massal dan diterapkan ke CV."
      }));
    }
  };

  const handleBatchAiRewrite = async () => {
    if (!activeLocalConfig) return;
    const targets = weakBullets.length > 0 ? weakBullets : visibleBullets;
    for (let i = 0; i < targets.length; i += 1) {
      const item = targets[i];
      setBatchProgress(`Memoles poin ${i + 1} dari ${targets.length} dengan AI...`);
      await handleAiRewrite(item);
    }
    setBatchProgress("");
  };

  return (
    <SectionCard
      title="Perkuat Kalimat CV"
      description="Pertajam poin pengalaman atau proyek dengan kata kerja aktif dan hasil terukur."
      accent="sage"
      icon={<PencilLine size={20} weight="duotone" />}
    >
      <div className="mb-4 grid gap-3">
        {/* Live ATS Bar Real-Time */}
        <LiveAtsBar />

        {/* Slim AI Status Bar */}
        <LocalAiControlPanel mode="bar" contextLabel="Optimasi Kalimat" />

        {/* Compact Gap Skill Toggles */}
        <GapTogglePanel compact />

        {/* Ringkasan Profil Card (Always Works With or Without AI) */}
        {resume.summary.trim() ? (
          <div className="rounded-xl border border-[#D9CEBC] bg-white px-3.5 py-3 grid gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#251813]">
                  Ringkasan Profil ({job.jobTitle || "Lowongan Target"})
                </p>
                <p className="text-xs text-[#59483F]">Sesuaikan ringkasan dengan target lowongan.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={summaryBusy}
                onClick={() => handleOpenOrTailorSummary("align_role", Boolean(activeLocalConfig))}
                className="min-h-[40px] text-xs gap-1.5"
              >
                <Sparkle size={14} weight="duotone" aria-hidden="true" />
                <span>
                  {summaryBusy
                    ? "Menyusun..."
                    : summaryEditorOpen
                    ? "Perbarui Draft Ringkasan"
                    : "Sesuaikan Ringkasan"}
                </span>
              </Button>
            </div>

            {summaryStatus ? (
              <p className="rounded-lg border border-[#94D1DF] bg-[#ECF9FC] px-3 py-1.5 text-xs font-semibold text-[#124959]">
                {summaryStatus}
              </p>
            ) : null}

            {summaryEditorOpen ? (
              <div className="grid gap-2.5 pt-1 border-t border-[#EFE7D6]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4E3E36] mr-1">
                    <Lightning size={13} weight="duotone" aria-hidden="true" />
                    <span>Quick Action Instan:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenOrTailorSummary("align_role", false)}
                    className="min-h-[34px] rounded-lg border border-[#D9CEBC] bg-[#FAF5E8] px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8]"
                  >
                    Fokus Posisi Target
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenOrTailorSummary("highlight_skills", false)}
                    className="min-h-[34px] rounded-lg border border-[#D9CEBC] bg-[#FAF5E8] px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8]"
                  >
                    Tonjolkan Skill Cocok
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenOrTailorSummary("polish_ats", false)}
                    className="min-h-[34px] rounded-lg border border-[#D9CEBC] bg-[#FAF5E8] px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8]"
                  >
                    Rapikan Gaya ATS
                  </button>
                  {activeLocalConfig ? (
                    <button
                      type="button"
                      disabled={summaryBusy}
                      onClick={() => handleOpenOrTailorSummary("align_role", true)}
                      className="min-h-[34px] rounded-lg border border-[#144C32]/40 bg-[#DFF5DA] px-2.5 text-xs font-bold text-[#144C32] hover:bg-[#CDECC6]"
                    >
                      Poles dengan AI ({activeLocalConfig.modelId})
                    </button>
                  ) : null}
                </div>

                <TextArea
                  rows={3}
                  value={summaryDraft}
                  onChange={(event) => {
                    setSummaryDraft(event.target.value);
                    if (summaryInventedWarning.length > 0) setSummaryInventedWarning([]);
                  }}
                  placeholder="Sunting ringkasan profil di sini..."
                />

                {summaryInventedWarning.length > 0 ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-[#E9A590] bg-[#FFE3D8] px-3 py-2 text-xs font-semibold text-[#7B1F14] flex items-start gap-2"
                  >
                    <WarningCircle size={15} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Hati-hati: draft ini menyebut {summaryInventedWarning.join(", ")} yang belum ada di CV kamu. Hapus sebelum menerapkan jika kamu memang belum menguasainya.
                    </span>
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    disabled={!summaryDraft.trim()}
                    onClick={() => {
                      applyOptimizedSummary(summaryDraft.trim(), "Terapkan ringkasan profil");
                      setSummaryStatus("Ringkasan profil diperbarui di CV. Skor ATS Live otomatis disesuaikan.");
                    }}
                    className="min-h-[40px] text-xs gap-1.5"
                  >
                    <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                    <span>Terapkan ke Ringkasan CV</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSummaryEditorOpen(false);
                      setSummaryDraft("");
                      setSummaryStatus("");
                    }}
                  >
                    Tutup Editor
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Main Bullet Cards Section */}
      {allBullets.length > 0 ? (
        <div className="grid gap-4">
          {/* Filter + Batch Quick Actions + Contoh Rumus Toggle */}
          <div className="grid gap-2.5 rounded-xl border border-[#D9CEBC] bg-[#FAF5E8] px-3.5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter poin CV">
                <button
                  type="button"
                  onClick={() => setFilterMode("weak")}
                  className={`min-h-[38px] rounded-lg border px-3 text-xs font-bold transition-colors ${
                    activeFilter === "weak"
                      ? "border-[#251813] bg-[#FFF0A8] text-[#251813]"
                      : "border-[#D9CEBC] bg-white text-[#4E3E36]"
                  }`}
                >
                  Perlu Diperkuat ({weakBullets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`min-h-[38px] rounded-lg border px-3 text-xs font-bold transition-colors ${
                    activeFilter === "all"
                      ? "border-[#251813] bg-white text-[#251813] shadow-2xs"
                      : "border-[#D9CEBC] bg-white text-[#4E3E36]"
                  }`}
                >
                  Semua Poin ({allBullets.length})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExamplesOpen((prev) => !prev)}
                  aria-expanded={examplesOpen}
                  className="inline-flex items-center gap-1 min-h-[38px] rounded-lg border border-[#D9CEBC] bg-white px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF8DF]"
                >
                  <Lightbulb size={14} weight="duotone" className="text-[#4A3A2E]" aria-hidden="true" />
                  <span>Contoh Rumus</span>
                  <CaretDown
                    size={12}
                    weight="bold"
                    className={`transition-transform duration-200 ${examplesOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {weakBullets.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBatchQuickFixWeak}
                    className="min-h-[38px] text-xs gap-1.5"
                  >
                    <Lightning size={14} weight="duotone" aria-hidden="true" />
                    <span>Kuatkan Pembuka ({weakBullets.length} Poin)</span>
                  </Button>
                ) : null}

                {activeLocalConfig ? (
                  <Button
                    type="button"
                    disabled={Boolean(batchProgress)}
                    onClick={handleBatchAiRewrite}
                    className="min-h-[38px] text-xs gap-1.5"
                  >
                    <Sparkle size={14} weight="duotone" aria-hidden="true" />
                    <span>{batchProgress || "Poles Semua dengan AI"}</span>
                  </Button>
                ) : null}
              </div>
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
                  <div className="border-t border-[#D9CEBC] pt-2.5 grid gap-2.5">
                    <p className="text-xs font-semibold text-[#4E3E36]">
                      Rumus singkat: Kata kerja aktif + tugas + hasil terukur (contoh nyata):
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
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
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {forbiddenSkills.length > 0 ? (
            <p className="rounded-xl border border-[#94D1DF] bg-[#ECF9FC] px-3.5 py-2 text-xs font-medium text-[#124959]">
              Mode CV Jujur: AI hanya menonjolkan keahlian yang sudah ada di CV kamu dan tidak akan menyisipkan keahlian yang belum dikuasai ({forbiddenSkills.slice(0, 4).join(", ")}
              {forbiddenSkills.length > 4 ? ", ..." : ""}).
            </p>
          ) : null}

          {strongCount > 0 && activeFilter === "weak" ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#9FD499] bg-[#DFF5DA] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#144C32]">
              <span className="flex items-center gap-2">
                <CheckCircle size={17} weight="duotone" className="shrink-0" aria-hidden="true" />
                <span>
                  {strongCount} poin lainnya sudah memiliki kata kerja aktif dan ukuran hasil.
                </span>
              </span>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-xs font-bold underline shrink-0"
              >
                Lihat Semua
              </button>
            </div>
          ) : null}

          {visibleBullets.map((record, index) => {
            const draft = getDraftValue(record);
            const hasPendingChange = draft.trim() !== record.text.trim();
            const originalBeforeEdit = sessionOriginals[record.id];
            const canRestore =
              originalBeforeEdit !== undefined && originalBeforeEdit.trim() !== record.text.trim();
            const showMetricQuickAdd = !hasMetric(draft);
            const candidateKeywords = verifiedTargetKeywords
              .filter((kw) => !containsTermBoundary(normalizeForMatch(draft), kw))
              .slice(0, 3);
            const inventedOnCard = cardInventedWarning[record.id] ?? [];

            return (
              <Reveal key={record.id} delay={Math.min(index, 4) * 35}>
                <article
                  className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                    record.analysis.needsImprovement
                      ? "border-[#C2B49E] bg-white shadow-2xs"
                      : "border-[#9FD499] bg-white"
                  }`}
                >
                  <div className="grid gap-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9CEBC] pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                          Poin #{index + 1}
                        </span>
                        <span className="rounded-md border border-[#D9CEBC] bg-[#FAF5E8] px-2 py-0.5 text-xs font-semibold text-[#251813]">
                          {sourceTypeLabels[record.sourceType]}: {record.sourceLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {hasPendingChange ? (
                          <span className="rounded-lg border border-[#94D1DF] bg-[#D6F3FA] px-2.5 py-0.5 text-xs font-bold text-[#124959]">
                            Ada perubahan belum diterapkan
                          </span>
                        ) : null}
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                            record.analysis.needsImprovement
                              ? "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]"
                              : "bg-[#DFF5DA] text-[#144C32] border-[#9FD499]"
                          }`}
                        >
                          {record.analysis.needsImprovement ? "Bisa Diperkuat" : "Sudah Kuat (XYZ)"}
                        </span>
                      </div>
                    </div>

                    {/* Original / Saved CV vs Editable Draft */}
                    <div className="grid gap-4 md:grid-cols-2 items-start">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#59483F] mb-1.5">
                          Teks saat ini
                        </p>
                        <div className="rounded-xl border border-[#D9CEBC] bg-[#FAF5E8] p-3.5 text-sm leading-relaxed text-[#251813]">
                          {record.text}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#144C32] mb-1.5">
                          Draft perbaikan
                        </p>
                        <TextArea
                          rows={3}
                          value={draft}
                          onChange={(event) => {
                            const nextVal = event.target.value;
                            setDrafts((current) => ({ ...current, [record.id]: nextVal }));
                            if (inventedOnCard.length > 0) {
                              setCardInventedWarning((prev) => ({ ...prev, [record.id]: [] }));
                            }
                          }}
                          placeholder="Sunting kalimat di sini..."
                        />
                      </div>
                    </div>

                    {/* Hybrid Quick Actions Row */}
                    <div className="rounded-xl border border-[#EFE7D6] bg-[#FFFDF8] p-3 grid gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4E3E36] mr-1">
                          <Lightning size={13} weight="duotone" aria-hidden="true" />
                          <span>Aksi cepat:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickActionVerb(record)}
                          className="inline-flex items-center gap-1 min-h-[36px] rounded-lg border border-[#D9CEBC] bg-white px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8] transition-colors"
                        >
                          <ArrowsClockwise size={13} weight="bold" aria-hidden="true" />
                          <span>Ganti Kata Kerja</span>
                        </button>

                        {showMetricQuickAdd ? (
                          <button
                            type="button"
                            onClick={() => handleQuickAddMetricSlot(record)}
                            className="inline-flex items-center gap-1 min-h-[36px] rounded-lg border border-[#D9CEBC] bg-white px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8] transition-colors"
                          >
                            <PlusCircle size={13} weight="duotone" aria-hidden="true" />
                            <span>Tambah Angka</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          disabled={Boolean(aiLoading[record.id])}
                          onClick={() => handleAiRewrite(record)}
                          className={`inline-flex items-center gap-1 min-h-[36px] rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                            activeLocalConfig
                              ? "border-[#144C32]/40 bg-[#DFF5DA] text-[#144C32] hover:bg-[#CDECC6]"
                              : "border-[#D9CEBC] bg-[#FAF5E8] text-[#4E3E36] hover:bg-[#FFF0A8]"
                          }`}
                        >
                          <Sparkle size={13} weight="duotone" aria-hidden="true" />
                          <span>
                            {aiLoading[record.id] ? "Memoles AI..." : "Poles AI"}
                          </span>
                        </button>
                      </div>

                      {candidateKeywords.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#EFE7D6]">
                          <span className="text-[11px] font-semibold text-[#59483F] mr-1">Tonjolkan keahlianmu yang cocok:</span>
                          {candidateKeywords.map((kw) => (
                            <button
                              key={kw}
                              type="button"
                              onClick={() => handleQuickInsertKeyword(record, kw)}
                              className="min-h-[32px] rounded-md border border-[#94D1DF] bg-[#ECF9FC] px-2 py-0.5 text-[11px] font-bold text-[#124959] hover:bg-[#D6F3FA] transition-colors"
                            >
                              + {kw}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {record.note ? (
                      <p className="rounded-xl border border-dashed border-[#C2B49E] bg-[#FFFDF8] p-3 text-xs sm:text-[13px] leading-relaxed text-[#4E3E36]">
                        <span className="font-bold text-[#251813]">Panduan jujur: </span>
                        {record.note}
                      </p>
                    ) : null}

                    {/* Detected keywords */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#59483F] mr-1">Kata kunci terbaca:</span>
                      {record.keywordsUsed.length ? (
                        record.keywordsUsed.map((keyword) => (
                          <Tag key={keyword} tone="match">
                            {keyword}
                          </Tag>
                        ))
                      ) : (
                        <Tag tone="neutral">Perbaikan struktur kalimat</Tag>
                      )}
                    </div>

                    {inventedOnCard.length > 0 ? (
                      <p
                        role="alert"
                        className="rounded-xl bg-[#FFE3D8] border border-[#E9A590] px-3 py-2 text-xs font-semibold text-[#7B1F14] flex items-start gap-2"
                      >
                        <WarningCircle size={15} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          Peringatan jujur: draft ini masih menyebut {inventedOnCard.join(", ")} yang belum ada di CV kamu. Hapus sebelum menekan Terapkan jika kamu belum menguasainya.
                        </span>
                      </p>
                    ) : null}

                    {cardMessage[record.id] ? (
                      <p className="rounded-xl bg-[#D6F3FA] border border-[#94D1DF] px-3 py-2 text-xs font-semibold text-[#124959]">
                        {cardMessage[record.id]}
                      </p>
                    ) : null}

                    {/* Apply / Restore Footer */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D9CEBC]">
                      <Button
                        type="button"
                        disabled={!hasPendingChange || !draft.trim()}
                        onClick={() => handleApplyBullet(record)}
                        className="gap-1.5"
                      >
                        <CheckCircle size={16} weight="duotone" aria-hidden="true" />
                        <span>{hasPendingChange ? "Terapkan ke CV" : "Tersimpan di CV"}</span>
                      </Button>

                      {canRestore ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRestoreOriginal(record)}
                          className="gap-1.5"
                        >
                          <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />
                          <span>Kembalikan Asli</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Belum ada poin pengalaman atau proyek"
          description="Tambahkan minimal satu poin pada Proyek, Pengalaman, atau Organisasi di Langkah 1."
          icon={<PencilLine size={20} weight="duotone" />}
          action={
            <Link
              className="btn doodle-btn bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538] px-4 py-2 text-sm font-bold"
              href="/master-cv"
            >
              Isi di Langkah 1
            </Link>
          }
        />
      )}
    </SectionCard>
  );
};
