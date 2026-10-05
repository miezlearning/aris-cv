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
      title="Impor resume"
      description="Tempel JSON Resume, JSON QuickTailor, atau teks resume terstruktur. Data tetap diproses di browser."
      actions={<Button type="button" variant="secondary" onClick={() => setRaw("")}>Kosongkan input</Button>}
    >
      <div className="grid gap-3">
        <div className="rounded-[20px_14px_22px_16px] border-2 border-line bg-[#fff0a8] p-3">
          <TextArea
            rows={6}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="Tempel resume lama atau JSON Resume di sini"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleImport} disabled={!raw.trim()}>
            Impor ke Master CV
          </Button>
        </div>
        {message ? <EmptyState title="Hasil impor" description={message} /> : null}
      </div>
    </SectionCard>
  );
};
