"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, CheckCircle, Student, UploadSimple, X } from "@phosphor-icons/react";
import { parseResumeInput } from "@/lib/importers";
import { sampleDemoProfile, sampleFreshGradProfile } from "@/lib/defaults";
import { useCvStore } from "@/lib/store";
import { Button, TextArea } from "@/components/ui";

export const ImportPanel = () => {
  const setResumeProfile = useCvStore((state) => state.setResumeProfile);
  const [importOpen, setImportOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [message, setMessage] = useState("");

  const handleImport = () => {
    const result = parseResumeInput(raw);
    setResumeProfile(result.profile);
    setMessage(result.message);
    setImportOpen(false);
  };

  const handleLoadFreshGrad = () => {
    setResumeProfile(sampleFreshGradProfile());
    setMessage("Contoh profil Fresh Graduate (S1, Magang MSIB, Proyek Tugas Akhir, dan Organisasi) berhasil dimuat.");
    setImportOpen(false);
  };

  const handleLoadExperienced = () => {
    setResumeProfile(sampleDemoProfile());
    setMessage("Contoh profil Berpengalaman berhasil dimuat ke formulir.");
    setImportOpen(false);
  };

  return (
    <div className="surface-card card-tint-butter p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-[#251813] bg-white text-[#251813] shadow-[2px_2px_0_rgba(37,24,19,0.12)]"
          >
            <UploadSimple size={19} weight="duotone" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#251813]">Cara mulai mengisi data CV</p>
            <p className="text-xs sm:text-[13px] text-[#4E3E36] mt-0.5">
              Isi langsung dari nol di bawah, muat contoh siap edit, atau tempel teks CV lama kamu.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3.5 text-xs sm:text-sm gap-1.5"
            aria-expanded={importOpen}
            onClick={() => setImportOpen((prev) => !prev)}
          >
            <UploadSimple size={15} weight="duotone" aria-hidden="true" />
            <span>{importOpen ? "Tutup Panel Impor" : "Impor CV Lama"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3.5 text-xs sm:text-sm gap-1.5 bg-[#DFF5DA] border-[#9FD499] text-[#144C32] hover:bg-[#CDECC6]"
            onClick={handleLoadFreshGrad}
          >
            <Student size={15} weight="duotone" aria-hidden="true" />
            <span>Contoh Fresh Grad</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] px-3 text-xs sm:text-sm gap-1.5"
            onClick={handleLoadExperienced}
          >
            <Briefcase size={15} weight="duotone" aria-hidden="true" />
            <span>Contoh Umum</span>
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {importOpen ? (
          <motion.div
            key="import-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-[#D9CEBC] pt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-semibold text-[#251813]">
                <span>Tempel teks CV lama atau JSON Resume</span>
                <TextArea
                  rows={5}
                  value={raw}
                  onChange={(event) => setRaw(event.target.value)}
                  placeholder="Tempel seluruh teks dari dokumen Word, PDF, atau berkas JSON Resume kamu di sini..."
                />
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="button" onClick={handleImport} disabled={!raw.trim()}>
                  Ekstrak & Isi Formulir
                </Button>
                {raw ? (
                  <Button type="button" variant="ghost" onClick={() => setRaw("")}>
                    Kosongkan
                  </Button>
                ) : null}
                <span className="text-xs text-[#59483F]">Diproses 100% di browser tanpa dikirim ke server.</span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div role="status" aria-live="polite">
        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-xl border border-[#9FD499] bg-[#DFF5DA] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#144C32] flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={16} weight="duotone" className="shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </span>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Tutup pemberitahuan"
              className="min-h-[32px] min-w-[32px] grid place-items-center rounded-lg hover:bg-white/60 shrink-0"
            >
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
