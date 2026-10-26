import { appPath } from "@/lib/app-paths";
import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { formatKgAmount, formatRepCount } from "@/lib/milestone-progress";

export type PersonalBestSetSample = {
  exerciseId: string;
  slug: string;
  label: string;
  performedOn: string;
  reps: number;
  /** Loaded (kg): external weight on the set. */
  loadedKg: number;
  /** Total (kg): Loaded + base weight. */
  totalKg: number;
};

export type PersonalBestCatalogExercise = {
  id: string;
  slug: string;
  label: string;
};

export type PersonalBestMark = {
  valueKg: number;
  reps: number | null;
  performedOn: string;
};

export type PersonalBestRow = {
  exerciseId: string;
  slug: string;
  label: string;
  href: string;
  isAssistance: boolean;
  /** Highest Total (kg), then reps, then earliest date. Least assistance on Assisted Dip and Assisted Pull-Up. */
  bestSet: PersonalBestMark | null;
  /** Highest Loaded (kg), then earliest date. Least assistance on Assisted Dip and Assisted Pull-Up. */
  heaviestLoad: PersonalBestMark | null;
};

export { isAssistanceExercise };

/**
 * Best set: highest Total (kg), then higher reps, then earlier performed-on date.
 * Heaviest load: highest Loaded (kg), then earlier performed-on date.
 * On Assisted Dip and Assisted Pull-Up both marks use the lowest assistance, including 0 kg.
 * Best set then prefers more reps, then the earlier date. Least assistance then prefers the earlier date.
 */
export function buildPersonalBestRows(
  catalog: readonly PersonalBestCatalogExercise[],
  samples: readonly PersonalBestSetSample[],
): PersonalBestRow[] {
  const byExercise = new Map<string, PersonalBestSetSample[]>();
  for (const sample of samples) {
    const list = byExercise.get(sample.exerciseId) ?? [];
    list.push(sample);
    byExercise.set(sample.exerciseId, list);
  }

  const rows: PersonalBestRow[] = [];
  for (const exercise of catalog) {
    const sets = byExercise.get(exercise.id) ?? [];
    const assistance = isAssistanceExercise(exercise.slug);
    const bestSet = pickBestSet(sets, assistance);
    const heaviestLoad = pickHeaviestLoad(sets, assistance);
    if (bestSet == null && heaviestLoad == null) {
      continue;
    }
    rows.push({
      exerciseId: exercise.id,
      slug: exercise.slug,
      label: exercise.label,
      href: appPath(`/exercises/${exercise.slug}`),
      isAssistance: assistance,
      bestSet,
      heaviestLoad,
    });
  }

  return rows.sort((left, right) => left.label.localeCompare(right.label));
}

function markKg(sample: PersonalBestSetSample, assistance: boolean): number {
  return assistance ? sample.loadedKg : sample.totalKg;
}

function pickBestSet(
  sets: readonly PersonalBestSetSample[],
  assistance: boolean,
): PersonalBestMark | null {
  let best: PersonalBestSetSample | null = null;
  for (const sample of sets) {
    const kg = markKg(sample, assistance);
    if (!Number.isFinite(kg) || sample.reps < 1) {
      continue;
    }
    if (assistance ? kg < 0 : kg <= 0) {
      continue;
    }
    if (!best) {
      best = sample;
      continue;
    }
    const bestKg = markKg(best, assistance);
    if (kg !== bestKg) {
      const better = assistance ? kg < bestKg : kg > bestKg;
      if (better) {
        best = sample;
      }
      continue;
    }
    if (sample.reps !== best.reps) {
      if (sample.reps > best.reps) {
        best = sample;
      }
      continue;
    }
    if (sample.performedOn < best.performedOn) {
      best = sample;
    }
  }
  if (!best) {
    return null;
  }
  return { valueKg: markKg(best, assistance), reps: best.reps, performedOn: best.performedOn };
}

function pickHeaviestLoad(
  sets: readonly PersonalBestSetSample[],
  assistance: boolean,
): PersonalBestMark | null {
  let best: PersonalBestSetSample | null = null;
  for (const sample of sets) {
    if (!Number.isFinite(sample.loadedKg) || sample.loadedKg < 0) {
      continue;
    }
    if (!best) {
      best = sample;
      continue;
    }
    if (sample.loadedKg !== best.loadedKg) {
      const better = assistance ? sample.loadedKg < best.loadedKg : sample.loadedKg > best.loadedKg;
      if (better) {
        best = sample;
      }
      continue;
    }
    if (sample.performedOn < best.performedOn) {
      best = sample;
    }
  }
  if (!best) {
    return null;
  }
  return { valueKg: best.loadedKg, reps: null, performedOn: best.performedOn };
}

/** Second mark on Personal bests. Assisted moves show least assistance. */
export function personalBestLoadMarkLabel(isAssistance: boolean): string {
  return isAssistance ? "Least assistance" : "Heaviest load";
}

export function formatPersonalBestSet(mark: PersonalBestMark | null): string {
  if (!mark || mark.reps == null) {
    return "—";
  }
  return `${formatKgAmount(mark.valueKg)} × ${formatRepCount(mark.reps)}`;
}

export function formatPersonalBestLoad(mark: PersonalBestMark | null): string {
  if (!mark) {
    return "—";
  }
  return formatKgAmount(mark.valueKg);
}

export function formatPersonalBestDate(mark: PersonalBestMark | null): string {
  if (!mark) {
    return "—";
  }
  return formatDateOnlyForLocale(mark.performedOn);
}
