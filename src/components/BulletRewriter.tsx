import { useState } from "react";
import { Button, EmptyState, SectionCard, Tag, TextArea } from "@/components/ui";
import { useCvStore } from "@/lib/store";

export const BulletRewriter = () => {
  const suggestions = useCvStore((state) => state.suggestions);
  const applySuggestion = useCvStore((state) => state.applySuggestion);
  const rejectSuggestion = useCvStore((state) => state.rejectSuggestion);
  const [edits, setEdits] = useState<Record<string, string>>({});

  return (
    <SectionCard title="Metric-driven bullet rewriter" description="Saran memakai data yang sudah ada saja. Jika angka, sertifikasi, atau skill tidak ada di input, sistem tidak menambahkannya.">
      {suggestions.length ? (
        <div className="grid gap-4">
          {suggestions.map((suggestion, index) => {
            const draft = edits[suggestion.id] ?? suggestion.suggestion;
            const note = index % 2 === 0 ? "bg-[#e0f6fb]" : "bg-[#fff0a8]";
            return (
              <article key={suggestion.id} className={`rounded-[22px_15px_24px_17px] border-2 border-line p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)] ${note}`}>
                <div className="grid gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-[#57443b]">Original</p>
                    <p className="mt-1 rounded-[16px_12px_18px_13px] border-2 border-line bg-white p-3 text-sm leading-6 text-ink">{suggestion.original}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-[#57443b]">Saran</p>
                    <TextArea rows={3} value={draft} onChange={(event) => setEdits((current) => ({ ...current, [suggestion.id]: event.target.value }))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.keywordsUsed.length ? suggestion.keywordsUsed.map((keyword) => <Tag key={keyword} tone="semantic">{keyword}</Tag>) : <Tag tone="neutral">Tidak menambah keyword baru</Tag>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => applySuggestion(suggestion.id, draft)} disabled={suggestion.status === "accepted" || suggestion.status === "edited"}>
                      Accept
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => applySuggestion(suggestion.id, draft)}>
                      Edit
                    </Button>
                    <Button type="button" variant="danger" onClick={() => rejectSuggestion(suggestion.id)} disabled={suggestion.status === "rejected"}>
                      Reject
                    </Button>
                    <span className="self-center rounded-[999px_12px_999px_14px] border-2 border-line bg-white px-3 py-1 text-sm font-black text-[#57443b]">Status: {suggestion.status}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Belum ada saran" description="Jalankan analisis lowongan setelah mengisi bullet pengalaman. Saran akan muncul jika ada bullet yang bisa dirapikan tanpa menambah fakta." />
      )}
    </SectionCard>
  );
};
