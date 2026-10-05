export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const splitList = (value: string) =>
  value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const unique = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeText(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const compact = (items: Array<string | undefined | null>) =>
  items.filter((item): item is string => Boolean(item && item.trim()));

export const toPercent = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);
