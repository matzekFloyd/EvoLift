"use client";

import { ArrowDown, ArrowUp, Hash, Minus } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useDisplayLocale } from "@/app/components/use-display-locale";
import { ChartTextAlternative } from "@/app/components/chart-text-alternative";
import { GoalReachedMark } from "@/app/components/goal-reached-mark";
import { heatmapActivityChartText } from "@/app/components/chart-text-data";
import {
  activityDateKey,
  activityDateToLocalDate,
  buildActivityHeatmapWeeks,
  currentWeekStartKey,
} from "@/app/components/workout-activity-weeks";
import {
  activityIntensity,
  activityIntensityClass,
  activityIntensityLabel,
  activityIntensityPhrase,
  buildActivityComparison,
  type ActivityIntensity,
  type ActivitySetTrend,
} from "@/lib/workout-activity-summary";

type WorkoutActivityPoint = {
  date: string;
  workouts: number;
  sets: number;
};

type WorkoutActivityHeatmapProps = {
  data: WorkoutActivityPoint[];
  highlightedDates?: string[] | null;
  onHighlightDatesChange?: (dates: string[] | null) => void;
  /** Opens the workout session for a day that has at least one session. */
  onDayClick?: (date: string) => void;
  /** Session dates (`YYYY-MM-DD`) that reached a goal, with the goal names for that day. */
  goalReachedByDate?: Record<string, string>;
  /** Date-range controls, aligned with the summary line above the chart. */
  headerAside?: ReactNode;
};

const INTENSITY_LEGEND: ActivityIntensity[] = ["rest", "no-sets", "workout"];
/** Day rows stay short so the grid does not outweigh the next session. */
const HEATMAP_ROW_PX = 20;

function ActivityRangeLine({ sentence }: { sentence: string }) {
  return (
    <p className="flex items-start gap-1.5 text-sm text-zinc-800">
      <Hash className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden />
      <span>{sentence}</span>
    </p>
  );
}

function ActivityComparisonLine({
  sentence,
  setTrend,
}: {
  sentence: string;
  setTrend: ActivitySetTrend | null;
}) {
  if (!sentence) {
    return null;
  }
  return (
    <p className="flex items-start gap-1.5 text-sm text-zinc-800">
      {setTrend === "up" ? (
        <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
      ) : null}
      {setTrend === "down" ? (
        <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
      ) : null}
      {setTrend === "same" ? (
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      ) : null}
      <span>{sentence}</span>
    </p>
  );
}

export function WorkoutActivityChart({
  data,
  highlightedDates = null,
  onHighlightDatesChange,
  onDayClick,
  goalReachedByDate = {},
  headerAside = null,
}: WorkoutActivityHeatmapProps) {
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const totalWorkouts = sortedData.reduce((sum, item) => sum + item.workouts, 0);
  const totalSets = sortedData.reduce((sum, item) => sum + item.sets, 0);
  const locale = useDisplayLocale();
  const highlightedDateSet = useMemo(() => new Set(highlightedDates ?? []), [highlightedDates]);

  if (sortedData.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500">No workouts in the selected timeframe.</p>
        {headerAside ? <div className="w-full sm:w-fit sm:self-end">{headerAside}</div> : null}
      </div>
    );
  }

  const today = new Date();
  const todayKey = activityDateKey(today);
  const currentWeekStart = currentWeekStartKey(today);
  const comparison = buildActivityComparison(sortedData, todayKey);
  const visibleWeeks = buildActivityHeatmapWeeks(sortedData);
  const heatmapTrackStyle = {
    gridTemplateColumns: `repeat(${visibleWeeks.length}, minmax(0, 1fr))`,
  };
  const heatmapRowStyle = {
    gridTemplateRows: `repeat(7, ${HEATMAP_ROW_PX}px)`,
  };
  const weekdayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
  const monthFormat = new Intl.DateTimeFormat(locale, { month: "short" });
  const dayFormat = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const monthLabels = visibleWeeks.map((week, index) => {
    const label = monthFormat.format(activityDateToLocalDate(week[0].date));
    const previous =
      index > 0 ? monthFormat.format(activityDateToLocalDate(visibleWeeks[index - 1][0].date)) : null;
    return previous !== label ? label : "";
  });
  return (
    <div>
      <div className="mb-3 space-y-2">
        <div className="flex flex-col gap-1">
          <ActivityRangeLine
            sentence={`${totalSets} sets across ${totalWorkouts} workouts in the selected range.`}
          />
          <ActivityComparisonLine sentence={comparison.sentence} setTrend={comparison.setTrend} />
          {headerAside ? <div className="w-full pt-1 sm:w-fit sm:self-end">{headerAside}</div> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500">
          {INTENSITY_LEGEND.map((intensity) => (
            <span
              key={intensity}
              className="inline-flex items-center gap-1"
              title={activityIntensityPhrase(intensity)}
            >
              <span
                className={`h-3 w-3 rounded-sm border border-zinc-200 ${activityIntensityClass(intensity)}`}
              />
              {activityIntensityLabel(intensity)}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-2">
        <div />
        <div
          className="grid gap-1.5 px-[1px] text-[10px] text-zinc-500"
          style={heatmapTrackStyle}
        >
          {visibleWeeks.map((week, index) => {
            const isCurrentWeek = week[0].date === currentWeekStart;
            return (
              <div
                key={`month-${index}`}
                className={isCurrentWeek ? "font-medium text-sky-800" : "truncate text-zinc-500"}
              >
                {isCurrentWeek ? "Now" : monthLabels[index]}
              </div>
            );
          })}
        </div>
        <div className="grid gap-1.5 text-[10px] leading-3 text-zinc-500" style={heatmapRowStyle}>
          {weekdayLabels.map((label, index) => (
            <div key={`weekday-${index}`} className="flex items-center">
              {label}
            </div>
          ))}
        </div>
        <div className="grid gap-1.5" style={heatmapTrackStyle}>
          {visibleWeeks.map((week, weekIndex) => {
            const isCurrentWeek = week[0].date === currentWeekStart;
            return (
            <div
              key={`week-${weekIndex}`}
              className={`grid gap-1.5 ${
                isCurrentWeek ? "rounded-sm outline outline-2 outline-sky-600 outline-offset-1" : ""
              }`}
              style={heatmapRowStyle}
            >
              {week.map((day) => {
                const parsedDate = activityDateToLocalDate(day.date);
                const intensity = day.isInRange ? activityIntensity(day.sets, day.workouts) : null;
                const isToday = day.date === todayKey;
                const goalLabel = day.isInRange ? goalReachedByDate[day.date] : undefined;
                const canOpen = day.isInRange && day.workouts > 0;
                const openHint =
                  day.workouts > 1 ? " Choose a workout session." : " Open this workout session.";
                const tooltip = `${dayFormat.format(parsedDate)}: ${day.sets} set${day.sets === 1 ? "" : "s"} across ${
                  day.workouts
                } workout${day.workouts === 1 ? "" : "s"}${
                  intensity ? ` ${activityIntensityPhrase(intensity)}` : ""
                }${goalLabel ? ` Goal reached: ${goalLabel}.` : ""}${
                  isCurrentWeek ? " This week." : ""
                }${isToday ? " Today." : ""}${canOpen ? openHint : ""}`;
                return (
                  <div
                    key={day.date}
                    title={tooltip}
                    aria-label={canOpen ? tooltip : undefined}
                    role={canOpen ? "button" : undefined}
                    tabIndex={canOpen ? 0 : undefined}
                    className={`flex h-full w-full items-center justify-center overflow-hidden rounded-sm border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-1 ${
                      canOpen ? "cursor-pointer hover:brightness-95 active:scale-95" : ""
                    } ${
                      isToday
                        ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-1"
                        : highlightedDateSet.has(day.date) && day.isInRange
                          ? "border-sky-700 ring-1 ring-sky-600/40"
                          : "border-zinc-200"
                    } ${intensity ? activityIntensityClass(intensity) : "bg-zinc-100"}`}
                    onClick={() => {
                      if (!canOpen) {
                        return;
                      }
                      onDayClick?.(day.date);
                    }}
                    onKeyDown={(event) => {
                      if (!canOpen || (event.key !== "Enter" && event.key !== " ")) {
                        return;
                      }
                      event.preventDefault();
                      onDayClick?.(day.date);
                    }}
                    onMouseEnter={() => {
                      if (!day.isInRange) {
                        return;
                      }
                      onHighlightDatesChange?.([day.date]);
                    }}
                    onMouseLeave={() => onHighlightDatesChange?.(null)}
                  >
                    {goalLabel ? (
                      <GoalReachedMark
                        label={goalLabel}
                        decorative
                        className="pointer-events-none h-5 w-5"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3">
        <ChartTextAlternative
          model={heatmapActivityChartText(
            visibleWeeks.flatMap((week) => {
              const isCurrentWeek = week[0].date === currentWeekStart;
              return week.map((day) => ({
                ...day,
                isCurrentWeek,
                isToday: day.date === todayKey,
              }));
            }),
            goalReachedByDate,
            locale,
          )}
        />
      </div>
    </div>
  );
}
