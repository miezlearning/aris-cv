"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, EmptyState, SectionCard, Tag, TextArea } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { useCvStore } from "@/lib/store";

const statusLabels = {
  pending: "Menunggu keputusan",
  accepted: "Sudah diterapkan ke CV",
  edited: "Diterapkan dengan editanmu",
  rejected: "Dilewati"
} as const;

export const BulletRewriter = () => {
  const resume = useCvStore((state) => state.resumeProfile);
  const suggestions = useCvStore((state) => state.suggestions);
  const applySuggestion = useCvStore((state) => state.applySuggestion);
  const rejectSuggestion = useCvStore((state) => state.rejectSuggestion);
  const updateSuggestion = useCvStore((state) => state.updateSuggestion);
  const job = useCvStore((state) => state.jobTarget);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiMessage, setAiMessage] = useState<Record<string, string>>({});

  const handleAiRewrite = async (suggestionId: string, originalText: string, expId: string) => {
    setAiLoading((prev) => ({ ...prev, [suggestionId]: true }));
    setAiMessage((prev) => ({ ...prev, [suggestionId]: "" }));

    const exp = resume.workExperience.find((item) => item.id === expId);
    const keywords = job.extractedKeywords.requiredHardSkills.slice(0, 5);

    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet: originalText,
          role: exp?.role,
          jobTitle: job.jobTitle,
          targetKeywords: keywords
        }),
        signal: AbortSignal.timeout(15000)
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal menghubungi layanan perbaikan AI.");
      }

      const { suggestion: aiText, note: aiNote } = json.data;
      setEdits((prev) => ({ ...prev, [suggestionId]: aiText }));
      updateSuggestion(suggestionId, {
        suggestion: aiText,
        note: aiNote || "Diformulasi ulang menggunakan metodologi Google XYZ."
      });
      setAiMessage((prev) => ({ ...prev, [suggestionId]: "Berhasil direkonstruksi dengan AI." }));
    } catch (err) {
      setAiMessage((prev) => ({
        ...prev,
        [suggestionId]: err instanceof Error ? err.message : "Kendala saat menghubungi AI."
      }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [suggestionId]: false }));
    }
  };

  const totalBullets = resume.workExperience.reduce(
    (sum, experience) => sum + experience.bulletPoints.filter((bullet) => bullet.trim()).length,
    0
  );
  const untouched = Math.max(0, totalBullets - suggestions.length);

  return (
    <SectionCard
      title="Perbaiki kalimat pengalaman kerja"
      description="Setiap saran menyusun ulang kalimatmu sendiri menggunakan pola STAR / Google XYZ (Tindakan, Konteks, dan Ukuran Hasil). Sistem tidak mengarang fakta baru."
    >
      {suggestions.length ? (
        <div className="grid gap-5">
          {/* Method Explanation Banner */}
          <div className="rounded-2xl border-2 border-dashed border-line/40 bg-[#f4fbff] p-5 text-sm leading-relaxed text-[#4d3b33]">
            <p className="font-bold text-ink">Standar Pola Penulisan ATS & Rekruter</p>
            <p className="mt-1 text-xs sm:text-sm">
              <span className="font-bold text-ink">Kata kerja aksi</span> + <span className="font-bold text-ink">ruang lingkup pekerjaan</span> + <span className="font-bold text-ink">angka hasil terukur</span>. Dua bagian pertama biasanya sudah ada di kalimat aslimu. Bagian ukuran hasil dapat kamu lengkapi agar daya tawar CV semakin kuat.
            </p>
            {untouched ? (
              <p className="mt-2 text-xs font-semibold text-moss">
                {untouched} poin lainnya sudah memiliki struktur yang baik dan tidak perlu diubah.
              </p>
            ) : null}
          </div>

          {/* List of Suggestions */}
          {suggestions.map((suggestion, index) => {
            const draft = edits[suggestion.id] ?? suggestion.suggestion;
            const decided = suggestion.status !== "pending";
            const changed = draft.trim() !== suggestion.suggestion.trim();

            return (
              <Reveal key={suggestion.id} delay={Math.min(index, 4) * 50}>
                <article
                  className={`rounded-2xl border-2 border-line p-5 sm:p-6 shadow-[2px_3px_0_rgba(37,24,19,0.08)] transition-all ${
                    decided ? "bg-white/80 opacity-90" : "bg-[#fffdf7]"
                  }`}
                >
                  <div className="grid gap-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between border-b border-line/10 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#57443b]">
                        Saran #{index + 1}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          suggestion.status === "pending"
                            ? "bg-[#fff0a8] text-[#604200] border-[#edd072]"
                            : suggestion.status === "rejected"
                            ? "bg-stone-100 text-[#57443b] border-stone-200"
                            : "bg-[#dff4dc] text-[#155436] border-[#b2e5ac]"
                        }`}
                      >
                        {statusLabels[suggestion.status]}
                      </span>
                    </div>

                    {/* Original vs Suggested Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#6b584d] mb-1.5">
                          Kalimat aslimu:
                        </p>
                        <div className="rounded-xl border border-line/30 bg-[#f8f6f0] p-3.5 text-xs sm:text-sm leading-relaxed text-[#3d2d24]">
                          {suggestion.original}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-moss mb-1.5 flex items-center justify-between">
                          <span>Kalimat yang disarankan:</span>
                          <span className="text-[11px] font-normal text-[#57443b]">Bisa kamu edit</span>
                        </p>
                        <TextArea
                          rows={3}
                          value={draft}
                          disabled={decided}
                          onChange={(event) => setEdits((current) => ({ ...current, [suggestion.id]: event.target.value }))}
                          placeholder="Sunting kalimat saran di sini..."
                        />
                      </div>
                    </div>

                    {suggestion.note ? (
                      <p className="rounded-xl border border-dashed border-line/30 bg-stone-50 p-3 text-xs leading-relaxed text-[#57443b]">
                        <span className="font-bold text-ink">Catatan:</span> {suggestion.note}
                      </p>
                    ) : null}

                    {/* Keywords tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs font-bold text-[#57443b] mr-1">Kata kunci yang disematkan:</span>
                      {suggestion.keywordsUsed.length ? (
                        suggestion.keywordsUsed.map((keyword) => <Tag key={keyword} tone="semantic">{keyword}</Tag>)
                      ) : (
                        <Tag tone="neutral">Pola struktur kalimat</Tag>
                      )}
                    </div>

                    {aiMessage[suggestion.id] ? (
                      <p className="rounded-lg bg-[#f0f9ff] border border-[#bae6fd] p-2 text-xs font-semibold text-[#0369a1]">
                        {aiMessage[suggestion.id]}
                      </p>
                    ) : null}

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/10">
                      {decided ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => updateSuggestion(suggestion.id, { status: "pending" })}
                        >
                          Ubah keputusan
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            onClick={() => applySuggestion(suggestion.id, changed ? draft : undefined)}
                          >
                            Pakai kalimat ini ke CV
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={Boolean(aiLoading[suggestion.id])}
                            onClick={() => handleAiRewrite(suggestion.id, suggestion.original, suggestion.experienceId)}
                          >
                            {aiLoading[suggestion.id] ? "Memproses AI..." : "Rekonstruksi via AI"}
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => rejectSuggestion(suggestion.id)}
                          >
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
          title="Belum ada saran perbaikan"
          description="Saran perbaikan otomatis akan muncul setelah kamu menempelkan iklan lowongan di Langkah 2 (Lowongan) dan menekan Cocokkan dengan CV saya."
          action={
            <Link
              className="btn doodle-btn bg-moss text-white hover:bg-[#154538] px-4 py-2 text-xs sm:text-sm font-bold"
              href="/lowongan"
            >
              Buka Langkah 2: Lowongan
            </Link>
          }
        />
      )}
    </SectionCard>
  );
};
