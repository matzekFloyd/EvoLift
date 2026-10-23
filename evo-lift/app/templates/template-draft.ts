type TemplateExerciseRow = {
  exerciseId: string;
  baseWeightKg: string;
};

type TemplateDraftComparable = {
  name: string;
  notes: string;
  exerciseRows: Array<{
    exerciseId: string;
    baseWeightKg: string;
    targetSets: string;
    targetReps: string;
    targetWeightKg: string;
    notes: string;
  }>;
};

function comparableExercise(row: TemplateDraftComparable["exerciseRows"][number]) {
  return {
    exerciseId: row.exerciseId,
    baseWeightKg: row.baseWeightKg.trim(),
    targetSets: row.targetSets.trim(),
    targetReps: row.targetReps.trim(),
    targetWeightKg: row.targetWeightKg.trim(),
    notes: row.notes.trim(),
  };
}

/** True when the editor differs from the template that was opened, ignoring row keys. */
export function templateDraftChanged(
  saved: TemplateDraftComparable,
  current: TemplateDraftComparable,
): boolean {
  if (saved.name.trim() !== current.name.trim() || saved.notes.trim() !== current.notes.trim()) {
    return true;
  }
  if (saved.exerciseRows.length !== current.exerciseRows.length) {
    return true;
  }
  return saved.exerciseRows.some((savedRow, index) => {
    const currentRow = current.exerciseRows[index];
    if (!currentRow) {
      return true;
    }
    const left = comparableExercise(savedRow);
    const right = comparableExercise(currentRow);
    return (
      left.exerciseId !== right.exerciseId ||
      left.baseWeightKg !== right.baseWeightKg ||
      left.targetSets !== right.targetSets ||
      left.targetReps !== right.targetReps ||
      left.targetWeightKg !== right.targetWeightKg ||
      left.notes !== right.notes
    );
  });
}

export function getTemplateDraftStorageKey(userId: string, scope: string): string {
  return `evolift:template-draft:${userId}:${scope}`;
}

export function templateSaveError(input: {
  isLoggedIn: boolean;
  name: string;
  exerciseRows: TemplateExerciseRow[];
}): string | null {
  if (!input.isLoggedIn) {
    return "You must be logged in to save a template.";
  }
  if (!input.name.trim()) {
    return "Please enter a template name.";
  }
  if (input.exerciseRows.length === 0) {
    return "Add at least one exercise.";
  }
  if (input.exerciseRows.some((row) => !row.exerciseId)) {
    return "Please choose an exercise for each row.";
  }
  if (
    input.exerciseRows.some((row) => {
      if (!row.baseWeightKg) {
        return false;
      }
      const value = Number(row.baseWeightKg);
      return !Number.isFinite(value) || value < 0;
    })
  ) {
    return "Please enter a valid base weight for each exercise.";
  }
  return null;
}
