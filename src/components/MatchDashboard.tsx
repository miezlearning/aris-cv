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
      label: "Sudah kuat",
      note: "green" as const,
      body: "Kata kunci utama lowongan ini sebagian besar sudah terbaca di CV kamu. Periksa sekali lagi sebelum mengirim."
    };
  }
  if (score >= 50) {
    return {
      label: "Masih setengah jalan",
      note: "yellow" as const,
      body: "Sebagian kata kunci sudah terbaca, sebagian belum. Menambahkan beberapa yang memang kamu kuasai biasanya cukup untuk menaikkan skor."
    };
  }
  return {
    label: "Masih jauh",
    note: "red" as const,
    body: "Banyak kata kunci utama belum ada di CV kamu, jadi sistem pembaca lowongan berisiko melewatkan CV ini. Mulai dari daftar Belum ada di CV di bawah."
  };
};

export const MatchDashboard = () => {
  const analytics = useCvStore((state) => state.matchAnalytics);
  const hasKeywords = analytics.keywordMatches.length > 0;

  if (!hasKeywords) {
    return (
      <SectionCard title="Skor kecocokan CV" description="Skor muncul setelah kamu menempelkan iklan lowongan di langkah 2.">
        <EmptyState
          title="Belum ada skor"
          description="Isi data CV lebih dulu, lalu tempel iklan lowongan dan tekan Cocokkan dengan CV saya. Skor dan daftar kata kunci akan muncul di sini."
          action={
            <Link className="btn doodle-btn min-h-11 border-2 border-line bg-moss px-4 py-2 text-sm font-black text-white hover:bg-[#154538]" href="/lowongan">
              Buka langkah 2
            </Link>
          }
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
      title="Skor kecocokan CV"
      description="Skor dihitung dari tiga hal: kata kunci yang persis sama, kata yang hanya serupa, dan kerapian format. Angka ini berasal dari perhitungan, bukan tebakan acak."
    >
      <div className="grid gap-4">
        <div className={`doodle-card p-5 ${noteClass[verdict.note]}`}>
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-5">
            <div>
              <p className="text-sm font-black text-[#4d3b33]">Skor total</p>
              <AnimatedScore value={analytics.overallScore} className="mt-1 block text-5xl font-black leading-none text-ink" />
            </div>
            <div>
              <p className="text-sm font-black text-ink">{verdict.label}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#4d3b33]">{verdict.body}</p>
              <p className="mt-2 text-sm font-bold text-[#4d3b33]">
                {analytics.matchedKeywords.length} kata kunci sudah persis sama, {missing.length} belum ada.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ScoreCard label="Kata persis sama" value={analytics.exactMatchRate} help="Ditulis dengan istilah yang sama seperti di iklan." tone="green" />
          <ScoreCard label="Kata serupa" value={analytics.semanticProximity} help="Sudah ada padanannya, tapi istilahnya berbeda." tone="blue" />
          <ScoreCard label="Kerapian format" value={analytics.formatQualityScore} help="Kelengkapan kontak, format tanggal, dan angka di poin pengalaman." tone="yellow" />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <KeywordList title="Sudah ada di CV" items={analytics.matchedKeywords} tone="match" note="green" empty="Belum ada yang persis sama." />
          <KeywordList title="Ada padanannya" items={analytics.semanticKeywords} tone="semantic" note="yellow" empty="Tidak ada padanan." />
          <KeywordList title="Belum ada di CV" items={missing.map((item) => item.keyword)} tone="missing" note="red" empty="Semua kata kunci sudah ada." />
        </div>

        {missingGroups.length ? (
          <div className="rounded-[19px_14px_21px_16px] border-2 border-line bg-white p-4 shadow-[3px_4px_0_rgba(37,24,19,0.10)]">
            <h3 className="text-sm font-black text-ink">Cara memasukkan kata kunci yang belum ada</h3>
            <p className="mt-1 text-sm leading-6 text-[#57443b]">
              Jangan hanya menempelkan katanya di akhir kalimat. Sebutkan di kalimat yang menjelaskan apa yang kamu kerjakan, dan hanya kalau kamu memang pernah melakukannya.
            </p>
            <div className="mt-3 grid gap-3">
              {missingGroups.map((group) => (
                <div key={group.category} className="rounded-[16px_12px_18px_13px] border-2 border-dashed border-line p-3">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#57443b]">{group.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Tag key={item.keyword} tone="missing">{item.keyword}</Tag>
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4d3b33]">{describeKeywordAction(group.items[0])}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-[19px_14px_21px_16px] border-2 border-line bg-white p-3 text-sm leading-6 text-[#4d3b33] shadow-[3px_4px_0_rgba(37,24,19,0.10)]">
          <p className="font-black text-ink">Catatan format</p>
          <p>
            {analytics.formatCheckPassed
              ? "Struktur dasar sudah baik. Periksa lagi format tanggal MM/YYYY dan pastikan setiap poin pengalaman punya ukuran hasil."
              : "Masih ada bagian format yang belum lengkap: kontak, ringkasan, daftar keahlian, format tanggal MM/YYYY, atau poin pengalaman yang belum memuat angka."}
          </p>
        </div>
      </div>
    </SectionCard>
  );
};

/** Angka skor naik dari nol supaya mata pengguna berhenti di satu angka terpenting halaman ini. */
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
  <div className={`doodle-score p-4 ${noteClass[tone]}`}>
    <p className="text-sm font-black text-[#4d3b33]">{label}</p>
    <p className="mt-2 text-3xl font-black text-ink">{value}%</p>
    <p className="mt-2 text-xs font-semibold leading-5 text-[#4d3b33]">{help}</p>
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
  <div className={`rounded-[19px_14px_21px_16px] border-2 border-line p-3 shadow-[3px_4px_0_rgba(37,24,19,0.10)] ${noteClass[note]}`}>
    <h3 className="text-sm font-black text-ink">
      {title} <span className="font-bold">({items.length})</span>
    </h3>
    <div className="mt-3 flex flex-wrap gap-2">
      {items.length ? items.map((item) => <Tag key={item} tone={tone}>{item}</Tag>) : <p className="text-sm font-semibold text-[#57443b]">{empty}</p>}
    </div>
  </div>
);
