"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { describeKeywordAction } from "@/lib/analyzer";
import { useCvStore } from "@/lib/store";
import { EmptyState, SectionCard, Tag } from "@/components/ui";
import type { KeywordMatch } from "@/types/resume";

const noteClass = {
  yellow: "doodle-note-yellow",
  green: "doodle-note-green",
  blue: "doodle-note-blue",
  red: "doodle-note-red"
};

const categoryLabels: Record<KeywordMatch["category"], string> = {
  requiredHardSkills: "Keahlian teknis",
  domainKeywords: "Bidang dan tanggung jawab",
  softSkills: "Sikap kerja"
};

const verdictFor = (score: number) => {
  if (score >= 75) {
    return {
      label: "Kecocokan Sangat Kuat",
      note: "green" as const,
      body: "Sebagian besar kata kunci kualifikasi utama lowongan ini sudah terbaca jelas di CV kamu. Peluang lolos saringan awal ATS sangat tinggi."
    };
  }
  if (score >= 50) {
    return {
      label: "Kecocokan Cukup Baik",
      note: "yellow" as const,
      body: "Sebagian kata kunci sudah ada, tetapi masih ada beberapa yang belum muncul. Menambahkan keahlian yang relevan akan mendongkrak skor."
    };
  }
  return {
    label: "Perlu Peningkatan",
    note: "red" as const,
    body: "Banyak kata kunci inti lowongan belum ditemukan di CV kamu. Sistem ATS berisiko melewatkan berkasmu. Lihat daftar kata kunci yang hilang di bawah."
  };
};

export const MatchDashboard = () => {
  const analytics = useCvStore((state) => state.matchAnalytics);
  const hasKeywords = analytics.keywordMatches.length > 0;

  if (!hasKeywords) {
    return (
      <SectionCard title="Skor kecocokan CV" description="Skor muncul setelah kamu menempelkan teks lowongan kerja di atas.">
        <EmptyState
          title="Belum ada skor kecocokan"
          description="Tempel isi iklan lowongan di bagian atas dan tekan tombol Cocokkan dengan CV saya. Skor kalkulasi ATS dan rincian kata kunci akan muncul di sini."
        />
      </SectionCard>
    );
  }

  const verdict = verdictFor(analytics.overallScore);
  const missing = analytics.keywordMatches.filter((item) => item.status === "missing");
  const missingGroups = (Object.keys(categoryLabels) as Array<KeywordMatch["category"]>)
    .map((category) => ({
      category,
      label: categoryLabels[category],
      items: missing.filter((item) => item.category === category)
    }))
    .filter((group) => group.items.length > 0);

  return (
    <SectionCard
      title="Skor kecocokan CV terhadap lowongan"
      description="Skor dihitung secara transparan: 50% kecocokan kata kunci eksak, 30% kedekatan semantik, dan 20% kualitas format struktural dokumen."
    >
      <div className="grid gap-5">
        {/* Main Verdict Card */}
        <div className={`doodle-card p-6 sm:p-7 ${noteClass[verdict.note]}`}>
          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
            <div className="text-center sm:text-left border-b sm:border-b-0 sm:border-r border-line/20 pb-3 sm:pb-0 sm:pr-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#57443b]">Skor total ATS</p>
              <AnimatedScore value={analytics.overallScore} className="mt-1 block text-5xl sm:text-6xl font-black leading-none text-ink" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold text-ink">{verdict.label}</span>
              </div>
              <p className="mt-1.5 text-sm text-[#4d3b33] leading-relaxed max-w-xl">{verdict.body}</p>
              <p className="mt-2 text-xs font-bold text-[#57443b]">
                {analytics.matchedKeywords.length} kata kunci cocok, {missing.length} belum ada di CV
              </p>
            </div>
          </div>
        </div>

        {/* 3 Metric Breakdown Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <ScoreCard label="Kata persis sama (50%)" value={analytics.exactMatchRate} help="Kata kunci yang identik dengan teks lowongan." tone="green" />
          <ScoreCard label="Kata serupa (30%)" value={analytics.semanticProximity} help="Ada padanan istilah atau sinonim di CV kamu." tone="blue" />
          <ScoreCard label="Format dokumen (20%)" value={analytics.formatQualityScore} help="Kelengkapan kontak, format tanggal, dan angka hasil." tone="yellow" />
        </div>

        {/* Keyword Lists in 3 Columns */}
        <div>
          <h3 className="text-sm font-bold text-ink mb-3">Status kata kunci yang ditemukan:</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <KeywordList title="Sudah ada di CV" items={analytics.matchedKeywords} tone="match" note="green" empty="Belum ada kata kunci yang persis." />
            <KeywordList title="Ada padanannya" items={analytics.semanticKeywords} tone="semantic" note="yellow" empty="Tidak ada padanan serupa." />
            <KeywordList title="Belum ada di CV" items={missing.map((item) => item.keyword)} tone="missing" note="red" empty="Semua kata kunci utama sudah terpenuhi!" />
          </div>
        </div>

        {/* Actionable guidance for missing keywords */}
        {missingGroups.length ? (
          <div className="rounded-2xl border-2 border-line bg-white p-5 sm:p-6 shadow-[2px_3px_0_rgba(37,24,19,0.08)]">
            <h3 className="text-base font-bold text-ink">Rekomendasi penempatan kata kunci yang belum ada</h3>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#57443b]">
              Masukkan kata-kata ini ke dalam kalimat pengalaman nyata atau bagian keahlian. Hindari sekadar menumpuk kata kunci tanpa konteks yang bisa dipertanggungjawabkan saat wawancara.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {missingGroups.map((group) => (
                <div key={group.category} className="rounded-xl border-2 border-dashed border-line/40 p-4 bg-[#fffdfa]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#57443b]">{group.label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <Tag key={item.keyword} tone="missing">{item.keyword}</Tag>
                    ))}
                  </div>
                  <p className="mt-2.5 text-xs text-[#5c4a40] leading-relaxed border-t border-line/10 pt-2">
                    {describeKeywordAction(group.items[0])}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Structural format note */}
        <div className="rounded-2xl border-2 border-line bg-white p-4 sm:p-5 text-xs sm:text-sm leading-relaxed text-[#4d3b33] shadow-[2px_3px_0_rgba(37,24,19,0.06)]">
          <p className="font-bold text-ink mb-0.5">Evaluasi format standar ATS:</p>
          <p>
            {analytics.formatCheckPassed
              ? "Format dasar sudah sesuai standar ATS (satu kolom, judul baku, format tanggal konsisten)."
              : "Periksa kelengkapan kontak, ringkasan profil, format tanggal (MM/YYYY), dan pastikan poin pengalaman kerja mencantumkan metrik terukur."}
          </p>
        </div>
      </div>
    </SectionCard>
  );
};

const AnimatedScore = ({ value, className }: { value: number; className?: string }) => {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    const duration = 800;
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

  return <span className={className}>{shown}%</span>;
};

const ScoreCard = ({ label, value, help, tone }: { label: string; value: number; help: string; tone: keyof typeof noteClass }) => (
  <div className={`rounded-2xl border-2 border-line p-5 shadow-[2px_3px_0_rgba(37,24,19,0.08)] ${noteClass[tone]}`}>
    <p className="text-xs font-bold uppercase tracking-wider text-[#57443b]">{label}</p>
    <p className="mt-2 text-3xl sm:text-4xl font-black text-ink">{value}%</p>
    <p className="mt-1.5 text-xs text-[#57443b] leading-relaxed">{help}</p>
  </div>
);

const KeywordList = ({
  title,
  items,
  tone,
  note,
  empty
}: {
  title: string;
  items: string[];
  tone: "match" | "semantic" | "missing";
  note: keyof typeof noteClass;
  empty: string;
}) => (
  <div className={`rounded-2xl border-2 border-line p-4 sm:p-5 shadow-[2px_3px_0_rgba(37,24,19,0.08)] ${noteClass[note]}`}>
    <div className="flex items-center justify-between mb-2.5">
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <span className="text-xs font-bold text-[#57443b]">({items.length})</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {items.length ? (
        items.map((item) => <Tag key={item} tone={tone}>{item}</Tag>)
      ) : (
        <p className="text-xs text-[#57443b]">{empty}</p>
      )}
    </div>
  </div>
);
