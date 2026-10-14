export type ActivityDay = {
  date: string;
  workouts: number;
  sets: number;
};

export type ActivityIntensity = "rest" | "no-sets" | "lighter" | "usual" | "heavier";

function parseDate(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function toYyyyMmDd(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekMonday(value: Date): Date {
  const date = new Date(value);
  const dayOfWeek = date.getDay();
  const offsetToMonday = (dayOfWeek + 6) % 7;
  date.setDate(date.getDate() - offsetToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toYyyyMmDd(date);
}

function weekStartKey(value: string): string {
  return toYyyyMmDd(startOfWeekMonday(parseDate(value)));
}

function countPhrase(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatWeekOf(weekStart: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseDate(weekStart));
}

function sumWeek(days: ActivityDay[], weekStart: string): { sessions: number; sets: number } {
  let sessions = 0;
  let sets = 0;
  for (const day of days) {
    if (weekStartKey(day.date) !== weekStart) {
      continue;
    }
    sessions += day.workouts;
    sets += day.sets;
  }
  return { sessions, sets };
}

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** Median set count on days that have at least one set. */
export function usualTrainingDaySets(setCounts: number[]): number | null {
  return median(setCounts.filter((sets) => sets > 0));
}

export function activityIntensity(sets: number, workouts: number, usualSets: number | null): ActivityIntensity {
  if (sets <= 0) {
    return workouts > 0 ? "no-sets" : "rest";
  }
  if (usualSets == null || usualSets <= 0) {
    return "usual";
  }
  if (sets < usualSets * 0.8) {
    return "lighter";
  }
  if (sets > usualSets * 1.25) {
    return "heavier";
  }
  return "usual";
}

export function activityIntensityClass(intensity: ActivityIntensity): string {
  switch (intensity) {
    case "rest":
      return "bg-zinc-100";
    case "no-sets":
      return "bg-zinc-400";
    case "lighter":
      return "bg-sky-200";
    case "usual":
      return "bg-sky-400";
    case "heavier":
      return "bg-sky-600";
  }
}

export function activityIntensityLabel(intensity: ActivityIntensity): string {
  switch (intensity) {
    case "rest":
      return "Rest";
    case "no-sets":
      return "No sets";
    case "lighter":
      return "Lighter";
    case "usual":
      return "Usual";
    case "heavier":
      return "Heavier";
  }
}

export function activityIntensityPhrase(intensity: ActivityIntensity): string {
  switch (intensity) {
    case "rest":
      return "Rest day.";
    case "no-sets":
      return "Session logged, no sets.";
    case "lighter":
      return "Lighter than your usual training day.";
    case "usual":
      return "In line with your usual training day.";
    case "heavier":
      return "Heavier than your usual training day.";
  }
}

/**
 * Compare the current week with the previous week when today is inside the data,
 * otherwise the latest week in range with the week before it.
 * The previous week is used only when its Monday is present, so a clipped range
 * does not compare a full week with a partial one.
 */
export function buildActivityComparisonSentence(days: ActivityDay[], today: string): string {
  if (days.length === 0) {
    return "";
  }
  const sorted = [...days].sort((left, right) => left.date.localeCompare(right.date));
  const first = sorted[0].date;
  const last = sorted[sorted.length - 1].date;
  const todayInRange = today >= first && today <= last;
  const focusWeekStart = todayInRange ? weekStartKey(today) : weekStartKey(last);
  const previousWeekStart = addDays(focusWeekStart, -7);
  const focus = sumWeek(sorted, focusWeekStart);
  const previous = sumWeek(sorted, previousWeekStart);
  const previousComplete = sorted.some((day) => day.date === previousWeekStart);
  const comparedWith = todayInRange ? "last week" : "the week before";

  const focusClause = (() => {
    if (focus.sessions === 0) {
      return todayInRange ? "No sessions this week yet" : `No sessions in the week of ${formatWeekOf(focusWeekStart)}`;
    }
    const counts = `${countPhrase(focus.sessions, "session")} and ${countPhrase(focus.sets, "set")}`;
    return todayInRange ? `${counts} this week` : `${counts} in the week of ${formatWeekOf(focusWeekStart)}`;
  })();

  if (!previousComplete) {
    return `${focusClause}.`;
  }

  if (focus.sessions === 0) {
    const previousCounts = `${countPhrase(previous.sessions, "session")} and ${countPhrase(previous.sets, "set")}`;
    return todayInRange
      ? `${focusClause}. Last week was ${previousCounts}.`
      : `${focusClause}. The week before was ${previousCounts}.`;
  }

  const setDelta = focus.sets - previous.sets;
  if (setDelta === 0) {
    return `${focusClause}, the same number of sets as ${comparedWith}.`;
  }
  const amount = Math.abs(setDelta);
  const direction = setDelta > 0 ? "more" : "fewer";
  const noun = amount === 1 ? "set" : "sets";
  return `${focusClause}, ${amount} ${direction} ${noun} than ${comparedWith}.`;
}
