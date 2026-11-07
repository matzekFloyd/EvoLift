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
import { ChartSeriesLegend, ChartTextAlternative } from "@/app/components/chart-text-alternative";
import { exerciseWeightChartText } from "@/app/components/chart-text-data";
import { SegmentedTabs } from "@/app/components/segmented-tabs";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { formatKgTick } from "@/app/components/exercise-weight-progress-format";
import {
  buildWeightChangeSentence,
  zoomedWeightAxisDomain,
  type ExerciseSessionWeightChartPoint,
} from "@/lib/exercise-session-weight-chart";

export type ExerciseWeightProgressSeriesMode = "total" | "loaded" | "both";

type ExerciseWeightProgressChartProps = {
  points: ExerciseSessionWeightChartPoint[];
  /** Machine-assisted moves: Assistance (kg) only, no Total / Both. */
  assistance?: boolean;
  /** Dip: Loaded (kg) plus bodyweight when a bodyweight is logged. */
  bodyweightPlusLoad?: boolean;
  /** Loaded and Total differ on the working sets in view. */
  usesBaseWeight?: boolean;
};

const LINE_TOTAL = "Total (kg)";
const LINE_LOADED = "Loaded (kg)";
const LINE_ASSISTANCE = "Assistance (kg)";
const LINE_MOVED_LOAD = "Bodyweight minus assistance (kg)";
const LINE_PLUS_LOAD = "Bodyweight plus added load (kg)";

export function ExerciseWeightProgressChart({
  points,
  assistance = false,
  bodyweightPlusLoad = false,
  usesBaseWeight = false,
}: ExerciseWeightProgressChartProps) {
  const [seriesMode, setSeriesMode] = useState<ExerciseWeightProgressSeriesMode>("loaded");
  const [isCompactView, setIsCompactView] = useState(false);
  const showSeriesToggle = !assistance && usesBaseWeight;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsCompactView(mediaQuery.matches);
    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, []);

  const effectiveMode: ExerciseWeightProgressSeriesMode = showSeriesToggle ? seriesMode : "loaded";
  const loadLineName = assistance ? LINE_ASSISTANCE : LINE_LOADED;
  const movedLoadName = bodyweightPlusLoad ? LINE_PLUS_LOAD : LINE_MOVED_LOAD;
  const showMovedLoad =
    (assistance || bodyweightPlusLoad) && points.some((point) => point.movedLoadKg != null);

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        totalValue: p.heaviestTotalKg,
        loadedValue: p.heaviestLoadedKg,
        movedLoadValue: p.movedLoadKg ?? null,
      })),
    [points],
  );

  const showTotal = !assistance && (effectiveMode === "total" || effectiveMode === "both");
  const showLoaded = assistance || effectiveMode === "loaded" || effectiveMode === "both";
  const changeSentence = buildWeightChangeSentence(points, effectiveMode, {
    assistance,
    bodyweightPlusLoad,
  });
  const yDomain = useMemo(() => {
    const values = chartData.flatMap((point) => {
      const seriesValues: number[] = [];
      if (showTotal) {
        seriesValues.push(point.totalValue);
      }
      if (showLoaded) {
        seriesValues.push(point.loadedValue);
      }
      if (showMovedLoad && point.movedLoadValue != null) {
        seriesValues.push(point.movedLoadValue);
      }
      return seriesValues;
    });
    return zoomedWeightAxisDomain(values);
  }, [chartData, showLoaded, showMovedLoad, showTotal]);

  const renderTooltip = ({
    active,
    payload,
  }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) {
      return null;
    }
    const source = payload[0]?.payload as ExerciseSessionWeightChartPoint | undefined;
    if (!source) {
      return null;
    }
    const sessionDate = formatDateOnlyForLocale(source.performedOn);
    if (assistance || bodyweightPlusLoad) {
      return (
        <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm">
          <p className="font-medium text-zinc-800">Session · {sessionDate}</p>
          <p className="text-zinc-700">
            {loadLineName}: {source.heaviestLoadedKg.toFixed(1)} kg
          </p>
          {showMovedLoad ? (
            <p className="text-zinc-700">
              {source.movedLoadKg == null
                ? `${movedLoadName}: not plotted for this session`
                : `${movedLoadName}: ${source.movedLoadKg.toFixed(1)} kg`}
            </p>
          ) : null}
          <p className="text-zinc-500">
            {bodyweightPlusLoad ? "Heaviest working set" : "Working set"}: #{source.heaviestSetNumber}
          </p>
        </div>
      );
    }
    if (!usesBaseWeight) {
      return (
        <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm">
          <p className="font-medium text-zinc-800">Session · {sessionDate}</p>
          <p className="text-zinc-700">
            {LINE_LOADED}: {source.heaviestLoadedKg.toFixed(1)} kg
          </p>
          <p className="text-zinc-500">Heaviest working set: #{source.heaviestSetNumber}</p>
        </div>
      );
    }
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm">
        <p className="font-medium text-zinc-800">Session · {sessionDate}</p>
        <p className="text-zinc-700">
          {LINE_TOTAL}: {source.heaviestTotalKg.toFixed(1)} kg
        </p>
        <p className="text-zinc-700">
          {LINE_LOADED}: {source.heaviestLoadedKg.toFixed(1)} kg
        </p>
        <p className="text-zinc-600">
          Base: {source.baseKg.toFixed(1)} kg (total minus loaded for that set)
        </p>
        <p className="text-zinc-500">Heaviest working set: #{source.heaviestSetNumber}</p>
      </div>
    );
  };

  if (points.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        {assistance
          ? "No working sets with logged assistance yet, so there is nothing to plot."
          : "No working sets with logged weight yet, so there is nothing to plot."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
        <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-800">{changeSentence}</p>
        {showSeriesToggle ? (
          <SegmentedTabs<ExerciseWeightProgressSeriesMode>
            value={seriesMode}
            onChange={setSeriesMode}
            className="w-auto min-w-[10.5rem] shrink-0"
            tabListAriaLabel="Chart series"
            buttonLayout="equal-row"
            buttonMinWidthClassName="min-w-0"
            options={[
              { value: "loaded", label: "Loaded" },
              { value: "total", label: "Total" },
              { value: "both", label: "Both" },
            ]}
          />
        ) : null}
      </div>

      {effectiveMode === "both" ? (
        <ChartSeriesLegend
          items={[
            { key: "loaded", label: LINE_LOADED, swatchClassName: "h-0.5 w-4 bg-teal-700" },
            { key: "total", label: LINE_TOTAL, swatchClassName: "h-0.5 w-4 bg-sky-600" },
          ]}
        />
      ) : null}
      {showMovedLoad ? (
        <ChartSeriesLegend
          items={[
            { key: "load", label: loadLineName, swatchClassName: "h-0.5 w-4 bg-teal-700" },
            { key: "moved", label: movedLoadName, swatchClassName: "h-0.5 w-4 bg-sky-600" },
          ]}
        />
      ) : null}

      <div
        className="exercise-weight-progress-chart relative h-52 w-full sm:h-64"
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
            {showTotal ? (
              <Line
                type="monotone"
                dataKey="totalValue"
                name={LINE_TOTAL}
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: points.length <= 8 ? 3 : 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ) : null}
            {showLoaded ? (
              <Line
                type="monotone"
                dataKey="loadedValue"
                name={loadLineName}
                stroke={
                  showSeriesToggle || assistance || (bodyweightPlusLoad && showMovedLoad)
                    ? "#0f766e"
                    : "#0284c7"
                }
                strokeWidth={2}
                dot={{ r: points.length <= 8 ? 3 : 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ) : null}
            {showMovedLoad ? (
              <Line
                type="monotone"
                dataKey="movedLoadValue"
                name={movedLoadName}
                stroke="#0284c7"
                strokeWidth={2}
                connectNulls={false}
                dot={{ r: points.length <= 8 ? 3 : 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ChartResponsiveContainer>
      </div>
      <ChartTextAlternative
        model={exerciseWeightChartText(points, effectiveMode, assistance, bodyweightPlusLoad)}
      />
    </div>
  );
}
