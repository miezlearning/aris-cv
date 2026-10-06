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
      setMessage(`Berkas ${kindLabels[kind]} sudah diunduh. Periksa folder unduhanmu.`);
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
      description="Berkas dibuat langsung di perangkat ini, jadi data CV kamu tidak dikirim ke mana pun. Formatnya satu kolom supaya terbaca sistem pembaca lowongan."
    >
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-[#4d3b33]">
          PDF untuk dikirim lewat email atau diunggah ke portal. DOCX untuk portal yang meminta Word. TXT adalah cadangan kalau dua format lain gagal.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => runExport("pdf")} disabled={busy === "pdf"}>Unduh PDF</Button>
          <Button type="button" variant="secondary" onClick={() => runExport("docx")} disabled={busy === "docx"}>Unduh DOCX</Button>
          <Button type="button" variant="secondary" onClick={() => runExport("txt")} disabled={busy === "txt"}>Unduh TXT</Button>
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
    </SectionCard>
  );
};
