import {
  MUSCLE_AREAS,
  exerciseMuscleAreas,
  muscleAreaLabel,
  type MuscleArea,
} from "@/lib/muscle-areas";

/** One sky ramp. 0 is the lightest. The last step is the brand emphasis shade. */
export const MUSCLE_AREA_SHADE_CLASSES = [
  "border-sky-200 bg-sky-100 text-zinc-900",
  "border-sky-300 bg-sky-200 text-zinc-900",
  "border-sky-400 bg-sky-300 text-zinc-900",
  "border-sky-500 bg-sky-400 text-sky-950",
  "border-sky-700 bg-sky-600 text-white",
  "border-sky-800 bg-sky-700 text-white",
] as const;

export const MUSCLE_AREA_COVERAGE_NOTE =
  "The number counts primary exercises. A secondary area is included and does not add to it.";

/** A gap. Not a step on the sky ramp. */
export const MUSCLE_AREA_MISSING_CLASS = "border-amber-200 bg-amber-50 text-amber-800";

export type MuscleAreaCoverageScope = "plan" | "template";

export type MuscleAreaCoverageArea = {
  area: MuscleArea;
  label: string;
  primaryCount: number;
  included: boolean;
  /** Primary count, "Secondary", or "Missing". */
  valueText: string;
  /** Index into the sky ramp. 0 is the lightest. Missing areas stay at 0 and use their own fill. */
  shade: number;
  shadeClass: string;
};

export type MuscleAreaCoverage = {
  includedCount: number;
  areas: MuscleAreaCoverageArea[];
};

export function muscleAreaCoverageSummary(
  scope: MuscleAreaCoverageScope,
  includedCount: number,
): string {
  const place = scope === "plan" ? "plan" : "template";
  return `${includedCount} of ${MUSCLE_AREAS.length} areas in this ${place}.`;
}

/** Slugs for rows that have an exercise chosen. An empty row adds nothing. */
export function exerciseRowSlugs(
  rows: readonly { exerciseId: string }[],
  options: readonly { id: string; slug: string }[],
): string[] {
  const slugById = new Map(options.map((option) => [option.id, option.slug]));
  const slugs: string[] = [];
  for (const row of rows) {
    if (!row.exerciseId) {
      continue;
    }
    const slug = slugById.get(row.exerciseId);
    if (slug) {
      slugs.push(slug);
    }
  }
  return slugs;
}

function shadeForCount(primaryCount: number, maxPrimaryCount: number): number {
  const darkest = MUSCLE_AREA_SHADE_CLASSES.length - 1;
  if (primaryCount <= 0 || maxPrimaryCount <= 0) {
    return 0;
  }
  const step = Math.round((primaryCount / maxPrimaryCount) * darkest);
  return Math.max(1, Math.min(darkest, step));
}

function valueText(included: boolean, primaryCount: number): string {
  if (!included) {
    return "Missing";
  }
  if (primaryCount === 0) {
    return "Secondary";
  }
  return String(primaryCount);
}

function fillClass(included: boolean, shade: number): string {
  if (!included) {
    return MUSCLE_AREA_MISSING_CLASS;
  }
  return MUSCLE_AREA_SHADE_CLASSES[shade];
}

/** Coverage for the exercise rows in a plan or a template. */
export function muscleAreaCoverage(slugs: readonly string[]): MuscleAreaCoverage {
  const primaryCount = new Map<MuscleArea, number>(MUSCLE_AREAS.map((area) => [area, 0]));
  const included = new Set<MuscleArea>();

  for (const slug of slugs) {
    const tags = exerciseMuscleAreas(slug);
    if (!tags) {
      continue;
    }
    primaryCount.set(tags.primary, (primaryCount.get(tags.primary) ?? 0) + 1);
    included.add(tags.primary);
    if (tags.secondary) {
      included.add(tags.secondary);
    }
  }

  let maxPrimaryCount = 0;
  for (const count of primaryCount.values()) {
    if (count > maxPrimaryCount) {
      maxPrimaryCount = count;
    }
  }

  const areas = MUSCLE_AREAS.map((area) => {
    const count = primaryCount.get(area) ?? 0;
    const areaIncluded = included.has(area);
    const shade = shadeForCount(count, maxPrimaryCount);
    return {
      area,
      label: muscleAreaLabel(area),
      primaryCount: count,
      included: areaIncluded,
      valueText: valueText(areaIncluded, count),
      shade,
      shadeClass: fillClass(areaIncluded, shade),
    };
  });

  return {
    includedCount: included.size,
    areas,
  };
}
