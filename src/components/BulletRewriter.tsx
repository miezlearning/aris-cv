"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, EmptyState, SectionCard, Tag, TextArea } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { useCvStore } from "@/lib/store";

const statusLabels = {
  pending: "Belum diputuskan",
  accepted: "Sudah dipakai",
  edited: "Sudah dipakai dengan editanmu",
  rejected: "Dilewati"
} as const;

export const BulletRewriter = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const suggestions = useCvStore((state) => state.suggestions);
  const applySuggestion = useCvStore((state) => state.applySuggestion);
  const rejectSuggestion = useCvStore((state) => state.rejectSuggestion);
  const updateSuggestion = useCvStore((state) => state.updateSuggestion);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const totalBullets = resume.workExperience.reduce(
    (sum, experience) => sum + experience.bulletPoints.filter((bullet) => bullet.trim()).length,
    0
  );
  const untouched = Math.max(0, totalBullets - suggestions.length);

  return (
    <SectionCard
      title="Perbaiki kalimat pengalaman"
      description="Setiap saran hanya menyusun ulang kalimatmu sendiri. Sistem tidak menambahkan angka, sertifikat, atau keahlian yang tidak kamu tulis."
    >
      {suggestions.length ? (
        <div className="grid gap-4">
          <div className="rounded-[19px_14px_21px_16px] border-2 border-dashed border-line bg-[#e0f6fb] p-4 text-sm leading-6 text-[#4d3b33]">
            <p className="font-black text-ink">Pola yang dipakai perekrut dan sistem ATS</p>
            <p className="mt-1">
              Kata kerja, lalu apa yang kamu kerjakan, lalu ukuran hasilnya. Dua bagian pertama biasanya sudah ada di kalimatmu. Yang sering belum ada justru ukuran hasilnya,
              dan itu hanya kamu yang tahu, jadi sistem tidak boleh mengarangnya.
            </p>
            {untouched ? (
              <p className="mt-2 font-bold text-ink">
                {untouched} poin lain tidak diubah. Kalau ada poin yang kamu rasa perlu diperbaiki tapi tidak muncul di sini, periksa apakah poin itu sudah dibuka dengan kata kerja
                seperti Menyusun atau Mengelola.
              </p>
            ) : null}
          </div>

          {suggestions.map((suggestion, index) => {
            const draft = edits[suggestion.id] ?? suggestion.suggestion;
            const decided = suggestion.status !== "pending";
            const changed = draft.trim() !== suggestion.suggestion.trim();

            return (
              <Reveal key={suggestion.id} delay={Math.min(index, 4) * 60}>
                <article className="rounded-[22px_15px_24px_17px] border-2 border-line bg-[#fff0a8] p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)]">
                  <div className="grid gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-[#57443b]">Kalimat aslimu</p>
                      <p className="mt-1 rounded-[16px_12px_18px_13px] border-2 border-line bg-white p-3 text-sm leading-6 text-ink">{suggestion.original}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-[#57443b]">Kalimat yang disarankan</p>
                      <TextArea
                        rows={3}
                        value={draft}
                        disabled={decided}
                        onChange={(event) => setEdits((current) => ({ ...current, [suggestion.id]: event.target.value }))}
                      />
                      <p className="mt-1 text-xs font-semibold text-[#57443b]">Kamu boleh mengubah kalimat di atas sebelum memakainya.</p>
                    </div>

                    {suggestion.note ? (
                      <p className="rounded-[16px_12px_18px_13px] border-2 border-dashed border-line bg-white p-3 text-sm leading-6 text-[#4d3b33]">
                        {suggestion.note}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-[#57443b]">Kata kunci lowongan di kalimat ini</span>
                      {suggestion.keywordsUsed.length ? (
                        suggestion.keywordsUsed.map((keyword) => <Tag key={keyword} tone="semantic">{keyword}</Tag>)
                      ) : (
                        <Tag tone="neutral">Belum ada</Tag>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {decided ? (
                        <>
                          <span className="rounded-[999px_12px_999px_14px] border-2 border-line bg-white px-3 py-1 text-sm font-black text-[#57443b]">
                            {statusLabels[suggestion.status]}
                          </span>
                          <Button type="button" variant="secondary" onClick={() => updateSuggestion(suggestion.id, { status: "pending" })}>
                            Batalkan keputusan
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" onClick={() => applySuggestion(suggestion.id, changed ? draft : undefined)}>
                            Pakai kalimat ini
                          </Button>
                          <Button type="button" variant="danger" onClick={() => rejectSuggestion(suggestion.id)}>
                            Lewati
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Belum ada saran"
          description="Saran muncul setelah kamu menempelkan iklan lowongan dan menekan Cocokkan dengan CV saya. Saran hanya dibuat untuk poin yang bisa dirapikan tanpa menambah fakta baru."
          action={
            <Link className="btn doodle-btn min-h-11 border-2 border-line bg-moss px-4 py-2 text-sm font-black text-white hover:bg-[#154538]" href="/lowongan">
              Buka langkah 2
            </Link>
          }
        />
      )}
    </SectionCard>
  );
};
