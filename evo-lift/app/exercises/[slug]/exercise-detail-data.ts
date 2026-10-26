import {
  compareExerciseSetHistoryForPerformedOn,
  isRowEarlier,
  sortExerciseHistoryRowsCanonical,
} from "@/app/exercises/[slug]/exercise-history";
import { normalizeLoadedForComparison } from "@/app/exercises/[slug]/exercise-history-display";
import { formatMilestoneTarget, type MilestoneType } from "@/lib/milestone-progress";

export type ExerciseSetHistoryRow = {
  sessionId: string;
  performedOn: string;
  /** `workout_sessions.created_at` (ISO); disambiguates multiple sessions on the same `performed_on` day. */
  sessionCreatedAt: string;
  /** `workout_sets.performed_at`. Matches a goal's achieved time when this set reached it. */
  performedAt: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  totalKg: number;
  isWarmup: boolean;
  /** Set when this row is the set that reached one or more goals. */
  goalLabel: string | null;
};

export type HistorySortKey =
  | "performedOn"
  | "setNumber"
  | "reps"
  | "weightKg"
  | "totalKg"
  | "isWarmup";
export type HistorySortDirection = "asc" | "desc";

export type ExerciseWorkoutSetRow = {
  session_exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number | null;
  is_warmup: boolean;
  performed_at: string;
};

export type ExerciseAchievedMilestoneRow = {
  milestone_type: MilestoneType;
  target_weight_kg: number | string | null;
  bodyweight_multiple: number | string | null;
  min_reps: number;
  achieved_at: string | null;
};

/** Goal labels keyed by the epoch ms of the set that reached them (`achieved_at`). */
export function buildGoalLabelsByAchievedAt(
  exerciseId: string,
  milestones: readonly ExerciseAchievedMilestoneRow[],
): Map<number, string[]> {
  const goalLabelsByAchievedAt = new Map<number, string[]>();
  for (const milestone of milestones) {
    if (!milestone.achieved_at) {
      continue;
    }
    const achievedAtMs = new Date(milestone.achieved_at).getTime();
    if (!Number.isFinite(achievedAtMs)) {
      continue;
    }
    const label = formatMilestoneTarget({
      exerciseId,
      milestoneType: milestone.milestone_type,
      targetWeightKg:
        milestone.target_weight_kg == null ? null : Number(milestone.target_weight_kg),
      bodyweightMultiple:
        milestone.bodyweight_multiple == null ? null : Number(milestone.bodyweight_multiple),
      minReps: milestone.min_reps,
    });
    const labels = goalLabelsByAchievedAt.get(achievedAtMs) ?? [];
    labels.push(label);
    goalLabelsByAchievedAt.set(achievedAtMs, labels);
  }
  return goalLabelsByAchievedAt;
}

/** Joins raw set rows with their session meta, base weight, and goal labels, in canonical order. */
export function buildExerciseSetHistoryRows(input: {
  sets: readonly ExerciseWorkoutSetRow[];
  sessionIdBySessionExerciseId: ReadonlyMap<string, string>;
  baseWeightBySessionExerciseId: ReadonlyMap<string, number>;
  sessionMetaBySessionId: ReadonlyMap<string, { performedOn: string; createdAt: string }>;
  goalLabelsByAchievedAt: ReadonlyMap<number, string[]>;
  assistance: boolean;
}): ExerciseSetHistoryRow[] {
  const history = input.sets
    .map((setRow) => {
      const sessionId = input.sessionIdBySessionExerciseId.get(setRow.session_exercise_id);
      if (!sessionId) {
        return null;
      }
      const sessionMeta = input.sessionMetaBySessionId.get(sessionId);
      if (!sessionMeta) {
        return null;
      }
      const baseWeightRaw = input.baseWeightBySessionExerciseId.get(setRow.session_exercise_id) ?? 0;
      const loadedRaw = setRow.weight_kg ?? 0;
      const baseWeightValue = Number(baseWeightRaw);
      const loadedValue = Number(loadedRaw);
      const baseWeightKg = Number.isFinite(baseWeightValue) ? baseWeightValue : 0;
      const loadedKg = Number.isFinite(loadedValue) ? loadedValue : 0;
      const performedAtMs = new Date(setRow.performed_at).getTime();
      const goalLabels = Number.isFinite(performedAtMs)
        ? input.goalLabelsByAchievedAt.get(performedAtMs)
        : undefined;
      return {
        sessionId,
        performedOn: sessionMeta.performedOn,
        sessionCreatedAt: sessionMeta.createdAt,
        performedAt: setRow.performed_at,
        setNumber: setRow.set_number,
        reps: setRow.reps,
        weightKg: setRow.weight_kg,
        totalKg: input.assistance ? loadedKg : loadedKg + baseWeightKg,
        isWarmup: setRow.is_warmup,
        goalLabel: goalLabels && goalLabels.length > 0 ? goalLabels.join(", ") : null,
      };
    })
    .filter((row): row is ExerciseSetHistoryRow => row !== null);
  return sortExerciseHistoryRowsCanonical(history);
}

/** “Clear filters” uses the full span of loaded sets for this exercise (not the 12-week landing default). */
export function fullHistoryClearDateRange(
  rows: readonly { performedOn: string }[],
  today: string,
): { from: string; to: string } {
  if (rows.length === 0) {
    return { from: today, to: today };
  }
  let min = rows[0].performedOn.slice(0, 10);
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i].performedOn.slice(0, 10);
    if (d < min) {
      min = d;
    }
  }
  return { from: min, to: today };
}

export function filterExerciseHistoryRows(
  rows: readonly ExerciseSetHistoryRow[],
  filters: { from: string; to: string; hideWarmups: boolean },
): ExerciseSetHistoryRow[] {
  const inRange = rows.filter((row) => {
    const d = row.performedOn.slice(0, 10);
    return d >= filters.from && d <= filters.to;
  });
  if (filters.hideWarmups) {
    return inRange.filter((row) => !row.isWarmup);
  }
  return inRange;
}

/** Key of the best working set: most reps, then heaviest load, then earliest. */
export function topRepsRowKeyFor(workingRows: readonly ExerciseSetHistoryRow[]): string | null {
  if (workingRows.length === 0) {
    return null;
  }
  let selectedRow: ExerciseSetHistoryRow | null = null;
  for (const row of workingRows) {
    if (!selectedRow || row.reps > selectedRow.reps) {
      selectedRow = row;
      continue;
    }
    if (selectedRow && row.reps === selectedRow.reps) {
      const rowLoaded = normalizeLoadedForComparison(row.weightKg);
      const selectedLoaded = normalizeLoadedForComparison(selectedRow.weightKg);
      if (rowLoaded > selectedLoaded) {
        selectedRow = row;
        continue;
      }
      if (rowLoaded === selectedLoaded && isRowEarlier(row, selectedRow)) {
        selectedRow = row;
      }
    }
  }
  if (!selectedRow) {
    return null;
  }
  return `${selectedRow.sessionId}-${selectedRow.setNumber}`;
}

export function sortExerciseHistoryTableRows(
  rows: readonly ExerciseSetHistoryRow[],
  sortKey: HistorySortKey,
  sortDirection: HistorySortDirection,
): ExerciseSetHistoryRow[] {
  const next = [...rows];
  next.sort((left, right) => {
    let leftValue: string | number = "";
    let rightValue: string | number = "";
    if (sortKey === "performedOn") {
      return compareExerciseSetHistoryForPerformedOn(left, right, sortDirection);
    } else if (sortKey === "setNumber") {
      leftValue = left.setNumber;
      rightValue = right.setNumber;
    } else if (sortKey === "reps") {
      leftValue = left.reps;
      rightValue = right.reps;
    } else if (sortKey === "weightKg") {
      leftValue = left.weightKg ?? Number.NEGATIVE_INFINITY;
      rightValue = right.weightKg ?? Number.NEGATIVE_INFINITY;
    } else if (sortKey === "totalKg") {
      leftValue = left.totalKg;
      rightValue = right.totalKg;
    } else if (sortKey === "isWarmup") {
      leftValue = left.isWarmup ? 1 : 0;
      rightValue = right.isWarmup ? 1 : 0;
    }
    if (leftValue < rightValue) return sortDirection === "asc" ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
  return next;
}
