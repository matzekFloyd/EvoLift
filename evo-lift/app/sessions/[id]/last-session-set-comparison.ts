import { formatKgAmount, formatRepCount, roundKg } from "@/lib/milestone-progress";

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

/** Hide the previous session when its performed date is older than this. */
const LAST_SESSION_MAX_AGE_DAYS = 30;

/**
 * Whole calendar days from `earlier` to `later`, using performed dates.
 * A later previous session is negative. An unreadable date stays unknown.
 */
function calendarDaysBefore(earlier: string, later: string): number | null {
  const startDay = earlier.slice(0, 10);
  const endDay = later.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay) || !/^\d{4}-\d{2}-\d{2}$/.test(endDay)) {
    return null;
  }
  const start = Date.parse(`${startDay}T00:00:00Z`);
  const end = Date.parse(`${endDay}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }
  return Math.round((end - start) / 86_400_000);
}

/**
 * True when `candidate` was performed before the session on screen.
 * A later calendar day is after. The same day uses created time, then id.
 * Without a created time, another session on that day still counts.
 */
function sessionIsBeforeOpenSession(
  candidate: { performedOn: string; sessionCreatedAt: string; sessionId: string },
  sessionPerformedOn: string,
  sessionCreatedAt: string | null | undefined,
  openSessionId: string | null | undefined,
): boolean {
  const openDay = sessionPerformedOn.slice(0, 10);
  const dateCompare = candidate.performedOn.localeCompare(openDay);
  if (dateCompare < 0) {
    return true;
  }
  if (dateCompare > 0) {
    return false;
  }
  if (!sessionCreatedAt) {
    return true;
  }
  const createdCompare = candidate.sessionCreatedAt.localeCompare(sessionCreatedAt);
  if (createdCompare < 0) {
    return true;
  }
  if (createdCompare > 0) {
    return false;
  }
  if (!openSessionId) {
    return false;
  }
  return candidate.sessionId.localeCompare(openSessionId) < 0;
}

/**
 * Working sets from the latest earlier session, in log order.
 * Warmups are left out, so the first entry is the first working set even when
 * earlier sets in that session were warmups. The session on screen is left out.
 * A previous session with only warmups stays empty instead of falling back.
 * When `sessionPerformedOn` is set, only a session on or before that performed
 * date can be previous. A later session of the same exercise is ignored.
 * Pass `sessionCreatedAt` so a later session on that same day is ignored too.
 * A previous session more than 30 days before that performed date is left out.
 * The cutoff uses performed dates.
 */
export function previousSessionWorkingSets(
  sets: readonly PreviousSessionSetSource[],
  excludeSessionId?: string | null,
  sessionPerformedOn?: string | null,
  sessionCreatedAt?: string | null,
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

  const openDay = sessionPerformedOn?.slice(0, 10);
  const latest = [...bySession.values()]
    .filter((session) => {
      if (!openDay || !/^\d{4}-\d{2}-\d{2}$/.test(openDay)) {
        return true;
      }
      return sessionIsBeforeOpenSession(session, openDay, sessionCreatedAt, excludeSessionId);
    })
    .sort((left, right) => {
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

  if (sessionPerformedOn) {
    const ageDays = calendarDaysBefore(latest.performedOn, sessionPerformedOn);
    if (ageDays != null && ageDays > LAST_SESSION_MAX_AGE_DAYS) {
      return [];
    }
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
 * `labeled` adds the "Previous session:" prefix used outside a column header.
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
  return `Previous session: ${value}`;
}

export type SetChangeDirection = "up" | "down";

/** Arrow and amount for one logged value compared with the previous session. */
export type SetChangeMark = {
  direction: SetChangeDirection;
  /** Short amount beside the arrow, such as "5 kg" or "2 reps". */
  amount: string;
  /** Sentence for screen readers. The visible amount repeats it, so hide one of them. */
  label: string;
};

export type LoggedSetChange = {
  load: SetChangeMark | null;
  reps: SetChangeMark | null;
};

const NO_SET_CHANGE: LoggedSetChange = { load: null, reps: null };

function repChange(current: number, previous: number): SetChangeMark | null {
  const count = Math.abs(Math.round(current - previous));
  if (count < 1) {
    return null;
  }
  const more = current > previous;
  const noun = count === 1 ? "rep" : "reps";
  return {
    direction: more ? "up" : "down",
    amount: formatRepCount(count),
    label: more
      ? `${count} more ${noun} than the previous session`
      : `${count} fewer ${noun} than the previous session`,
  };
}

function loadChange(
  current: number,
  previous: number,
  assistance: boolean,
): SetChangeMark | null {
  const delta = roundKg(current - previous);
  if (Math.abs(delta) < 0.001) {
    return null;
  }
  const amountKg = formatKgAmount(Math.abs(delta));
  if (assistance) {
    const lessAssistance = delta < 0;
    return {
      direction: lessAssistance ? "up" : "down",
      amount: lessAssistance ? `${amountKg} less` : `${amountKg} more`,
      label: lessAssistance
        ? `${amountKg} less assistance than the previous session`
        : `${amountKg} more assistance than the previous session`,
    };
  }
  const moreLoad = delta > 0;
  return {
    direction: moreLoad ? "up" : "down",
    amount: amountKg,
    label: moreLoad
      ? `Loaded is ${amountKg} more than the previous session`
      : `Loaded is ${amountKg} less than the previous session`,
  };
}

/**
 * Up means a harder set than the matching working set last time.
 * More loaded weight or reps is up. Less assistance is up.
 * An unchanged value stays unmarked.
 */
export function loggedSetChangeFromPrevious(input: {
  loadedKg: number | null;
  reps: number;
  previous: LastSessionWorkingSet | null;
  assistance: boolean;
}): LoggedSetChange {
  const previous = input.previous;
  if (!previous || !Number.isFinite(input.reps) || !Number.isFinite(previous.reps)) {
    return NO_SET_CHANGE;
  }

  const reps = repChange(input.reps, previous.reps);
  const currentLoad = input.loadedKg;
  const previousLoad = previous.loadedKg;
  if (
    currentLoad == null ||
    previousLoad == null ||
    !Number.isFinite(currentLoad) ||
    !Number.isFinite(previousLoad)
  ) {
    return { load: null, reps };
  }

  return {
    load: loadChange(currentLoad, previousLoad, input.assistance),
    reps,
  };
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
