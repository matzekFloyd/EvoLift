export type ExerciseHistoryOrderRow = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  setNumber: number;
};

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export function clampDateToMaxYyyyMmDd(value: string, max: string): string {
  return value > max ? max : value;
}

export function parseExerciseDetailFiltersFromSearchParams(
  sp: { get: (name: string) => string | null },
  defaults: { from: string; to: string },
  today: string,
): { from: string; to: string; hideWarmups: boolean } {
  let from = defaults.from;
  let to = defaults.to;

  const rawFrom = sp.get("from")?.trim() ?? "";
  const rawTo = sp.get("to")?.trim() ?? "";
  if (rawFrom && YYYY_MM_DD.test(rawFrom)) {
    from = clampDateToMaxYyyyMmDd(rawFrom.slice(0, 10), today);
  }
  if (rawTo && YYYY_MM_DD.test(rawTo)) {
    to = clampDateToMaxYyyyMmDd(rawTo.slice(0, 10), today);
  }

  const hideFlag = sp.get("hideWarmups")?.trim().toLowerCase() ?? "";
  let hideWarmups = hideFlag !== "0" && hideFlag !== "false" && hideFlag !== "no";
  const legacyKind = sp.get("kind")?.trim().toLowerCase() ?? "";
  if (legacyKind === "working" || hideFlag === "1" || hideFlag === "true" || hideFlag === "yes") {
    hideWarmups = true;
  }

  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  return { from, to, hideWarmups };
}

/**
 * Session date, then session, then set number.
 * Descending puts the newest day, the newer session that day, and the highest set number first.
 */
export function compareExerciseSetHistoryForPerformedOn(
  a: ExerciseHistoryOrderRow,
  b: ExerciseHistoryOrderRow,
  direction: "asc" | "desc",
): number {
  const dateCmp = a.performedOn.localeCompare(b.performedOn);
  if (dateCmp !== 0) {
    return direction === "desc" ? -dateCmp : dateCmp;
  }
  const sessionCmp = a.sessionCreatedAt.localeCompare(b.sessionCreatedAt);
  if (sessionCmp !== 0) {
    return direction === "desc" ? -sessionCmp : sessionCmp;
  }
  if (a.setNumber !== b.setNumber) {
    if (direction === "desc") {
      return b.setNumber - a.setNumber;
    }
    return a.setNumber - b.setNumber;
  }
  return a.sessionId.localeCompare(b.sessionId);
}

export function compareExerciseSetHistoryRowsCanonical(
  a: ExerciseHistoryOrderRow,
  b: ExerciseHistoryOrderRow,
): number {
  return compareExerciseSetHistoryForPerformedOn(a, b, "desc");
}

export function sortExerciseHistoryRowsCanonical<T extends ExerciseHistoryOrderRow>(rows: T[]): T[] {
  rows.sort(compareExerciseSetHistoryRowsCanonical);
  return rows;
}

export function isRowEarlier(left: ExerciseHistoryOrderRow, right: ExerciseHistoryOrderRow): boolean {
  if (left.performedOn !== right.performedOn) {
    return left.performedOn < right.performedOn;
  }
  if (left.sessionCreatedAt !== right.sessionCreatedAt) {
    return left.sessionCreatedAt < right.sessionCreatedAt;
  }
  return left.setNumber < right.setNumber;
}
