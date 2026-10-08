"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BulletRewriter } from "@/components/BulletRewriter";
import { CvPreview } from "@/components/CvPreview";
import { DoodleArt } from "@/components/DoodleArt";
import { ExportPanel } from "@/components/ExportPanel";
import { ImportPanel } from "@/components/ImportPanel";
import { JobAnalyzer } from "@/components/JobAnalyzer";
import { MasterCvEditor } from "@/components/MasterCvEditor";
import { MatchDashboard } from "@/components/MatchDashboard";
import { Reveal } from "@/components/Reveal";
import { getResumeCompleteness } from "@/lib/analyzer";
import { useCvStore } from "@/lib/store";

export type WorkspacePage = "dashboard" | "master" | "target" | "rewrite" | "export";
type StepId = Exclude<WorkspacePage, "dashboard">;

type Step = {
  id: StepId;
  href: string;
  order: number;
  short: string;
  title: string;
  body: string;
  color: string;
};

const steps: Step[] = [
  {
    id: "master",
    href: "/master-cv",
    order: 1,
    short: "Data CV",
    title: "Isi data CV",
    body: "Kontak, pengalaman, pendidikan, dan keahlian. Ini bahan mentah untuk semua langkah berikutnya.",
    color: "bg-[#fff0a8]"
  },
  {
    id: "target",
    href: "/lowongan",
    order: 2,
    short: "Lowongan",
    title: "Tempel iklan lowongan",
    body: "Salin seluruh isi iklan lowongan. Sistem membaca kata kunci yang diminta dan menandai yang belum ada di CV kamu.",
    color: "bg-[#e0f6fb]"
  },
  {
    id: "rewrite",
    href: "/optimasi",
    order: 3,
    short: "Optimasi",
    title: "Perbaiki kalimat pengalaman",
    body: "Pakai saran yang sesuai, lewati yang tidak. Sistem hanya menyusun ulang kalimatmu, tanpa menambah fakta baru.",
    color: "bg-[#e4f6df]"
  },
  {
    id: "export",
    href: "/export",
    order: 4,
    short: "Unduh",
    title: "Unduh CV siap kirim",
    body: "Pilih format PDF atau DOCX. Berkas dibuat di perangkat ini dengan format satu kolom ramah sistem ATS.",
    color: "bg-[#ffe1d6]"
  }
];

const pageCopy: Record<WorkspacePage, { title: string; body: string; step?: number; next?: StepId }> = {
  dashboard: {
    title: "Ruang kerja CV kamu",
    body: "Empat langkah dari data mentah sampai CV siap dikirim. Semua data tersimpan di perangkat ini, bukan di server."
  },
  master: {
    title: "Langkah 1: Isi data CV",
    body: "Tulis apa adanya. Sistem hanya menyusun ulang kata yang kamu tulis sendiri, jadi tidak ada keahlian atau angka yang muncul tiba-tiba.",
    step: 1,
    next: "target"
  },
  target: {
    title: "Langkah 2: Tempel iklan lowongan",
    body: "Masukkan judul posisi dan seluruh isi iklannya. Setelah dicocokkan, kamu akan melihat kata kunci mana yang sudah terbaca dan mana yang belum.",
    step: 2,
    next: "rewrite"
  },
  rewrite: {
    title: "Langkah 3: Perbaiki kalimat pengalaman",
    body: "Setiap saran memakai kalimatmu sendiri dan mengikuti pola tindakan, konteks, dan ukuran hasil (metode Google XYZ).",
    step: 3,
    next: "export"
  },
  export: {
    title: "Langkah 4: Unduh CV siap kirim",
    body: "Pilih format PDF atau DOCX, lalu unduh. Berkas dibuat di perangkat ini dengan format satu kolom supaya aman untuk ATS.",
    step: 4
  }
};

let hasHydratedOnce = false;

export const WorkspaceShell = ({ currentPage }: { currentPage: WorkspacePage }) => {
  const isHydrated = useCvStore((state) => state.hydrated);
  const [mounted, setMounted] = useState(() => {
    if (typeof window === "undefined") return false;
    return hasHydratedOnce || isHydrated;
  });

  const previewOpenDesktop = useCvStore((state) => state.previewOpenDesktop);
  const setPreviewOpenDesktop = useCvStore((state) => state.setPreviewOpenDesktop);
  const setModalPreviewOpen = useCvStore((state) => state.setModalPreviewOpen);

  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const job = useCvStore((state) => state.jobTarget);
  const analytics = useCvStore((state) => state.matchAnalytics);
  const suggestions = useCvStore((state) => state.suggestions);

  const completeness = getResumeCompleteness(resumeProfile);
  const analyzed = analytics.keywordMatches.length > 0;
  const pendingSuggestions = suggestions.filter((item) => item.status === "pending").length;

  const currentStep = steps.find((step) => step.id === currentPage);
  const copy = pageCopy[currentPage];
  const nextStep = copy.next ? steps.find((step) => step.id === copy.next) : undefined;

  const stepStatus = (id: StepId): { text: string; short: string; done: boolean } => {
    if (id === "master") {
      return completeness >= 80
        ? { text: `${completeness}% data sudah terisi`, short: "Selesai", done: true }
        : { text: `${completeness}% data terisi`, short: `${completeness}% terisi`, done: false };
    }
    if (id === "target") {
      if (!analyzed) return { text: "Belum ada iklan yang dianalisis", short: "Belum", done: false };
      return {
        text: `Skor ${analytics.overallScore}% untuk ${job.jobTitle || "lowongan ini"}`,
        short: `Skor ${analytics.overallScore}%`,
        done: true
      };
    }
    if (id === "rewrite") {
      if (!suggestions.length) return { text: "Belum ada saran", short: "Belum ada", done: false };
      if (pendingSuggestions) {
        return {
          text: `${pendingSuggestions} saran menunggu keputusanmu`,
          short: `${pendingSuggestions} saran`,
          done: false
        };
      }
      return { text: `${suggestions.length} saran sudah diputuskan`, short: "Selesai", done: true };
    }
    return { text: "Siap diunduh dalam format PDF atau DOCX", short: "Siap", done: false };
  };

  const focusStep = steps.find((step) => !stepStatus(step.id).done) ?? steps[steps.length - 1];

  const metricCards: Array<{ label: string; value: string; help: string; href: string; color: string }> = [
    {
      label: "Kelengkapan data CV",
      value: `${completeness}%`,
      help: completeness >= 80 ? "Sudah lengkap untuk diproses" : "Perlu dilengkapi di Langkah 1",
      href: "/master-cv",
      color: "bg-[#fff0a8]"
    },
    {
      label: "Skor kecocokan ATS",
      value: analyzed ? `${analytics.overallScore}%` : "Belum ada",
      help: analyzed ? `Dari kata kunci ${job.jobTitle || "lowongan"}` : "Tempel iklan di Langkah 2",
      href: "/lowongan",
      color: "bg-[#e0f6fb]"
    },
    {
      label: "Saran perbaikan",
      value: String(suggestions.length),
      help: pendingSuggestions ? `${pendingSuggestions} menunggu keputusanmu` : "Semua saran sudah selesai",
      href: "/optimasi",
      color: "bg-[#e4f6df]"
    }
  ];

  useEffect(() => {
    hasHydratedOnce = true;
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 w-full min-h-[60vh] p-4 sm:p-6 grid place-items-center">
        <div className="doodle-card bg-[var(--paper-strong)] p-8 text-center max-w-md">
          <p className="text-xs font-black uppercase tracking-widest text-[#57443b]">QuickTailor CV</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Menyiapkan ruang kerja</h1>
          <p className="mt-2 text-sm text-[#5c4a40]">Memuat data lokal dari perangkatmu...</p>
        </div>
      </div>
    );
  }

  const isDashboard = currentPage === "dashboard";

  return (
    <main className="flex-1 w-full mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8">
        {isDashboard ? (
          /* Dashboard Layout: Spacious 1-column Command Center */
          <div className="mx-auto max-w-5xl grid gap-7 py-2 sm:py-4">
            {/* Welcoming Hero Banner */}
            <div className="doodle-card bg-[var(--paper-strong)] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-ink leading-tight">
                    Susun CV yang cocok dengan lowongan impianmu
                  </h1>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#57443b] max-w-2xl">
                    Cocokkan kata kunci lowongan, perbaiki butir pengalaman kerja dengan metode Google XYZ, dan unduh dokumen siap lolos saringan ATS. Semua data 100% tersimpan aman di browser perangkatmu.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      href={focusStep.href}
                      className="btn doodle-btn bg-moss text-white hover:bg-[#154538] px-5 py-2.5 text-sm font-bold shadow-[2px_3px_0_rgba(37,24,19,0.18)]"
                    >
                      Lanjutkan Langkah {focusStep.order}: {focusStep.short}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setModalPreviewOpen(true)}
                      className="btn doodle-btn bg-white text-ink hover:bg-[#fff0a8]/60 px-4 py-2.5 text-sm font-bold"
                    >
                      Lihat Lembar CV Saat Ini
                    </button>
                  </div>
                </div>

                <div className="hidden lg:block h-44 rounded-2xl border-2 border-line/60 bg-[#fff0a8]/80 p-3 shadow-2xs">
                  <DoodleArt />
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <section aria-label="Ringkasan kemajuan" className="grid gap-4 sm:grid-cols-3">
              {metricCards.map((metric, index) => (
                <Reveal key={metric.label} delay={index * 50}>
                  <Link
                    href={metric.href}
                    className={`block h-full rounded-2xl border-2 border-line p-5 shadow-[3px_4px_0_rgba(37,24,19,0.10)] transition-all hover:-translate-y-1 ${metric.color}`}
                  >
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#57443b]">{metric.label}</span>
                    <span className="mt-2 block text-3xl sm:text-4xl font-black text-ink">{metric.value}</span>
                    <span className="mt-2 block text-xs font-medium text-[#4d3b33] leading-relaxed">{metric.help}</span>
                  </Link>
                </Reveal>
              ))}
            </section>

            {/* 4 Steps Interactive Roadmap */}
            <section aria-label="Alur 4 Langkah Kerja" className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-ink">Alur 4 Langkah Kerja</h2>
                  <p className="text-xs sm:text-sm text-[#57443b] mt-0.5">Selesaikan berurutan untuk hasil CV terbaik</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => {
                  const status = stepStatus(step.id);
                  const isCurrentFocus = focusStep.id === step.id;
                  return (
                    <div
                      key={step.id}
                      className={`rounded-2xl border-2 border-line p-5 flex flex-col justify-between shadow-[2px_3px_0_rgba(37,24,19,0.08)] transition-all ${
                        isCurrentFocus ? "bg-white ring-4 ring-moss/20" : "bg-white/90"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-xl border-2 border-line text-xs font-black shadow-2xs ${
                              status.done ? "bg-moss text-white" : `${step.color} text-ink`
                            }`}
                          >
                            {step.order}
                          </span>
                          <span className="text-xs font-semibold text-[#57443b]">
                            {status.done ? "Selesai" : isCurrentFocus ? "Fokus saat ini" : "Belum mulai"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-ink">{step.title}</h3>
                        <p className="mt-1.5 text-xs text-[#57443b] leading-relaxed">{step.body}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-line/10">
                        <Link
                          href={step.href}
                          className={`btn doodle-btn w-full min-h-[38px] text-xs font-bold justify-center ${
                            isCurrentFocus
                              ? "bg-moss text-white hover:bg-[#154538]"
                              : "bg-[#fffdf7] text-ink hover:bg-[#fff0a8]"
                          }`}
                        >
                          Buka Langkah {step.order}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          /* Workspace Steps Layout: Spacious 2-Column or Focused 1-Column */
          <div>
            {/* Step Context Sub-header Banner */}
            <div className={`doodle-card mb-6 p-4 sm:p-5 ${currentStep ? currentStep.color : "bg-[#fff0a8]"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#57443b] mb-1">
                    Langkah {copy.step} dari 4 : {currentStep?.short}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">{copy.title}</h1>
                  <p className="mt-1 text-xs sm:text-sm text-[#57443b] leading-relaxed max-w-2xl">{copy.body}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {nextStep ? (
                    <Link
                      href={nextStep.href}
                      className="btn doodle-btn min-h-[42px] bg-moss text-white hover:bg-[#154538] px-4 py-2 text-xs sm:text-sm font-bold shadow-[2px_2px_0_rgba(37,24,19,0.18)]"
                    >
                      Lanjut ke Langkah {nextStep.order}: {nextStep.short}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div
              className={`grid gap-6 items-start ${
                previewOpenDesktop
                  ? "lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_500px]"
                  : "max-w-4xl mx-auto"
              }`}
            >
              {/* Left Column: Spacious Form / Tool */}
              <div className="min-w-0 grid gap-6">
                {currentPage === "master" ? (
                  <div className="grid gap-6">
                    <ImportPanel />
                    <MasterCvEditor />
                  </div>
                ) : null}

                {currentPage === "target" ? (
                  <div className="grid gap-6">
                    <JobAnalyzer />
                    <MatchDashboard />
                  </div>
                ) : null}

                {currentPage === "rewrite" ? <BulletRewriter /> : null}

                {currentPage === "export" ? <ExportPanel /> : null}

                {/* Banner when desktop preview is closed */}
                {!previewOpenDesktop ? (
                  <div className="rounded-2xl border-2 border-dashed border-line/30 bg-white/70 p-4 text-center">
                    <p className="text-xs text-[#57443b]">
                      Pratinjau CV sedang disembunyikan untuk ruang menulis yang lebih luas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewOpenDesktop(true)}
                      className="mt-2 text-xs font-bold text-moss hover:underline"
                    >
                      Tampilkan Pratinjau Berdampingan
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Right Column: Sticky Live CV Preview (Zero scrollbar clutter!) */}
              {previewOpenDesktop ? (
                <div className="hidden lg:block sticky top-20">
                  <CvPreview onOpenModal={() => setModalPreviewOpen(true)} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    );
  };
