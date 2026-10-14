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
