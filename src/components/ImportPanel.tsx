"use client";

import { useState } from "react";
import { parseResumeInput } from "@/lib/importers";
import { useCvStore } from "@/lib/store";
import { Button, EmptyState, SectionCard, TextArea } from "@/components/ui";

export const ImportPanel = () => {
  const setResumeProfile = useCvStore((state) => state.setResumeProfile);
  const [raw, setRaw] = useState("");
  const [message, setMessage] = useState("");

  const handleImport = () => {
    const result = parseResumeInput(raw);
    setResumeProfile(result.profile);
    setMessage(result.message);
  };

  return (
    <SectionCard
      title="Punya CV lama? Tempel untuk isi otomatis"
      description="Sistem akan mengekstrak kontak, ringkasan, riwayat kerja, dan pendidikan secara otomatis. Jika belum punya CV lama, kamu bisa langsung mengisi formulir di bawah."
      actions={
        raw ? (
          <Button type="button" variant="secondary" onClick={() => setRaw("")}>
            Kosongkan teks
          </Button>
        ) : null
      }
    >
      <div className="grid gap-4">
        <TextArea
          rows={5}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Tempel seluruh isi teks CV lama kamu di sini (dari file Word, PDF, atau catatan lama)..."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleImport} disabled={!raw.trim()}>
            Ekstrak dan isi formulir otomatis ➔
          </Button>
          <span className="text-xs text-[#57443b]">Semua diproses langsung di browsermu</span>
        </div>

        <div role="status" aria-live="polite">
          {message ? <EmptyState title="Hasil Pemisahan Otomatis" description={message} /> : null}
        </div>
      </div>
    </SectionCard>
  );
};
