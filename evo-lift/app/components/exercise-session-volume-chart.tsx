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
import { exerciseVolumeChartText } from "@/app/components/chart-text-data";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { formatVolumeTick } from "@/app/components/exercise-session-volume-format";
import {
  buildVolumeChangeSentence,
  type ExerciseSessionVolumeChartPoint,
} from "@/lib/exercise-session-volume-chart";

type ExerciseSessionVolumeChartProps = {
  points: ExerciseSessionVolumeChartPoint[];
};

export function ExerciseSessionVolumeChart({ points }: ExerciseSessionVolumeChartProps) {
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
        volumeValue: p.volumeKg,
      })),
    [points],
  );

  const renderTooltip = ({
    active,
    payload,
  }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) {
      return null;
    }
    const source = payload[0]?.payload as ExerciseSessionVolumeChartPoint | undefined;
    if (!source) {
      return null;
    }
    const sessionDate = formatDateOnlyForLocale(source.performedOn);
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm">
        <p className="font-medium text-zinc-800">Session · {sessionDate}</p>
        <p className="text-zinc-700">Session volume: {source.volumeKg.toFixed(1)} kg</p>
        <p className="text-zinc-500">
          Sum of reps × Total (kg) on {source.workingSetsIncluded} working set
          {source.workingSetsIncluded === 1 ? "" : "s"} (warmups excluded).
        </p>
      </div>
    );
  };

  if (points.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No working sets with logged weight yet, so session volume cannot be calculated.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-snug text-zinc-800">{buildVolumeChangeSentence(points)}</p>

      <div
        className="exercise-session-volume-chart relative h-52 w-full sm:h-64"
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
              tick={{ fill: "#52525b", fontSize: 11 }}
              tickFormatter={(v: number) => `${formatVolumeTick(v)} kg`}
              width={isCompactView ? 52 : 64}
            />
            <Tooltip content={renderTooltip} />
            <Line
              type="monotone"
              dataKey="volumeValue"
              name="Session volume"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: points.length <= 8 ? 3 : 2 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartResponsiveContainer>
      </div>
      <ChartTextAlternative model={exerciseVolumeChartText(points)} />
    </div>
  );
}
