export const SAMPLE_WEEK_HEADING = "Sample week";
export const SAMPLE_WEEK_DAY_LABEL = "Day";
export const SAMPLE_WEEK_REST_LABEL = "Rest";

export type SampleWeekCell = "day" | "rest";

export type SampleWeekView =
  | { kind: "hidden" }
  | { kind: "longer"; message: string }
  | { kind: "week"; cells: readonly SampleWeekCell[]; countLine: string };

const SAMPLE_WEEK_CELLS: Record<number, readonly SampleWeekCell[]> = {
  1: ["day", "rest", "rest", "rest", "rest", "rest", "rest"],
  2: ["day", "rest", "rest", "day", "rest", "rest", "rest"],
  3: ["day", "rest", "day", "rest", "day", "rest", "rest"],
  4: ["day", "day", "rest", "day", "day", "rest", "rest"],
  5: ["day", "day", "day", "day", "day", "rest", "rest"],
  6: ["day", "day", "day", "day", "day", "day", "rest"],
  7: ["day", "day", "day", "day", "day", "day", "day"],
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Typical spacing for a plan. It does not change day order or which day comes next. */
export function sampleWeek(dayCount: number): SampleWeekView {
  if (dayCount <= 0) {
    return { kind: "hidden" };
  }
  if (dayCount > 7) {
    return {
      kind: "longer",
      message: `This cycle runs longer than one week. ${countLabel(dayCount, "day", "days")}.`,
    };
  }
  const cells = SAMPLE_WEEK_CELLS[dayCount];
  if (!cells) {
    return { kind: "hidden" };
  }
  if (dayCount === 7) {
    return { kind: "week", cells, countLine: "7 days across the week." };
  }
  const restCount = cells.filter((cell) => cell === "rest").length;
  return {
    kind: "week",
    cells,
    countLine: `${countLabel(dayCount, "day", "days")} and ${countLabel(restCount, "rest day", "rest days")}.`,
  };
}

/** Cycle length beside the sample week. Hidden when there is nothing to show. */
export function sampleWeekDayCountLabel(dayCount: number): string | null {
  if (sampleWeek(dayCount).kind === "hidden") {
    return null;
  }
  return `${dayCount} ${dayCount === 1 ? "day" : "days"}`;
}
