"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartResponsiveContainer } from "@/app/components/chart-responsive-container";
import {
  exerciseProgressPaceFill,
  exerciseProgressPaceTextRows,
  exerciseProgressPaceTotalLabel,
  type ExerciseProgressPaceBucket,
} from "@/app/components/exercise-progress-pace";
import type { ProgressRead } from "@/lib/exercise-progress-insights";

type ExerciseProgressPaceChartProps = {
  buckets: ExerciseProgressPaceBucket[];
};

function paceSwatchClass(read: ProgressRead): string {
  switch (read) {
    case "ahead":
      return "h-2 w-2 bg-emerald-600";
    case "on-track":
      return "h-2 w-2 bg-sky-600";
    case "room":
      return "h-2 w-2 bg-amber-600";
    case "down":
      return "h-2 w-2 bg-amber-700";
    case "early":
      return "h-2 w-2 bg-zinc-500";
  }
}

export function ExerciseProgressPaceChart({ buckets }: ExerciseProgressPaceChartProps) {
  if (buckets.length === 0) {
    return null;
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const data = buckets.map((bucket) => ({
    name: bucket.label,
    value: bucket.count,
    read: bucket.read,
  }));

  const textRows = exerciseProgressPaceTextRows(buckets);

  return (
    <div className="w-[9.75rem]">
      <div className="relative mx-auto h-24 w-24" aria-hidden>
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <p className="flex flex-col items-center leading-none">
            <span className="text-lg font-semibold tabular-nums text-zinc-900">{total}</span>
            <span className="-mt-0.5 text-[10px] text-zinc-500">{total === 1 ? "lift" : "lifts"}</span>
          </p>
        </div>
        <div className="relative z-10 h-full w-full">
          <ChartResponsiveContainer initialDimension={{ width: 96, height: 96 }}>
            <PieChart accessibilityLayer={false}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="92%"
                paddingAngle={buckets.length > 1 ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.read} fill={exerciseProgressPaceFill(entry.read)} />
                ))}
              </Pie>
            </PieChart>
          </ChartResponsiveContainer>
        </div>
      </div>
      <ul aria-label="Pace mix" className="mt-2 space-y-0.5 text-xs text-zinc-700">
        <li className="sr-only">{exerciseProgressPaceTotalLabel(total)}</li>
        {textRows.map((row) => (
          <li key={row.read} className="flex items-baseline justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className={`shrink-0 rounded-sm ${paceSwatchClass(row.read)}`} aria-hidden />
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums">{row.countLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
