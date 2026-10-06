"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, SectionCard } from "@/components/ui";
import { exportDocx, exportPdf, exportTextFallback } from "@/lib/exporters";
import { useCvStore } from "@/lib/store";
import type { ExportMode } from "@/types/resume";

const kindLabels = { pdf: "PDF", docx: "DOCX", txt: "TXT" } as const;

export const ExportPanel = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const tokens = useCvStore((state) => state.exportTokens);
  const addExportToken = useCvStore((state) => state.addExportToken);
  const consumeExportToken = useCvStore((state) => state.consumeExportToken);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"pdf" | "docx" | "txt" | "">("");

  const cleanAllowed = tokens > 0;

  useEffect(() => {
    if (!paymentOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPaymentOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paymentOpen]);

  const runExport = async (kind: "pdf" | "docx" | "txt", mode: ExportMode) => {
    if (mode === "clean" && !consumeExportToken()) {
      setPaymentOpen(true);
      setMessage("Unduhan bersih butuh token. Tambah token dulu lewat kartu unduhan bersih.");
      return;
    }

    try {
      setBusy(kind);
      if (kind === "pdf") await exportPdf(resume, mode);
      if (kind === "docx") await exportDocx(resume, mode);
      if (kind === "txt") exportTextFallback(resume, mode);
      setMessage(`Berkas ${kindLabels[kind]} ${mode === "preview" ? "pratinjau" : "bersih"} sudah diunduh. Periksa folder unduhanmu.`);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Berkas gagal dibuat.";
      setMessage(`${fallback} Coba unduh versi TXT dulu sebagai cadangan.`);
    } finally {
      setBusy("");
    }
  };

  return (
    <SectionCard
      title="Unduh CV"
      description="Berkas PDF dan DOCX dibuat langsung di perangkat ini, jadi data CV kamu tidak dikirim ke mana pun. Formatnya satu kolom agar terbaca sistem pembaca lowongan."
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px_15px_24px_17px] border-2 border-line bg-[#e4f6df] p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)]">
            <h3 className="font-black text-ink">Pratinjau gratis</h3>
            <p className="mt-1 text-sm leading-6 text-[#57443b]">Bertanda air. Pakai ini untuk memastikan isi dan urutannya sudah benar sebelum memakai token.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={busy === "pdf"} onClick={() => runExport("pdf", "preview")}>Unduh PDF pratinjau</Button>
              <Button type="button" variant="secondary" disabled={busy === "docx"} onClick={() => runExport("docx", "preview")}>Unduh DOCX pratinjau</Button>
              <Button type="button" variant="secondary" disabled={busy === "txt"} onClick={() => runExport("txt", "preview")}>Unduh TXT</Button>
            </div>
          </div>
          <div className="rounded-[18px_24px_17px_22px] border-2 border-line bg-[#ffe1d6] p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)]">
            <h3 className="font-black text-ink">Unduhan bersih</h3>
            <p className="mt-1 text-sm leading-6 text-[#57443b]">Tanpa tanda air. Satu unduhan memakai satu token. Token kamu sekarang: {tokens}.</p>
            {!cleanAllowed ? (
              <p className="mt-2 text-sm font-bold text-[#7b1f14]">Tombol unduhan bersih aktif setelah kamu menambah token di bawah.</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={() => setPaymentOpen(true)}>Tambah token uji coba</Button>
              <Button type="button" variant="secondary" disabled={!cleanAllowed || busy === "pdf"} onClick={() => runExport("pdf", "clean")}>Unduh PDF bersih</Button>
              <Button type="button" variant="secondary" disabled={!cleanAllowed || busy === "docx"} onClick={() => runExport("docx", "clean")}>Unduh DOCX bersih</Button>
            </div>
          </div>
        </div>

        <div role="status" aria-live="polite">
          {busy ? (
            <p className="rounded-[18px_14px_20px_16px] border-2 border-line bg-[#e0f6fb] p-3 text-sm font-black text-[#251813]">
              Sedang menyiapkan berkas {kindLabels[busy]}. Jangan tutup halaman ini.
            </p>
          ) : message ? (
            <EmptyState title="Status unduhan" description={message} />
          ) : null}
        </div>
      </div>

      {paymentOpen ? (
        <div
          className="motion-backdrop fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-title"
          onClick={() => setPaymentOpen(false)}
        >
          <div className="motion-drawer doodle-card w-full max-w-md bg-[var(--paper-strong)] p-5" onClick={(event) => event.stopPropagation()}>
            <h3 id="payment-title" className="text-lg font-black text-ink"><span className="doodle-title-mark">Token unduhan</span></h3>
            <p className="mt-2 text-sm leading-6 text-[#4d3b33]">
              Pembayaran QRIS belum tersambung ke layanan pembayaran mana pun. Tombol di bawah hanya menambah token di perangkat ini supaya kamu bisa mencoba alur unduhan bersih.
            </p>
            <div className="mt-4 rounded-[20px_14px_22px_16px] border-2 border-dashed border-line bg-white p-5 text-center text-sm font-black text-[#57443b]">
              QRIS belum tersambung, ini penanda uji coba
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" autoFocus onClick={() => setPaymentOpen(false)}>Tutup</Button>
              <Button type="button" onClick={() => { addExportToken(1); setPaymentOpen(false); setMessage("1 token uji coba ditambahkan."); }}>
                Tambah 1 token
              </Button>
              <Button type="button" onClick={() => { addExportToken(10); setPaymentOpen(false); setMessage("10 token uji coba ditambahkan."); }}>
                Tambah 10 token
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
};
