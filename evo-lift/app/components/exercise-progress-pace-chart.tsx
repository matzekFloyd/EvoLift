"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartResponsiveContainer } from "@/app/components/chart-responsive-container";
import {
  exerciseProgressPaceChartLabel,
  exerciseProgressPaceFill,
  type ExerciseProgressPaceBucket,
} from "@/app/components/exercise-progress-pace";

type ExerciseProgressPaceChartProps = {
  buckets: ExerciseProgressPaceBucket[];
};

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

  return (
    <div
      className="relative h-24 w-24"
      role="img"
      aria-label={exerciseProgressPaceChartLabel(buckets)}
      title={exerciseProgressPaceChartLabel(buckets)}
    >
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center" aria-hidden>
        <p className="flex flex-col items-center leading-none">
          <span className="text-lg font-semibold tabular-nums text-zinc-900">{total}</span>
          <span className="-mt-0.5 text-[10px] text-zinc-500">{total === 1 ? "lift" : "lifts"}</span>
        </p>
      </div>
      <div className="relative z-10 h-full w-full">
        <ChartResponsiveContainer initialDimension={{ width: 96, height: 96 }}>
          <PieChart>
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
  );
}
