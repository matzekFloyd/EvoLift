import {
  progressReadLabel,
  type ExerciseProgressRow,
  type ProgressRead,
} from "@/lib/exercise-progress-insights";
import { progressReadBadgeTone } from "@/app/components/insight-rows";
import type { StatusBadgeTone } from "@/app/components/status-badge";

/** Same urgency order as the Exercise progress list. */
const READ_ORDER: readonly ProgressRead[] = ["room", "down", "on-track", "ahead", "early"];

export type ExerciseProgressPaceBucket = {
  read: ProgressRead;
  label: string;
  tone: StatusBadgeTone;
  count: number;
  /** Share of all progress rows, rounded to a whole percent. */
  percent: number;
};

export function exerciseProgressPaceBuckets(
  rows: readonly Pick<ExerciseProgressRow, "read">[],
): ExerciseProgressPaceBucket[] {
  const total = rows.length;
  if (total === 0) {
    return [];
  }

  const counts = new Map<ProgressRead, number>();
  for (const row of rows) {
    counts.set(row.read, (counts.get(row.read) ?? 0) + 1);
  }

  return READ_ORDER.flatMap((read) => {
    const count = counts.get(read) ?? 0;
    if (count === 0) {
      return [];
    }
    return [
      {
        read,
        label: progressReadLabel(read),
        tone: progressReadBadgeTone(read),
        count,
        percent: Math.round((count / total) * 100),
      },
    ];
  });
}

export function exerciseProgressPaceChartLabel(buckets: readonly ExerciseProgressPaceBucket[]): string {
  if (buckets.length === 0) {
    return "No exercise progress buckets yet.";
  }
  return `Pace mix: ${buckets
    .map((bucket) => `${bucket.count} ${bucket.label} (${bucket.percent}%)`)
    .join(", ")}.`;
}

export function exerciseProgressPaceFill(read: ProgressRead): string {
  switch (read) {
    case "ahead":
      return "#059669";
    case "on-track":
      return "#0284c7";
    case "room":
      return "#d97706";
    case "down":
      return "#b45309";
    case "early":
      return "#71717a";
  }
}
