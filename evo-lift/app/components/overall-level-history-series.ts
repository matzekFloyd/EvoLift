import type { ChartTextAlternativeModel } from "@/app/components/chart-text-data";
import type { OverallLevelHistoryPoint } from "@/lib/overall-level-detail";
import { EXRX_LEVELS, exrxLevelScore, type ExrxLevel } from "@/lib/strength-standards";

/** Provisional sits under the ExRx ladder so a gap in recent lifts stays on the chart. */
const PROVISIONAL_SCORE = -1;

const TICK_LABEL: Record<number, string> = {
  [PROVISIONAL_SCORE]: "Provisional",
  0: "Under",
  1: "Untrained",
  2: "Novice",
  3: "Intermediate",
  4: "Advanced",
  5: "Elite",
};

export type OverallLevelHistoryChartPoint = {
  asOf: string;
  badge: string;
  score: number;
  time: number;
  dateLabel: string;
  xTickLabel: string;
  /** The level still held on the range end. Drawn as a line, not as another change. */
  hold?: boolean;
};

export type OverallLevelHistoryChartModel = {
  points: OverallLevelHistoryChartPoint[];
  /** Even ranks for the levels that appear, lowest first. Empty rungs are left out. */
  yTicks: number[];
  /** Axis name for each rank in `yTicks`. */
  yLabels: string[];
  /** Year on the horizontal axis when the first and last dates are not in the same year. */
  includeYear: boolean;
  text: ChartTextAlternativeModel;
};

export function overallLevelChartTick(labels: readonly string[], rank: number): string {
  return labels[rank] ?? "";
}

function chartScore(badge: string): number | null {
  if (badge === "Provisional") {
    return PROVISIONAL_SCORE;
  }
  if ((EXRX_LEVELS as readonly string[]).includes(badge)) {
    return exrxLevelScore(badge as ExrxLevel);
  }
  return null;
}

function formatEn(time: number, includeYear: boolean): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(time));
}

export function overallLevelChartAxisLabel(time: number, includeYear: boolean): string {
  return formatEn(time, includeYear);
}

/** One plotted step per day the overall level changed. The line holds through `through`. */
export function overallLevelHistoryChart(
  history: readonly OverallLevelHistoryPoint[],
  options?: { through?: string | null },
): OverallLevelHistoryChartModel | null {
  const scored = history.flatMap((point) => {
    const score = chartScore(point.badge);
    if (score == null) {
      return [];
    }
    return [{ ...point, score }];
  });
  if (scored.length === 0) {
    return null;
  }
  const through = options?.through && /^\d{4}-\d{2}-\d{2}$/.test(options.through) ? options.through : null;
  const endAsOf = through && through > scored[scored.length - 1].asOf ? through : scored[scored.length - 1].asOf;
  const includeYear = scored[0].asOf.slice(0, 4) !== endAsOf.slice(0, 4);
  const presentScores = [...new Set(scored.map((point) => point.score))].sort((left, right) => left - right);
  const rankByScore = new Map(presentScores.map((score, index) => [score, index]));
  const yTicks = presentScores.map((_, index) => index);
  const yLabels = presentScores.map((score) => TICK_LABEL[score] ?? "");
  const points: OverallLevelHistoryChartPoint[] = scored.map((point) => {
    const time = Date.parse(`${point.asOf}T00:00:00Z`);
    return {
      asOf: point.asOf,
      badge: point.badge,
      score: rankByScore.get(point.score) ?? 0,
      time,
      dateLabel: formatEn(time, true),
      xTickLabel: formatEn(time, includeYear),
    };
  });
  if (through && through > points[points.length - 1].asOf) {
    const time = Date.parse(`${through}T00:00:00Z`);
    const last = points[points.length - 1];
    points.push({
      asOf: through,
      badge: last.badge,
      score: last.score,
      time,
      dateLabel: formatEn(time, true),
      xTickLabel: formatEn(time, includeYear),
      hold: true,
    });
  }
  return {
    points,
    yTicks,
    yLabels,
    includeYear,
    text: {
      caption: "Evolution",
      columns: [
        { key: "date", label: "Date" },
        { key: "level", label: "Level" },
      ],
      rows: points.flatMap((point) =>
        point.hold
          ? []
          : [
              {
                key: point.asOf,
                cells: {
                  date: point.dateLabel,
                  level: point.badge,
                },
              },
            ],
      ),
    },
  };
}
