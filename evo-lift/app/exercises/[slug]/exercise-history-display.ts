export function buildExerciseDetailFilterQueryString(
  from: string,
  to: string,
  hideWarmups: boolean,
  defaults: { from: string; to: string },
): string {
  const params = new URLSearchParams();
  if (from !== defaults.from) {
    params.set("from", from);
  }
  if (to !== defaults.to) {
    params.set("to", to);
  }
  if (!hideWarmups) {
    params.set("hideWarmups", "0");
  }
  return params.toString();
}

export function normalizeLoadedForComparison(weightKg: number | null): number {
  return weightKg ?? Number.NEGATIVE_INFINITY;
}

/** Working sets with an explicit logged load (kg), for load-based KPIs. */
export function loggedLoadKg(row: { weightKg: number | null }): number | null {
  if (row.weightKg == null) {
    return null;
  }
  const weight = Number(row.weightKg);
  return Number.isFinite(weight) ? weight : null;
}

/**
 * Per-set total on the bar (kg) for KPIs: same value as the history Total (kg) column.
 * Only working sets with a logged load qualify.
 */
export function setTotalKgForStats(row: { weightKg: number | null; totalKg: number }): number | null {
  if (loggedLoadKg(row) === null) {
    return null;
  }
  return row.totalKg;
}

export function formatKgValue(value: number | null, fractionDigits: number): string {
  return value == null ? "—" : `${value.toFixed(fractionDigits)} kg`;
}

export function historyRowTitle(
  row: { goalLabel: string | null; isWarmup: boolean },
  isTopRepsRow: boolean,
): string {
  const parts: string[] = [];
  if (isTopRepsRow) {
    parts.push("Best set marker: top reps (with tie-break rules).");
  }
  if (row.goalLabel) {
    parts.push(`Goal reached: ${row.goalLabel}.`);
  }
  if (!isTopRepsRow && !row.goalLabel) {
    parts.push("Set details for this exercise entry.");
  }
  parts.push("Open session.");
  parts.push(row.isWarmup ? "Warmup: yes." : "Warmup: no.");
  return parts.join(" ");
}

export function historyRowSurfaceClass(isTopRepsRow: boolean, isGoalRow: boolean): string {
  if (isTopRepsRow) {
    return "bg-emerald-100/70 text-emerald-950 hover:bg-emerald-100";
  }
  if (isGoalRow) {
    return "bg-sky-100/70 text-sky-950 hover:bg-sky-100";
  }
  return "odd:bg-white even:bg-zinc-50/60 hover:bg-zinc-100/70";
}

export function historyValueClass(isTopRepsRow: boolean, isGoalRow: boolean): string {
  if (isTopRepsRow) {
    return "font-medium text-emerald-900";
  }
  if (isGoalRow) {
    return "font-medium text-sky-900";
  }
  return "";
}
