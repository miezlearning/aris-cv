"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle,
  CheckSquareOffset,
  Compass,
  Gauge,
  GraduationCap,
  ListChecks,
  Plus,
  Translate,
  UsersThree,
  WarningCircle,
  Wrench
} from "@phosphor-icons/react";
import { useCvStore } from "@/lib/store";
import { EmptyState, SectionCard, Tag } from "@/components/ui";
import type { AdministrativeItem, QualificationMatchItem } from "@/types/resume";

const noteClass = {
  yellow: "doodle-note-yellow",
  green: "doodle-note-green",
  blue: "doodle-note-blue",
  red: "doodle-note-red"
};

const subTypeLabels: Record<AdministrativeItem["subType"], string> = {
  document: "Berkas",
  demographic: "Demografi",
  physical: "Fisik",
  logistics: "Mobilitas & Shift"
};

const languageLabels = {
  id: "Bahasa Indonesia",
  en: "Bahasa Inggris",
  mixed: "Campuran ID-EN"
} as const;

const verdictFor = (score: number) => {
  if (score >= 75) {
    return {
      label: "Kecocokan Kuat",
      note: "green" as const,
      ringColor: "#1F6B57",
      body: "Sebagian besar kualifikasi utama lowongan ini sudah terbaca jelas di CV kamu. Pertahankan bukti nyata di poin proyek atau pengalaman."
    };
  }
  if (score >= 50) {
    return {
      label: "Kecocokan Cukup Baik",
      note: "yellow" as const,
      ringColor: "#9B6B12",
      body: "Beberapa kualifikasi sudah cocok atau memiliki padanan istilah. Menjelaskan kata kunci yang relevan dari pengalaman/proyek aslimu akan memperkuat skor."
    };
  }
  return {
    label: "Perlu Penyesuaian",
    note: "red" as const,
    ringColor: "#A3291B",
    body: "Masih banyak kualifikasi inti lowongan yang belum muncul di CV kamu. Periksa rincian celah di bawah dan sesuaikan hanya berdasarkan kemampuan nyatamu."
  };
};

export const MatchDashboard = () => {
  const analytics = useCvStore((state) => state.matchAnalytics);
  const addSkillItem = useCvStore((state) => state.addSkillItem);
  const checkedAdminItems = useCvStore((state) => state.checkedAdminItems);
  const toggleAdminItem = useCvStore((state) => state.toggleAdminItem);

  if (!analytics.hasAnalyzed) {
    return (
      <SectionCard
        title="Hasil Analisis & Skor Kecocokan ATS"
        description="Skor kecocokan muncul setelah kamu menempelkan iklan lowongan dan menekan Cocokkan dengan CV Saya."
        accent="butter"
        icon={<Gauge size={20} weight="duotone" />}
      >
        <EmptyState
          title="Belum ada analisis yang dijalankan"
          description="Tempel iklan lowongan di atas atau klik salah satu contoh lowongan cepat untuk melihat rincian skor ATS, kecocokan lintas bahasa, dan checklist berkas administratif."
          icon={<Gauge size={20} weight="duotone" />}
        />
      </SectionCard>
    );
  }

  const verdict = verdictFor(analytics.overallScore);
  const matches = analytics.qualificationMatches ?? [];
  const matchedList = matches.filter((m) => m.status === "matched");
  const partialList = matches.filter((m) => m.status === "partial");
  const gapList = matches.filter((m) => m.status === "gap");
  const adminItems = analytics.administrativeItems ?? [];
  const implicitSuggestions = analytics.implicitSuggestions ?? [];
  const formatChecks = analytics.formatChecks ?? [];
  const { breakdown } = analytics;

  const breakdownRows: Array<{
    label: string;
    score: number;
    weightPct: number;
    active: boolean;
    barColor: string;
    icon: ReactNode;
  }> = [
    {
      label: "Hard Skills & Alat Kerja",
      score: breakdown.hardSkillsScore,
      weightPct: Math.round(breakdown.weights.hardSkills * 100),
      active: breakdown.weights.hardSkills > 0,
      barColor: "bg-[#1F6B57]",
      icon: <Wrench size={15} weight="duotone" className="text-[#144C32]" aria-hidden="true" />
    },
    {
      label: "Pendidikan & Relevansi Domain",
      score: breakdown.educationAndDomainScore,
      weightPct: Math.round(breakdown.weights.educationAndDomain * 100),
      active: breakdown.weights.educationAndDomain > 0,
      barColor: "bg-[#2C7B90]",
      icon: <GraduationCap size={15} weight="duotone" className="text-[#124959]" aria-hidden="true" />
    },
    {
      label: "Struktur, Kelengkapan & Dampak CV",
      score: breakdown.structureAndImpactScore,
      weightPct: Math.round(breakdown.weights.structureAndImpact * 100),
      active: breakdown.weights.structureAndImpact > 0,
      barColor: "bg-[#9B6B12]",
      icon: <CheckSquareOffset size={15} weight="duotone" className="text-[#4A3A2E]" aria-hidden="true" />
    },
    {
      label: "Karakter Kerja (Bobot Rendah)",
      score: breakdown.softSkillsScore,
      weightPct: Math.round(breakdown.weights.softSkills * 100),
      active: breakdown.weights.softSkills > 0,
      barColor: "bg-[#6B584D]",
      icon: <UsersThree size={15} weight="duotone" className="text-[#59483F]" aria-hidden="true" />
    }
  ].filter((row) => row.active);

  return (
    <SectionCard
      title="Hasil Analisis & Rincian Skor ATS"
      description="Skor dihitung secara transparan dari kecocokan Hard Skills, Pendidikan, Struktur & Dampak CV, serta bobot rendah untuk Soft Skills. Berkas administratif tidak ikut dihitung."
      accent="sage"
      icon={<Gauge size={20} weight="duotone" />}
    >
      <div className="min-w-0 grid gap-5">
        {/* Main Focal Verdict Card dengan Animated Circular Gauge */}
        <div className={`min-w-0 doodle-card p-5 sm:p-6 ${noteClass[verdict.note]}`}>
          <div className="min-w-0 grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
            <div className="flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-[#251813]/20 pb-4 sm:pb-0 sm:pr-6">
              <ScoreRing value={analytics.overallScore} ringColor={verdict.ringColor} />
              <p className="mt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#4E3E36]">
                Skor Kecocokan ATS
              </p>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-[#251813]">{verdict.label}</span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-[#251813]/25 bg-white/95 px-2.5 py-0.5 text-xs font-bold text-[#251813]">
                  <Translate size={13} weight="duotone" aria-hidden="true" />
                  <span>Iklan: {languageLabels[analytics.detectedLanguage ?? "id"]}</span>
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[#251813] leading-relaxed max-w-xl">{verdict.body}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#251813]">
                <span className="rounded-md bg-white/90 px-2.5 py-1 border border-[#251813]/15">
                  Cocok langsung: {matchedList.length}
                </span>
                <span className="rounded-md bg-white/90 px-2.5 py-1 border border-[#251813]/15">
                  Sinonim/Lintas Bahasa: {partialList.length}
                </span>
                <span className="rounded-md bg-white/90 px-2.5 py-1 border border-[#251813]/15">
                  Perlu ditonjolkan: {gapList.length}
                </span>
                {adminItems.length > 0 ? (
                  <span className="rounded-md bg-white/90 px-2.5 py-1 border border-[#251813]/15">
                    Berkas admin dipisah: {adminItems.length}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Penyebab Skor dengan Animated Bars */}
        <div className="min-w-0 rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5">
          <h3 className="text-sm font-bold text-[#251813] mb-3">Rincian Penyumbang Skor ATS</h3>
          <div className="min-w-0 grid gap-3.5 sm:grid-cols-2">
            {breakdownRows.map((row) => (
              <div key={row.label} className="min-w-0 rounded-xl border border-[#D9CEBC] bg-[#FFFDF8] p-3.5">
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-bold text-[#251813]">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {row.icon}
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0">
                    {row.score}% <span className="text-xs font-normal text-[#59483F]">(bobot {row.weightPct}%)</span>
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-[#EFE7D6] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${row.score}%` }}
                    transition={{ duration: 0.55, ease: [0.2, 0.7, 0.3, 1] }}
                    className={`h-full rounded-full ${row.barColor}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chip Kata Kunci Berkode Warna + Ikon + Label */}
        <div className="min-w-0 grid gap-4 lg:grid-cols-3">
          <MatchColumn
            title="Cocok Langsung"
            tone="match"
            items={matchedList}
            empty="Belum ada kecocokan kata kunci persis."
          />
          <MatchColumn
            title="Cocok Sebagian / Sinonim"
            tone="partial"
            items={partialList}
            empty="Tidak ada kecocokan padanan sinonim atau lintas bahasa."
          />
          <MatchColumn
            title="Belum Ada / Gap"
            tone="gap"
            items={gapList}
            empty="Semua kualifikasi utama sudah terbaca di CV!"
          />
        </div>

        {/* Panduan Menjembatani Gap (Anti-Hallucination) */}
        {gapList.length > 0 ? (
          <div className="min-w-0 rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-bold text-[#251813]">
              Cara Jujur Menjembatani Kualifikasi yang Belum Muncul
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-[#4E3E36]">
              Jangan mengarang keahlian atau pengalaman palsu. Gunakan panduan berikut hanya untuk kemampuan yang memang sudah pernah kamu pelajari atau kerjakan.
            </p>
            <div className="mt-3.5 min-w-0 grid gap-3 sm:grid-cols-2">
              {gapList.slice(0, 6).map((item) => (
                <div key={item.term} className="min-w-0 rounded-xl border border-[#E9A590] bg-[#FFFDF8] p-3.5 text-xs">
                  <Tag tone="gap" showPrefix>
                    {item.term}
                  </Tag>
                  <p className="mt-2 text-[#4E3E36] leading-relaxed break-words">{item.guidance}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Kartu Saran Kompetensi Domain Implisit (Opt-in) */}
        {implicitSuggestions.length > 0 ? (
          <div className="min-w-0 rounded-xl border border-[#94D1DF] bg-[#ECF9FC] p-4 sm:p-5">
            <div className="mb-3 flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[#251813] bg-white text-[#124959]"
              >
                <Compass size={18} weight="duotone" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#124959]">
                  Saran Kompetensi Kontekstual ({implicitSuggestions[0].domain})
                </h3>
                <p className="mt-1 text-xs sm:text-[13px] text-[#2B4F5A] leading-relaxed">
                  Iklan lowongan ini singkat/umum. Berikut kompetensi inti yang biasa diharapkan di bidang ini.{" "}
                  <span className="font-bold">Tambahkan ke CV hanya jika kamu benar-benar menguasainya:</span>
                </p>
              </div>
            </div>
            <div className="min-w-0 grid gap-3 sm:grid-cols-2">
              <AnimatePresence>
                {implicitSuggestions.map((comp) => (
                  <motion.div
                    key={comp.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.2 }}
                    className="min-w-0 rounded-xl border border-[#94D1DF] bg-white p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#251813]">{comp.skill}</p>
                      <p className="mt-1 text-xs text-[#4E3E36] leading-relaxed">{comp.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addSkillItem("hardSkills", comp.skill)}
                      className="inline-flex items-center gap-1.5 min-h-[44px] w-fit rounded-xl border border-[#1F6B57] bg-[#DFF5DA] px-3 py-1.5 text-xs font-bold text-[#144C32] hover:bg-[#CDECC6] transition-colors"
                    >
                      <Plus size={14} weight="bold" aria-hidden="true" />
                      <span>Saya menguasai ini (Tambahkan ke Keahlian)</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : null}

        {/* Kartu Terpisah: Checklist Berkas & Syarat Administratif */}
        {adminItems.length > 0 ? (
          <div className="min-w-0 rounded-xl border border-[#DFC25A] bg-[#FFFDF2] p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[#251813] bg-[#FFF0A8] text-[#4A3A2E]"
                >
                  <ListChecks size={18} weight="duotone" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#251813]">
                    Checklist Berkas & Syarat Administratif (Di Luar Skor ATS)
                  </h3>
                  <p className="mt-1 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                    Persyaratan berkas fisik, usia, atau domisili di bawah ini otomatis dikecualikan dari skor ATS agar tidak mengacaukan isi CV kamu. Centang sebagai pengingat dokumen lamaranmu:
                  </p>
                </div>
              </div>
              <span className="rounded-lg border border-[#DFC25A] bg-[#FFF0A8] px-2.5 py-1 text-xs font-bold text-[#4A3A2E]">
                {adminItems.filter((item) => checkedAdminItems[item.id]).length}/{adminItems.length} siap
              </span>
            </div>

            <div className="min-w-0 grid gap-2.5 sm:grid-cols-2">
              {adminItems.map((item) => {
                const checked = Boolean(checkedAdminItems[item.id]);
                return (
                  <label
                    key={item.id}
                    className={`min-w-0 flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors min-h-[44px] ${
                      checked
                        ? "border-[#9FD499] bg-[#DFF5DA]/70"
                        : "border-[#D9CEBC] bg-white hover:border-[#251813]/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAdminItem(item.id)}
                      className="checkbox checkbox-sm mt-0.5 shrink-0 border-[#251813]/40 checked:bg-[#1F6B57] checked:border-[#1F6B57]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-bold break-words ${
                            checked ? "line-through text-[#4E3E36]" : "text-[#251813]"
                          }`}
                        >
                          {item.label}
                        </span>
                        <span className="rounded bg-[#F3E7C8] px-1.5 py-0.5 text-[10px] font-bold text-[#4E3E36]">
                          {subTypeLabels[item.subType]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#59483F] break-words">
                        Dari iklan: &ldquo;{item.rawSnippet}&rdquo;
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Evaluasi Struktur & Format CV */}
        {formatChecks.length > 0 ? (
          <div className="min-w-0 rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[#251813] mb-3">Evaluasi Struktur & Kelengkapan CV</h3>
            <div className="min-w-0 grid gap-2 sm:grid-cols-2">
              {formatChecks.map((check) => (
                <div
                  key={check.id}
                  className={`min-w-0 rounded-xl border p-3 text-xs ${
                    check.passed
                      ? "border-[#9FD499] bg-[#EEF9EB] text-[#144C32]"
                      : "border-[#DFC25A] bg-[#FFF8DF] text-[#4A3A2E]"
                  }`}
                >
                  <p className="flex items-start gap-1.5 font-bold">
                    {check.passed ? (
                      <CheckCircle size={15} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <WarningCircle size={15} weight="duotone" className="shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span>
                      {check.passed ? "Terpenuhi:" : "Perlu dicek:"} {check.label}
                    </span>
                  </p>
                  {!check.passed ? <p className="mt-1 pl-5 text-[#4E3E36] leading-relaxed">{check.tip}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
};

const ScoreRing = ({ value, ringColor }: { value: number; ringColor: string }) => {
  const [shown, setShown] = useState(0);
  const size = 112;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    const duration = 650;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="rgba(255,255,255,0.65)"
          stroke="rgba(37, 24, 19, 0.14)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 0.75, ease: [0.2, 0.7, 0.3, 1] }}
        />
      </svg>
      <span className="absolute text-2xl sm:text-3xl font-black text-[#251813]">{shown}%</span>
    </div>
  );
};

const MatchColumn = ({
  title,
  tone,
  items,
  empty
}: {
  title: string;
  tone: "match" | "partial" | "gap";
  items: QualificationMatchItem[];
  empty: string;
}) => {
  const bgStyle =
    tone === "match"
      ? "border-[#9FD499] bg-[#EEF9EB]"
      : tone === "partial"
      ? "border-[#DFC25A] bg-[#FFF8DF]"
      : "border-[#E9A590] bg-[#FFF3EF]";

  return (
    <div className={`min-w-0 rounded-xl border p-4 ${bgStyle}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-[#251813]">{title}</h4>
        <span className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-bold text-[#251813] border border-[#D9CEBC]">
          {items.length}
        </span>
      </div>

      {items.length ? (
        <div className="min-w-0 grid gap-2">
          {items.map((item) => (
            <div key={`${item.category}-${item.term}`} className="min-w-0 rounded-lg bg-white/95 border border-[#D9CEBC] p-2.5 break-words">
              <Tag tone={tone} showPrefix>
                {item.term}
              </Tag>
              {item.matchedVia ? (
                <p className="mt-1.5 text-xs font-semibold text-[#4A3A2E] break-words">{item.matchedVia}</p>
              ) : item.evidenceLocation ? (
                <p className="mt-1.5 text-xs text-[#4E3E36] break-words">Terbaca di bagian {item.evidenceLocation}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#4E3E36]">{empty}</p>
      )}
    </div>
  );
};
