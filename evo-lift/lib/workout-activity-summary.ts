export type ActivityDay = {
  date: string;
  workouts: number;
  sets: number;
};

export type ActivityIntensity = "rest" | "no-sets" | "workout";

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

/** Rest, an upcoming workout with nothing logged, or a day a workout was done. */
export function activityIntensity(sets: number, workouts: number): ActivityIntensity {
  if (sets <= 0) {
    return workouts > 0 ? "no-sets" : "rest";
  }
  return "workout";
}

export function activityIntensityClass(intensity: ActivityIntensity): string {
  switch (intensity) {
    case "rest":
      return "bg-zinc-100";
    case "no-sets":
      return "bg-zinc-400";
    case "workout":
      return "bg-sky-600";
  }
}

export function activityIntensityLabel(intensity: ActivityIntensity): string {
  switch (intensity) {
    case "rest":
      return "No Workout";
    case "no-sets":
      return "No Sets";
    case "workout":
      return "Workout";
  }
}

export function activityIntensityPhrase(intensity: ActivityIntensity): string {
  switch (intensity) {
    case "rest":
      return "No workout.";
    case "no-sets":
      return "An upcoming workout has no exercises logged yet.";
    case "workout":
      return "A workout was done.";
  }
}

export type ActivitySetTrend = "up" | "down" | "same";

export type ActivityComparison = {
  sentence: string;
  /** Set only when the sentence compares this week's sets with the previous week. */
  setTrend: ActivitySetTrend | null;
};

/**
 * Compare the current week with the previous week when today is inside the data,
 * otherwise the latest week in range with the week before it.
 * The previous week is used only when its Monday is present, so a clipped range
 * does not compare a full week with a partial one.
 */
export function buildActivityComparison(days: ActivityDay[], today: string): ActivityComparison {
  if (days.length === 0) {
    return { sentence: "", setTrend: null };
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
    return { sentence: `${focusClause}.`, setTrend: null };
  }

  if (focus.sessions === 0) {
    const previousCounts = `${countPhrase(previous.sessions, "session")} and ${countPhrase(previous.sets, "set")}`;
    const sentence = todayInRange
      ? `${focusClause}. Last week was ${previousCounts}.`
      : `${focusClause}. The week before was ${previousCounts}.`;
    return { sentence, setTrend: null };
  }

  const setDelta = focus.sets - previous.sets;
  const setTrend: ActivitySetTrend = setDelta > 0 ? "up" : setDelta < 0 ? "down" : "same";
  if (setDelta === 0) {
    return { sentence: `${focusClause}, the same number of sets as ${comparedWith}.`, setTrend };
  }
  const amount = Math.abs(setDelta);
  const direction = setDelta > 0 ? "more" : "fewer";
  const noun = amount === 1 ? "set" : "sets";
  return { sentence: `${focusClause}, ${amount} ${direction} ${noun} than ${comparedWith}.`, setTrend };
}

export function buildActivityComparisonSentence(days: ActivityDay[], today: string): string {
  return buildActivityComparison(days, today).sentence;
}
