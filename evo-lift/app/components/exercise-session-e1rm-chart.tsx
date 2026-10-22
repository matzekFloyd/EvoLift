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
import { exerciseE1rmChartText } from "@/app/components/chart-text-data";
import { formatKgTick } from "@/app/components/exercise-weight-progress-format";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import {
  buildE1rmChangeSentence,
  type ExerciseSessionE1rmChartPoint,
} from "@/lib/exercise-session-e1rm-chart";
import { zoomedWeightAxisDomain } from "@/lib/exercise-session-weight-chart";

type ExerciseSessionE1rmChartProps = {
  points: ExerciseSessionE1rmChartPoint[];
};

export function ExerciseSessionE1rmChart({ points }: ExerciseSessionE1rmChartProps) {
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
      points.map((p) => ({
        ...p,
        e1rmValue: p.e1rmKg,
      })),
    [points],
  );

  const yDomain = useMemo(
    () => zoomedWeightAxisDomain(chartData.map((point) => point.e1rmValue)),
    [chartData],
  );

  const renderTooltip = ({
    active,
    payload,
  }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) {
      return null;
    }
    const source = payload[0]?.payload as ExerciseSessionE1rmChartPoint | undefined;
    if (!source) {
      return null;
    }
    const sessionDate = formatDateOnlyForLocale(source.performedOn);
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm">
        <p className="font-medium text-zinc-800">Session · {sessionDate}</p>
        <p className="text-zinc-700">Estimated 1RM: {source.e1rmKg.toFixed(1)} kg</p>
        <p className="text-zinc-600">
          From set #{source.sourceSetNumber}: {source.sourceReps} reps ×{" "}
          {source.sourceTotalKg.toFixed(1)} kg Total
        </p>
        <p className="text-zinc-500">
          Loaded {source.sourceLoadedKg.toFixed(1)} kg · Epley · not a tested max
        </p>
      </div>
    );
  };

  if (points.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No working sets of 12 reps or fewer with a logged load yet, so estimated 1RM cannot be
        plotted.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-snug text-zinc-800">{buildE1rmChangeSentence(points)}</p>

      <div
        className="exercise-session-e1rm-chart relative h-52 w-full sm:h-64"
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-hidden
      >
        <ChartResponsiveContainer initialDimension={{ width: 320, height: 208 }}>
          <LineChart
            accessibilityLayer={false}
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="xTickLabel"
              tick={{ fill: "#52525b", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={isCompactView ? 36 : 48}
            />
            <YAxis
              domain={yDomain}
              allowDataOverflow
              tick={{ fill: "#52525b", fontSize: 11 }}
              tickFormatter={(v: number) => `${formatKgTick(v)} kg`}
              width={isCompactView ? 56 : 64}
            />
            <Tooltip content={renderTooltip} />
            <Line
              type="monotone"
              dataKey="e1rmValue"
              name="Estimated 1RM"
              stroke="#0284c7"
              strokeWidth={2}
              dot={{ r: points.length <= 8 ? 3 : 2 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartResponsiveContainer>
      </div>
      <ChartTextAlternative model={exerciseE1rmChartText(points)} />
    </div>
  );
}
