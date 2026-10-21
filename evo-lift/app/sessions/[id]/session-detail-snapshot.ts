import type { OpenedSessionSnapshot } from "@/lib/opened-session-cache";
import { formatPlanSessionSource } from "@/lib/plan-cycle";

type JoinedName = { name: string } | { name: string }[] | null | undefined;

/** Related-name columns Supabase joins onto the session row (object or one-item array). */
export type SessionJoinedNames = {
  workout_templates?: JoinedName;
  workout_plans?: JoinedName;
  workout_plan_days?: JoinedName;
};

export type SessionExerciseMetadata = { id: string; slug: string; label: string };

/** Trimmed name from a joined relation, or null when missing or blank. */
export function joinedName(value: JoinedName): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  const name = row?.name?.trim();
  return name ? name : null;
}

/** 1-based session number: sessions created earlier, plus this session's rank among equal `created_at` values. */
export function computeSessionNumber(
  priorSessionCount: number | null,
  sameCreatedAtRows: Array<{ id: string }>,
  sessionId: string,
): number | null {
  const sameCreatedAtIndex = sameCreatedAtRows.findIndex((row) => row.id === sessionId);
  const computed = (priorSessionCount ?? 0) + (sameCreatedAtIndex >= 0 ? sameCreatedAtIndex + 1 : 1);
  return computed > 0 ? computed : null;
}

/** Assembles the cacheable session snapshot from loaded rows. */
export function buildSessionSnapshot(input: {
  sessionRow: OpenedSessionSnapshot["session"];
  joined: SessionJoinedNames;
  sessionExercises: OpenedSessionSnapshot["sessionExercises"];
  workoutSets: OpenedSessionSnapshot["workoutSets"];
  sessionNumber: number | null;
  exerciseMetadata: SessionExerciseMetadata[];
  hiddenExerciseRows: Array<{ exercise_id: string }>;
}): OpenedSessionSnapshot {
  const { sessionRow, joined } = input;
  const labels = new Map<string, string>();
  for (const item of input.exerciseMetadata) {
    labels.set(item.id, item.label);
  }
  const hiddenSet = new Set<string>();
  for (const row of input.hiddenExerciseRows) {
    hiddenSet.add(row.exercise_id);
  }
  const resolvedTemplateName = joinedName(joined.workout_templates);
  return {
    session: {
      id: sessionRow.id,
      user_id: sessionRow.user_id,
      performed_on: sessionRow.performed_on,
      notes: sessionRow.notes,
      source_template_id: sessionRow.source_template_id,
      plan_id: sessionRow.plan_id,
      plan_day_id: sessionRow.plan_day_id,
      started_at: sessionRow.started_at ?? null,
      completed_at: sessionRow.completed_at ?? null,
      created_at: sessionRow.created_at,
      updated_at: sessionRow.updated_at,
    },
    sessionExercises: input.sessionExercises,
    workoutSets: input.workoutSets,
    sessionNumber: input.sessionNumber,
    createdFromLabel:
      formatPlanSessionSource(joinedName(joined.workout_plans), joinedName(joined.workout_plan_days)) ??
      resolvedTemplateName,
    exerciseLabels: [...labels],
    exerciseOptions: input.exerciseMetadata.map((item) => ({
      id: item.id,
      label: item.label,
      slug: item.slug,
    })),
    hiddenExerciseIds: [...hiddenSet],
  };
}
