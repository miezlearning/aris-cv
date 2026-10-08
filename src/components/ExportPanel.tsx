"use client";

import { useState } from "react";
import { Button, SectionCard } from "@/components/ui";
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
      setMessage(`Berkas ${kindLabels[kind]} berhasil diunduh. Dokumen tersimpan di folder Unduhan.`);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Berkas gagal dibuat.";
      setMessage(`${fallback} Coba unduh versi TXT dulu sebagai cadangan.`);
    } finally {
      setBusy("");
    }
  };

  return (
    <SectionCard
      title="Unduh CV siap kirim (100% Gratis & Privat)"
      description="Dokumen dikompilasi langsung di browser perangkatmu (client-side) tanpa dikirim ke server luar. Menggunakan format linear satu kolom yang 100% lolos saringan sistem ATS (Applicant Tracking System)."
    >
      <div className="grid gap-6">
        {/* Banner 100% Free & No Watermark */}
        <div className="rounded-2xl border-2 border-line/20 bg-[#e4f6df]/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-moss text-white font-bold text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-ink text-sm sm:text-base">
                100% Gratis & Bebas Watermark
              </p>
              <p className="text-xs text-[#2c4a3b] mt-0.5 leading-relaxed">
                Tanpa biaya langganan, tanpa batasan unduh, dan tanpa tanda air. Berkas bersih siap diserahkan langsung ke portal lamaran kerja.
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#155436] sm:self-center shrink-0">
            Format Standar ATS Industri
          </p>
        </div>

        {/* Export Formats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* PDF Format Card */}
          <div className="rounded-2xl border-2 border-line bg-white p-5 flex flex-col justify-between shadow-[2px_3px_0_rgba(37,24,19,0.08)] hover:border-moss/60 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffe1d6] text-[#8a2e12] font-black text-sm border border-[#8a2e12]/20">
                  PDF
                </span>
                <span className="text-xs font-semibold text-[#155436]">
                  Format Utama
                </span>
              </div>
              <h3 className="font-bold text-base text-ink">Dokumen PDF (A4)</h3>
              <p className="mt-1.5 text-xs text-[#57443b] leading-relaxed">
                Format tata letak tetap dengan header rata tengah, garis pembatas tebal, dan teks hitam berstandar ATS.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-line/10">
              <Button
                type="button"
                className="w-full justify-center min-h-[42px] bg-moss text-white hover:bg-[#154538]"
                disabled={Boolean(busy)}
                onClick={() => runExport("pdf")}
              >
                {busy === "pdf" ? "Memproses PDF..." : "Unduh PDF"}
              </Button>
            </div>
          </div>

          {/* Word DOCX Format Card */}
          <div className="rounded-2xl border-2 border-line bg-white p-5 flex flex-col justify-between shadow-[2px_3px_0_rgba(37,24,19,0.08)] hover:border-moss/60 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0f6fb] text-[#12586a] font-black text-sm border border-[#12586a]/20">
                  DOCX
                </span>
                <span className="text-xs font-semibold text-[#57443b]">
                  Dapat Diedit
                </span>
              </div>
              <h3 className="font-bold text-base text-ink">Dokumen Word (DOCX)</h3>
              <p className="mt-1.5 text-xs text-[#57443b] leading-relaxed">
                Dapat diedit bebas di Microsoft Word atau Google Docs. Menggunakan tab stop rata kanan untuk tanggal posisi.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-line/10">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center min-h-[42px]"
                disabled={Boolean(busy)}
                onClick={() => runExport("docx")}
              >
                {busy === "docx" ? "Memproses DOCX..." : "Unduh DOCX"}
              </Button>
            </div>
          </div>

          {/* TXT Format Card */}
          <div className="rounded-2xl border-2 border-line bg-white p-5 flex flex-col justify-between shadow-[2px_3px_0_rgba(37,24,19,0.08)] hover:border-moss/60 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0a8] text-[#5c4a40] font-black text-sm border border-line/20">
                  TXT
                </span>
                <span className="text-xs font-semibold text-[#57443b]">
                  Teks Salin
                </span>
              </div>
              <h3 className="font-bold text-base text-ink">Teks Polos (TXT)</h3>
              <p className="mt-1.5 text-xs text-[#57443b] leading-relaxed">
                Format teks murni tanpa gaya. Sangat cocok untuk disalin ke formulir input isian lowongan kerja online.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-line/10">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center min-h-[42px]"
                disabled={Boolean(busy)}
                onClick={() => runExport("txt")}
              >
                {busy === "txt" ? "Menyiapkan TXT..." : "Unduh TXT"}
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {message ? (
          <div className="rounded-xl border border-line/30 bg-white p-4 text-xs sm:text-sm font-semibold text-ink flex items-center gap-2 shadow-2xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-moss shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{message}</span>
          </div>
        ) : null}

        {/* ATS Quality Checklist Box */}
        <div className="rounded-2xl border-2 border-line/20 bg-white/70 p-5 shadow-inner">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#57443b] mb-3">
            Karakteristik Dokumen Sesuai Format Referensi
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2 text-xs text-[#4d3b33]">
            <li className="flex items-center gap-2">
              <span className="text-moss font-bold">&bull;</span>
              <span>Header Rata Tengah: Nama, Gelar Profesional, dan Kontak</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-moss font-bold">&bull;</span>
              <span>Garis batas horizontal penuh pada setiap judul bagian</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-moss font-bold">&bull;</span>
              <span>Tanggal posisi sejajar rata kanan pada baris yang sama</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-moss font-bold">&bull;</span>
              <span>Pengelompokan keahlian terstruktur dengan label tebal</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-moss font-bold">&bull;</span>
              <span>Tanpa tabel, tanpa kolom majemuk, dan tanpa kotak teks tersembunyi</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-moss font-bold">&bull;</span>
              <span>100% diproses langsung di peramban (data tidak dikirim ke server)</span>
            </li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
};
