import Link from "next/link";
import {
  type ExerciseProgressReport,
} from "@/lib/exercise-progress-insights";
import { isPublicStandardLift, exrxTableUrl } from "@/lib/strength-standards";
import {
  comparisonInsightRow,
  InsightRowList,
  progressInsightRow,
  TextWithExRxTableLink,
} from "@/app/components/insight-row-list";
import { SectionHeading } from "@/app/components/section-heading";
import { PanelInset, panelInsetClass } from "@/app/components/panel-inset";

type LiftComparisonPanelProps = {
  report: ExerciseProgressReport;
};

export function LiftComparisonPanel({ report }: LiftComparisonPanelProps) {
  const notes = [...report.publicNotes, ...report.balanceNotes];
  return (
    <PanelInset className="p-4">
      <SectionHeading>Lift comparison</SectionHeading>
      <p className="mt-1 text-sm text-zinc-800">
        {notes.length > 0
          ? "How your compounds sit next to each other, and next to published standards."
          : "Log a compound on at least 3 sessions to compare it with your other lifts."}
      </p>
      <details className="mt-2 text-xs text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">How these comparisons work</summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          <p>
            Lift-to-lift balance uses coaching ratios for barbell compounds, with a little room either
            side. Deadlift is often about 110–125% of Back Squat, so Back Squat is about 80–90% of
            Deadlift. Barbell Bench Press is often about 65–85% of Back Squat. Barbell Overhead Press is
            often about 60–75% of Barbell Bench Press. Barbell Bent Over Row is often about 80–100% of
            Barbell Bench Press. Barbell Romanian Deadlift is often about 70–85% of Deadlift. Close-Grip
            Bench Press is often about 90–95% of Barbell Bench Press. Barbell Hip Thrust is often about
            130–170% of Back Squat. Limb length and technique move these numbers, so a note appears only
            when a ratio sits clearly outside the band. These are coaching rules of thumb, not a lab study.
          </p>
          <p>
            Machine, dumbbell, and leg-press loads are not turned into a ratio against a barbell, because
            the kilogram is not the same kind of number. Those exercises still count when a whole pattern
            is missing: a press with no pull, or a squat with no hinge, and the reverse. A body part with no
            loaded working sets in this range is marked not trained. That check covers chest, back,
            shoulders, arms, legs, core, and calves.
          </p>
          <p>
            The general-public level uses the{" "}
            <a
              href="https://exrx.net/Testing/WeightLifting/SquatStandardsKg"
              className="underline underline-offset-2 hover:text-sky-800"
              target="_blank"
              rel="noreferrer"
            >
              ExRx.net
            </a>{" "}
            tables for ages 18–39, separate for women and men, at your bodyweight. It applies only to Back
            Squat, Barbell Bench Press, Deadlift, and Barbell Overhead Press, and only when sex, date of birth, and
            bodyweight are saved. ExRx describes those standards for a squat below parallel, a bench with a
            pause and lockout, a locked-out deadlift, and a strict press. The number here is an Epley
            estimate from sets of 12 reps or fewer, not a tested max, so the level can be off by a step.
            The tables are published training standards, not a census. Under 18, no level is shown. From age
            40, ExRx publishes lower tables that this screen does not use, so the label can look harder than
            an age-matched table.
          </p>
        </div>
      </details>
      <InsightRowList rows={notes.map(comparisonInsightRow)} />
      {report.comparisonHint ? (
        <p className="mt-3 text-xs text-zinc-600">
          {report.comparisonHint.replace(
            "the ExRx table for ages 18–39",
            "the ages 18–39 standards linked on each lift",
          )}
        </p>
      ) : null}
    </PanelInset>
  );
}

type ExerciseInsightPanelProps = {
  report: ExerciseProgressReport;
  slug: string;
};

export function ExerciseInsightPanel({ report, slug }: ExerciseInsightPanelProps) {
  const row = report.rows.find((item) => item.slug === slug) ?? null;
  const notes = [...report.publicNotes, ...report.balanceNotes].filter((note) => note.slugs.includes(slug));
  const hint = isPublicStandardLift(slug) ? report.comparisonHint : null;
  const rows = [
    ...(row ? [progressInsightRow(row, { link: false })] : []),
    ...notes.map(comparisonInsightRow),
  ];
  return (
    <section
      className={panelInsetClass("p-4")}
      aria-labelledby="exercise-insight-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <SectionHeading id="exercise-insight-heading">Insight</SectionHeading>
        <Link href="/insights" className="shrink-0 text-xs text-sky-800 underline-offset-2 hover:underline">
          All lifts
        </Link>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Uses the date range on this page, and the same pace, balance, and published standards as Insights.
      </p>
      {rows.length > 0 ? (
        <InsightRowList rows={rows} />
      ) : (
        <p className="mt-3 text-sm text-zinc-700">
          Log working sets up to 12 reps to estimate a 1RM for this exercise.
        </p>
      )}
      {hint ? (
        <p className="mt-3 text-xs text-zinc-600">
          <TextWithExRxTableLink text={hint} href={exrxTableUrl(slug)} />
        </p>
      ) : null}
    </section>
  );
}
