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
      title="Punya CV lama? Tempel di sini"
      description="Sistem akan mencoba memisahkan kontak, pengalaman, dan pendidikan secara otomatis. Kalau belum punya CV, lewati bagian ini dan langsung isi formulir di bawah. Semua diproses di perangkat ini."
      actions={<Button type="button" variant="secondary" onClick={() => setRaw("")}>Kosongkan kotak</Button>}
    >
      <div className="grid gap-3">
        <div className="rounded-[20px_14px_22px_16px] border-2 border-line bg-[#fff0a8] p-3">
          <TextArea
            rows={6}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="Tempel isi CV lama kamu di sini."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleImport} disabled={!raw.trim()}>
            Isi otomatis dari teks ini
          </Button>
        </div>
        <div role="status" aria-live="polite">
          {message ? <EmptyState title="Hasil pemisahan otomatis" description={message} /> : null}
        </div>
      </div>
    </SectionCard>
  );
};
