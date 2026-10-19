import { TrendingUp } from "lucide-react";
import { type ExerciseProgressReport } from "@/lib/exercise-progress-insights";
import { CollapsibleSection } from "@/app/components/collapsible-section";
import { ExerciseProgressPaceChart } from "@/app/components/exercise-progress-pace-chart";
import { exerciseProgressPaceBuckets } from "@/app/components/exercise-progress-pace";
import { InsightRowList, progressInsightRow } from "@/app/components/insight-row-list";
import { StatusBadge } from "@/app/components/status-badge";

type ExerciseProgressPanelProps = {
  report: ExerciseProgressReport;
  defaultOpen?: boolean;
};

export function ExerciseProgressPanel({
  report,
  defaultOpen = false,
}: ExerciseProgressPanelProps) {
  const paceBuckets = exerciseProgressPaceBuckets(report.rows);

  return (
    <CollapsibleSection
      title="Exercise progress"
      icon={<TrendingUp />}
      defaultOpen={defaultOpen}
      titleAside={
        paceBuckets.length > 0 ? (
          <span className="flex flex-wrap items-center gap-1 sm:ms-auto">
            {paceBuckets.map((bucket) => (
              <StatusBadge key={bucket.read} tone={bucket.tone}>
                {bucket.count} {bucket.label}
              </StatusBadge>
            ))}
          </span>
        ) : null
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-800">{report.summary}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Estimated 1RM uses working sets up to 12 reps, including base weight.
          </p>
          <details className="mt-2 text-xs text-zinc-600">
            <summary className="cursor-pointer font-medium text-zinc-700">How the pace works</summary>
            <p className="mt-2 leading-relaxed">
              A steady rate is a coaching pace after the first months of training: about 1.5 kg per month on
              Barbell Back Squat and Barbell Deadlift, about 1 kg on Barbell Bench Press and Barbell Bent Over
              Row, and about 0.5 kg on Barbell Overhead Press. Published coaching summaries often put squat and
              deadlift in a 1–2.5 kg per month band, with bench and press slower. This is a pace, not a ranking
              against other people. Early training is often faster, so a steep rise can read as ahead.
            </p>
          </details>
        </div>
        {paceBuckets.length > 0 ? (
          <div className="shrink-0">
            <ExerciseProgressPaceChart buckets={paceBuckets} />
          </div>
        ) : null}
      </div>
      <InsightRowList rows={report.rows.map((row) => progressInsightRow(row))} />
    </CollapsibleSection>
  );
}
