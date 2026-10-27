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

export type ExerciseHistoryStatInput = {
  sessionId: string;
  isWarmup: boolean;
  weightKg: number | null;
  totalKg: number;
};

export type ExerciseHistoryStats = {
  setCount: number;
  avgSetsPerSession: number | null;
  maxSetsInSession: number | null;
  avgLoadedKg: number | null;
  bestLoadedKg: number | null;
  avgTotalKg: number | null;
  bestTotalKg: number | null;
};

/**
 * Same summary numbers as the exercise page. Warmups count as logged sets and are left out of load totals.
 * On Assisted Dip and Assisted Pull-Up, `bestLoadedKg` is the lowest assistance, including 0 kg.
 */
export function summarizeExerciseHistory(
  rows: readonly ExerciseHistoryStatInput[],
  options?: { assistance?: boolean },
): ExerciseHistoryStats {
  const bySession = new Map<string, number>();
  for (const row of rows) {
    bySession.set(row.sessionId, (bySession.get(row.sessionId) ?? 0) + 1);
  }
  const counts = [...bySession.values()];
  const workingRows = rows.filter((row) => !row.isWarmup);
  const loads = workingRows.map(loggedLoadKg).filter((value): value is number => value !== null);
  const totals = workingRows.map(setTotalKgForStats).filter((value): value is number => value !== null);
  const bestLoadedKg =
    loads.length === 0 ? null : options?.assistance ? Math.min(...loads) : Math.max(...loads);
  return {
    setCount: rows.length,
    avgSetsPerSession: counts.length === 0 ? null : counts.reduce((sum, count) => sum + count, 0) / counts.length,
    maxSetsInSession: counts.length === 0 ? null : Math.max(...counts),
    avgLoadedKg: loads.length === 0 ? null : loads.reduce((sum, value) => sum + value, 0) / loads.length,
    bestLoadedKg,
    avgTotalKg: totals.length === 0 ? null : totals.reduce((sum, value) => sum + value, 0) / totals.length,
    bestTotalKg: totals.length === 0 ? null : Math.max(...totals),
  };
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
  if (isGoalRow) {
    return "!bg-emerald-100/70 text-emerald-950 hover:!bg-emerald-100";
  }
  if (isTopRepsRow) {
    return "!bg-sky-100/70 text-sky-950 hover:!bg-sky-100";
  }
  return "odd:bg-white even:bg-zinc-100 hover:bg-sky-50";
}

export function historyValueClass(isTopRepsRow: boolean, isGoalRow: boolean): string {
  if (isGoalRow) {
    return "font-medium text-emerald-900";
  }
  if (isTopRepsRow) {
    return "font-medium text-sky-900";
  }
  return "";
}
