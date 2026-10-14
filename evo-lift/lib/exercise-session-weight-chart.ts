import { formatDateOnlyForLocale } from "@/lib/date-format";

/** Minimal row shape for session weight chart aggregation (matches exercise history rows). */
export type ExerciseSessionWeightSetRow = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  setNumber: number;
  weightKg: number | null;
  totalKg: number;
  isWarmup: boolean;
};

export type ExerciseSessionWeightChartPoint = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  /** Categorical X key (stable, unique per session). */
  xKey: string;
  /** Short label for the X axis (may disambiguate multiple sessions on the same day). */
  xTickLabel: string;
  heaviestTotalKg: number;
  heaviestLoadedKg: number;
  /** Total (kg) minus Loaded (kg) for the chosen set — base on the bar for that session. */
  baseKg: number;
  heaviestSetNumber: number;
};

function loggedLoadKg(row: ExerciseSessionWeightSetRow): number | null {
  if (row.weightKg == null) {
    return null;
  }
  const w = Number(row.weightKg);
  return Number.isFinite(w) ? w : null;
}

/**
 * One chart point per workout **session**: **heaviest working set** by **Total (kg)** among sets
 * with a **logged** load (same gate as loaded / total KPIs on the exercise page). Warmups excluded.
 * Tie on total: higher **set number** wins (favors the later / “top” set in session order).
 */
export function buildExerciseSessionWeightChartPoints(
  rows: ExerciseSessionWeightSetRow[],
): ExerciseSessionWeightChartPoint[] {
  const bySession = new Map<string, ExerciseSessionWeightSetRow[]>();
  for (const row of rows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  const rawPoints: Omit<ExerciseSessionWeightChartPoint, "xTickLabel">[] = [];

  for (const [sessionId, sessionRows] of bySession) {
    const eligible = sessionRows.filter((r) => !r.isWarmup && loggedLoadKg(r) !== null);
    if (eligible.length === 0) {
      continue;
    }

    let best = eligible[0];
    for (const r of eligible) {
      if (r.totalKg > best.totalKg) {
        best = r;
        continue;
      }
      if (r.totalKg === best.totalKg && r.setNumber > best.setNumber) {
        best = r;
      }
    }

    const loaded = Number(best.weightKg);
    const heaviestLoadedKg = Number.isFinite(loaded) ? loaded : 0;
    const heaviestTotalKg = best.totalKg;
    const baseKg = heaviestTotalKg - heaviestLoadedKg;

    rawPoints.push({
      sessionId,
      performedOn: best.performedOn,
      sessionCreatedAt: best.sessionCreatedAt,
      xKey: best.sessionCreatedAt,
      heaviestTotalKg,
      heaviestLoadedKg,
      baseKg,
      heaviestSetNumber: best.setNumber,
    });
  }

  rawPoints.sort((a, b) => {
    const d = a.performedOn.localeCompare(b.performedOn);
    if (d !== 0) {
      return d;
    }
    return a.sessionCreatedAt.localeCompare(b.sessionCreatedAt);
  });

  const countsByPerformedOn = new Map<string, number>();
  for (const p of rawPoints) {
    countsByPerformedOn.set(p.performedOn, (countsByPerformedOn.get(p.performedOn) ?? 0) + 1);
  }

  const dayCounter = new Map<string, number>();
  const withLabels: ExerciseSessionWeightChartPoint[] = [];
  for (const p of rawPoints) {
    const next = (dayCounter.get(p.performedOn) ?? 0) + 1;
    dayCounter.set(p.performedOn, next);
    const totalOnDay = countsByPerformedOn.get(p.performedOn) ?? 1;
    const baseLabel = formatDateOnlyForLocale(p.performedOn);
    const xTickLabel =
      totalOnDay === 1 ? baseLabel : next === 1 ? baseLabel : `${baseLabel} (${next})`;
    withLabels.push({ ...p, xTickLabel });
  }

  return withLabels;
}

function formatKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function comparedWithPrevious(delta: number): string {
  if (Math.abs(delta) < 0.05) {
    return "the same as the session before";
  }
  const amount = formatKg(Math.abs(delta));
  return `${amount} ${delta > 0 ? "more" : "less"} than the session before`;
}

/** Last session versus the session before, for the series on screen. */
export function buildWeightChangeSentence(
  points: ExerciseSessionWeightChartPoint[],
  mode: "total" | "loaded" | "both",
): string {
  if (points.length === 0) {
    return "";
  }
  const last = points[points.length - 1];
  if (points.length === 1) {
    if (mode === "total") {
      return `Last session: ${formatKg(last.heaviestTotalKg)} total. Log another session to see the change.`;
    }
    if (mode === "both") {
      return `Last session: ${formatKg(last.heaviestLoadedKg)} loaded and ${formatKg(last.heaviestTotalKg)} total. Log another session to see the change.`;
    }
    return `Last session: ${formatKg(last.heaviestLoadedKg)} loaded. Log another session to see the change.`;
  }

  const previous = points[points.length - 2];
  if (mode === "both") {
    const loadedDelta = last.heaviestLoadedKg - previous.heaviestLoadedKg;
    const totalDelta = last.heaviestTotalKg - previous.heaviestTotalKg;
    return `Last session: ${formatKg(last.heaviestLoadedKg)} loaded, ${comparedWithPrevious(loadedDelta)}, and ${formatKg(last.heaviestTotalKg)} total, ${comparedWithPrevious(totalDelta)}.`;
  }

  const lastValue = mode === "total" ? last.heaviestTotalKg : last.heaviestLoadedKg;
  const previousValue = mode === "total" ? previous.heaviestTotalKg : previous.heaviestLoadedKg;
  const unit = mode === "total" ? "total" : "loaded";
  return `Last session: ${formatKg(lastValue)} ${unit}, ${comparedWithPrevious(lastValue - previousValue)}.`;
}

/** Y-axis bounds around the plotted weights so small changes stay visible. */
export function zoomedWeightAxisDomain(values: number[]): [number, number] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return [0, 1];
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = Math.max(max - min, 2.5);
  const pad = Math.max(span * 0.2, 1);
  let low = Math.max(0, min - pad);
  let high = max + pad;
  const step = span >= 40 ? 5 : span >= 15 ? 2.5 : span >= 5 ? 1 : 0.5;
  low = Math.floor(low / step) * step;
  high = Math.ceil(high / step) * step;
  if (high <= low) {
    high = low + step;
  }
  return [Number(low.toFixed(2)), Number(high.toFixed(2))];
}
