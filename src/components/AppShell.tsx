"use client";

import { useEffect, type ReactNode } from "react";
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

  // Lock background scroll when modal preview is open
  useEffect(() => {
    if (!modalPreviewOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalPreviewOpen]);

  return (
    <div className="doodle-stage min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* Global Preview Modal */}
      {modalPreviewOpen ? (
        <div
          className="motion-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-preview-title"
          onClick={() => setModalPreviewOpen(false)}
        >
          <div
            className="motion-rise is-visible flex h-full max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl border-2 border-line bg-[var(--paper-strong)] p-4 sm:p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line/15 pb-3 mb-3">
              <div>
                <h2 id="modal-preview-title" className="text-lg font-bold text-ink">
                  Pratinjau Lengkap Lembar CV
                </h2>
                <p className="text-xs text-[#57443b]">Dokumen A4 sesuai standar sistem pembaca lowongan (ATS)</p>
              </div>
              <Button type="button" variant="secondary" autoFocus onClick={() => setModalPreviewOpen(false)}>
                Tutup Pratinjau
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <CvPreview isModal={true} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
