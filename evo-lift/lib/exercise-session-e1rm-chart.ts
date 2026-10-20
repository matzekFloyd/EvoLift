import { buildChartAxisTickLabel } from "@/lib/date-format";
import { estimateEpley1Rm } from "@/lib/exercise-progress-insights";

/** Row shape for estimated 1RM aggregation (matches exercise set history). */
export type ExerciseSessionE1rmSetRow = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  totalKg: number;
  isWarmup: boolean;
};

export type ExerciseSessionE1rmChartPoint = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  xKey: string;
  xTickLabel: string;
  /** Best Epley estimate for the session (Total kg, ≤12 reps). */
  e1rmKg: number;
  sourceSetNumber: number;
  sourceReps: number;
  sourceTotalKg: number;
  sourceLoadedKg: number;
};

function loggedLoadKg(row: ExerciseSessionE1rmSetRow): number | null {
  if (row.weightKg == null) {
    return null;
  }
  const w = Number(row.weightKg);
  return Number.isFinite(w) ? w : null;
}

/**
 * One point per session: highest estimated 1RM from working sets with a logged load and
 * 1–12 reps (Epley on Total kg). Warmups and sets above 12 reps are excluded.
 * Tie on estimate: higher Total (kg), then higher set number.
 */
export function buildExerciseSessionE1rmChartPoints(
  rows: ExerciseSessionE1rmSetRow[],
): ExerciseSessionE1rmChartPoint[] {
  const bySession = new Map<string, ExerciseSessionE1rmSetRow[]>();
  for (const row of rows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  const rawPoints: Omit<ExerciseSessionE1rmChartPoint, "xTickLabel">[] = [];

  for (const [sessionId, sessionRows] of bySession) {
    let best: {
      e1rmKg: number;
      setNumber: number;
      reps: number;
      totalKg: number;
      loadedKg: number;
      performedOn: string;
      sessionCreatedAt: string;
    } | null = null;

    for (const r of sessionRows) {
      if (r.isWarmup) {
        continue;
      }
      const loaded = loggedLoadKg(r);
      if (loaded === null) {
        continue;
      }
      const reps = Number(r.reps);
      const estimate = estimateEpley1Rm(r.totalKg, reps);
      if (estimate == null) {
        continue;
      }
      if (
        !best ||
        estimate > best.e1rmKg ||
        (estimate === best.e1rmKg && r.totalKg > best.totalKg) ||
        (estimate === best.e1rmKg && r.totalKg === best.totalKg && r.setNumber > best.setNumber)
      ) {
        best = {
          e1rmKg: estimate,
          setNumber: r.setNumber,
          reps,
          totalKg: r.totalKg,
          loadedKg: loaded,
          performedOn: r.performedOn,
          sessionCreatedAt: r.sessionCreatedAt,
        };
      }
    }

    if (!best) {
      continue;
    }

    rawPoints.push({
      sessionId,
      performedOn: best.performedOn,
      sessionCreatedAt: best.sessionCreatedAt,
      xKey: best.sessionCreatedAt,
      e1rmKg: best.e1rmKg,
      sourceSetNumber: best.setNumber,
      sourceReps: best.reps,
      sourceTotalKg: best.totalKg,
      sourceLoadedKg: best.loadedKg,
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

  const includeYear = new Set(rawPoints.map((p) => p.performedOn.slice(0, 4))).size > 1;
  const dayCounter = new Map<string, number>();
  const withLabels: ExerciseSessionE1rmChartPoint[] = [];
  for (const p of rawPoints) {
    const next = (dayCounter.get(p.performedOn) ?? 0) + 1;
    dayCounter.set(p.performedOn, next);
    const totalOnDay = countsByPerformedOn.get(p.performedOn) ?? 1;
    withLabels.push({
      ...p,
      xTickLabel: buildChartAxisTickLabel(p.performedOn, next, totalOnDay, { includeYear }),
    });
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

/** Last session estimated 1RM versus the session before. */
export function buildE1rmChangeSentence(points: ExerciseSessionE1rmChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  const last = points[points.length - 1];
  const lastText = formatKg(last.e1rmKg);
  if (points.length === 1) {
    return `Last session estimated 1RM is ${lastText}. Log another session to see the change.`;
  }
  const previous = points[points.length - 2];
  const delta = last.e1rmKg - previous.e1rmKg;
  return `Last session estimated 1RM is ${lastText}, ${comparedWithPrevious(delta)}.`;
}
