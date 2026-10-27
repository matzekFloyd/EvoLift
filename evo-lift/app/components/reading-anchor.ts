/** Stable fragment for a reading heading. "Loaded (kg)" becomes "loaded-kg". */
export function readingAnchorId(label: string): string {
  const slug = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

/** First heading keeps the slug. A repeat on the same page gets -2, -3, and so on. */
export function uniqueReadingAnchorIds(labels: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label) => {
    const base = readingAnchorId(label);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}
