"use client";

import { useState } from "react";
import { BulletRewriter } from "@/components/BulletRewriter";
import { CvPreview } from "@/components/CvPreview";
import { ExportPanel } from "@/components/ExportPanel";
import { Header } from "@/components/Header";
import { ImportPanel } from "@/components/ImportPanel";
import { JobAnalyzer } from "@/components/JobAnalyzer";
import { MasterCvEditor } from "@/components/MasterCvEditor";
import { MatchDashboard } from "@/components/MatchDashboard";
import { Button } from "@/components/ui";
import { useCvStore } from "@/lib/store";

type WorkspaceTab = "profile" | "target" | "rewrite" | "export";

const workspaceTabs: Array<{ id: WorkspaceTab; label: string; hint: string; color: string }> = [
  { id: "profile", label: "Master CV", hint: "Kontak, pengalaman, pendidikan, skills", color: "bg-[#fff0a8]" },
  { id: "target", label: "Lowongan", hint: "JD extractor, gap, skor ATS", color: "bg-[#e0f6fb]" },
  { id: "rewrite", label: "Rewrite", hint: "Accept, edit, reject bullet", color: "bg-[#e4f6df]" },
  { id: "export", label: "Export", hint: "PDF, DOCX, token testing", color: "bg-[#ffe1d6]" }
];

export default function Home() {
  const resetAll = useCvStore((state) => state.resetAll);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("profile");

  return (
    <main className="doodle-stage min-h-screen">
      <Header />
      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)_minmax(440px,0.9fr)] lg:items-start lg:px-8">
        <aside className="no-print lg:sticky lg:top-5">
          <div className="doodle-card bg-[var(--paper-strong)] p-4">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#57443b]">Studio CV</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-ink"><span className="doodle-title-mark">Pilih meja kerja</span></h2>
            </div>
            <nav aria-label="Navigasi workspace" className="grid gap-3">
              {workspaceTabs.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-16 rounded-[20px_14px_22px_16px] border-2 border-line p-3 text-left shadow-[3px_4px_0_rgba(37,24,19,0.12)] transition hover:-translate-y-0.5 ${tab.color} ${selected ? "rotate-[-1deg] ring-4 ring-[#251813]/10" : "bg-white"}`}
                    aria-current={selected ? "page" : undefined}
                  >
                    <span className="block text-sm font-black text-ink">{tab.label}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-[#57443b]">{tab.hint}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 rounded-[18px_13px_20px_14px] border-2 border-dashed border-line bg-white p-3 text-xs font-semibold leading-5 text-[#57443b]">
              Preview di kanan selalu hidup. Kamu tidak perlu scroll ke bawah hanya untuk cek hasil.
            </div>
            <Button type="button" variant="danger" className="mt-4 w-full" onClick={resetAll}>Reset data lokal</Button>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="no-print doodle-card mb-5 bg-[#e0f6fb] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#57443b]">Panel aktif</p>
                <h2 className="mt-1 text-2xl font-black text-ink">{workspaceTabs.find((tab) => tab.id === activeTab)?.label}</h2>
              </div>
              <p className="max-w-md text-sm font-semibold leading-6 text-[#4d3b33]">
                Layout ini memotong scroll panjang. Isi satu bagian, lihat preview langsung, lalu pindah meja kerja dari panel kiri.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-auto lg:pr-2">
            {activeTab === "profile" ? (
              <>
                <ImportPanel />
                <MasterCvEditor />
              </>
            ) : null}
            {activeTab === "target" ? (
              <>
                <JobAnalyzer />
                <MatchDashboard />
              </>
            ) : null}
            {activeTab === "rewrite" ? <BulletRewriter /> : null}
            {activeTab === "export" ? <ExportPanel /> : null}
          </div>
        </section>

        <div className="min-w-0 lg:sticky lg:top-5">
          <CvPreview />
        </div>
      </section>
    </main>
  );
}
