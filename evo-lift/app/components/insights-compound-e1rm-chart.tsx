"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { ChartResponsiveContainer } from "@/app/components/chart-responsive-container";
import { ChartTextAlternative } from "@/app/components/chart-text-alternative";
import { compoundE1rmChartText } from "@/app/components/chart-text-data";
import { formatKgTick } from "@/app/components/exercise-weight-progress-format";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import type { InsightsCompoundE1rmSeries } from "@/lib/insights-compound-e1rm";
import { zoomedWeightAxisDomain } from "@/lib/exercise-session-weight-chart";

type InsightsCompoundE1rmChartProps = {
  series: InsightsCompoundE1rmSeries[];
};

function CompoundE1rmMiniChart({ item }: { item: InsightsCompoundE1rmSeries }) {
  const [isCompactView, setIsCompactView] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsCompactView(mediaQuery.matches);
    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, []);

  const chartData = useMemo(
    () =>
      item.points.map((point) => ({
        ...point,
        e1rmValue: point.e1rmKg,
      })),
    [item.points],
  );

  const yDomain = useMemo(
    () => zoomedWeightAxisDomain(chartData.map((point) => point.e1rmValue)),
    [chartData],
  );

  const latest = item.points[item.points.length - 1];
  const previous = item.points.length >= 2 ? item.points[item.points.length - 2] : null;
  const latestText = latest ? `${latest.e1rmKg.toFixed(1)} kg` : "";
  const changeText =
    latest && previous
      ? (() => {
          const delta = latest.e1rmKg - previous.e1rmKg;
          if (Math.abs(delta) < 0.05) {
            return "same as last session";
          }
          return `${Math.abs(delta).toFixed(1)} kg ${delta > 0 ? "up" : "down"} vs last`;
        })()
      : "log another session to see change";

  const renderTooltip = ({
    active,
    payload,
  }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) {
      return null;
    }
    const source = payload[0]?.payload as (typeof chartData)[number] | undefined;
    if (!source) {
      return null;
    }
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm">
        <p className="font-medium text-zinc-800">
          {item.shortLabel} · {formatDateOnlyForLocale(source.performedOn)}
        </p>
        <p className="text-zinc-700">Estimated 1RM: {source.e1rmKg.toFixed(1)} kg</p>
        <p className="text-zinc-500">
          {source.sourceReps} reps × {source.sourceTotalKg.toFixed(1)} kg Total
        </p>
      </div>
    );
  };

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800">{item.shortLabel}</p>
        <p className="truncate text-xs text-zinc-500" title={item.label}>
          {latestText}
          {latestText ? " · " : ""}
          {changeText}
        </p>
      </div>
      <div
        className="insights-compound-e1rm-chart relative mt-2 h-36 w-full sm:h-40"
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-hidden
      >
        <ChartResponsiveContainer initialDimension={{ width: 280, height: 144 }}>
          <LineChart
            accessibilityLayer={false}
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="xTickLabel"
              tick={{ fill: "#52525b", fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={isCompactView ? 28 : 36}
            />
            <YAxis
              domain={yDomain}
              allowDataOverflow
              tick={{ fill: "#52525b", fontSize: 10 }}
              tickFormatter={(v: number) => `${formatKgTick(v)}`}
              width={isCompactView ? 36 : 44}
            />
            <Tooltip content={renderTooltip} />
            <Line
              type="monotone"
              dataKey="e1rmValue"
              name="Estimated 1RM"
              stroke="#0284c7"
              strokeWidth={2}
              dot={{ r: item.points.length <= 8 ? 2.5 : 2 }}
              activeDot={{ r: 3.5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartResponsiveContainer>
      </div>
      <div className="mt-2">
        <ChartTextAlternative model={compoundE1rmChartText(item.shortLabel, item.points)} />
      </div>
    </div>
  );
}

export function InsightsCompoundE1rmChart({ series }: InsightsCompoundE1rmChartProps) {
  if (series.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Log Barbell Back Squat, Barbell Bench Press, Barbell Deadlift, or Barbell Overhead Press with
        working sets of 12 reps or fewer to plot estimated 1RM here.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {series.map((item) => (
        <CompoundE1rmMiniChart key={item.slug} item={item} />
      ))}
    </div>
  );
}
