import { DoodleArt } from "@/components/DoodleArt";
import { getResumeCompleteness } from "@/lib/analyzer";
import { useCvStore } from "@/lib/store";

export const Header = () => {
  const resumeProfile = useCvStore((state) => state.resumeProfile);
  const hydrated = useCvStore((state) => state.hydrated);
  const completeness = getResumeCompleteness(resumeProfile);

  return (
    <header className="no-print relative border-b-2 border-line bg-[rgba(255,250,240,0.88)]">
      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px_260px] lg:items-center lg:px-8">
        <div className="doodle-card bg-[var(--paper-strong)] p-4 sm:p-5">
          <p className="text-sm font-black tracking-[0.02em] text-[#57443b]">QuickTailor CV</p>
          <h1 className="mt-2 max-w-4xl text-2xl font-black tracking-tight text-ink sm:text-4xl sm:leading-[1.02]">
            <span className="doodle-title-mark">Susun CV yang cocok dengan lowongan yang kamu lamar</span>
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#4d3b33]">
            Tempel iklan lowongan, lihat kata kunci yang belum ada di CV kamu, perbaiki kalimatnya, lalu unduh. Semua data disimpan di perangkat ini.
          </p>
        </div>

        <div className="hidden h-40 overflow-hidden rounded-[24px_18px_26px_20px] border-2 border-line bg-[#fff0a8] p-2 shadow-[5px_6px_0_rgba(37,24,19,0.14)] lg:block">
          <DoodleArt />
        </div>

        <div className="doodle-card bg-white p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="font-black text-ink">Kelengkapan data CV</span>
            <span className="font-black text-moss">{completeness}%</span>
          </div>
          <progress className="progress mt-3 h-3 w-full border border-line bg-[#f8e7b8]" value={completeness} max="100" aria-label="Kelengkapan data CV" />
          <p className="mt-2 text-xs font-semibold text-[#57443b]">
            {hydrated ? "Tersimpan otomatis di perangkat ini." : "Memuat data dari perangkat."}
          </p>
          {hydrated && completeness < 80 ? (
            <p className="mt-1 text-xs font-bold text-[#7b1f14]">Masih ada bagian yang kosong. Buka langkah 1 untuk melengkapinya.</p>
          ) : null}
        </div>
      </div>
    </header>
  );
};
