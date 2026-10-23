export type ExerciseDraftScanInput = {
  label: string | null;
  baseWeightKg: string;
  targetSets: string;
  targetWeightKg: string;
  targetReps: string;
  usesAssistance: boolean;
};

export type ExerciseDraftScan = {
  name: string;
  details: string;
};

function present(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Lift name, then the targets a collapsed row can show. */
export function exerciseDraftScan(input: ExerciseDraftScanInput): ExerciseDraftScan {
  const name = input.label?.trim() || "Exercise";
  const parts: string[] = [];
  const base = present(input.baseWeightKg);
  if (base && !input.usesAssistance) {
    parts.push(`Base weight ${base} kg`);
  }
  const sets = present(input.targetSets);
  if (sets) {
    parts.push(`${sets} sets`);
  }
  const weight = present(input.targetWeightKg);
  if (weight) {
    parts.push(
      input.usesAssistance ? `Target assistance ${weight} kg` : `Target weight ${weight} kg`,
    );
  }
  const reps = present(input.targetReps);
  if (reps) {
    parts.push(`${reps} reps`);
  }
  return { name, details: parts.join(", ") };
}
