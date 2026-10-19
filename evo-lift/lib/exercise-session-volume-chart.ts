import { buildChartAxisTickLabel } from "@/lib/date-format";

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

  const includeYear = new Set(rawPoints.map((p) => p.performedOn.slice(0, 4))).size > 1;
  const dayCounter = new Map<string, number>();
  const withLabels: ExerciseSessionVolumeChartPoint[] = [];
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

function formatVolumeKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function workingSetDeltaClause(delta: number, lastCount: number): string {
  if (delta === 0) {
    return `the same number of working sets (${lastCount})`;
  }
  const amount = Math.abs(delta);
  const noun = amount === 1 ? "working set" : "working sets";
  return delta > 0 ? `${amount} more ${noun}` : `${amount} fewer ${noun}`;
}

/** Last session volume versus the session before, including a set-count change when it differs. */
export function buildVolumeChangeSentence(points: ExerciseSessionVolumeChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  const last = points[points.length - 1];
  const lastVolume = formatVolumeKg(last.volumeKg);
  if (points.length === 1) {
    const setNoun = last.workingSetsIncluded === 1 ? "working set" : "working sets";
    return `Last session volume is ${lastVolume} across ${last.workingSetsIncluded} ${setNoun}. Log another session to see the change.`;
  }
  const previous = points[points.length - 2];
  const delta = last.volumeKg - previous.volumeKg;
  const volumeClause =
    Math.abs(delta) < 0.05
      ? "the same volume as the session before"
      : `${formatVolumeKg(Math.abs(delta))} ${delta > 0 ? "more" : "less"} than the session before`;
  const setClause = workingSetDeltaClause(
    last.workingSetsIncluded - previous.workingSetsIncluded,
    last.workingSetsIncluded,
  );
  return `Last session volume is ${lastVolume}, ${volumeClause}, with ${setClause}.`;
}
