import {
  createEmptyExerciseRow,
  exerciseDraftRowsFromTemplateLines,
  type ExerciseDraftRow,
} from "@/lib/workout-exercise-draft";

export type DayDraft = {
  key: string;
  id: string | null;
  name: string;
  exerciseRows: ExerciseDraftRow[];
};

type PlanDayExerciseSource = {
  exercise_id: string;
  position: number;
  base_weight_kg: number | null;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  notes: string | null;
};

export type PlanDaySource = {
  id: string;
  name: string;
  position: number;
  exercises: PlanDayExerciseSource[];
};

let nextDayKey = 1;

export function createDayDraft(partial?: Partial<Omit<DayDraft, "key">>): DayDraft {
  return {
    key: `plan-day-${nextDayKey++}`,
    id: partial?.id ?? null,
    name: partial?.name ?? "",
    exerciseRows: partial?.exerciseRows ?? [createEmptyExerciseRow()],
  };
}

export function planDayExerciseLabels(
  rows: readonly { exerciseId: string }[],
  options: readonly { id: string; label: string }[],
): string[] {
  const byId = new Map(options.map((option) => [option.id, option.label]));
  const labels: string[] = [];
  for (const row of rows) {
    if (!row.exerciseId) {
      continue;
    }
    const label = byId.get(row.exerciseId);
    if (label) {
      labels.push(label);
    }
  }
  return labels;
}

export function planDaySummary(input: {
  position: number;
  name: string;
  exerciseLabels: readonly string[];
}): { positionLabel: string; name: string; exercises: string } {
  const name = input.name.trim();
  const labels = input.exerciseLabels.map((label) => label.trim()).filter((label) => label.length > 0);
  return {
    positionLabel: `Day ${input.position}`,
    name: name || "Unnamed day",
    exercises: labels.length > 0 ? labels.join(", ") : "No exercises",
  };
}

type PlanDraftComparable = {
  name: string;
  notes: string;
  isActive: boolean;
  days: DayDraft[];
};

function comparableExercise(row: ExerciseDraftRow) {
  return {
    exerciseId: row.exerciseId,
    baseWeightKg: row.baseWeightKg.trim(),
    targetSets: row.targetSets.trim(),
    targetReps: row.targetReps.trim(),
    targetWeightKg: row.targetWeightKg.trim(),
    notes: row.notes.trim(),
  };
}

/** True when the editor differs from the plan that was opened, ignoring row keys. */
export function planDraftChanged(saved: PlanDraftComparable, current: PlanDraftComparable): boolean {
  if (saved.name.trim() !== current.name.trim()) {
    return true;
  }
  if (saved.notes.trim() !== current.notes.trim()) {
    return true;
  }
  if (saved.isActive !== current.isActive) {
    return true;
  }
  if (saved.days.length !== current.days.length) {
    return true;
  }
  for (let index = 0; index < saved.days.length; index += 1) {
    const savedDay = saved.days[index];
    const currentDay = current.days[index];
    if (!savedDay || !currentDay) {
      return true;
    }
    if (savedDay.id !== currentDay.id || savedDay.name.trim() !== currentDay.name.trim()) {
      return true;
    }
    if (savedDay.exerciseRows.length !== currentDay.exerciseRows.length) {
      return true;
    }
    for (let rowIndex = 0; rowIndex < savedDay.exerciseRows.length; rowIndex += 1) {
      const savedRow = savedDay.exerciseRows[rowIndex];
      const currentRow = currentDay.exerciseRows[rowIndex];
      if (!savedRow || !currentRow) {
        return true;
      }
      const left = comparableExercise(savedRow);
      const right = comparableExercise(currentRow);
      if (
        left.exerciseId !== right.exerciseId ||
        left.baseWeightKg !== right.baseWeightKg ||
        left.targetSets !== right.targetSets ||
        left.targetReps !== right.targetReps ||
        left.targetWeightKg !== right.targetWeightKg ||
        left.notes !== right.notes
      ) {
        return true;
      }
    }
  }
  return false;
}

export function daysFromPlan(plan: { days: PlanDaySource[] }): DayDraft[] {
  return [...plan.days]
    .sort((a, b) => a.position - b.position)
    .map((day) =>
      createDayDraft({
        id: day.id,
        name: day.name,
        exerciseRows:
          day.exercises.length > 0
            ? exerciseDraftRowsFromTemplateLines(day.exercises)
            : [createEmptyExerciseRow()],
      }),
    );
}
