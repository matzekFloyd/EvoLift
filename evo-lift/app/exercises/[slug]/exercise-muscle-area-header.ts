import { exerciseMuscleAreas, muscleAreaLabel, type MuscleArea } from "@/lib/muscle-areas";

export type ExerciseDetailMuscleArea = {
  label: "Muscle area";
  primary: string;
  /** Catalog name, such as "Back", or null when there is no secondary. */
  secondary: string | null;
  primaryArea: MuscleArea;
  secondaryArea: MuscleArea | null;
};

/** Header copy for one catalog exercise. Null when the slug has no tags. */
export function exerciseDetailMuscleArea(slug: string): ExerciseDetailMuscleArea | null {
  const areas = exerciseMuscleAreas(slug);
  if (!areas) {
    return null;
  }
  return {
    label: "Muscle area",
    primary: muscleAreaLabel(areas.primary),
    secondary: areas.secondary == null ? null : muscleAreaLabel(areas.secondary),
    primaryArea: areas.primary,
    secondaryArea: areas.secondary,
  };
}
