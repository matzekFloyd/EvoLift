import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { MUSCLE_AREA_PRIMARY_FILLS, type MuscleAreaMark } from "@/lib/muscle-area-coverage";
import {
  MUSCLE_AREAS,
  exerciseMuscleAreas,
  muscleAreaLabel,
  type MuscleArea,
} from "@/lib/muscle-areas";

export type MuscleAreaRangeSet = {
  slug: string;
  reps: number;
  totalKg: number;
  /** Warmups are ignored. Insights samples are already working sets. */
  isWarmup?: boolean;
  /** False when the set has no logged load. Omitted means the load was logged. */
  hasLoggedLoad?: boolean;
};

export type MuscleAreaRangeArea = {
  area: MuscleArea;
  label: string;
  trained: boolean;
  volumeKg: number;
  /** "32%", "Trained", or "Not trained". */
  valueText: string;
  /**
   * Same marks as a plan or template: primary has volume, secondary is trained
   * with none, missing was not trained.
   */
  mark: MuscleAreaMark;
  /** Index into the sky ramp. 0 when this area has no primary volume. */
  shade: number;
};

export type MuscleAreaRangeCoverage = {
  totalVolumeKg: number;
  areas: MuscleAreaRangeArea[];
};

function countsAsWorkingSet(set: MuscleAreaRangeSet): boolean {
  if (set.isWarmup === true || set.hasLoggedLoad === false) {
    return false;
  }
  return Number.isFinite(set.reps) && set.reps >= 1;
}

/** Reps × Total (kg) on the primary. Assistance adds none. */
function addedVolumeKg(set: MuscleAreaRangeSet): number {
  if (!countsAsWorkingSet(set) || isAssistanceExercise(set.slug)) {
    return 0;
  }
  if (!Number.isFinite(set.totalKg) || set.totalKg <= 0) {
    return 0;
  }
  return set.reps * set.totalKg;
}

/** Larger primary volume is a darker step. Zero volume stays the lightest. */
function shadeForVolume(volumeKg: number, maxVolumeKg: number): number {
  const darkest = MUSCLE_AREA_PRIMARY_FILLS.length - 1;
  if (volumeKg <= 0 || maxVolumeKg <= 0) {
    return 0;
  }
  const step = Math.round((volumeKg / maxVolumeKg) * darkest);
  return Math.max(1, Math.min(darkest, step));
}

function markFor(trained: boolean, volumeKg: number): MuscleAreaMark {
  if (!trained) {
    return "missing";
  }
  if (volumeKg <= 0) {
    return "secondary";
  }
  return "primary";
}

/** Share of range volume, so 30% fills about a third of the bar. */
export function muscleAreaRangeBarPercent(volumeKg: number, totalVolumeKg: number): number {
  if (volumeKg <= 0 || totalVolumeKg <= 0) {
    return 0;
  }
  return (volumeKg / totalVolumeKg) * 100;
}

function valueText(trained: boolean, volumeKg: number, totalVolumeKg: number): string {
  if (!trained) {
    return "Not trained";
  }
  if (volumeKg <= 0 || totalVolumeKg <= 0) {
    return "Trained";
  }
  const rounded = Math.round((volumeKg / totalVolumeKg) * 100);
  return `${rounded === 0 ? 1 : rounded}%`;
}

/**
 * Muscle-area coverage for loaded working sets in one date range.
 * The caller passes sets already limited to that range.
 * Trained includes primary and secondary. Volume is added to the primary only.
 */
export function muscleAreaRangeCoverage(sets: readonly MuscleAreaRangeSet[]): MuscleAreaRangeCoverage {
  const volumeKg = new Map<MuscleArea, number>(MUSCLE_AREAS.map((area) => [area, 0]));
  const trained = new Set<MuscleArea>();

  for (const set of sets) {
    if (!countsAsWorkingSet(set)) {
      continue;
    }
    const tags = exerciseMuscleAreas(set.slug);
    if (!tags) {
      continue;
    }
    volumeKg.set(tags.primary, (volumeKg.get(tags.primary) ?? 0) + addedVolumeKg(set));
    trained.add(tags.primary);
    if (tags.secondary) {
      trained.add(tags.secondary);
    }
  }

  let totalVolumeKg = 0;
  let maxVolumeKg = 0;
  for (const volume of volumeKg.values()) {
    totalVolumeKg += volume;
    if (volume > maxVolumeKg) {
      maxVolumeKg = volume;
    }
  }

  const areas = MUSCLE_AREAS.map((area) => {
    const volume = volumeKg.get(area) ?? 0;
    const areaTrained = trained.has(area);
    return {
      area,
      label: muscleAreaLabel(area),
      trained: areaTrained,
      volumeKg: volume,
      valueText: valueText(areaTrained, volume, totalVolumeKg),
      mark: markFor(areaTrained, volume),
      shade: shadeForVolume(volume, maxVolumeKg),
    };
  });

  return { totalVolumeKg, areas };
}
