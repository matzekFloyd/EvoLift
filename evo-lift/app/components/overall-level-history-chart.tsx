"use client";

import { CartesianGrid, Line, LineChart, Tooltip, useXAxisScale, useYAxisScale, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { ChartResponsiveContainer } from "@/app/components/chart-responsive-container";
import { ChartTextAlternative } from "@/app/components/chart-text-alternative";
import { LEVEL_FIGURE_VIEW_BOX, levelFigure, markedOverallLevel } from "@/app/components/overall-level-figure";
import {
  overallLevelChartAxisLabel,
  overallLevelChartTick,
  type OverallLevelHistoryChartModel,
  type OverallLevelHistoryChartPoint,
} from "@/app/components/overall-level-history-series";

const DAY_MS = 86_400_000;
const FIGURE_HEIGHT = 40;

function EvolutionFigures({ points }: { points: readonly OverallLevelHistoryChartPoint[] }) {
  const scaleX = useXAxisScale();
  const scaleY = useYAxisScale();
  if (!scaleX || !scaleY) {
    return null;
  }
  const figureWidth = (FIGURE_HEIGHT * 100) / 204;
  return (
    <g>
      {points.map((point) => {
        if (point.hold) {
          return null;
        }
        const level = markedOverallLevel(point.badge);
        if (!level) {
          return null;
        }
        const x = scaleX(point.time);
        const y = scaleY(point.score);
        if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }
        const figure = levelFigure(level);
        return (
          <svg
            key={point.asOf}
            x={x - figureWidth - 8}
            y={y - FIGURE_HEIGHT / 2}
            width={figureWidth}
            height={FIGURE_HEIGHT}
            viewBox={LEVEL_FIGURE_VIEW_BOX}
          >
            <path d={figure.body} className="fill-sky-500 stroke-sky-950" strokeWidth="1.6" strokeLinejoin="round" />
            <path d={figure.head} className="fill-sky-500 stroke-sky-950" strokeWidth="1.6" strokeLinejoin="round" />
            {figure.seams.map((seamPath) => (
              <path
                key={seamPath}
                d={seamPath}
                fill="none"
                className="stroke-sky-950"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            ))}
          </svg>
        );
      })}
    </g>
  );
}

type OverallLevelHistoryChartProps = {
  model: OverallLevelHistoryChartModel;
};

function timeDomain(points: readonly OverallLevelHistoryChartPoint[]): [number, number] {
  const first = points[0]?.time ?? 0;
  const last = points[points.length - 1]?.time ?? first;
  const span = Math.max(last - first, DAY_MS);
  const pad = span * 0.04;
  return [first - pad, last + pad];
}

function yDomain(ticks: readonly number[]): [number, number] {
  const low = ticks[0] ?? 0;
  const high = ticks[ticks.length - 1] ?? low;
  if (low === high) {
    return [low - 0.65, high + 0.65];
  }
  return [low - 0.25, high + 0.25];
}

function LevelDot({
  cx,
  cy,
  payload,
  r = 4,
}: {
  cx?: number;
  cy?: number;
  payload?: OverallLevelHistoryChartPoint;
  r?: number;
}) {
  if (payload?.hold || cx == null || cy == null) {
    return <g />;
  }
  return <circle cx={cx} cy={cy} r={r} fill="#0284c7" stroke="#ffffff" strokeWidth={2} />;
}

export function OverallLevelHistoryChart({ model }: OverallLevelHistoryChartProps) {
  const domain = timeDomain(model.points);
  const renderTooltip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) {
      return null;
    }
    const source = payload[0]?.payload as OverallLevelHistoryChartPoint | undefined;
    if (!source) {
      return null;
    }
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm">
        <p className="font-medium text-zinc-800">{source.dateLabel}</p>
        <p className="text-zinc-700">{source.badge}</p>
      </div>
    );
  };

  const plotHeight = model.yTicks.length <= 4 ? 168 : 216;
  return (
    <div className="min-w-0">
      <div className="relative mt-2 w-full" style={{ height: plotHeight }} aria-hidden>
        <ChartResponsiveContainer initialDimension={{ width: 320, height: plotHeight }}>
          <LineChart
            accessibilityLayer={false}
            data={model.points}
            margin={{ top: 28, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={domain}
              padding={{ left: 28, right: 8 }}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52525b", fontSize: 11 }}
              tickFormatter={(value: number) => overallLevelChartAxisLabel(value, model.includeYear)}
              minTickGap={28}
            />
            <YAxis
              domain={yDomain(model.yTicks)}
              ticks={model.yTicks}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52525b", fontSize: 11 }}
              tickFormatter={(value: number) => overallLevelChartTick(model.yLabels, value)}
              width={92}
            />
            <Tooltip content={renderTooltip} />
            <EvolutionFigures points={model.points} />
            <Line
              type="stepAfter"
              dataKey="score"
              name="Evolution"
              stroke="#0284c7"
              strokeWidth={2}
              dot={<LevelDot />}
              activeDot={<LevelDot r={5} />}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartResponsiveContainer>
      </div>
      <div className="mt-2">
        <ChartTextAlternative model={model.text} />
      </div>
    </div>
  );
}
