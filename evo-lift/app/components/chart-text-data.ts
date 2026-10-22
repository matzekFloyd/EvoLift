import type { ExerciseSessionE1rmChartPoint } from "@/lib/exercise-session-e1rm-chart";
import type { ExerciseSessionVolumeChartPoint } from "@/lib/exercise-session-volume-chart";
import type { ExerciseSessionWeightChartPoint } from "@/lib/exercise-session-weight-chart";
import {
  activityIntensity,
  activityIntensityLabel,
} from "@/lib/workout-activity-summary";

export type ChartTextColumn = {
  key: string;
  label: string;
};

export type ChartTextRow = {
  key: string;
  cells: Record<string, string>;
};

/** Numbers a chart draws, as a short table a screen reader can read. */
export type ChartTextAlternativeModel = {
  caption: string;
  columns: ChartTextColumn[];
  rows: ChartTextRow[];
};

export type WeightChartSeriesMode = "total" | "loaded" | "both";

export type WeeklyChartTextMetric = "volume" | "workingSets" | "sessions";

export type WeeklyChartTextPoint = {
  weekStart: string;
  volumeKg: number;
  workingSets: number;
  sessionCount: number;
  movingAverage: number | null;
};

export type HeatmapChartTextDay = {
  date: string;
  sets: number;
  workouts: number;
  isInRange: boolean;
  isCurrentWeek: boolean;
  isToday: boolean;
};

const NOT_ENOUGH_WEEKS = "Not enough weeks";

function kg(value: number): string {
  return value.toFixed(1);
}

function count(value: number): string {
  return String(Math.round(value));
}

function average(value: number | null): string {
  return value == null ? NOT_ENOUGH_WEEKS : value.toFixed(1);
}

/** English on the server and the first client render; callers pass the browser language after hydration. */
export const CHART_TEXT_HYDRATION_LOCALE = "en";

function formatChartDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function weekOf(weekStart: string, locale: string): string {
  return `Week of ${formatChartDate(weekStart, locale)}`;
}

export function exerciseWeightChartText(
  points: readonly ExerciseSessionWeightChartPoint[],
  mode: WeightChartSeriesMode,
  assistance: boolean,
): ChartTextAlternativeModel {
  const session: ChartTextColumn = { key: "session", label: "Session" };
  const loaded: ChartTextColumn = {
    key: "loaded",
    label: assistance ? "Assistance (kg)" : "Loaded (kg)",
  };
  const total: ChartTextColumn = { key: "total", label: "Total (kg)" };
  const showTotal = !assistance && (mode === "total" || mode === "both");
  const showLoaded = assistance || mode === "loaded" || mode === "both";
  const columns = [session, ...(showLoaded ? [loaded] : []), ...(showTotal ? [total] : [])];
  const caption = assistance
    ? "Assistance (kg) by session"
    : mode === "both"
      ? "Loaded (kg) and Total (kg) by session"
      : mode === "total"
        ? "Total (kg) by session"
        : "Loaded (kg) by session";

  return {
    caption,
    columns,
    rows: points.map((point) => ({
      key: point.sessionId,
      cells: {
        session: point.xTickLabel,
        loaded: kg(point.heaviestLoadedKg),
        total: kg(point.heaviestTotalKg),
      },
    })),
  };
}

export function exerciseE1rmChartText(
  points: readonly ExerciseSessionE1rmChartPoint[],
): ChartTextAlternativeModel {
  return {
    caption: "Estimated 1RM (kg) by session",
    columns: [
      { key: "session", label: "Session" },
      { key: "e1rm", label: "Estimated 1RM (kg)" },
    ],
    rows: points.map((point) => ({
      key: point.sessionId,
      cells: {
        session: point.xTickLabel,
        e1rm: kg(point.e1rmKg),
      },
    })),
  };
}

export function exerciseVolumeChartText(
  points: readonly ExerciseSessionVolumeChartPoint[],
): ChartTextAlternativeModel {
  return {
    caption: "Session volume (kg) by session",
    columns: [
      { key: "session", label: "Session" },
      { key: "volume", label: "Session volume (kg)" },
    ],
    rows: points.map((point) => ({
      key: point.sessionId,
      cells: {
        session: point.xTickLabel,
        volume: kg(point.volumeKg),
      },
    })),
  };
}

export function insightsWeeklyChartText(
  points: readonly WeeklyChartTextPoint[],
  metric: WeeklyChartTextMetric,
  locale = CHART_TEXT_HYDRATION_LOCALE,
): ChartTextAlternativeModel {
  const valueColumn: ChartTextColumn =
    metric === "volume"
      ? { key: "value", label: "Volume (kg)" }
      : metric === "workingSets"
        ? { key: "value", label: "Working sets" }
        : { key: "value", label: "Sessions" };
  const caption =
    metric === "volume"
      ? "Volume (kg) by week"
      : metric === "workingSets"
        ? "Working sets by week"
        : "Sessions by week";

  return {
    caption,
    columns: [
      { key: "week", label: "Week" },
      valueColumn,
      { key: "average", label: "4-week average" },
    ],
    rows: points.map((point) => {
      const raw =
        metric === "volume"
          ? point.volumeKg
          : metric === "workingSets"
            ? point.workingSets
            : point.sessionCount;
      return {
        key: point.weekStart,
        cells: {
          week: weekOf(point.weekStart, locale),
          value: metric === "volume" ? kg(raw) : count(raw),
          average: average(point.movingAverage),
        },
      };
    }),
  };
}

export function compoundE1rmChartText(
  label: string,
  points: readonly ExerciseSessionE1rmChartPoint[],
): ChartTextAlternativeModel {
  return {
    caption: `Estimated 1RM (kg) for ${label}`,
    columns: [
      { key: "session", label: "Session" },
      { key: "e1rm", label: "Estimated 1RM (kg)" },
    ],
    rows: points.map((point) => ({
      key: point.sessionId,
      cells: {
        session: point.xTickLabel,
        e1rm: kg(point.e1rmKg),
      },
    })),
  };
}

export function compactActivityChartText(
  weeks: readonly { weekStart: string; weekLabel: string; sets: number }[],
): ChartTextAlternativeModel {
  return {
    caption: "Sets by week",
    columns: [
      { key: "week", label: "Week" },
      { key: "sets", label: "Sets" },
    ],
    rows: weeks.map((week) => ({
      key: week.weekStart,
      cells: {
        week: week.weekLabel,
        sets: count(week.sets),
      },
    })),
  };
}

export function heatmapActivityChartText(
  days: readonly HeatmapChartTextDay[],
  goalReachedByDate: Readonly<Record<string, string>>,
  locale = CHART_TEXT_HYDRATION_LOCALE,
): ChartTextAlternativeModel {
  return {
    caption: "Sets and workouts by day",
    columns: [
      { key: "day", label: "Day" },
      { key: "sets", label: "Sets" },
      { key: "workouts", label: "Workouts" },
      { key: "status", label: "Status" },
    ],
    rows: days.flatMap((day) => {
      if (!day.isInRange) {
        return [];
      }
      const notes = [
        day.isCurrentWeek ? "This week" : null,
        day.isToday ? "Today" : null,
      ].filter((note): note is string => note != null);
      const dayLabel = formatChartDate(day.date, locale);
      const goal = goalReachedByDate[day.date];
      const status = activityIntensityLabel(activityIntensity(day.sets, day.workouts));
      return [
        {
          key: day.date,
          cells: {
            day: notes.length > 0 ? `${dayLabel} · ${notes.join(" · ")}` : dayLabel,
            sets: count(day.sets),
            workouts: count(day.workouts),
            status: goal ? `${status} · Goal reached: ${goal}` : status,
          },
        },
      ];
    }),
  };
}
