"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BulletRewriter } from "@/components/BulletRewriter";
import { CvPreview } from "@/components/CvPreview";
import { ExportPanel } from "@/components/ExportPanel";
import { Header } from "@/components/Header";
import { ImportPanel } from "@/components/ImportPanel";
import { JobAnalyzer } from "@/components/JobAnalyzer";
import { MasterCvEditor } from "@/components/MasterCvEditor";
import { MatchDashboard } from "@/components/MatchDashboard";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui";
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

/** Urutan langkah ini mengikuti alur kerja produk yang sebenarnya, bukan template tiga langkah. */
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
    body: "Salin seluruh isi iklan dari portal kerja. Sistem membaca kata kunci yang diminta dan menandai yang belum ada di CV kamu.",
    color: "bg-[#e0f6fb]"
  },
  {
    id: "rewrite",
    href: "/optimasi",
    order: 3,
    short: "Perbaiki",
    title: "Perbaiki kalimat pengalaman",
    body: "Pakai saran yang sesuai, lewati yang tidak. Sistem hanya menyusun ulang kalimatmu, tanpa menambah fakta baru.",
    color: "bg-[#e4f6df]"
  },
  {
    id: "export",
    href: "/export",
    order: 4,
    short: "Unduh",
    title: "Unduh CV",
    body: "Pratinjau gratis bertanda air, atau unduhan bersih memakai token.",
    color: "bg-[#ffe1d6]"
  }
];

const pageCopy: Record<WorkspacePage, { title: string; body: string; step?: number; next?: StepId }> = {
  dashboard: {
    title: "Ruang kerja CV kamu",
    body: "Empat langkah dari data mentah sampai CV siap dikirim. Semua data tersimpan di perangkat ini, bukan di server."
  },
  master: {
    title: "Isi data CV",
    body: "Tulis apa adanya. Sistem hanya menyusun ulang kata yang kamu tulis sendiri, jadi tidak ada keahlian atau angka yang muncul tiba-tiba.",
    step: 1,
    next: "target"
  },
  target: {
    title: "Tempel iklan lowongan",
    body: "Masukkan judul posisi dan seluruh isi iklannya. Setelah dianalisis, kamu akan melihat kata kunci mana yang sudah terbaca dan mana yang belum.",
    step: 2,
    next: "rewrite"
  },
  rewrite: {
    title: "Perbaiki kalimat pengalaman",
    body: "Setiap saran memakai kalimatmu sendiri dan mengikuti pola hasil, ukuran, dan cara kerja. Kalau datanya belum ada, sistem memintamu menambahkannya, bukan mengarang.",
    step: 3,
    next: "export"
  },
  export: {
    title: "Unduh CV",
    body: "Pratinjau gratis memakai tanda air. Unduhan bersih butuh token, dan kartu QRIS di layar ini masih penanda uji coba yang belum terhubung ke pembayaran.",
    step: 4
  }
};

export const WorkspaceShell = ({ currentPage }: { currentPage: WorkspacePage }) => {
  const [mounted, setMounted] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetAll = useCvStore((state) => state.resetAll);
  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const job = useCvStore((state) => state.jobTarget);
  const analytics = useCvStore((state) => state.matchAnalytics);
  const suggestions = useCvStore((state) => state.suggestions);
  const tokens = useCvStore((state) => state.exportTokens);

  const completeness = getResumeCompleteness(resumeProfile);
  const analyzed = analytics.keywordMatches.length > 0;
  const pendingSuggestions = suggestions.filter((item) => item.status === "pending").length;
  const current = steps.find((step) => step.id === currentPage);
  const copy = pageCopy[currentPage];
  const nextStep = copy.next ? steps.find((step) => step.id === copy.next) : undefined;

  const stepStatus = (id: StepId) => {
    if (id === "master") {
      return completeness >= 80
        ? { text: "Selesai", done: true }
        : { text: `${completeness}% terisi`, done: false };
    }
    if (id === "target") {
      if (!analyzed) return { text: "Belum dianalisis", done: false };
      return { text: `Skor ${analytics.overallScore}% untuk ${job.jobTitle || "lowongan ini"}`, done: true };
    }
    if (id === "rewrite") {
      if (!suggestions.length) return { text: "Belum ada saran", done: false };
      if (pendingSuggestions) return { text: `${pendingSuggestions} saran menunggu keputusan`, done: false };
      return { text: `${suggestions.length} saran sudah diputuskan`, done: true };
    }
    return { text: tokens > 0 ? `${tokens} token siap dipakai` : "Unduhan pratinjau gratis", done: false };
  };

  const focusStep = steps.find((step) => !stepStatus(step.id).done) ?? steps[steps.length - 1];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!previewOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewOpen]);

  if (!mounted) {
    return (
      <main className="doodle-stage min-h-screen p-4 sm:p-6">
        <div className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center">
          <div className="doodle-card bg-[var(--paper-strong)] p-6 text-center">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#57443b]">QuickTailor CV</p>
            <h1 className="mt-2 text-2xl font-black text-ink">Menyiapkan ruang kerja</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#4d3b33]">Data CV dimuat dari penyimpanan perangkat ini. Tunggu sebentar.</p>
          </div>
        </div>
      </main>
    );
  }

  const resetControl = confirmReset ? (
    <div className="rounded-[18px_13px_20px_14px] border-2 border-dashed border-line bg-[#ffe1d6] p-3">
      <p className="text-xs font-black text-[#7b1f14]">Hapus semua data CV di perangkat ini?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            resetAll();
            setConfirmReset(false);
          }}
        >
          Ya, hapus semua
        </Button>
        <Button type="button" variant="secondary" onClick={() => setConfirmReset(false)}>
          Batal
        </Button>
      </div>
    </div>
  ) : (
    <Button type="button" variant="danger" className="w-full" onClick={() => setConfirmReset(true)}>
      Hapus semua data
    </Button>
  );

  return (
    <main className="doodle-stage min-h-screen">
      <Header />
      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[245px_minmax(0,1fr)] lg:items-start lg:px-8 xl:grid-cols-[245px_minmax(0,1fr)_minmax(380px,0.92fr)]">
        <aside className="min-w-0">
          {/* Layar kecil: stepper mendatar, bukan daftar panjang yang mendorong isi ke bawah. */}
          <div className="lg:hidden">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#57443b]">Langkah kerja</p>
            <nav aria-label="Langkah kerja" className="mt-2 flex snap-x gap-2 overflow-x-auto pb-2">
              <Link
                href="/"
                className={`flex min-h-11 shrink-0 snap-start items-center rounded-[14px_10px_16px_12px] border-2 border-line px-3 text-sm font-black shadow-[2px_3px_0_rgba(37,24,19,0.14)] ${currentPage === "dashboard" ? "bg-white ring-4 ring-[#251813]/10" : "bg-[#fffaf0]"}`}
              >
                Ringkasan
              </Link>
              {steps.map((step) => {
                const status = stepStatus(step.id);
                const selected = currentPage === step.id;
                return (
                  <Link
                    key={step.id}
                    href={step.href}
                    className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-[14px_10px_16px_12px] border-2 border-line px-3 text-sm font-black shadow-[2px_3px_0_rgba(37,24,19,0.14)] ${selected ? `${step.color} ring-4 ring-[#251813]/10` : "bg-white"}`}
                    aria-current={selected ? "page" : undefined}
                  >
                    <span aria-hidden="true">{status.done ? "✓" : step.order}</span>
                    {step.short}
                    <span className="sr-only">{status.done ? "selesai" : status.text}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
              <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
                Lihat CV
              </Button>
              {resetControl}
            </div>
          </div>

          {/* Layar besar: rail lengkap dengan nomor langkah dan status nyata. */}
          <div className="hidden lg:block lg:sticky lg:top-5">
            <div className="doodle-card bg-[var(--paper-strong)] p-4">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#57443b]">Alur kerja</p>
                <h2 className="mt-1 text-xl font-black leading-tight text-ink"><span className="doodle-title-mark">Langkah kerja</span></h2>
              </div>
              <nav aria-label="Langkah kerja" className="grid gap-2">
                <Link
                  href="/"
                  className={`flex min-h-11 items-center rounded-[16px_12px_18px_13px] border-2 border-line px-3 text-sm font-black shadow-[2px_3px_0_rgba(37,24,19,0.12)] transition hover:-translate-y-0.5 ${currentPage === "dashboard" ? "bg-white ring-4 ring-[#251813]/10" : "bg-[#fffaf0]"}`}
                  aria-current={currentPage === "dashboard" ? "page" : undefined}
                >
                  Ringkasan
                </Link>
                {steps.map((step) => {
                  const status = stepStatus(step.id);
                  const selected = currentPage === step.id;
                  const isFocus = focusStep.id === step.id && !selected;
                  return (
                    <Link
                      key={step.id}
                      href={step.href}
                      className={`flex min-h-11 items-start gap-3 rounded-[16px_12px_18px_13px] border-2 border-line p-3 shadow-[2px_3px_0_rgba(37,24,19,0.12)] transition hover:-translate-y-0.5 ${selected ? `${step.color} ring-4 ring-[#251813]/10` : "bg-white"}`}
                      aria-current={selected ? "page" : undefined}
                    >
                      <span className="doodle-step-number" data-state={status.done ? "done" : "todo"} aria-hidden="true">
                        {status.done ? "✓" : step.order}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-ink">{step.title}</span>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-[#57443b]">{status.text}</span>
                        {isFocus ? <span className="mt-1 inline-block text-xs font-black text-moss">Lanjutkan di sini</span> : null}
                      </span>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-4 grid gap-2">
                <Button type="button" className="w-full" onClick={() => setPreviewOpen(true)}>
                  Lihat CV sekarang
                </Button>
                {resetControl}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className={`no-print doodle-card mb-5 p-5 ${current ? current.color : "bg-[#e0f6fb]"}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#57443b]">
                  {copy.step ? `Langkah ${copy.step} dari ${steps.length}` : "Ringkasan"}
                </p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-ink sm:text-3xl">{copy.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#4d3b33]">{copy.body}</p>
              </div>
              {nextStep ? (
                <Link
                  className="btn doodle-btn min-h-11 border-2 border-line bg-moss px-4 py-2 text-sm font-black text-white hover:bg-[#154538]"
                  href={nextStep.href}
                >
                  Lanjut ke langkah {nextStep.order}
                </Link>
              ) : null}
            </div>
          </div>

          <div key={currentPage} className="motion-panel grid gap-5">
            {currentPage === "dashboard" ? (
              <Dashboard focusStep={focusStep} stepStatus={stepStatus} />
            ) : null}
            {currentPage === "master" ? (
              <div className="grid gap-5">
                <ImportPanel />
                <MasterCvEditor />
              </div>
            ) : null}
            {currentPage === "target" ? (
              <div className="grid gap-5">
                <JobAnalyzer />
                <MatchDashboard />
              </div>
            ) : null}
            {currentPage === "rewrite" ? <BulletRewriter /> : null}
            {currentPage === "export" ? <ExportPanel /> : null}
          </div>
        </section>

        <div className="hidden min-w-0 xl:block xl:sticky xl:top-5">
          <CvPreview />
        </div>
      </section>

      {previewOpen ? (
        <div
          className="motion-backdrop fixed inset-0 z-50 grid bg-black/45 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="motion-drawer ml-auto flex h-full w-full max-w-4xl flex-col gap-3 overflow-hidden rounded-[30px_22px_34px_24px] border-2 border-line bg-[var(--paper)] p-3 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#57443b]">Pratinjau</p>
                <h2 id="preview-title" className="text-xl font-black text-ink">CV kamu saat ini</h2>
              </div>
              <Button type="button" variant="secondary" autoFocus onClick={() => setPreviewOpen(false)}>
                Tutup pratinjau
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <CvPreview />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

const Dashboard = ({
  focusStep,
  stepStatus
}: {
  focusStep: Step;
  stepStatus: (id: StepId) => { text: string; done: boolean };
}) => (
  <div className="grid gap-5">
    <Reveal>
      <section className={`doodle-card p-5 ${focusStep.color}`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#57443b]">Kerjakan ini dulu</p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-ink">
              <span className="doodle-title-mark">Langkah {focusStep.order}: {focusStep.title}</span>
            </h3>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#4d3b33]">{focusStep.body}</p>
          </div>
          <Link
            className="btn doodle-btn min-h-11 border-2 border-line bg-moss px-5 py-3 text-sm font-black text-white hover:bg-[#154538]"
            href={focusStep.href}
          >
            Buka langkah ini
          </Link>
        </div>
      </section>
    </Reveal>

    <section className="doodle-card bg-[var(--paper-strong)] p-5">
      <h3 className="text-lg font-black text-ink"><span className="doodle-title-mark">Urutan lengkapnya</span></h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#4d3b33]">
        Nomor yang sudah bertanda centang berarti bagian itu sudah terisi. Kamu bisa kembali ke langkah mana pun tanpa kehilangan data.
      </p>
      <ol className="mt-4 grid gap-3">
        {steps.map((step, index) => {
          const status = stepStatus(step.id);
          return (
            <Reveal key={step.id} delay={index * 70}>
              <li>
                <Link
                  href={step.href}
                  className="flex min-h-16 items-center gap-4 rounded-[20px_14px_22px_16px] border-2 border-line bg-white p-3 shadow-[3px_4px_0_rgba(37,24,19,0.12)] transition hover:-translate-y-0.5"
                >
                  <span className="doodle-step-number" data-state={status.done ? "done" : "todo"} aria-hidden="true">
                    {status.done ? "✓" : step.order}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-ink">{step.title}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-[#57443b]">{status.text}</span>
                  </span>
                </Link>
              </li>
            </Reveal>
          );
        })}
      </ol>
    </section>
  </div>
);
