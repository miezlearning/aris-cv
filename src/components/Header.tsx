"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  Crosshair,
  Export,
  FileText,
  GearSix,
  HouseLine,
  IdentificationCard,
  PencilLine,
  PencilRuler,
  SidebarSimple
} from "@phosphor-icons/react";
import { getResumeCompleteness } from "@/lib/analyzer";
import { extractAllResumeBullets } from "@/lib/ats/rewriter";
import { useLiveAts } from "@/lib/live-ats";
import { useCvStore } from "@/lib/store";
import type { WorkspacePage } from "@/components/WorkspaceShell";

const navSteps: Array<{
  id: Exclude<WorkspacePage, "settings">;
  href: string;
  order?: number;
  label: string;
  short: string;
}> = [
  { id: "dashboard", href: "/", label: "Ringkasan", short: "Ringkasan" },
  { id: "master", href: "/master-cv", order: 1, label: "Data CV", short: "Data" },
  { id: "target", href: "/lowongan", order: 2, label: "Lowongan", short: "Lowongan" },
  { id: "rewrite", href: "/optimasi", order: 3, label: "Optimasi", short: "Optimasi" },
  { id: "export", href: "/export", order: 4, label: "Unduh", short: "Unduh" }
];

const renderNavIcon = (id: Exclude<WorkspacePage, "settings">, active: boolean) => {
  const weight = active ? "duotone" : "regular";
  if (id === "dashboard") return <HouseLine size={15} weight={weight} aria-hidden="true" />;
  if (id === "master") return <IdentificationCard size={15} weight={weight} aria-hidden="true" />;
  if (id === "target") return <Crosshair size={15} weight={weight} aria-hidden="true" />;
  if (id === "rewrite") return <PencilLine size={15} weight={weight} aria-hidden="true" />;
  return <Export size={15} weight={weight} aria-hidden="true" />;
};

export const Header = ({
  currentPage: propCurrentPage,
  previewOpenDesktop: propPreviewOpenDesktop,
  onTogglePreviewDesktop,
  onOpenMobilePreview
}: {
  currentPage?: WorkspacePage;
  previewOpenDesktop?: boolean;
  onTogglePreviewDesktop?: () => void;
  onOpenMobilePreview?: () => void;
} = {}) => {
  const pathname = usePathname();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const hydrated = useCvStore((state) => state.hydrated);
  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const { analytics, effectiveResume } = useLiveAts();
  const aiEnabled = useCvStore((state) => state.aiEnabled);
  const localAiStatus = useCvStore((state) => state.localAiStatus);
  const historyPast = useCvStore((state) => state.historyPast);
  const historyFuture = useCvStore((state) => state.historyFuture);
  const undoResume = useCvStore((state) => state.undoResume);
  const redoResume = useCvStore((state) => state.redoResume);
  const storePreviewOpenDesktop = useCvStore((state) => state.previewOpenDesktop);
  const setStorePreviewOpenDesktop = useCvStore((state) => state.setPreviewOpenDesktop);
  const setStoreModalPreviewOpen = useCvStore((state) => state.setModalPreviewOpen);

  const previewOpen = propPreviewOpenDesktop ?? storePreviewOpenDesktop;
  const togglePreview = onTogglePreviewDesktop ?? (() => setStorePreviewOpenDesktop((prev) => !prev));
  const openMobilePreview = onOpenMobilePreview ?? (() => setStoreModalPreviewOpen(true));

  const completeness = hydrated ? getResumeCompleteness(resumeProfile) : 0;
  const analyzed = hydrated ? analytics.hasAnalyzed : false;
  const liveWeakBullets = hydrated
    ? extractAllResumeBullets(effectiveResume, analytics).filter((b) => b.analysis.needsImprovement).length
    : 0;
  const liveTotalBullets = hydrated ? extractAllResumeBullets(effectiveResume, analytics).length : 0;

  const isStepDone = (id: Exclude<WorkspacePage, "settings">): boolean => {
    if (!hydrated) return false;
    if (id === "master") return completeness >= 80;
    if (id === "target") return analyzed;
    if (id === "rewrite") return analyzed && liveTotalBullets > 0 && liveWeakBullets === 0;
    return false;
  };

  const activeHref =
    optimisticHref ??
    (propCurrentPage ? navSteps.find((s) => s.id === propCurrentPage)?.href ?? (propCurrentPage === "settings" ? "/pengaturan" : null) : null) ??
    pathname;

  const isStepActive = (stepHref: string) => {
    if (stepHref === "/") return activeHref === "/";
    return activeHref === stepHref || activeHref.startsWith(`${stepHref}/`);
  };

  const isDashboard = isStepActive("/");
  const isSettings = isStepActive("/pengaturan");
  const aiReady = hydrated && aiEnabled && localAiStatus === "ready";
  const lastUndo = historyPast[historyPast.length - 1];
  const lastRedo = historyFuture[historyFuture.length - 1];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-[#D9CEBC] bg-[#FFFDF8]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/" prefetch={true} className="group flex min-h-[44px] items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: -4, y: -1 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-[#251813] bg-[#FFF0A8] text-[#251813] shadow-[2px_2px_0_rgba(37,24,19,0.16)]"
            >
              <PencilRuler size={20} weight="duotone" aria-hidden="true" />
            </motion.div>
            <div className="whitespace-nowrap">
              <span className="block text-base font-extrabold tracking-tight text-[#251813]">
                QuickTailor CV
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Stepper Nav */}
        <nav
          aria-label="Alur langkah kerja"
          className="hidden lg:flex items-center gap-1 rounded-2xl border border-[#D9CEBC] bg-[#F3E7C8] p-1 select-none"
        >
          {navSteps.map((step) => {
            const active = isStepActive(step.href);
            const done = isStepDone(step.id);
            return (
              <Link
                key={step.id}
                href={step.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (activeHref !== step.href) setOptimisticHref(step.href);
                }}
                className={`relative flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-colors duration-150 select-none ${
                  active ? "text-[#251813]" : "text-[#4E3E36] hover:text-[#251813] hover:bg-white/50"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="header-stepper-active"
                    className="absolute inset-0 rounded-xl bg-white shadow-xs border border-[#C2B49E] -z-10"
                    transition={{ type: "spring", stiffness: 480, damping: 36, mass: 0.6 }}
                  />
                )}
                {step.order ? (
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-black transition-colors ${
                      done
                        ? "bg-[#1F6B57] text-white"
                        : active
                        ? "bg-[#DFF5DA] text-[#144C32]"
                        : "bg-white/85 text-[#4E3E36]"
                    }`}
                  >
                    {step.order}
                  </span>
                ) : (
                  renderNavIcon(step.id, active)
                )}
                <span>{step.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Live Preview di Desktop (sembunyikan di / dan /pengaturan) */}
          {!isDashboard && !isSettings ? (
            <button
              type="button"
              onClick={togglePreview}
              className={`hidden lg:flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                previewOpen
                  ? "border-2 border-[#251813] bg-[#FFF0A8] text-[#251813] shadow-[2px_2px_0_rgba(37,24,19,0.14)] hover:bg-[#FFE885]"
                  : "border border-[#C2B49E] bg-white text-[#4E3E36] hover:bg-[#FFF8DF]"
              }`}
              title="Sembunyikan atau buka pratinjau CV berdampingan"
            >
              <SidebarSimple size={16} weight="duotone" aria-hidden="true" />
              <span>{previewOpen ? "Tutup Pratinjau" : "Buka Pratinjau"}</span>
            </button>
          ) : null}

          {/* Tombol Pratinjau Modal di layar < lg (sembunyikan di /pengaturan) */}
          {!isSettings ? (
            <button
              type="button"
              onClick={openMobilePreview}
              className="flex lg:hidden min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-[#251813] bg-[#1F6B57] px-3 py-1.5 text-xs font-bold text-white shadow-[2px_2px_0_rgba(37,24,19,0.14)] hover:bg-[#154538] transition-colors"
            >
              <FileText size={16} weight="duotone" aria-hidden="true" />
              <span>Lihat CV</span>
            </button>
          ) : null}

          {/* Undo & Redo Global */}
          <div className="flex items-center gap-1" role="group" aria-label="Riwayat perubahan CV">
            <button
              type="button"
              disabled={!lastUndo}
              onClick={undoResume}
              title={lastUndo ? `Urungkan: ${lastUndo.label} (Ctrl+Z)` : "Belum ada perubahan untuk diurungkan"}
              aria-label={lastUndo ? `Urungkan ${lastUndo.label}` : "Urungkan perubahan"}
              className="grid h-11 w-11 place-items-center rounded-xl border border-[#D9CEBC] bg-white text-[#251813] hover:bg-[#FFF8DF] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6B57]"
            >
              <ArrowUUpLeft size={17} weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={!lastRedo}
              onClick={redoResume}
              title={lastRedo ? `Ulangi: ${lastRedo.label} (Ctrl+Y)` : "Belum ada perubahan untuk diulangi"}
              aria-label={lastRedo ? `Ulangi ${lastRedo.label}` : "Ulangi perubahan"}
              className="grid h-11 w-11 place-items-center rounded-xl border border-[#D9CEBC] bg-white text-[#251813] hover:bg-[#FFF8DF] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6B57]"
            >
              <ArrowUUpRight size={17} weight="bold" aria-hidden="true" />
            </button>
          </div>

          {/* Tautan Halaman Pengaturan */}
          <Link
            href="/pengaturan"
            prefetch={true}
            aria-current={isSettings ? "page" : undefined}
            aria-label="Pengaturan"
            title="Pengaturan AI, Dokumen & Data"
            onClick={() => {
              if (activeHref !== "/pengaturan") setOptimisticHref("/pengaturan");
            }}
            className={`relative inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 xl:px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6B57] ${
              isSettings
                ? "border-2 border-[#251813] bg-[#FFF0A8] text-[#251813] shadow-[2px_2px_0_rgba(37,24,19,0.14)]"
                : "border border-[#D9CEBC] bg-white text-[#251813] hover:bg-[#FFF8DF]"
            }`}
          >
            <GearSix size={18} weight={isSettings ? "duotone" : "regular"} aria-hidden="true" />
            <span className="hidden xl:inline">Pengaturan</span>
            {aiReady ? (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#1F6B57]"
              />
            ) : null}
          </Link>
        </div>
      </div>

      {/* Strip Navigasi Mobile & Tablet (< lg) */}
      <div className="flex lg:hidden border-t border-[#D9CEBC] bg-[#F3E7C8]/80 px-3 py-1.5 overflow-x-auto no-scrollbar gap-1 select-none">
        {navSteps.map((step) => {
          const active = isStepActive(step.href);
          const done = isStepDone(step.id);
          return (
            <Link
              key={step.id}
              href={step.href}
              prefetch={true}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (activeHref !== step.href) setOptimisticHref(step.href);
              }}
              className={`relative flex shrink-0 min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-colors select-none ${
                active ? "text-[#251813]" : "text-[#4E3E36] hover:text-[#251813] hover:bg-white/40"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="header-stepper-mobile"
                  className="absolute inset-0 rounded-xl bg-white shadow-xs border border-[#C2B49E] -z-10"
                  transition={{ type: "spring", stiffness: 480, damping: 36, mass: 0.6 }}
                />
              )}
              {step.order ? (
                <span
                  aria-hidden="true"
                  className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-black transition-colors ${
                    done
                      ? "bg-[#1F6B57] text-white"
                      : active
                      ? "bg-[#DFF5DA] text-[#144C32]"
                      : "bg-white/80 text-[#4E3E36]"
                  }`}
                >
                  {step.order}
                </span>
              ) : (
                renderNavIcon(step.id, active)
              )}
              <span>{step.short}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
