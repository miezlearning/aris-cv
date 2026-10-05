import { useCvStore } from "@/lib/store";
import { EmptyState, SectionCard, Tag } from "@/components/ui";

export const MatchDashboard = () => {
  const analytics = useCvStore((state) => state.matchAnalytics);
  const hasKeywords = analytics.keywordMatches.length > 0;

  return (
    <SectionCard title="ATS match scoring" description="Formula: 50% exact match, 30% padanan semantik, 20% kualitas format.">
      {hasKeywords ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <ScoreCard label="Overall" value={analytics.overallScore} strong tone="yellow" />
            <ScoreCard label="Exact match" value={analytics.exactMatchRate} tone="green" />
            <ScoreCard label="Semantic" value={analytics.semanticProximity} tone="blue" />
            <ScoreCard label="Format" value={analytics.formatQualityScore} tone="red" />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <KeywordList title="Terpenuhi" tone="match" items={analytics.matchedKeywords} note="green" />
            <KeywordList title="Padanan" tone="semantic" items={analytics.semanticKeywords} note="yellow" />
            <KeywordList title="Belum ada" tone="missing" items={analytics.missingKeywords} note="red" />
          </div>
          <div className="rounded-[19px_14px_21px_16px] border-2 border-line bg-white p-3 text-sm leading-6 text-[#4d3b33] shadow-[3px_4px_0_rgba(37,24,19,0.10)]">
            <p className="font-black text-ink">Catatan format</p>
            <p>
              {analytics.formatCheckPassed
                ? "Struktur dasar sudah cukup baik. Tetap periksa format tanggal, bullet bermetrik, dan kontak."
                : "Lengkapi kontak, ringkasan, skills, tanggal MM/YYYY, dan bullet dengan hasil terukur jika datanya memang ada."}
            </p>
          </div>
        </div>
      ) : (
        <EmptyState title="Belum ada skor" description="Isi Master CV dan tempel deskripsi lowongan, lalu pilih Analisis lowongan." />
      )}
    </SectionCard>
  );
};

const noteClass = {
  yellow: "doodle-note-yellow",
  green: "doodle-note-green",
  blue: "doodle-note-blue",
  red: "doodle-note-red"
};

const ScoreCard = ({ label, value, strong = false, tone }: { label: string; value: number; strong?: boolean; tone: keyof typeof noteClass }) => (
  <div className={`doodle-score p-4 ${noteClass[tone]} ${strong ? "-rotate-1" : ""}`}>
    <p className="text-sm font-black text-[#4d3b33]">{label}</p>
    <p className="mt-2 text-3xl font-black text-ink">{value}%</p>
  </div>
);

const KeywordList = ({ title, items, tone, note }: { title: string; items: string[]; tone: "match" | "semantic" | "missing"; note: keyof typeof noteClass }) => (
  <div className={`rounded-[19px_14px_21px_16px] border-2 border-line p-3 shadow-[3px_4px_0_rgba(37,24,19,0.10)] ${noteClass[note]}`}>
    <h3 className="text-sm font-black text-ink">{title}</h3>
    <div className="mt-3 flex flex-wrap gap-2">
      {items.length ? items.map((item) => <Tag key={item} tone={tone}>{item}</Tag>) : <p className="text-sm font-semibold text-[#57443b]">Tidak ada.</p>}
    </div>
  </div>
);
