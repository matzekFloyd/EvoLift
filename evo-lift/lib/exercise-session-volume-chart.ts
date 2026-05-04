import { formatDateOnlyForLocale } from "@/lib/date-format";

/** Row shape for volume aggregation (matches exercise set history). */
export type ExerciseSessionVolumeSetRow = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  reps: number;
  weightKg: number | null;
  totalKg: number;
  isWarmup: boolean;
};

export type ExerciseSessionVolumeChartPoint = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  xKey: string;
  xTickLabel: string;
  /** Sum of reps × Total (kg) over included working sets for this session. */
  volumeKg: number;
  /** Working sets with logged load that were included in the sum. */
  workingSetsIncluded: number;
};

function loggedLoadKg(row: ExerciseSessionVolumeSetRow): number | null {
  if (row.weightKg == null) {
    return null;
  }
  const w = Number(row.weightKg);
  return Number.isFinite(w) ? w : null;
}

/**
 * Session volume: sum over **working** sets of `reps × Total (kg)` on the bar (same Total as set
 * history). Only sets with a **logged** load are counted; **warmups** are excluded.
 */
export function buildExerciseSessionVolumeChartPoints(
  rows: ExerciseSessionVolumeSetRow[],
): ExerciseSessionVolumeChartPoint[] {
  const bySession = new Map<string, ExerciseSessionVolumeSetRow[]>();
  for (const row of rows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  const rawPoints: Omit<ExerciseSessionVolumeChartPoint, "xTickLabel">[] = [];

  for (const [sessionId, sessionRows] of bySession) {
    let volumeKg = 0;
    let workingSetsIncluded = 0;
    let meta: { performedOn: string; sessionCreatedAt: string } | null = null;

    for (const r of sessionRows) {
      if (r.isWarmup) {
        continue;
      }
      if (loggedLoadKg(r) === null) {
        continue;
      }
      const reps = Number(r.reps);
      if (!Number.isFinite(reps) || reps < 0) {
        continue;
      }
      meta = { performedOn: r.performedOn, sessionCreatedAt: r.sessionCreatedAt };
      volumeKg += reps * r.totalKg;
      workingSetsIncluded += 1;
    }

    if (!meta || workingSetsIncluded === 0 || volumeKg <= 0) {
      continue;
    }

    rawPoints.push({
      sessionId,
      performedOn: meta.performedOn,
      sessionCreatedAt: meta.sessionCreatedAt,
      xKey: meta.sessionCreatedAt,
      volumeKg,
      workingSetsIncluded,
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
  const withLabels: ExerciseSessionVolumeChartPoint[] = [];
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
