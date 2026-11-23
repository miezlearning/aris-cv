"use client";

import { useEffect, useRef } from "react";
import { Gauge, Translate, TrendDown, TrendUp } from "@phosphor-icons/react";
import { useLiveAts } from "@/lib/live-ats";
import { useCvStore } from "@/lib/store";

export const LiveAtsBar = ({ compact = false }: { compact?: boolean }) => {
  const { analytics } = useLiveAts();
  const job = useCvStore((state) => state.jobTarget);
  const setCvLanguage = useCvStore((state) => state.setCvLanguage);
  const setAutoTranslateContent = useCvStore((state) => state.setAutoTranslateContent);

  const baselineRef = useRef<{ jobKey: string; score: number } | null>(null);
  const jobKey = `${job.jobTitle}|${job.rawDescription.slice(0, 120)}`;

  useEffect(() => {
    if (!analytics.hasAnalyzed) {
      baselineRef.current = null;
      return;
    }
    if (!baselineRef.current || baselineRef.current.jobKey !== jobKey) {
      baselineRef.current = { jobKey, score: analytics.overallScore };
    }
  }, [analytics.hasAnalyzed, analytics.overallScore, jobKey]);

  if (!analytics.hasAnalyzed) return null;

  const baselineScore =
    baselineRef.current && baselineRef.current.jobKey === jobKey
      ? baselineRef.current.score
      : analytics.overallScore;
  const delta = analytics.overallScore - baselineScore;

  const scoreTone =
    analytics.overallScore >= 75
      ? "border-[#9FD499] bg-[#DFF5DA] text-[#144C32]"
      : analytics.overallScore >= 50
      ? "border-[#DFC25A] bg-[#FFF0A8] text-[#4A3A2E]"
      : "border-[#E9A590] bg-[#FFE3D8] text-[#7B1F14]";

  const align = analytics.languageAlignment;
  const needsTranslateButton =
    align.status === "mismatch" && (align.jobLanguage === "en" || align.jobLanguage === "id");

  return (
    <div
      aria-live="polite"
      className={`rounded-xl border border-[#D9CEBC] bg-[#FFFDF8] ${
        compact ? "px-3.5 py-2.5" : "px-4 py-3"
      } grid gap-2.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 text-xs sm:text-sm font-black ${scoreTone}`}
          >
            <Gauge size={16} weight="duotone" aria-hidden="true" />
            <span>Skor ATS Live: {analytics.overallScore}%</span>
          </span>

          {delta !== 0 ? (
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold ${
                delta > 0
                  ? "border-[#9FD499] bg-[#EEF9EB] text-[#144C32]"
                  : "border-[#E9A590] bg-[#FFE3D8] text-[#7B1F14]"
              }`}
            >
              {delta > 0 ? (
                <TrendUp size={13} weight="bold" aria-hidden="true" />
              ) : (
                <TrendDown size={13} weight="bold" aria-hidden="true" />
              )}
              <span>
                {delta > 0 ? `+${delta}%` : `${delta}%`} sesi ini
              </span>
            </span>
          ) : null}

          <span className="text-xs font-semibold text-[#59483F] truncate max-w-[260px]">
            Target: {job.jobTitle || "Lowongan Langkah 2"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#4E3E36]">
          <span className="rounded-md border border-[#D9CEBC] bg-[#FAF5E8] px-2 py-0.5">
            Hard Skill: {analytics.breakdown.hardSkillsScore}%
          </span>
          <span className="rounded-md border border-[#D9CEBC] bg-[#FAF5E8] px-2 py-0.5">
            Struktur & XYZ: {analytics.breakdown.structureAndImpactScore}%
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 ${
              align.status === "aligned"
                ? "border-[#9FD499] bg-[#EEF9EB] text-[#144C32]"
                : align.status === "partial"
                ? "border-[#DFC25A] bg-[#FFF8DF] text-[#4A3A2E]"
                : "border-[#E9A590] bg-[#FFE3D8] text-[#7B1F14]"
            }`}
          >
            Bahasa: {align.score}%
          </span>
        </div>
      </div>

      {needsTranslateButton ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#DFC25A] bg-[#FFF8DF] px-3 py-2">
          <span className="text-xs font-semibold text-[#4A3A2E] leading-relaxed">
            {align.note}
          </span>
          <button
            type="button"
            onClick={() => {
              setCvLanguage(align.jobLanguage === "en" ? "en" : "id");
              setAutoTranslateContent(true);
            }}
            className="inline-flex items-center gap-1.5 min-h-[38px] shrink-0 rounded-lg border border-[#144C32] bg-[#1F6B57] px-3 py-1 text-xs font-bold text-white hover:bg-[#154538] transition-colors"
          >
            <Translate size={14} weight="duotone" aria-hidden="true" />
            <span>
              {align.jobLanguage === "en" ? "Terjemahkan ke English" : "Terjemahkan ke Indonesia"}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
