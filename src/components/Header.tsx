"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { getResumeCompleteness } from "@/lib/analyzer";
import { useCvStore } from "@/lib/store";
import type { WorkspacePage } from "@/components/WorkspaceShell";

const navSteps: Array<{
  id: WorkspacePage;
  href: string;
  order?: number;
  label: string;
  short: string;
}> = [
  { id: "dashboard", href: "/", label: "Ringkasan", short: "Home" },
  { id: "master", href: "/master-cv", order: 1, label: "Data CV", short: "Data" },
  { id: "target", href: "/lowongan", order: 2, label: "Lowongan", short: "Lowongan" },
  { id: "rewrite", href: "/optimasi", order: 3, label: "Optimasi", short: "Optimasi" },
  { id: "export", href: "/export", order: 4, label: "Unduh", short: "Unduh" }
];

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

  // Sync optimistic indicator with actual route
  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const analytics = useCvStore((state) => state.matchAnalytics);
  const suggestions = useCvStore((state) => state.suggestions);
  const resetAll = useCvStore((state) => state.resetAll);
  const storePreviewOpenDesktop = useCvStore((state) => state.previewOpenDesktop);
  const setStorePreviewOpenDesktop = useCvStore((state) => state.setPreviewOpenDesktop);
  const setStoreModalPreviewOpen = useCvStore((state) => state.setModalPreviewOpen);

  const previewOpen = propPreviewOpenDesktop ?? storePreviewOpenDesktop;
  const togglePreview = onTogglePreviewDesktop ?? (() => setStorePreviewOpenDesktop((prev) => !prev));
  const openMobilePreview = onOpenMobilePreview ?? (() => setStoreModalPreviewOpen(true));

  const [confirmReset, setConfirmReset] = useState(false);

  const completeness = getResumeCompleteness(resumeProfile);
  const analyzed = analytics.keywordMatches.length > 0;
  const pendingSuggestions = suggestions.filter((item) => item.status === "pending").length;

  const isStepDone = (id: WorkspacePage): boolean => {
    if (id === "master") return completeness >= 80;
    if (id === "target") return analyzed;
    if (id === "rewrite") return suggestions.length > 0 && pendingSuggestions === 0;
    if (id === "export") return false;
    return false;
  };

  // Determine active href optimistically for instant zero-lag feedback
  const activeHref = optimisticHref ?? (propCurrentPage ? navSteps.find((s) => s.id === propCurrentPage)?.href : null) ?? pathname;

  const isStepActive = (stepHref: string) => {
    if (stepHref === "/") return activeHref === "/";
    return activeHref === stepHref || activeHref.startsWith(`${stepHref}/`);
  };

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line/20 bg-[rgba(255,250,240,0.95)] backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" prefetch={true} className="group flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border-2 border-line bg-[#fff0a8] shadow-[2px_2px_0_rgba(37,24,19,0.18)] transition-transform group-hover:-translate-y-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <span className="block text-base font-black tracking-tight text-ink sm:text-lg">QuickTailor CV</span>
              <span className="hidden text-[11px] font-bold text-moss sm:block">100% Privat di Browser</span>
            </div>
          </Link>
        </div>

        {/* Central Segmented Stepper Nav (Kumo UI Style: Inset track, zero splash, sliding spring pill) */}
        <nav
          aria-label="Alur langkah kerja"
          className="hidden md:flex items-center gap-1 rounded-2xl border border-line/15 bg-[#ebe4d4]/85 p-1.5 shadow-inner select-none"
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
                  if (activeHref !== step.href) {
                    setOptimisticHref(step.href);
                  }
                }}
                className={`relative flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-1 text-xs font-bold transition-colors duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-moss ${
                  active
                    ? "text-ink"
                    : "text-[#5c4a40] hover:text-ink hover:bg-black/[0.03]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="header-stepper-active"
                    className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_8px_rgba(37,24,19,0.08),0_1px_3px_rgba(37,24,19,0.06)] border border-line/12 -z-10"
                    transition={{
                      type: "spring",
                      stiffness: 480,
                      damping: 36,
                      mass: 0.6
                    }}
                  />
                )}
                {step.order ? (
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-black transition-colors ${
                      done
                        ? "bg-moss text-white"
                        : active
                        ? "bg-[#e4f6df] text-[#155436]"
                        : "bg-black/5 text-[#5c4a40]"
                    }`}
                  >
                    {step.order}
                  </span>
                ) : null}
                <span>{step.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Kelengkapan CV Mini Badge */}
          <Link
            href="/master-cv"
            prefetch={true}
            title="Kelengkapan data CV"
            className="hidden sm:flex items-center gap-2 rounded-xl border border-line/30 bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-2xs hover:bg-[#fff0a8]/40 transition-colors"
          >
            <span className="text-[#5c4a40]">Data:</span>
            <span className={`font-black ${completeness >= 80 ? "text-moss" : "text-[#b24823]"}`}>{completeness}%</span>
            <div className="h-2 w-12 rounded-full bg-line/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${completeness >= 80 ? "bg-moss" : "bg-[#e86f4d]"}`}
                style={{ width: `${completeness}%` }}
              />
            </div>
          </Link>

          {/* Toggle Live Preview on Desktop */}
          <button
            type="button"
            onClick={togglePreview}
            className={`hidden lg:flex min-h-[40px] items-center gap-2 rounded-xl border-2 border-line px-3.5 py-1 text-xs font-bold shadow-[2px_2px_0_rgba(37,24,19,0.14)] transition-colors ${
              previewOpen
                ? "bg-[#fff0a8] text-ink hover:bg-[#ffe58f]"
                : "bg-white text-[#4d3b33] hover:bg-white/90"
            }`}
            title="Sembunyikan atau buka pratinjau CV berdampingan"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            <span>{previewOpen ? "Tutup Pratinjau" : "Buka Pratinjau"}</span>
          </button>

          {/* Mobile Preview Trigger Button */}
          <button
            type="button"
            onClick={openMobilePreview}
            className="flex lg:hidden min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-line bg-moss px-3 py-1.5 text-xs font-bold text-white shadow-[2px_2px_0_rgba(37,24,19,0.14)] hover:bg-[#154538] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Lihat CV</span>
          </button>

          {/* Reset Button */}
          {confirmReset ? (
            <div className="flex items-center gap-1 bg-[#ffe1d6] border border-[#a3291b]/30 rounded-xl px-2 py-1">
              <span className="text-[11px] font-bold text-[#7b1f14]">Hapus data?</span>
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
                className="px-2 py-0.5 text-[11px] font-black bg-[#a3291b] text-white rounded-lg hover:bg-[#852014] transition-colors"
              >
                Ya
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-1.5 py-0.5 text-[11px] font-bold text-ink hover:underline"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              title="Hapus semua data di browser"
              className="grid h-10 w-10 place-items-center rounded-xl border border-line/30 bg-white text-[#7b1f14] hover:bg-[#ffe1d6]/50 transition-colors shadow-2xs"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Horizontal Segmented Stepper Strip */}
      <div className="flex md:hidden border-t border-line/15 bg-[#ebe4d4]/70 px-3 py-1.5 overflow-x-auto no-scrollbar gap-1 select-none">
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
                if (activeHref !== step.href) {
                  setOptimisticHref(step.href);
                }
              }}
              className={`relative flex shrink-0 min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-colors select-none ${
                active
                  ? "text-ink"
                  : "text-[#5c4a40] hover:text-ink hover:bg-black/[0.03]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="header-stepper-mobile"
                  className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_6px_rgba(37,24,19,0.08)] border border-line/12 -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 480,
                    damping: 36,
                    mass: 0.6
                  }}
                />
              )}
              {step.order ? (
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-black transition-colors ${
                    done
                      ? "bg-moss text-white"
                      : active
                      ? "bg-[#e4f6df] text-[#155436]"
                      : "bg-black/5 text-[#5c4a40]"
                  }`}
                >
                  {step.order}
                </span>
              ) : null}
              <span>{step.short}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
