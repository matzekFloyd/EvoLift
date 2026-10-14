type TemplateExerciseRow = {
  exerciseId: string;
  baseWeightKg: string;
};

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
