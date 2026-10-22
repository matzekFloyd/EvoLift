import { formatRepCount } from "@/lib/milestone-progress";

/** One set from exercise history, before the previous session is chosen. */
export type PreviousSessionSetSource = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  setNumber: number;
  reps: number;
  loadedKg: number | null;
  isWarmup: boolean;
};

/** A working set from the previous session, in log order. Index 0 is working set 1. */
export type LastSessionWorkingSet = {
  loadedKg: number | null;
  reps: number;
};

/**
 * Working sets from the latest earlier session, in log order.
 * Warmups are left out, so the first entry is the first working set even when
 * earlier sets in that session were warmups. The session on screen is left out.
 * A previous session with only warmups stays empty instead of falling back.
 */
export function previousSessionWorkingSets(
  sets: readonly PreviousSessionSetSource[],
  excludeSessionId?: string | null,
): LastSessionWorkingSet[] {
  const bySession = new Map<
    string,
    {
      sessionId: string;
      performedOn: string;
      sessionCreatedAt: string;
      sets: PreviousSessionSetSource[];
    }
  >();

  for (const set of sets) {
    if (excludeSessionId && set.sessionId === excludeSessionId) {
      continue;
    }
    const existing = bySession.get(set.sessionId);
    if (existing) {
      existing.sets.push(set);
      continue;
    }
    bySession.set(set.sessionId, {
      sessionId: set.sessionId,
      performedOn: set.performedOn.slice(0, 10),
      sessionCreatedAt: set.sessionCreatedAt,
      sets: [set],
    });
  }

  const latest = [...bySession.values()].sort((left, right) => {
    const dateCompare = right.performedOn.localeCompare(left.performedOn);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    const createdCompare = right.sessionCreatedAt.localeCompare(left.sessionCreatedAt);
    if (createdCompare !== 0) {
      return createdCompare;
    }
    return right.sessionId.localeCompare(left.sessionId);
  })[0];

  if (!latest) {
    return [];
  }

  return latest.sets
    .filter((set) => !set.isWarmup)
    .sort((left, right) => left.setNumber - right.setNumber)
    .map((set) => ({ loadedKg: set.loadedKg, reps: set.reps }));
}

/** 1-based index among working sets. Warmups and unknown set numbers have no index. */
export function workingSetOrdinal(
  sets: readonly { setNumber: number; isWarmup: boolean }[],
  setNumber: number,
): number | null {
  const working = sets
    .filter((set) => !set.isWarmup)
    .sort((left, right) => left.setNumber - right.setNumber);
  const index = working.findIndex((set) => set.setNumber === setNumber);
  return index < 0 ? null : index + 1;
}

/** Ordinal the next working set will take. Warmups already logged do not count. */
export function nextWorkingSetOrdinal(sets: readonly { isWarmup: boolean }[]): number {
  return sets.filter((set) => !set.isWarmup).length + 1;
}

function loadKgText(loadedKg: number | null): string {
  if (loadedKg == null || !Number.isFinite(loadedKg)) {
    return "- kg";
  }
  return `${loadedKg} kg`;
}

/**
 * Last-session load and reps for one working set.
 * `labeled` adds the "Last session:" prefix used outside a column header.
 * Assisted moves use assistance, and blank or 0 stays unassisted.
 */
export function formatLastSessionSetComparison(
  set: LastSessionWorkingSet,
  options: { assistance: boolean; labeled?: boolean },
): string {
  const reps = formatRepCount(set.reps);
  const value = options.assistance
    ? set.loadedKg == null || !Number.isFinite(set.loadedKg) || set.loadedKg === 0
      ? `unassisted, ${reps}`
      : `${set.loadedKg} kg assistance, ${reps}`
    : `${loadKgText(set.loadedKg)}, ${reps}`;
  if (options.labeled === false) {
    return value;
  }
  return `Last session: ${value}`;
}

/**
 * Line for working-set ordinal N (set 2 ↔ the previous session's second working set).
 * Missing history returns null so the log stays quiet instead of showing zeros.
 */
export function lastSessionComparisonLine(
  previousWorkingSets: readonly LastSessionWorkingSet[],
  workingOrdinal: number | null,
  options: { assistance: boolean; labeled?: boolean },
): string | null {
  if (workingOrdinal == null || !Number.isInteger(workingOrdinal) || workingOrdinal < 1) {
    return null;
  }
  const match = previousWorkingSets[workingOrdinal - 1];
  if (!match) {
    return null;
  }
  return formatLastSessionSetComparison(match, options);
}
