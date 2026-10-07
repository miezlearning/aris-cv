"use client";

import { useState } from "react";
import { Button, EmptyState, SectionCard } from "@/components/ui";
import { exportDocx, exportPdf, exportTextFallback } from "@/lib/exporters";
import { useCvStore } from "@/lib/store";

const kindLabels = { pdf: "PDF", docx: "DOCX", txt: "TXT" } as const;

export const ExportPanel = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"pdf" | "docx" | "txt" | "">("");

  const runExport = async (kind: "pdf" | "docx" | "txt") => {
    try {
      setBusy(kind);
      setMessage("");
      if (kind === "pdf") await exportPdf(resume);
      if (kind === "docx") await exportDocx(resume);
      if (kind === "txt") exportTextFallback(resume);
      setMessage(`Berkas ${kindLabels[kind]} berhasil diunduh. Silakan periksa folder Unduhan di perangkatmu.`);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Berkas gagal dibuat.";
      setMessage(`${fallback} Coba unduh versi TXT dulu sebagai cadangan.`);
    } finally {
      setBusy("");
    }
  };

  return (
    <SectionCard
      title="Unduh CV siap kirim"
      description="Dokumen dikompilasi langsung di browser perangkatmu (client-side) tanpa dikirim ke server. Menggunakan format satu kolom linear terstandar yang 100% lolos pembacaan sistem ATS enterprise."
    >
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* PDF Card */}
          <div className="rounded-2xl border-2 border-line bg-[#fffdf7] p-5 flex flex-col justify-between shadow-[2px_3px_0_rgba(37,24,19,0.08)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-black text-ink">PDF</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#dff4dc] text-[#155436] border border-[#b2e5ac]">
                  Direkomendasikan
                </span>
              </div>
              <p className="text-xs text-[#57443b] leading-relaxed">
                Format standar untuk dikirim via email atau diunggah ke formulir lamaran. Tata letak persis seperti lembar pratinjau.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line/10">
              <Button
                type="button"
                className="w-full justify-center"
                onClick={() => runExport("pdf")}
                disabled={busy === "pdf"}
              >
                {busy === "pdf" ? "Memproses..." : "Unduh PDF ➔"}
              </Button>
            </div>
          </div>

          {/* DOCX Card */}
          <div className="rounded-2xl border-2 border-line bg-[#fffdf7] p-5 flex flex-col justify-between shadow-[2px_3px_0_rgba(37,24,19,0.08)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-black text-ink">DOCX</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e0f6fb] text-[#1a4a58] border border-[#7bc7d8]">
                  Microsoft Word
                </span>
              </div>
              <p className="text-xs text-[#57443b] leading-relaxed">
                Untuk portal kerja yang secara eksplisit meminta berkas .docx (misal: portal korporat berbasis Taleo).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line/10">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={() => runExport("docx")}
                disabled={busy === "docx"}
              >
                {busy === "docx" ? "Memproses..." : "Unduh DOCX"}
              </Button>
            </div>
          </div>

          {/* TXT Card */}
          <div className="rounded-2xl border-2 border-line bg-[#fffdf7] p-5 flex flex-col justify-between shadow-[2px_3px_0_rgba(37,24,19,0.08)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-black text-ink">TXT</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-[#57443b] border border-stone-200">
                  Cadangan
                </span>
              </div>
              <p className="text-xs text-[#57443b] leading-relaxed">
                Teks polos terstruktur. Berguna untuk salin-tempel langsung ke kolom formulir lamaran online yang tidak menerima lampiran berkas.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line/10">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={() => runExport("txt")}
                disabled={busy === "txt"}
              >
                {busy === "txt" ? "Memproses..." : "Unduh TXT"}
              </Button>
            </div>
          </div>
        </div>

        {/* Status notification */}
        <div role="status" aria-live="polite">
          {busy ? (
            <p className="rounded-xl border-2 border-line bg-[#e0f6fb] p-4 text-sm font-bold text-ink">
              Sedang merender dan menyusun berkas {kindLabels[busy]}. Proses ini berlangsung langsung di browsermu...
            </p>
          ) : message ? (
            <EmptyState title="Status Unduhan" description={message} />
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
};
