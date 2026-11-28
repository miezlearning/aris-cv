import type {
  CertificationItem,
  Education,
  OrganizationItem,
  ProjectItem,
  WorkExperience
} from "@/types/resume";

const PRESENT_RE = /^(?:present|current|now|ongoing|sekarang|saat ini|hingga saat ini|aktif)$/i;

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  januari: 0,
  feb: 1,
  february: 1,
  februari: 1,
  mar: 2,
  march: 2,
  maret: 2,
  apr: 3,
  april: 3,
  may: 4,
  mei: 4,
  jun: 5,
  june: 5,
  juni: 5,
  jul: 6,
  july: 6,
  juli: 6,
  aug: 7,
  august: 7,
  agu: 7,
  agust: 7,
  agustus: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
  des: 11,
  desember: 11
};

const RANGE_SPLIT_RE = /\s*(?:[-\u2013\u2014]|to|s\.?d\.?|sampai|hingga)\s*/i;

export const isPresentToken = (raw?: string): boolean => {
  const trimmed = (raw ?? "").trim();
  return Boolean(trimmed && PRESENT_RE.test(trimmed));
};

/**
 * Mengubah teks tanggal CV (MM/YYYY, YYYY-MM, Bulan YYYY, atau YYYY)
 * menjadi indeks bulan numerik agar mudah dibandingkan secara kronologis.
 */
export const parseDatePoint = (raw?: string, edge: "start" | "end" = "end"): number | null => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || PRESENT_RE.test(trimmed)) return null;

  const slashOrDashMonthFirst = trimmed.match(/^(\d{1,2})[/-]((?:19|20)\d{2})$/);
  if (slashOrDashMonthFirst) {
    const month = Number(slashOrDashMonthFirst[1]);
    const year = Number(slashOrDashMonthFirst[2]);
    if (month >= 1 && month <= 12) return year * 12 + (month - 1);
  }

  const isoYearFirst = trimmed.match(/^((?:19|20)\d{2})[/-](\d{1,2})(?:[/-]\d{1,2})?$/);
  if (isoYearFirst) {
    const year = Number(isoYearFirst[1]);
    const month = Number(isoYearFirst[2]);
    if (month >= 1 && month <= 12) return year * 12 + (month - 1);
  }

  const monthWordMatch = trimmed.match(/^([A-Za-z]+)\.?\s+((?:19|20)\d{2})$/);
  if (monthWordMatch) {
    const monthIdx = MONTH_INDEX[monthWordMatch[1].toLowerCase()];
    const year = Number(monthWordMatch[2]);
    if (monthIdx !== undefined) return year * 12 + monthIdx;
  }

  const yearOnly = trimmed.match(/^((?:19|20)\d{2})$/);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    return year * 12 + (edge === "start" ? 0 : 11);
  }

  return null;
};

export const parsePeriodRange = (
  period?: string
): { isCurrent: boolean; start: number | null; end: number | null; hasDate: boolean } => {
  const clean = (period ?? "").trim();
  if (!clean) return { isCurrent: false, start: null, end: null, hasDate: false };

  if (isPresentToken(clean)) {
    return { isCurrent: true, start: null, end: null, hasDate: true };
  }

  // Cegah pemisahan tanggal ISO YYYY-MM oleh tanda hubung
  const isIsoSingle = /^(?:19|20)\d{2}-\d{1,2}(?:-\d{1,2})?$/.test(clean);
  const parts = isIsoSingle
    ? [clean]
    : clean
        .split(RANGE_SPLIT_RE)
        .map((part) => part.trim())
        .filter(Boolean);

  if (parts.length >= 2) {
    const startPart = parts[0];
    const endPart = parts[parts.length - 1];
    const isCurrent = isPresentToken(endPart);
    const start = parseDatePoint(startPart, "start");
    const end = isCurrent ? null : parseDatePoint(endPart, "end");
    return {
      isCurrent,
      start,
      end,
      hasDate: isCurrent || start !== null || end !== null
    };
  }

  const singleStart = parseDatePoint(clean, "start");
  const singleEnd = parseDatePoint(clean, "end");
  return {
    isCurrent: false,
    start: singleStart,
    end: singleEnd,
    hasDate: singleStart !== null || singleEnd !== null
  };
};

const compareChronologicalDescTuple = (
  a: { isCurrent: boolean; start: number | null; end: number | null },
  b: { isCurrent: boolean; start: number | null; end: number | null }
): number => {
  const aPrimary = a.isCurrent ? Number.POSITIVE_INFINITY : a.end ?? a.start;
  const bPrimary = b.isCurrent ? Number.POSITIVE_INFINITY : b.end ?? b.start;

  if (aPrimary === null && bPrimary === null) return 0;
  if (aPrimary === null) return 1;
  if (bPrimary === null) return -1;

  if (a.isCurrent && b.isCurrent) {
    if (a.start === null && b.start === null) return 0;
    if (a.start === null) return 1;
    if (b.start === null) return -1;
    return b.start - a.start;
  }

  if (aPrimary !== bPrimary) {
    return bPrimary > aPrimary ? 1 : -1;
  }

  if (a.start !== null && b.start !== null && a.start !== b.start) {
    return b.start - a.start;
  }

  return 0;
};

const toWorkChronology = (item: WorkExperience) => {
  const isCurrent = Boolean(item.isCurrent) || isPresentToken(item.endDate);
  return {
    isCurrent,
    start: parseDatePoint(item.startDate, "start"),
    end: isCurrent ? null : parseDatePoint(item.endDate, "end")
  };
};

export const compareWorkExperienceDesc = (a: WorkExperience, b: WorkExperience): number =>
  compareChronologicalDescTuple(toWorkChronology(a), toWorkChronology(b));

export const sortWorkExperienceDesc = (items: WorkExperience[]): WorkExperience[] =>
  [...items].sort(compareWorkExperienceDesc);

export const isWorkExperienceChronological = (items: WorkExperience[]): boolean => {
  const dated = items.filter((w) => {
    const info = toWorkChronology(w);
    return info.isCurrent || info.start !== null || info.end !== null;
  });

  if (dated.length < 2) return true;

  for (let i = 1; i < dated.length; i += 1) {
    if (compareWorkExperienceDesc(dated[i - 1], dated[i]) > 0) {
      return false;
    }
  }
  return true;
};

const sortByPeriodDesc = <T>(items: T[], getPeriod: (item: T) => string | undefined): T[] =>
  [...items].sort((a, b) =>
    compareChronologicalDescTuple(parsePeriodRange(getPeriod(a)), parsePeriodRange(getPeriod(b)))
  );

const isPeriodChronological = <T>(items: T[], getPeriod: (item: T) => string | undefined): boolean => {
  const dated = items
    .map((item) => parsePeriodRange(getPeriod(item)))
    .filter((parsed) => parsed.hasDate);

  if (dated.length < 2) return true;

  for (let i = 1; i < dated.length; i += 1) {
    if (compareChronologicalDescTuple(dated[i - 1], dated[i]) > 0) {
      return false;
    }
  }
  return true;
};

export const sortProjectsDesc = (items: ProjectItem[]): ProjectItem[] =>
  sortByPeriodDesc(items, (item) => item.period);

export const isProjectsChronological = (items: ProjectItem[]): boolean =>
  isPeriodChronological(items, (item) => item.period);

export const sortOrganizationsDesc = (items: OrganizationItem[]): OrganizationItem[] =>
  sortByPeriodDesc(items, (item) => item.period);

export const isOrganizationsChronological = (items: OrganizationItem[]): boolean =>
  isPeriodChronological(items, (item) => item.period);

export const sortEducationDesc = (items: Education[]): Education[] =>
  sortByPeriodDesc(items, (item) => item.graduationDate);

export const isEducationChronological = (items: Education[]): boolean =>
  isPeriodChronological(items, (item) => item.graduationDate);

export const sortCertificationsDesc = (items: CertificationItem[]): CertificationItem[] =>
  sortByPeriodDesc(items, (item) => item.year);

export const isCertificationsChronological = (items: CertificationItem[]): boolean =>
  isPeriodChronological(items, (item) => item.year);

export const moveItemById = <T extends { id: string }>(
  items: T[],
  id: string,
  direction: "up" | "down"
): T[] => {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return items;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next;
};
