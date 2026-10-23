/**
 * Muscle areas for the exercise catalog.
 * Each exercise has one primary. The secondary is optional and is a different area.
 * Isolations usually have no secondary. There is no third area.
 *
 * The primary is the area the lift is for. The secondary is the other area a
 * lifter would still count. The same movement keeps the same tags when only
 * the equipment changes.
 */

export const MUSCLE_AREAS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

export type MuscleArea = (typeof MUSCLE_AREAS)[number];

export const MUSCLE_AREA_LABELS: Record<MuscleArea, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

export type ExerciseMuscleAreas = {
  primary: MuscleArea;
  secondary: MuscleArea | null;
};

/** Catalog slug, primary area, optional secondary. Alphabetical by slug. */
export const EXERCISE_MUSCLE_AREA_ROWS: ReadonlyArray<
  readonly [slug: string, primary: MuscleArea, secondary: MuscleArea | null]
> = [
  ["arnold-press", "shoulders", "triceps"],
  ["assisted-dip", "chest", "triceps"],
  ["assisted-pull-up", "back", "biceps"],
  ["back-extension", "back", "glutes"],
  ["back-squat", "quads", "glutes"],
  ["barbell-bench-press", "chest", "triceps"],
  ["barbell-bent-over-row", "back", "biceps"],
  ["barbell-curl", "biceps", null],
  ["barbell-hip-thrust", "glutes", "hamstrings"],
  ["barbell-incline-press", "chest", "triceps"],
  ["barbell-romanian-deadlift", "hamstrings", "glutes"],
  ["bent-over-reverse-dumbbell-flye", "shoulders", null],
  ["bicycle-crunch", "core", null],
  ["bulgarian-split-squat", "quads", "glutes"],
  ["cable-crunch", "core", null],
  ["cable-curl", "biceps", null],
  ["cable-flye", "chest", null],
  ["cable-lateral-raise", "shoulders", null],
  ["cable-pull-through", "glutes", "hamstrings"],
  ["cable-reverse-flye", "shoulders", null],
  ["cable-seated-row", "back", "biceps"],
  ["cable-tricep-kickback", "triceps", null],
  ["cable-tricep-pushdown", "triceps", null],
  ["chest-supported-row", "back", "biceps"],
  ["chest-supported-t-bar-row", "back", "biceps"],
  ["chin-up", "back", "biceps"],
  ["close-grip-bench-press", "triceps", "chest"],
  ["crunch", "core", null],
  ["deadlift", "hamstrings", "back"],
  ["dumbbell-bench-press", "chest", "triceps"],
  ["dumbbell-floor-press", "chest", "triceps"],
  ["dumbbell-flye", "chest", null],
  ["dumbbell-incline-press", "chest", "triceps"],
  ["dumbbell-lateral-raise", "shoulders", null],
  ["dumbbell-overhead-press", "shoulders", "triceps"],
  ["dumbbell-romanian-deadlift", "hamstrings", "glutes"],
  ["dumbbell-row", "back", "biceps"],
  ["dumbbell-seated-shoulder-press", "shoulders", "triceps"],
  ["dumbbell-single-leg-hip-thrust", "glutes", "hamstrings"],
  ["dumbbell-skull-crusher", "triceps", null],
  ["dumbbell-supinated-curl", "biceps", null],
  ["dumbbell-walking-lunge", "quads", "glutes"],
  ["ez-bar-curl", "biceps", null],
  ["front-squat", "quads", "glutes"],
  ["glute-bridge", "glutes", "hamstrings"],
  ["goblet-squat", "quads", "glutes"],
  ["hack-squat", "quads", "glutes"],
  ["hammer-curl", "biceps", null],
  ["hanging-leg-raise", "core", null],
  ["lat-pulldown", "back", "biceps"],
  ["leg-extension", "quads", null],
  ["leg-press", "quads", "glutes"],
  ["lying-leg-curl", "hamstrings", null],
  ["machine-chest-press", "chest", "triceps"],
  ["machine-incline-chest-press", "chest", "triceps"],
  ["machine-lateral-raise", "shoulders", null],
  ["machine-seated-hip-abduction", "glutes", null],
  ["neutral-grip-pulldown", "back", "biceps"],
  ["overhead-press", "shoulders", "triceps"],
  ["pallof-press", "core", null],
  ["pec-deck", "chest", null],
  ["plank", "core", null],
  ["pull-up", "back", "biceps"],
  ["push-up", "chest", "triceps"],
  ["reverse-grip-lat-pulldown", "back", "biceps"],
  ["reverse-pec-deck", "shoulders", null],
  ["seated-calf-raise", "calves", null],
  ["seated-face-pull", "shoulders", "back"],
  ["seated-leg-curl", "hamstrings", null],
  ["single-arm-cable-curl", "biceps", null],
  ["single-arm-pulldown", "back", "biceps"],
  ["single-arm-rope-tricep-extension", "triceps", null],
  ["single-leg-leg-extension", "quads", null],
  ["single-leg-lying-leg-curl", "hamstrings", null],
  ["standing-calf-raise", "calves", null],
  ["sumo-deadlift", "hamstrings", "back"],
  ["trap-bar-deadlift", "hamstrings", "back"],
];

const EXERCISE_MUSCLE_AREAS = new Map<string, ExerciseMuscleAreas>(
  EXERCISE_MUSCLE_AREA_ROWS.map(([slug, primary, secondary]) => [slug, { primary, secondary }]),
);

export function isMuscleArea(value: string): value is MuscleArea {
  return (MUSCLE_AREAS as readonly string[]).includes(value);
}

export function muscleAreaLabel(area: MuscleArea): string {
  return MUSCLE_AREA_LABELS[area];
}

/** Tags for a catalog slug. Null when the slug is not in the catalog. */
export function exerciseMuscleAreas(slug: string): ExerciseMuscleAreas | null {
  return EXERCISE_MUSCLE_AREAS.get(slug) ?? null;
}
