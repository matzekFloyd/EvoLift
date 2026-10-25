/**
 * Four starter plans inserted for an account that has no plans yet.
 * The lifter owns them: they can edit, rename, delete, and activate each one.
 * Names stay plain. A prefix would mark a plan as special after the lifter changes it.
 */

export const STARTER_PLAN_NOTES = "Do the days in order, then start again.";

export type StarterPlanExercise = {
  slug: string;
  sets: number;
  reps: number;
  /** Hold length for a timed exercise. Plan rows store this on the exercise notes. */
  notes: string | null;
};

export type StarterPlanDay = {
  name: string;
  exercises: readonly StarterPlanExercise[];
};

export type StarterPlan = {
  name: string;
  days: readonly StarterPlanDay[];
};

const exercise = (
  slug: string,
  sets: number,
  reps: number,
  notes: string | null = null,
): StarterPlanExercise => ({ slug, sets, reps, notes });

export const STARTER_PLANS: readonly StarterPlan[] = [
  {
    name: "Full body",
    days: [
      {
        name: "Full Body #1",
        exercises: [
          exercise("back-squat", 3, 6),
          exercise("barbell-bench-press", 3, 8),
          exercise("lat-pulldown", 3, 10),
          exercise("barbell-romanian-deadlift", 3, 10),
          exercise("assisted-dip", 3, 8),
          exercise("standing-calf-raise", 3, 10),
          exercise("dumbbell-supinated-curl", 3, 10),
        ],
      },
      {
        name: "Full Body #2",
        exercises: [
          exercise("deadlift", 3, 5),
          exercise("overhead-press", 3, 8),
          exercise("chest-supported-t-bar-row", 3, 12),
          exercise("leg-extension", 3, 12),
          exercise("cable-flye", 3, 12),
          exercise("crunch", 3, 12),
          exercise("dumbbell-skull-crusher", 3, 12),
        ],
      },
      {
        name: "Full Body #3",
        exercises: [
          exercise("dumbbell-walking-lunge", 3, 10),
          exercise("dumbbell-incline-press", 3, 8),
          exercise("reverse-grip-lat-pulldown", 3, 10),
          exercise("barbell-hip-thrust", 3, 12),
          exercise("seated-face-pull", 3, 12),
          exercise("dumbbell-lateral-raise", 3, 10),
          exercise("lying-leg-curl", 3, 10),
        ],
      },
    ],
  },
  {
    name: "Upper / Lower",
    days: [
      {
        name: "Lower Body #1",
        exercises: [
          exercise("back-squat", 3, 6),
          exercise("barbell-romanian-deadlift", 3, 10),
          exercise("barbell-hip-thrust", 3, 12),
          exercise("leg-extension", 3, 12),
          exercise("lying-leg-curl", 3, 12),
          exercise("machine-seated-hip-abduction", 3, 6),
          exercise("crunch", 3, 12),
        ],
      },
      {
        name: "Upper Body #1",
        exercises: [
          exercise("barbell-bench-press", 3, 5),
          exercise("lat-pulldown", 3, 10),
          exercise("overhead-press", 3, 10),
          exercise("chest-supported-t-bar-row", 3, 12),
          exercise("cable-flye", 3, 12),
          exercise("dumbbell-supinated-curl", 3, 10),
          exercise("single-arm-rope-tricep-extension", 3, 12),
        ],
      },
      {
        name: "Lower Body #2",
        exercises: [
          exercise("deadlift", 3, 8),
          exercise("dumbbell-walking-lunge", 3, 10),
          exercise("single-leg-leg-extension", 3, 15),
          exercise("single-leg-lying-leg-curl", 3, 15),
          exercise("machine-seated-hip-abduction", 3, 15),
          exercise("standing-calf-raise", 3, 12),
          exercise("plank", 3, 20, "20 sec"),
        ],
      },
      {
        name: "Upper Body #2",
        exercises: [
          exercise("dumbbell-incline-press", 3, 8),
          exercise("reverse-grip-lat-pulldown", 3, 8),
          exercise("assisted-dip", 3, 10),
          exercise("barbell-bent-over-row", 3, 12),
          exercise("dumbbell-lateral-raise", 3, 15),
          exercise("seated-face-pull", 3, 15),
          exercise("hammer-curl", 3, 8),
        ],
      },
    ],
  },
  {
    name: "Push / Pull / Legs",
    days: [
      {
        name: "Push",
        exercises: [
          exercise("barbell-bench-press", 3, 5),
          exercise("overhead-press", 3, 5),
          exercise("dumbbell-incline-press", 3, 8),
          exercise("dumbbell-lateral-raise", 3, 10),
          exercise("pec-deck", 3, 10),
          exercise("cable-tricep-pushdown", 3, 10),
        ],
      },
      {
        name: "Pull",
        exercises: [
          exercise("barbell-bent-over-row", 3, 8),
          exercise("lat-pulldown", 3, 8),
          exercise("cable-seated-row", 3, 8),
          exercise("seated-face-pull", 3, 10),
          exercise("barbell-curl", 3, 10),
          exercise("hammer-curl", 3, 10),
        ],
      },
      {
        name: "Legs",
        exercises: [
          exercise("back-squat", 3, 5),
          exercise("barbell-romanian-deadlift", 3, 8),
          exercise("leg-press", 3, 8),
          exercise("lying-leg-curl", 3, 10),
          exercise("standing-calf-raise", 3, 10),
          exercise("cable-crunch", 3, 10),
        ],
      },
    ],
  },
  {
    name: "Body part",
    days: [
      {
        name: "Chest & Triceps",
        exercises: [
          exercise("barbell-bench-press", 3, 6),
          exercise("dumbbell-incline-press", 3, 8),
          exercise("cable-flye", 3, 12),
          exercise("assisted-dip", 3, 10),
          exercise("dumbbell-skull-crusher", 3, 12),
        ],
      },
      {
        name: "Legs & Abs",
        exercises: [
          exercise("back-squat", 3, 6),
          exercise("barbell-romanian-deadlift", 3, 8),
          exercise("barbell-hip-thrust", 3, 12),
          exercise("leg-extension", 3, 12),
          exercise("lying-leg-curl", 3, 12),
          exercise("standing-calf-raise", 2, 8),
          exercise("crunch", 2, 12),
        ],
      },
      {
        name: "Back & Biceps",
        exercises: [
          exercise("reverse-grip-lat-pulldown", 3, 8),
          exercise("cable-seated-row", 3, 10),
          exercise("chest-supported-t-bar-row", 3, 12),
          exercise("seated-face-pull", 3, 15),
          exercise("dumbbell-supinated-curl", 3, 12),
        ],
      },
      {
        name: "Legs & Abs",
        exercises: [
          exercise("deadlift", 3, 5),
          exercise("dumbbell-walking-lunge", 3, 10),
          exercise("single-leg-leg-extension", 2, 15),
          exercise("single-leg-lying-leg-curl", 2, 15),
          exercise("machine-seated-hip-abduction", 3, 15),
          exercise("standing-calf-raise", 2, 12),
          exercise("plank", 3, 20, "20 sec"),
        ],
      },
      {
        name: "Shoulders & Arms",
        exercises: [
          exercise("overhead-press", 3, 6),
          exercise("dumbbell-lateral-raise", 3, 12),
          exercise("cable-reverse-flye", 3, 15),
          exercise("single-arm-rope-tricep-extension", 2, 12),
          exercise("single-arm-cable-curl", 2, 12),
        ],
      },
    ],
  },
];

/** One SQL VALUES row per exercise, in plan, day, and exercise order. */
export function starterPlanSeedSqlRows(): string[] {
  const rows: string[] = [];
  for (const plan of STARTER_PLANS) {
    plan.days.forEach((day, dayIndex) => {
      day.exercises.forEach((row, exerciseIndex) => {
        const notes = row.notes == null ? "null" : `'${row.notes.replaceAll("'", "''")}'`;
        rows.push(
          `('${plan.name.replaceAll("'", "''")}', ${dayIndex + 1}, '${day.name.replaceAll("'", "''")}', ${exerciseIndex + 1}, '${row.slug}', ${row.sets}, ${row.reps}, ${notes})`,
        );
      });
    });
  }
  return rows;
}
