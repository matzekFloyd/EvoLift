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
  /** Highest Total (kg), then reps, then earliest date. */
  bestSet: PersonalBestMark | null;
  /** Highest Loaded (kg), then earliest date. */
  heaviestLoad: PersonalBestMark | null;
};

export { isAssistanceExercise };

/**
 * Best set: highest Total (kg), then higher reps, then earlier performed-on date.
 * Heaviest load: highest Loaded (kg) / assistance, then earlier performed-on date.
 */
export function buildPersonalBestRows(
  catalog: readonly PersonalBestCatalogExercise[],
  samples: readonly PersonalBestSetSample[],
  options?: { hideEmpty?: boolean },
): PersonalBestRow[] {
  const hideEmpty = options?.hideEmpty ?? true;
  const byExercise = new Map<string, PersonalBestSetSample[]>();
  for (const sample of samples) {
    const list = byExercise.get(sample.exerciseId) ?? [];
    list.push(sample);
    byExercise.set(sample.exerciseId, list);
  }

  const rows: PersonalBestRow[] = [];
  for (const exercise of catalog) {
    const sets = byExercise.get(exercise.id) ?? [];
    const bestSet = pickBestSet(sets);
    const heaviestLoad = pickHeaviestLoad(sets);
    if (hideEmpty && bestSet == null && heaviestLoad == null) {
      continue;
    }
    rows.push({
      exerciseId: exercise.id,
      slug: exercise.slug,
      label: exercise.label,
      href: appPath(`/exercises/${exercise.slug}`),
      isAssistance: isAssistanceExercise(exercise.slug),
      bestSet,
      heaviestLoad,
    });
  }

  return rows.sort((left, right) => left.label.localeCompare(right.label));
}

function pickBestSet(sets: readonly PersonalBestSetSample[]): PersonalBestMark | null {
  let best: PersonalBestSetSample | null = null;
  for (const sample of sets) {
    if (!Number.isFinite(sample.totalKg) || sample.totalKg <= 0 || sample.reps < 1) {
      continue;
    }
    if (!best) {
      best = sample;
      continue;
    }
    if (sample.totalKg !== best.totalKg) {
      if (sample.totalKg > best.totalKg) {
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
  return { valueKg: best.totalKg, reps: best.reps, performedOn: best.performedOn };
}

function pickHeaviestLoad(sets: readonly PersonalBestSetSample[]): PersonalBestMark | null {
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
      if (sample.loadedKg > best.loadedKg) {
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
