"use client";

import { ArrowDown, ArrowUp, Hash, Minus, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  activityDateKey,
  activityDateToLocalDate,
  buildActivityHeatmapWeeks,
  buildCompactActivityWeeks,
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
  isCompactView?: boolean;
  highlightedDates?: string[] | null;
  onHighlightDatesChange?: (dates: string[] | null) => void;
  /** Opens the workout session for a day that has at least one session. */
  onDayClick?: (date: string) => void;
  /** Session dates (`YYYY-MM-DD`) that reached a goal, with the goal names for that day. */
  goalReachedByDate?: Record<string, string>;
};

const INTENSITY_LEGEND: ActivityIntensity[] = ["rest", "no-sets", "workout"];

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
  isCompactView = false,
  highlightedDates = null,
  onHighlightDatesChange,
  onDayClick,
  goalReachedByDate = {},
}: WorkoutActivityHeatmapProps) {
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const totalWorkouts = sortedData.reduce((sum, item) => sum + item.workouts, 0);
  const totalSets = sortedData.reduce((sum, item) => sum + item.sets, 0);
  const [selectedCompactWeekStart, setSelectedCompactWeekStart] = useState<string | null>(null);
  const compactChartRef = useRef<HTMLDivElement | null>(null);
  const highlightedDateSet = useMemo(() => new Set(highlightedDates ?? []), [highlightedDates]);

  useEffect(() => {
    if (!isCompactView || !selectedCompactWeekStart) {
      return;
    }
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (!compactChartRef.current?.contains(target)) {
        setSelectedCompactWeekStart(null);
              onHighlightDatesChange?.(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isCompactView, onHighlightDatesChange, selectedCompactWeekStart]);

  if (sortedData.length === 0) {
    return <p className="text-xs text-zinc-500">No workouts in the selected timeframe.</p>;
  }

  const today = new Date();
  const todayKey = activityDateKey(today);
  const currentWeekStart = currentWeekStartKey(today);
  const comparison = buildActivityComparison(sortedData, todayKey);

  if (isCompactView) {
    const compactData = buildCompactActivityWeeks(sortedData, today);
    const currentWeekInCompact = compactData.some((item) => item.isCurrentWeek);
    const selectedWeek = compactData.find((item) => item.weekStart === selectedCompactWeekStart);

    return (
      <div>
        <ActivityRangeLine
          sentence={`${totalSets} sets across ${totalWorkouts} workouts in the last 10 weeks`}
        />
        <div className="mb-2 mt-1">
          <ActivityComparisonLine sentence={comparison.sentence} setTrend={comparison.setTrend} />
        </div>
        <div
          ref={compactChartRef}
          className="compact-activity-chart relative h-36 w-full"
          style={{ WebkitTapHighlightColor: "transparent" }}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            const clickedBar = target.closest(".recharts-bar-rectangle, .recharts-rectangle");
            if (!clickedBar) {
              setSelectedCompactWeekStart(null);
                onHighlightDatesChange?.(null);
            }
          }}
        >
          {selectedWeek ? (
            <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md border border-zinc-300 bg-white/95 px-2 py-1 text-[11px] text-zinc-700 shadow-sm">
              {selectedWeek.weekLabel}: {selectedWeek.sets} set{selectedWeek.sets === 1 ? "" : "s"}
            </div>
          ) : null}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compactData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="weekLabel" tick={{ fill: "#52525b", fontSize: 10 }} minTickGap={10} />
              <YAxis allowDecimals={false} tick={{ fill: "#52525b", fontSize: 10 }} />
              <Bar
                dataKey="sets"
                fill="#0284c7"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                onClick={(entry: { weekStart?: string; payload?: { weekStart?: string } }) => {
                  const weekStart = entry.weekStart ?? entry.payload?.weekStart;
                  if (weekStart) {
                    setSelectedCompactWeekStart(weekStart);
                    const weekStartDate = activityDateToLocalDate(weekStart);
                    const weekEndDate = new Date(weekStartDate);
                    weekEndDate.setDate(weekStartDate.getDate() + 6);
                    const weekStartKey = activityDateKey(weekStartDate);
                    const weekEndKey = activityDateKey(weekEndDate);
                    const weekDates = sortedData
                      .map((item) => item.date)
                      .filter((date) => date >= weekStartKey && date <= weekEndKey);
                    onHighlightDatesChange?.(weekDates);
                  }
                }}
              >
                {compactData.map((item) => (
                  <Cell
                    key={item.weekStart}
                    fill={
                      item.isCurrentWeek ? "#0369a1" : currentWeekInCompact ? "#7dd3fc" : "#0284c7"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const visibleWeeks = buildActivityHeatmapWeeks(sortedData);
  const weekdayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
  const monthLabels = visibleWeeks.map((week, index) => {
    const date = activityDateToLocalDate(week[0].date);
    const label = new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
    const previous = index > 0 ? new Intl.DateTimeFormat(undefined, { month: "short" }).format(activityDateToLocalDate(visibleWeeks[index - 1][0].date)) : null;
    return previous !== label ? label : "";
  });
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <ActivityRangeLine
            sentence={`${totalSets} sets across ${totalWorkouts} workouts in the selected range.`}
          />
          <ActivityComparisonLine sentence={comparison.sentence} setTrend={comparison.setTrend} />
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
          style={{ gridTemplateColumns: `repeat(${visibleWeeks.length}, minmax(0, 1fr))` }}
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
        <div className="grid grid-rows-7 gap-1.5 text-[10px] leading-3 text-zinc-500">
          {weekdayLabels.map((label, index) => (
            <div key={`weekday-${index}`} className="flex items-center">
              {label}
            </div>
          ))}
        </div>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${visibleWeeks.length}, minmax(0, 1fr))` }}
        >
          {visibleWeeks.map((week, weekIndex) => {
            const isCurrentWeek = week[0].date === currentWeekStart;
            return (
            <div
              key={`week-${weekIndex}`}
              className={`grid grid-rows-7 gap-1.5 ${
                isCurrentWeek ? "rounded-sm outline outline-2 outline-sky-600 outline-offset-1" : ""
              }`}
            >
              {week.map((day) => {
                const parsedDate = activityDateToLocalDate(day.date);
                const intensity = day.isInRange ? activityIntensity(day.sets, day.workouts) : null;
                const isToday = day.date === todayKey;
                const goalLabel = day.isInRange ? goalReachedByDate[day.date] : undefined;
                const canOpen = day.isInRange && day.workouts > 0;
                const openHint =
                  day.workouts > 1 ? " Choose a workout session." : " Open this workout session.";
                const tooltip = `${new Intl.DateTimeFormat(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }).format(parsedDate)}: ${day.sets} set${day.sets === 1 ? "" : "s"} across ${
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
                    aria-label={tooltip}
                    role={canOpen ? "button" : undefined}
                    tabIndex={canOpen ? 0 : undefined}
                    className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-sm border transition hover:brightness-95 active:scale-95 ${
                      isToday
                        ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-1"
                        : highlightedDateSet.has(day.date) && day.isInRange
                          ? "border-sky-700 ring-1 ring-sky-600/40"
                          : "border-zinc-200"
                    } ${intensity ? activityIntensityClass(intensity) : "bg-zinc-100"}`}
                    style={{ width: "100%", aspectRatio: "1 / 1", height: "auto" }}
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
                      <Trophy
                        className="pointer-events-none h-[62%] w-[62%] fill-yellow-400 text-amber-500"
                        strokeWidth={1.75}
                        aria-hidden
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
    </div>
  );
}
