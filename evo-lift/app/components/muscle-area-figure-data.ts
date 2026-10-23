import type { MuscleArea } from "@/lib/muscle-areas";

export type MuscleFigureRole = "primary" | "secondary" | "rest";

/** How one catalog area is drawn. Primary wins if the tags ever match. */
export function muscleFigureRole(
  area: MuscleArea,
  tagged: { primary: MuscleArea; secondary: MuscleArea | null },
): MuscleFigureRole {
  if (area === tagged.primary) {
    return "primary";
  }
  if (tagged.secondary != null && area === tagged.secondary) {
    return "secondary";
  }
  return "rest";
}

export type MuscleFigureSide = "front" | "rear";

export type MuscleEllipse = {
  area: MuscleArea;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

/** Head, neck, trunk, forearms, hands, and feet. Same on both sides. */
export const BODY_ELLIPSES = [
  { cx: 60, cy: 26, rx: 16, ry: 18 },
  { cx: 60, cy: 48, rx: 8, ry: 10 },
  { cx: 60, cy: 98, rx: 30, ry: 42 },
  { cx: 16, cy: 116, rx: 7, ry: 18 },
  { cx: 104, cy: 116, rx: 7, ry: 18 },
  { cx: 16, cy: 138, rx: 6, ry: 5 },
  { cx: 104, cy: 138, rx: 6, ry: 5 },
  { cx: 42, cy: 232, rx: 14, ry: 6 },
  { cx: 78, cy: 232, rx: 14, ry: 6 },
] as const;

/**
 * Front view. Shoulders and calves are also on the rear.
 * Order is paint order: later shapes sit on top.
 */
export const FRONT_MUSCLE_PATHS: readonly MuscleEllipse[] = [
  { area: "core", cx: 60, cy: 114, rx: 14, ry: 22 },
  { area: "chest", cx: 45, cy: 82, rx: 15, ry: 17 },
  { area: "chest", cx: 75, cy: 82, rx: 15, ry: 17 },
  { area: "quads", cx: 42, cy: 166, rx: 16, ry: 32 },
  { area: "quads", cx: 78, cy: 166, rx: 16, ry: 32 },
  { area: "calves", cx: 40, cy: 210, rx: 10, ry: 20 },
  { area: "calves", cx: 80, cy: 210, rx: 10, ry: 20 },
  { area: "shoulders", cx: 28, cy: 66, rx: 18, ry: 13 },
  { area: "shoulders", cx: 92, cy: 66, rx: 18, ry: 13 },
  { area: "biceps", cx: 18, cy: 88, rx: 10, ry: 22 },
  { area: "biceps", cx: 102, cy: 88, rx: 10, ry: 22 },
];

/** Rear view. Biceps stay on the front; triceps are here. */
export const REAR_MUSCLE_PATHS: readonly MuscleEllipse[] = [
  { area: "back", cx: 60, cy: 92, rx: 28, ry: 38 },
  { area: "glutes", cx: 44, cy: 138, rx: 16, ry: 15 },
  { area: "glutes", cx: 76, cy: 138, rx: 16, ry: 15 },
  { area: "hamstrings", cx: 42, cy: 174, rx: 13, ry: 26 },
  { area: "hamstrings", cx: 78, cy: 174, rx: 13, ry: 26 },
  { area: "calves", cx: 40, cy: 214, rx: 10, ry: 18 },
  { area: "calves", cx: 80, cy: 214, rx: 10, ry: 18 },
  { area: "shoulders", cx: 28, cy: 66, rx: 18, ry: 13 },
  { area: "shoulders", cx: 92, cy: 66, rx: 18, ry: 13 },
  { area: "triceps", cx: 18, cy: 88, rx: 10, ry: 22 },
  { area: "triceps", cx: 102, cy: 88, rx: 10, ry: 22 },
];

export const MUSCLE_FIGURE_VIEW_BOX = "0 0 120 246";
