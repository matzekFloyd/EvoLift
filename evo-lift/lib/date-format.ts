export function formatDateOnlyForLocale(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

/** Short axis tick for session charts (month + day; year when the series spans years). */
export function formatChartAxisDate(value: string, options?: { includeYear?: boolean }): string {
  const parsed = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(options?.includeYear ? { year: "numeric" } : {}),
  }).format(parsed);
}

/**
 * Axis label for one session point. When several sessions share a calendar day, later ones
 * get a `(n)` suffix so ticks stay unique.
 */
export function buildChartAxisTickLabel(
  performedOn: string,
  occurrenceOnDay: number,
  totalOnDay: number,
  options?: { includeYear?: boolean },
): string {
  const baseLabel = formatChartAxisDate(performedOn, options);
  if (totalOnDay === 1 || occurrenceOnDay === 1) {
    return baseLabel;
  }
  return `${baseLabel} (${occurrenceOnDay})`;
}
