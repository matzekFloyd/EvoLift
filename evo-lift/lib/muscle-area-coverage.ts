import {
  MUSCLE_AREAS,
  exerciseMuscleAreas,
  muscleAreaLabel,
  type MuscleArea,
} from "@/lib/muscle-areas";

/**
 * Sky fills for a primary count. Index 0 is unused: a primary count starts at 1.
 * The last step is the brand emphasis shade.
 */
export const MUSCLE_AREA_PRIMARY_FILLS = [
  "fill-sky-100 stroke-sky-300",
  "fill-sky-200 stroke-sky-400",
  "fill-sky-300 stroke-sky-500",
  "fill-sky-400 stroke-sky-600",
  "fill-sky-600 stroke-sky-800",
  "fill-sky-700 stroke-sky-900",
] as const;

export type MuscleAreaMark = "primary" | "secondary" | "missing";

export type MuscleAreaCoverageScope = "plan" | "template";

export type MuscleAreaCoverageArea = {
  area: MuscleArea;
  label: string;
  primaryCount: number;
  included: boolean;
  /** Primary count, "Secondary", or "Missing". */
  valueText: string;
  /** Index into the primary fill ramp. 0 when this area is not a primary count. */
  shade: number;
  mark: MuscleAreaMark;
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

function markFor(included: boolean, primaryCount: number): MuscleAreaMark {
  if (!included) {
    return "missing";
  }
  if (primaryCount === 0) {
    return "secondary";
  }
  return "primary";
}

function shadeForCount(primaryCount: number, maxPrimaryCount: number): number {
  const darkest = MUSCLE_AREA_PRIMARY_FILLS.length - 1;
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
      mark: markFor(areaIncluded, count),
    };
  });

  return {
    includedCount: included.size,
    areas,
  };
}
