type NewSessionExerciseRow = {
  exerciseId: string;
  baseWeightKg: string;
};

export function newSessionCreateError(input: {
  userId: string | null;
  performedOn: string;
  exerciseRows: NewSessionExerciseRow[];
}): string | null {
  if (!input.userId) {
    return "You must be logged in to create a workout session.";
  }
  if (!input.performedOn) {
    return "Please choose a performed date.";
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
