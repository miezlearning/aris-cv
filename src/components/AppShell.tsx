"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowUUpLeft, FileText, X } from "@phosphor-icons/react";
import { Header } from "@/components/Header";
import { useCvStore } from "@/lib/store";
import { CvPreview } from "@/components/CvPreview";
import { Button } from "@/components/ui";

export function AppShell({ children }: { children: ReactNode }) {
  const modalPreviewOpen = useCvStore((state) => state.modalPreviewOpen);
  const setModalPreviewOpen = useCvStore((state) => state.setModalPreviewOpen);
  const undoResume = useCvStore((state) => state.undoResume);
  const redoResume = useCvStore((state) => state.redoResume);
  const undoToast = useCvStore((state) => state.undoToast);
  const dismissUndoToast = useCvStore((state) => state.dismissUndoToast);

  useEffect(() => {
    const handleGlobalUndoRedo = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoResume();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redoResume();
      }
    };

    window.addEventListener("keydown", handleGlobalUndoRedo);
    return () => window.removeEventListener("keydown", handleGlobalUndoRedo);
  }, [undoResume, redoResume]);

  useEffect(() => {
    if (!undoToast) return;
    const timer = window.setTimeout(() => {
      dismissUndoToast();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [undoToast, dismissUndoToast]);

  useEffect(() => {
    if (!modalPreviewOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalPreviewOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalPreviewOpen, setModalPreviewOpen]);

  useEffect(() => {
    if (!modalPreviewOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalPreviewOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="doodle-stage min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col">{children}</div>

        {/* Floating 1-Click Undo Toast */}
        <AnimatePresence>
          {undoToast ? (
            <motion.div
              key={undoToast.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              role="status"
              aria-live="polite"
              className="no-print fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md rounded-2xl border-2 border-[#251813] bg-[#251813] px-4 py-2.5 text-[#FFFDF8] shadow-[3px_4px_0_rgba(37,24,19,0.25)] flex items-center justify-between gap-3"
            >
              <span className="text-xs sm:text-sm font-semibold truncate">{undoToast.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={undoResume}
                  className="inline-flex items-center gap-1.5 min-h-[44px] rounded-xl bg-[#FFF0A8] px-3 text-xs font-extrabold text-[#251813] hover:bg-[#FFE885] transition-colors cursor-pointer"
                >
                  <ArrowUUpLeft size={14} weight="bold" aria-hidden="true" />
                  <span>Urungkan</span>
                </button>
                <button
                  type="button"
                  onClick={dismissUndoToast}
                  aria-label="Tutup notifikasi urungkan"
                  className="grid h-11 w-11 place-items-center rounded-xl text-[#FFFDF8]/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={15} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Global Preview Modal */}
        <AnimatePresence>
          {modalPreviewOpen ? (
            <motion.div
              key="modal-preview-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-preview-title"
              onClick={() => setModalPreviewOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="flex h-full max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl border-2 border-[#251813] bg-[#FFFDF8] p-4 sm:p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-[#D9CEBC] pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-[#251813] bg-[#FFF0A8] text-[#251813]">
                      <FileText size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 id="modal-preview-title" className="text-base sm:text-lg font-bold text-[#251813]">
                        Pratinjau Lengkap Lembar CV
                      </h2>
                      <p className="text-xs text-[#59483F]">
                        Dokumen A4 satu kolom linear sesuai standar sistem ATS
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    autoFocus
                    onClick={() => setModalPreviewOpen(false)}
                    className="gap-1.5"
                  >
                    <X size={16} weight="bold" aria-hidden="true" />
                    <span>Tutup Pratinjau</span>
                  </Button>
                </div>
                <div className="flex-1 min-h-0">
                  <CvPreview isModal={true} />
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
