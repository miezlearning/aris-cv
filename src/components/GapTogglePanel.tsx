"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretDown, CheckCircle, Compass, GraduationCap, WarningCircle } from "@phosphor-icons/react";
import { normalizeForMatch } from "@/lib/ats/synonyms";
import { hasSkillInProfile, useLiveAts } from "@/lib/live-ats";
import { useCvStore } from "@/lib/store";
import { Tag } from "@/components/ui";

type ToggleItem = {
  key: string;
  term: string;
  field: "hardSkills" | "softSkills" | "tools";
  kind: "gap" | "cross_language" | "implicit" | "added";
  reason: string;
  enabled: boolean;
};

const inferToolVsHard = (term: string): "tools" | "hardSkills" =>
  /\b(excel|word|powerpoint|office|figma|git|github|docker|mysql|postgresql|vscode|vs code|jira|trello|looker|tableau|power bi|sap|spss)\b/i.test(
    term
  )
    ? "tools"
    : "hardSkills";

export const GapTogglePanel = ({
  compact = false
}: {
  compact?: boolean;
}) => {
  const { analytics } = useLiveAts();
  const resume = useCvStore((state) => state.resumeProfile);
  const addedGapTerms = useCvStore((state) => state.addedGapTerms);
  const toggleSkillItem = useCvStore((state) => state.toggleSkillItem);
  const setActiveMasterTab = useCvStore((state) => state.setActiveMasterTab);

  const [expanded, setExpanded] = useState(!compact);
  const [showAll, setShowAll] = useState(false);

  if (!analytics.hasAnalyzed) return null;

  const seenKeys = new Set<string>();
  const skillItems: ToggleItem[] = [];
  const eduGaps = (analytics.qualificationMatches ?? []).filter(
    (m) => m.category === "education_criteria" && m.status === "gap"
  );

  for (const match of analytics.qualificationMatches ?? []) {
    if (match.category === "education_criteria") continue;
    const normKey = normalizeForMatch(match.term);
    if (!normKey || seenKeys.has(normKey)) continue;

    const inProfile = hasSkillInProfile(resume, match.term);
    const trackedAdded = addedGapTerms.some((t) => normalizeForMatch(t) === normKey);

    if (match.status === "matched" && !trackedAdded) continue;

    seenKeys.add(normKey);
    const field: ToggleItem["field"] =
      match.category === "soft_skills_and_work_traits" ? "softSkills" : inferToolVsHard(match.term);

    skillItems.push({
      key: `${match.category}:${normKey}`,
      term: match.term,
      field,
      kind: inProfile ? "added" : match.matchKind === "cross_language" ? "cross_language" : "gap",
      reason: inProfile
        ? "Aktif di daftar keahlian CV."
        : match.matchedVia
        ? `${match.matchedVia}. Aktifkan jika perlu ditulis eksplisit.`
        : match.guidance,
      enabled: inProfile
    });
  }

  for (const comp of analytics.implicitSuggestions ?? []) {
    const normKey = normalizeForMatch(comp.skill);
    if (!normKey || seenKeys.has(normKey)) continue;
    seenKeys.add(normKey);
    const inProfile = hasSkillInProfile(resume, comp.skill);
    skillItems.push({
      key: `implicit:${normKey}`,
      term: comp.skill,
      field: inferToolVsHard(comp.skill),
      kind: inProfile ? "added" : "implicit",
      reason: `Terkait (${comp.domain}): ${comp.reason}`,
      enabled: inProfile
    });
  }

  for (const addedTerm of addedGapTerms) {
    const normKey = normalizeForMatch(addedTerm);
    if (!normKey || seenKeys.has(normKey)) continue;
    const inProfile = hasSkillInProfile(resume, addedTerm);
    if (!inProfile) continue;
    seenKeys.add(normKey);
    skillItems.push({
      key: `added:${normKey}`,
      term: addedTerm,
      field: inferToolVsHard(addedTerm),
      kind: "added",
      reason: "Aktif di daftar keahlian CV.",
      enabled: true
    });
  }

  if (skillItems.length === 0 && eduGaps.length === 0) {
    return null;
  }

  const gapOnlyCount = skillItems.filter((i) => !i.enabled).length + eduGaps.length;
  const visibleItems = showAll ? skillItems : skillItems.slice(0, compact ? 4 : 6);

  return (
    <div
      className={`rounded-xl border border-[#D9CEBC] bg-white ${
        compact ? "p-3.5" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#94D1DF] bg-[#D6F3FA] text-[#124959]"
          >
            <Compass size={17} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#251813]">
              Tambah Cepat Keahlian Kurang ({gapOnlyCount})
            </h3>
            <p className="text-xs text-[#59483F]">
              Aktifkan hanya yang benar-benar kamu kuasai.
            </p>
          </div>
        </div>

        {compact ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 min-h-[38px] rounded-lg border border-[#D9CEBC] bg-[#FAF5E8] px-2.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8] transition-colors"
          >
            <span>{expanded ? "Sembunyikan" : "Buka Toggle Gap"}</span>
            <CaretDown
              size={13}
              weight="bold"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-3 grid gap-3">
          {visibleItems.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {visibleItems.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-colors ${
                    item.enabled
                      ? "border-[#9FD499] bg-[#EEF9EB]"
                      : item.kind === "implicit"
                      ? "border-[#94D1DF] bg-[#ECF9FC]/60"
                      : "border-[#E9A590] bg-[#FFFDF8]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag tone={item.enabled ? "match" : item.kind === "cross_language" ? "partial" : "gap"}>
                          {item.term}
                        </Tag>
                        <span className="text-[11px] font-semibold text-[#59483F]">
                          {item.field === "softSkills" ? "Soft Skill" : item.field === "tools" ? "Alat" : "Teknis"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-[#4E3E36] leading-relaxed break-words">
                        {item.reason}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.enabled}
                      aria-label={`${item.enabled ? "Hapus" : "Tambahkan"} ${item.term} di Keahlian CV`}
                      onClick={() => toggleSkillItem(item.field, item.term)}
                      className={`inline-flex shrink-0 items-center gap-1.5 min-h-[40px] rounded-full border px-2.5 text-[11px] font-bold transition-colors ${
                        item.enabled
                          ? "border-[#144C32] bg-[#1F6B57] text-white"
                          : "border-[#C2B49E] bg-[#FAF5E8] text-[#251813] hover:bg-[#FFF0A8]"
                      }`}
                    >
                      <span>{item.enabled ? "ON" : "OFF"}</span>
                      <span
                        aria-hidden="true"
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-2xs transition-transform ${
                          item.enabled ? "translate-x-0.5" : "-translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {item.enabled ? (
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#144C32]">
                      <CheckCircle size={13} weight="fill" aria-hidden="true" />
                      <span>Terpasang di CV</span>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {skillItems.length > visibleItems.length ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-fit min-h-[38px] rounded-lg border border-[#D9CEBC] bg-[#FAF5E8] px-3 py-1.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8]"
            >
              Tampilkan semua ({skillItems.length - visibleItems.length} lainnya)
            </button>
          ) : null}

          {eduGaps.length > 0 ? (
            <div className="grid gap-2">
              {eduGaps.map((edu) => (
                <div
                  key={edu.term}
                  className="rounded-xl border border-[#DFC25A] bg-[#FFF8DF] p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 font-bold text-[#4A3A2E]">
                      <GraduationCap size={15} weight="duotone" aria-hidden="true" />
                      <span>Kualifikasi Pendidikan: {edu.term}</span>
                    </p>
                    <p className="mt-1 text-[#4E3E36] leading-relaxed">{edu.guidance}</p>
                  </div>
                  <Link
                    href="/master-cv"
                    onClick={() => setActiveMasterTab("education")}
                    className="inline-flex items-center gap-1 min-h-[40px] rounded-lg border border-[#251813]/30 bg-white px-3 py-1.5 font-bold text-[#251813] hover:bg-[#FFF0A8]"
                  >
                    <WarningCircle size={14} weight="duotone" aria-hidden="true" />
                    <span>Cek Pendidikan</span>
                  </Link>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
