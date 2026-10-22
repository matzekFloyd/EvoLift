/** Wider layouts show every exercise. Scroll the active one into view when it is not first. */
export function shouldScrollActiveExerciseIntoView(input: {
  isChecking: boolean;
  isPhone: boolean;
  isReadOnly: boolean;
  activeExerciseIndex: number;
}): boolean {
  if (input.isChecking || input.activeExerciseIndex <= 0) {
    return false;
  }
  const singleExerciseFlow = input.isPhone && !input.isReadOnly;
  return !singleExerciseFlow;
}
