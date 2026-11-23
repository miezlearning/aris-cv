"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { FileText, X } from "@phosphor-icons/react";
import { Header } from "@/components/Header";
import { useCvStore } from "@/lib/store";
import { CvPreview } from "@/components/CvPreview";
import { Button } from "@/components/ui";

export function AppShell({ children }: { children: ReactNode }) {
  const modalPreviewOpen = useCvStore((state) => state.modalPreviewOpen);
  const setModalPreviewOpen = useCvStore((state) => state.setModalPreviewOpen);

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
