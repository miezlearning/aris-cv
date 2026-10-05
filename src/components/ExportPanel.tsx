import { useEffect, useState } from "react";
import { Button, EmptyState, SectionCard } from "@/components/ui";
import { exportDocx, exportPdf, exportTextFallback } from "@/lib/exporters";
import { useCvStore } from "@/lib/store";
import type { ExportMode } from "@/types/resume";

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
      setMessage("Export bersih membutuhkan token.");
      return;
    }

    try {
      setBusy(kind);
      if (kind === "pdf") await exportPdf(resume, mode);
      if (kind === "docx") await exportDocx(resume, mode);
      if (kind === "txt") exportTextFallback(resume, mode);
      setMessage(`Export ${kind.toUpperCase()} ${mode === "preview" ? "pratinjau" : "bersih"} selesai.`);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Export gagal.";
      setMessage(`${fallback} Gunakan export TXT sebagai cadangan sementara.`);
    } finally {
      setBusy("");
    }
  };

  return (
    <SectionCard title="Export dokumen" description="PDF dan DOCX dibuat di browser. Pratinjau memakai watermark, export bersih memakai token testing lokal.">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px_15px_24px_17px] border-2 border-line bg-[#e4f6df] p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)]">
            <h3 className="font-black text-ink">Pratinjau gratis</h3>
            <p className="mt-1 text-sm leading-6 text-[#57443b]">Unduh dokumen bertanda air untuk cek struktur ATS.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={busy === "pdf"} onClick={() => runExport("pdf", "preview")}>Unduh PDF pratinjau</Button>
              <Button type="button" variant="secondary" disabled={busy === "docx"} onClick={() => runExport("docx", "preview")}>Unduh DOCX pratinjau</Button>
              <Button type="button" variant="secondary" disabled={busy === "txt"} onClick={() => runExport("txt", "preview")}>Unduh TXT</Button>
            </div>
          </div>
          <div className="rounded-[18px_24px_17px_22px] border-2 border-line bg-[#ffe1d6] p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)]">
            <h3 className="font-black text-ink">Export bersih</h3>
            <p className="mt-1 text-sm leading-6 text-[#57443b]">Token tersedia: {tokens}. Gateway QRIS produksi perlu backend Midtrans atau Xendit.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={() => setPaymentOpen(true)}>Beli token testing</Button>
              <Button type="button" variant="secondary" disabled={!cleanAllowed || busy === "pdf"} onClick={() => runExport("pdf", "clean")}>Unduh PDF bersih</Button>
              <Button type="button" variant="secondary" disabled={!cleanAllowed || busy === "docx"} onClick={() => runExport("docx", "clean")}>Unduh DOCX bersih</Button>
            </div>
          </div>
        </div>
        {message ? <EmptyState title="Status export" description={message} /> : null}
      </div>

      {paymentOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="payment-title" onClick={() => setPaymentOpen(false)}>
          <div className="doodle-card w-full max-w-md bg-[var(--paper-strong)] p-5" onClick={(event) => event.stopPropagation()}>
            <h3 id="payment-title" className="text-lg font-black text-ink"><span className="doodle-title-mark">Token export testing</span></h3>
            <p className="mt-2 text-sm leading-6 text-[#4d3b33]">
              QRIS dinamis belum tersambung ke gateway produksi. Tombol di bawah hanya menambah token lokal untuk menguji alur export bersih.
            </p>
            <div className="mt-4 rounded-[20px_14px_22px_16px] border-2 border-dashed border-line bg-white p-5 text-center text-sm font-black text-[#57443b]">
              Placeholder QRIS dinamis Midtrans atau Xendit
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>Tutup</Button>
              <Button type="button" onClick={() => { addExportToken(1); setPaymentOpen(false); setMessage("Token testing ditambahkan."); }}>
                Tambah 1 token testing
              </Button>
              <Button type="button" onClick={() => { addExportToken(10); setPaymentOpen(false); setMessage("Bundel 10 token testing ditambahkan."); }}>
                Tambah 10 token testing
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
};
