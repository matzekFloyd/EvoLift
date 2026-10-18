import {
  type ExerciseProgressReport,
} from "@/lib/exercise-progress-insights";
import { InsightRowList, progressInsightRow } from "@/app/components/insight-row-list";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";

type ExerciseProgressPanelProps = {
  report: ExerciseProgressReport;
};

export function ExerciseProgressPanel({ report }: ExerciseProgressPanelProps) {
  return (
    <PanelInset className="p-4">
      <SectionHeading>Exercise progress</SectionHeading>
      <p className="mt-1 text-sm text-zinc-800">{report.summary}</p>
      <p className="mt-1 text-xs text-zinc-500">
        Estimated 1RM uses working sets up to 12 reps, including base weight.
      </p>
      <details className="mt-2 text-xs text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">How the pace works</summary>
        <p className="mt-2 leading-relaxed">
          A steady rate is a coaching pace after the first months of training: about 1.5 kg per month on
          Back Squat and Deadlift, about 1 kg on Barbell Bench Press and Barbell Bent Over Row, and about
          0.5 kg on Barbell Overhead Press. Published coaching summaries often put squat and deadlift in a 1–2.5 kg
          per month band, with bench and press slower. This is a pace, not a ranking against other people.
          Early training is often faster, so a steep rise can read as ahead.
        </p>
      </details>
      <InsightRowList rows={report.rows.map((row) => progressInsightRow(row))} />
    </PanelInset>
  );
}
