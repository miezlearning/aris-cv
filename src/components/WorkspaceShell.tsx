"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Export,
  FileMagnifyingGlass,
  FileText,
  Gauge,
  IdentificationCard,
  LockSimple,
  NotePencil,
  PencilLine,
  Student,
  Translate,
  UserCircleCheck
} from "@phosphor-icons/react";
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
import { extractAllResumeBullets } from "@/lib/ats/rewriter";
import { useLiveAts } from "@/lib/live-ats";
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
  badgeColor: string;
  barTint: string;
  medallion: string;
  icon: ReactNode;
};

const steps: Step[] = [
  {
    id: "master",
    href: "/master-cv",
    order: 1,
    short: "Data CV",
    title: "Isi data CV",
    body: "Kontak, pendidikan, proyek atau magang, pengalaman, dan keahlianmu.",
    badgeColor: "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]",
    barTint: "card-tint-butter",
    medallion: "bg-[#FFF0A8] text-[#251813] border-[#251813]",
    icon: <IdentificationCard size={20} weight="duotone" aria-hidden="true" />
  },
  {
    id: "target",
    href: "/lowongan",
    order: 2,
    short: "Lowongan",
    title: "Tempel iklan lowongan",
    body: "Pisahkan berkas administratif otomatis dan ukur kecocokan ATS secara jujur.",
    badgeColor: "bg-[#D6F3FA] text-[#124959] border-[#94D1DF]",
    barTint: "card-tint-sky",
    medallion: "bg-[#D6F3FA] text-[#124959] border-[#251813]",
    icon: <FileMagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
  },
  {
    id: "rewrite",
    href: "/optimasi",
    order: 3,
    short: "Optimasi",
    title: "Perbaiki kalimat pengalaman & proyek",
    body: "Susun ulang poinmu memakai pola Google XYZ / STAR tanpa menambah fakta palsu.",
    badgeColor: "bg-[#DFF5DA] text-[#144C32] border-[#9FD499]",
    barTint: "card-tint-sage",
    medallion: "bg-[#DFF5DA] text-[#144C32] border-[#251813]",
    icon: <PencilLine size={20} weight="duotone" aria-hidden="true" />
  },
  {
    id: "export",
    href: "/export",
    order: 4,
    short: "Unduh",
    title: "Unduh CV siap kirim",
    body: "Pilih bahasa ID atau Full-Content ATS English lalu unduh PDF atau DOCX.",
    badgeColor: "bg-[#FFE3D8] text-[#7B1F14] border-[#E9A590]",
    barTint: "card-tint-clay",
    medallion: "bg-[#FFE3D8] text-[#7B1F14] border-[#251813]",
    icon: <Export size={20} weight="duotone" aria-hidden="true" />
  }
];

const pageCopy: Record<WorkspacePage, { title: string; body: string; step?: number; next?: StepId }> = {
  dashboard: {
    title: "Ruang kerja CV kamu",
    body: "Empat langkah dari data mentah sampai CV siap dikirim. Semua data tersimpan di browser perangkat ini, bukan di server."
  },
  master: {
    title: "Isi Data CV",
    body: "Cocok untuk fresh graduate maupun pelamar berpengalaman. Tulis fakta apa adanya agar sistem membantu menyusunnya dengan rapi.",
    step: 1,
    next: "target"
  },
  target: {
    title: "Analisis Iklan Lowongan",
    body: "Tempel iklan lowongan bahasa Indonesia, Inggris, atau campuran. Syarat berkas (KTP, SKCK, usia) dipisahkan otomatis dari skor ATS.",
    step: 2,
    next: "rewrite"
  },
  rewrite: {
    title: "Optimasi Kalimat Google XYZ / STAR",
    body: "Pilih saran yang sesuai atau sunting langsung. Poin dari Proyek Kuliah, Magang, Pengalaman Kerja, hingga Organisasi didukung penuh.",
    step: 3,
    next: "export"
  },
  export: {
    title: "Unduh CV ATS-Safe",
    body: "Pilih bahasa dokumen (Indonesia, Full ATS English, atau Otomatis) lalu ekspor PDF, DOCX, atau TXT langsung di perangkatmu.",
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

  const [mobilePane, setMobilePane] = useState<"editor" | "preview">("editor");

  const previewOpenDesktop = useCvStore((state) => state.previewOpenDesktop);
  const setPreviewOpenDesktop = useCvStore((state) => state.setPreviewOpenDesktop);
  const setModalPreviewOpen = useCvStore((state) => state.setModalPreviewOpen);

  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const job = useCvStore((state) => state.jobTarget);
  const { analytics, effectiveResume } = useLiveAts();
  const activeMasterTab = useCvStore((state) => state.activeMasterTab);

  const completeness = getResumeCompleteness(resumeProfile);
  const analyzed = analytics.hasAnalyzed;
  const liveBullets = extractAllResumeBullets(effectiveResume, analytics);
  const pendingSuggestions = liveBullets.filter((item) => item.analysis.needsImprovement).length;

  const currentStep = steps.find((step) => step.id === currentPage);
  const copy = pageCopy[currentPage];
  const nextStep = copy.next ? steps.find((step) => step.id === copy.next) : undefined;

  const stepStatus = (id: StepId): { text: string; short: string; done: boolean } => {
    if (id === "master") {
      return completeness >= 80
        ? { text: `${completeness}% data terisi`, short: "Selesai", done: true }
        : { text: `${completeness}% data terisi`, short: `${completeness}% terisi`, done: false };
    }
    if (id === "target") {
      if (!analyzed) return { text: "Belum ada iklan dianalisis", short: "Belum", done: false };
      return {
        text: `Skor ${analytics.overallScore}% untuk ${job.jobTitle || "lowongan ini"}`,
        short: `Skor ${analytics.overallScore}%`,
        done: true
      };
    }
    if (id === "rewrite") {
      if (!analyzed) return { text: "Menunggu analisis lowongan", short: "Belum", done: false };
      if (!liveBullets.length) return { text: "Belum ada poin kalimat tertulis", short: "Kosong", done: false };
      if (pendingSuggestions) {
        return {
          text: `${pendingSuggestions} poin kalimat bisa diperkuat`,
          short: `${pendingSuggestions} poin`,
          done: false
        };
      }
      return { text: `${liveBullets.length} poin kalimat sudah kuat`, short: "Selesai", done: true };
    }
    return { text: "Siap diunduh dalam PDF atau DOCX", short: "Siap", done: false };
  };

  const focusStep = steps.find((step) => !stepStatus(step.id).done) ?? steps[steps.length - 1];

  const suggestionMetric = (() => {
    if (!analyzed) {
      return {
        value: "Belum dianalisis",
        help:
          completeness < 30
            ? "Lengkapi data CV dulu di Langkah 1, lalu analisis lowongan"
            : "Jalankan analisis iklan lowongan di Langkah 2"
      };
    }
    if (!liveBullets.length) {
      return {
        value: "0 poin",
        help: "Tambahkan poin pengalaman, proyek, atau organisasi di Langkah 1"
      };
    }
    if (pendingSuggestions > 0) {
      return {
        value: `${pendingSuggestions} perlu dioptimasi`,
        help: `Dari total ${liveBullets.length} poin kalimat di Langkah 3`
      };
    }
    return {
      value: "Siap & Kuat",
      help: `Seluruh ${liveBullets.length} poin sudah kuat (tetap bisa disunting di Langkah 3)`
    };
  })();

  const metricCards: Array<{
    label: string;
    value: string;
    help: string;
    href: string;
    bg: string;
    medallion: string;
    icon: ReactNode;
    progress?: number;
  }> = [
    {
      label: "Kelengkapan data CV",
      value: `${completeness}%`,
      help:
        completeness >= 80
          ? "Siap dicocokkan dengan iklan lowongan"
          : resumeProfile.experienceLevel === "fresh_graduate"
          ? "Isi Profil, Pendidikan, Proyek/Organisasi, & Keahlian"
          : "Perlu dilengkapi di Langkah 1",
      href: "/master-cv",
      bg: "bg-[#FFF4BF]",
      medallion: "bg-[#FFFFFF] text-[#251813] border-[#251813]",
      icon: <UserCircleCheck size={20} weight="duotone" aria-hidden="true" />,
      progress: completeness
    },
    {
      label: "Skor kecocokan ATS",
      value: analyzed ? `${analytics.overallScore}%` : "Belum dianalisis",
      help: analyzed ? `Untuk ${job.jobTitle || "lowongan target"}` : "Tempel iklan lowongan di Langkah 2",
      href: "/lowongan",
      bg: "bg-[#D6F3FA]",
      medallion: "bg-[#FFFFFF] text-[#124959] border-[#251813]",
      icon: <Gauge size={20} weight="duotone" aria-hidden="true" />,
      progress: analyzed ? analytics.overallScore : undefined
    },
    {
      label: "Saran perbaikan kalimat",
      value: suggestionMetric.value,
      help: suggestionMetric.help,
      href: "/optimasi",
      bg: "bg-[#DFF5DA]",
      medallion: "bg-[#FFFFFF] text-[#144C32] border-[#251813]",
      icon: <NotePencil size={20} weight="duotone" aria-hidden="true" />
    }
  ];

  useEffect(() => {
    hasHydratedOnce = true;
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 w-full min-h-[60vh] p-4 sm:p-6 grid place-items-center">
        <div className="surface-card p-8 text-center max-w-md">
          <p className="text-xs font-bold uppercase tracking-widest text-[#59483F]">QuickTailor CV</p>
          <h1 className="mt-2 text-2xl font-bold text-[#251813]">Menyiapkan ruang kerja</h1>
          <p className="mt-2 text-sm text-[#4E3E36]">Memuat data lokal dari perangkatmu...</p>
        </div>
      </div>
    );
  }

  const isDashboard = currentPage === "dashboard";

  return (
    <main className="flex-1 w-full mx-auto max-w-[1560px] px-4 py-5 sm:px-6 lg:px-8">
      {isDashboard ? (
        <div className="mx-auto max-w-5xl grid gap-6 py-2">
          {/* Hero Utama dengan aksen kartu stationery hangat */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
            className="doodle-card card-tint-butter p-6 sm:p-8"
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_240px] lg:items-center">
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#251813] leading-tight">
                  Susun CV yang <span className="doodle-title-mark">cocok dan jujur</span> untuk lowongan impianmu
                </h1>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#4E3E36] max-w-2xl">
                  Dirancang untuk fresh graduate, pelamar pemula, hingga profesional. Cocokkan kualifikasi lowongan, pisahkan syarat berkas administratif secara otomatis, terjemahkan isi CV ke English standar ATS, dan unduh langsung di browsermu.
                </p>

                {/* Capability highlights dengan ikon duotone */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#9FD499] bg-[#DFF5DA] px-2.5 py-1 text-[#144C32]">
                    <LockSimple size={14} weight="duotone" aria-hidden="true" />
                    100% Lokal di Browser
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#94D1DF] bg-[#D6F3FA] px-2.5 py-1 text-[#124959]">
                    <Student size={14} weight="duotone" aria-hidden="true" />
                    Ramah Fresh Graduate
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFC25A] bg-[#FFF0A8] px-2.5 py-1 text-[#4A3A2E]">
                    <Translate size={14} weight="duotone" aria-hidden="true" />
                    Bilingual ID & Full ATS English
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={focusStep.href}
                    className="btn doodle-btn bg-[#1F6B57] text-white border-2 border-[#251813] shadow-[2px_3px_0_rgba(37,24,19,0.18)] hover:bg-[#154538] px-5 py-2.5 text-sm font-bold"
                  >
                    Lanjutkan Langkah {focusStep.order}: {focusStep.short}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalPreviewOpen(true)}
                    className="btn doodle-btn bg-white text-[#251813] border border-[#C2B49E] hover:bg-[#FFF8DF] px-4 py-2.5 text-sm font-bold gap-1.5"
                  >
                    <FileText size={16} weight="duotone" aria-hidden="true" />
                    <span>Lihat Lembar CV Saat Ini</span>
                  </button>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.45, delay: 0.08, ease: [0.2, 0.7, 0.3, 1] }}
                className="hidden lg:block h-48 rounded-2xl border-2 border-[#251813] bg-[#FFF0A8] p-3 shadow-[3px_4px_0_rgba(37,24,19,0.14)]"
              >
                <DoodleArt />
              </motion.div>
            </div>
          </motion.div>

          {/* Ringkasan Kemajuan */}
          <section aria-label="Ringkasan kemajuan" className="grid gap-4 sm:grid-cols-3">
            {metricCards.map((metric, index) => (
              <Reveal key={metric.label} delay={index * 45}>
                <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 360, damping: 24 }} className="h-full">
                  <Link
                    href={metric.href}
                    className={`flex flex-col justify-between h-full rounded-2xl border-2 border-[#251813]/85 p-5 shadow-[3px_4px_0_rgba(37,24,19,0.10)] ${metric.bg}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#4E3E36]">
                          {metric.label}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 ${metric.medallion}`}
                        >
                          {metric.icon}
                        </span>
                      </div>
                      <span className="mt-2 block text-2xl sm:text-3xl font-black text-[#251813]">
                        {metric.value}
                      </span>
                      {metric.progress !== undefined ? (
                        <div className="mt-2.5 h-2 w-full rounded-full bg-white/75 border border-[#251813]/15 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${metric.progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full rounded-full bg-[#1F6B57]"
                          />
                        </div>
                      ) : null}
                    </div>
                    <span className="mt-3 block text-xs sm:text-[13px] font-medium text-[#4E3E36] leading-relaxed">
                      {metric.help}
                    </span>
                  </Link>
                </motion.div>
              </Reveal>
            ))}
          </section>

          {/* Alur 4 Langkah Kerja */}
          <section aria-label="Alur 4 Langkah Kerja" className="grid gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#251813]">Alur 4 Langkah Kerja</h2>
              <p className="text-xs sm:text-sm text-[#4E3E36] mt-0.5">
                Kerjakan berurutan agar isi CV selaras dengan lowongan yang kamu lamar.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => {
                const status = stepStatus(step.id);
                const isCurrentFocus = focusStep.id === step.id;
                return (
                  <motion.div
                    key={step.id}
                    whileHover={{ y: -3 }}
                    transition={{ type: "spring", stiffness: 360, damping: 24 }}
                    className={`rounded-2xl p-5 flex flex-col justify-between transition-colors ${
                      isCurrentFocus
                        ? "border-2 border-[#251813] bg-white shadow-[3px_4px_0_rgba(37,24,19,0.14)]"
                        : "border border-[#D9CEBC] bg-[#FFFDF8] shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`grid h-9 w-9 place-items-center rounded-xl border-2 ${
                              status.done ? "border-[#251813] bg-[#1F6B57] text-white" : step.medallion
                            }`}
                          >
                            {step.icon}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#59483F]">
                            Langkah {step.order}
                          </span>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                            status.done
                              ? "bg-[#DFF5DA] text-[#144C32] border-[#9FD499]"
                              : isCurrentFocus
                              ? "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]"
                              : "bg-[#FAF5E8] text-[#59483F] border-[#D9CEBC]"
                          }`}
                        >
                          {status.done ? "Selesai" : isCurrentFocus ? "Fokus" : "Siap"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#251813]">{step.title}</h3>
                      <p className="mt-1.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                        {step.body}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#D9CEBC]">
                      <Link
                        href={step.href}
                        className={`btn doodle-btn w-full min-h-[44px] text-xs sm:text-sm font-bold justify-center ${
                          isCurrentFocus
                            ? "bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538]"
                            : "bg-white text-[#251813] border border-[#C2B49E] hover:bg-[#FFF8DF]"
                        }`}
                      >
                        Buka Langkah {step.order}
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <div>
          {/* Compact Step Bar dengan warna pastel spesifik langkah & ikon duotone */}
          <div
            className={`rounded-2xl border border-[#D9CEBC] mb-4 px-4 py-3 sm:px-5 shadow-xs ${
              currentStep?.barTint ?? "bg-[#FFFDF8]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 shadow-[2px_2px_0_rgba(37,24,19,0.12)] ${
                    currentStep?.medallion ?? "bg-[#FFF0A8] text-[#251813] border-[#251813]"
                  }`}
                >
                  {currentStep?.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${
                        currentStep?.badgeColor ?? "bg-[#FFF0A8] text-[#4A3A2E] border-[#DFC25A]"
                      }`}
                    >
                      Langkah {copy.step} dari 4
                    </span>
                    <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#251813] leading-snug">
                      {copy.title}
                    </h1>
                  </div>
                  <p className="mt-0.5 text-xs sm:text-[13px] text-[#4E3E36] leading-relaxed">
                    {copy.body}
                  </p>
                </div>
              </div>

              {nextStep ? (
                <Link
                  href={nextStep.href}
                  className="btn doodle-btn shrink-0 min-h-[44px] bg-[#1F6B57] text-white border-2 border-[#251813] hover:bg-[#154538] px-4 py-1.5 text-xs sm:text-sm font-bold shadow-[2px_2px_0_rgba(37,24,19,0.14)]"
                >
                  Lanjut Langkah {nextStep.order}: {nextStep.short}
                </Link>
              ) : null}
            </div>
          </div>

          {/* Mobile / Tablet (< lg) Switcher dengan sliding spring indicator */}
          <div className="lg:hidden mb-4">
            <div
              role="tablist"
              aria-label="Mode tampilan"
              className="relative grid grid-cols-2 gap-1 rounded-xl border border-[#D9CEBC] bg-[#F3E7C8] p-1"
            >
              {(["editor", "preview"] as const).map((pane) => {
                const selected = mobilePane === pane;
                return (
                  <button
                    key={pane}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setMobilePane(pane)}
                    className={`relative z-10 flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                      selected ? "text-[#251813]" : "text-[#4E3E36]"
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="mobile-pane-pill"
                        className="absolute inset-0 rounded-lg bg-white border border-[#C2B49E] shadow-2xs -z-10"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                    {pane === "editor" ? (
                      <NotePencil size={16} weight={selected ? "duotone" : "regular"} aria-hidden="true" />
                    ) : (
                      <FileText size={16} weight={selected ? "duotone" : "regular"} aria-hidden="true" />
                    )}
                    <span>{pane === "editor" ? "Editor" : "Pratinjau CV"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Split-Pane Layout */}
          <div
            className={`grid gap-6 items-start ${
              previewOpenDesktop
                ? "lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_480px] 2xl:grid-cols-[minmax(0,1fr)_520px]"
                : "max-w-4xl mx-auto"
            }`}
          >
            {/* Left Column */}
            <div className={`min-w-0 w-full grid gap-5 ${mobilePane === "preview" ? "hidden lg:grid" : "grid"}`}>
              {currentPage === "master" ? (
                <div className="min-w-0 grid gap-5">
                  <ImportPanel />
                  <MasterCvEditor />
                </div>
              ) : null}

              {currentPage === "target" ? (
                <div className="min-w-0 grid gap-5">
                  <JobAnalyzer />
                  <MatchDashboard />
                </div>
              ) : null}

              {currentPage === "rewrite" ? <BulletRewriter /> : null}

              {currentPage === "export" ? <ExportPanel /> : null}

              {!previewOpenDesktop ? (
                <div className="hidden lg:block rounded-2xl border border-dashed border-[#C2B49E] bg-white p-4 text-center">
                  <p className="text-xs text-[#4E3E36]">
                    Pratinjau CV sedang disembunyikan untuk ruang menulis yang lebih luas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewOpenDesktop(true)}
                    className="mt-1.5 text-xs font-bold text-[#1F6B57] hover:underline"
                  >
                    Tampilkan Pratinjau Berdampingan
                  </button>
                </div>
              ) : null}
            </div>

            {/* Mobile/Tablet Inline Preview Pane */}
            {mobilePane === "preview" ? (
              <div className="lg:hidden min-w-0">
                <CvPreview
                  onOpenModal={() => setModalPreviewOpen(true)}
                  highlightSection={currentPage === "master" ? activeMasterTab : undefined}
                />
              </div>
            ) : null}

            {/* Right Column: Sticky Live CV Preview on Desktop */}
            {previewOpenDesktop ? (
              <div className="hidden lg:block sticky top-20">
                <CvPreview
                  onOpenModal={() => setModalPreviewOpen(true)}
                  highlightSection={currentPage === "master" ? activeMasterTab : undefined}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
};
