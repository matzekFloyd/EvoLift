type ActivityTotalsPoint = {
  date: string;
  workouts: number;
  sets: number;
  loadedKg: number;
};

export type InsightsActivityTotals = {
  workouts: number;
  sets: number;
  volumeKg: number;
};

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

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toYyyyMmDd(date);
}

function inclusiveDayCount(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Groups the whole kilograms and keeps one decimal. */
export function formatInsightsVolumeKg(value: number): string {
  const [whole, fraction] = value.toFixed(1).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${fraction}`;
}

export function insightsActivityTotals(points: readonly ActivityTotalsPoint[]): InsightsActivityTotals {
  return points.reduce(
    (sum, point) => ({
      workouts: sum.workouts + point.workouts,
      sets: sum.sets + point.sets,
      volumeKg: sum.volumeKg + point.loadedKg,
    }),
    { workouts: 0, sets: 0, volumeKg: 0 },
  );
}

/** The window of the same length immediately before From. Null when the range is open. */
export function previousInsightsActivityWindow(
  from: string,
  to: string,
): { from: string; to: string } | null {
  if (!from || !to || from > to) {
    return null;
  }
  const length = inclusiveDayCount(from, to);
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(length - 1));
  return { from: previousFrom, to: previousTo };
}

function comparedWith(periodName: string | null): string {
  return periodName ? `the previous ${periodName}` : "the previous period";
}

function countNote(current: number, previous: number, singular: string, plural: string, period: string): string {
  const delta = Math.round(current) - Math.round(previous);
  if (delta === 0) {
    return `Same as ${period}`;
  }
  const amount = Math.abs(delta);
  const noun = amount === 1 ? singular : plural;
  const direction = delta > 0 ? "more" : "fewer";
  return `${amount} ${direction} ${noun} than ${period}`;
}

/** Short comparison for one Insights tile. */
export function insightsKpiNote(
  current: number,
  previous: number,
  metric: "workouts" | "sets" | "volume",
  periodName: string | null,
): string {
  const period = comparedWith(periodName);
  if (metric === "workouts") {
    return countNote(current, previous, "workout", "workouts", period);
  }
  if (metric === "sets") {
    return countNote(current, previous, "set", "sets", period);
  }
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) {
    return `Same as ${period}`;
  }
  if (previous > 0) {
    const percent = Math.round((Math.abs(delta) / previous) * 100);
    if (percent >= 1) {
      return `${percent}% ${delta > 0 ? "more" : "less"} than ${period}`;
    }
  }
  return `${formatInsightsVolumeKg(Math.abs(delta))} kg ${delta > 0 ? "more" : "less"} than ${period}`;
}
