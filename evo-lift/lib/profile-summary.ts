import { appPath } from "@/lib/app-paths";
import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { assistedMovedLoadKg } from "@/lib/assisted-moved-load";
import { bodyweightOnOrBefore, type BodyweightLogEntry } from "@/lib/bodyweight-log";
import { bodyweightPlusAddedLoadKg, isBodyweightPlusLoadExercise } from "@/lib/bodyweight-plus-load";
import { estimateEpley1Rm } from "@/lib/exercise-progress-insights";
import {
  buildPersonalBestRows,
  formatPersonalBestDate,
  type PersonalBestCatalogExercise,
  type PersonalBestSetSample,
} from "@/lib/personal-bests";

export type ProfileRecordMark = {
  valueKg: number;
  performedOn: string;
};

export type ProfileRecordRow = {
  exerciseId: string;
  slug: string;
  label: string;
  href: string;
  isAssistance: boolean;
  /** Highest Loaded (kg). Least assistance on Assisted Dip and Assisted Pull-Up. */
  bestWeight: ProfileRecordMark | null;
  /** Best Epley estimate from working sets of 12 reps or fewer. */
  bestE1rm: ProfileRecordMark | null;
};

export type ProfileAchievedGoal = {
  id: string;
  label: string;
  slug: string;
  href: string;
  targetLabel: string;
  achievedAt: string | null;
};

/** Second column on Profile. Assisted moves show least assistance, not a load. */
export function profileBestWeightLabel(isAssistance: boolean): string {
  return isAssistance ? "Least assistance" : "Best weight";
}

export function formatProfileEstimated1Rm(valueKg: number | null): string {
  if (valueKg == null || !Number.isFinite(valueKg)) {
    return "—";
  }
  return `${valueKg.toFixed(1)} kg`;
}

/** The shared day when best weight and estimated 1RM were both first hit then. */
export function profileRecordSharedDate(row: Pick<ProfileRecordRow, "bestWeight" | "bestE1rm">): string | null {
  const weightOn = row.bestWeight?.performedOn;
  const e1rmOn = row.bestE1rm?.performedOn;
  if (weightOn == null || e1rmOn == null || weightOn !== e1rmOn) {
    return null;
  }
  return formatPersonalBestDate(row.bestWeight);
}

/**
 * All-time records. Best weight follows the personal-best load rule.
 * Estimated 1RM uses the same Epley rules as the exercise chart, including bodyweight
 * on Dip and on assisted moves. Ties keep the earlier session date.
 */
export function buildProfileRecords(
  samples: readonly PersonalBestSetSample[],
  bodyweightEntries: readonly BodyweightLogEntry[] = [],
): ProfileRecordRow[] {
  const catalog = catalogFromSamples(samples);
  const bests = buildPersonalBestRows(catalog, samples);
  const e1rmByExercise = new Map<string, ProfileRecordMark>();

  for (const sample of samples) {
    const estimate = estimated1RmKg(sample, bodyweightEntries);
    if (estimate == null) {
      continue;
    }
    const current = e1rmByExercise.get(sample.exerciseId);
    if (
      !current ||
      estimate > current.valueKg ||
      (estimate === current.valueKg && sample.performedOn < current.performedOn)
    ) {
      e1rmByExercise.set(sample.exerciseId, { valueKg: estimate, performedOn: sample.performedOn });
    }
  }

  return bests.map((row) => ({
    exerciseId: row.exerciseId,
    slug: row.slug,
    label: row.label,
    href: row.href,
    isAssistance: row.isAssistance,
    bestWeight: row.heaviestLoad
      ? { valueKg: row.heaviestLoad.valueKg, performedOn: row.heaviestLoad.performedOn }
      : null,
    bestE1rm: e1rmByExercise.get(row.exerciseId) ?? null,
  }));
}

/** Newest achievement first. A missing date sorts last. Equal dates use the exercise name. */
export function sortProfileAchievedGoals(goals: readonly ProfileAchievedGoal[]): ProfileAchievedGoal[] {
  return [...goals].sort((left, right) => {
    const byDate = (right.achievedAt ?? "").localeCompare(left.achievedAt ?? "");
    if (byDate !== 0) {
      return byDate;
    }
    return left.label.localeCompare(right.label);
  });
}

export function profileExerciseHref(slug: string): string {
  return appPath(`/exercises/${slug}`);
}

function catalogFromSamples(samples: readonly PersonalBestSetSample[]): PersonalBestCatalogExercise[] {
  const byId = new Map<string, PersonalBestCatalogExercise>();
  for (const sample of samples) {
    if (!byId.has(sample.exerciseId)) {
      byId.set(sample.exerciseId, {
        id: sample.exerciseId,
        slug: sample.slug,
        label: sample.label,
      });
    }
  }
  return [...byId.values()];
}

function estimated1RmKg(
  sample: PersonalBestSetSample,
  bodyweightEntries: readonly BodyweightLogEntry[],
): number | null {
  const bodyweightKg = bodyweightOnOrBefore(bodyweightEntries, sample.performedOn);
  const assistance = isAssistanceExercise(sample.slug);
  const loadKg = assistance
    ? assistedMovedLoadKg(bodyweightKg, sample.loadedKg)
    : isBodyweightPlusLoadExercise(sample.slug)
      ? bodyweightPlusAddedLoadKg(bodyweightKg, sample.loadedKg)
      : sample.totalKg;
  if (loadKg == null) {
    return null;
  }
  return estimateEpley1Rm(loadKg, sample.reps);
}
