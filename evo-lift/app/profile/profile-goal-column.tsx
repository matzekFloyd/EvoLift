import Link from "next/link";
import { ExerciseName } from "@/app/components/exercise-badge-chip";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { goalMeterValueText, goalMeterVisible } from "@/app/goals/goal-meter";
import { GoalProgressMeter } from "@/app/goals/goal-progress-meter";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import type { ProfileGoalHighlights } from "@/lib/profile-goal-highlights";
import { appPath } from "@/lib/app-paths";

type ProfileGoalColumnProps = {
  highlights: ProfileGoalHighlights;
  error: string | null;
  checking: boolean;
};

function formatAchievedOn(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return formatDateOnlyForLocale(iso);
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function ProfileGoalColumn({ highlights, error, checking }: ProfileGoalColumnProps) {
  const heading =
    checking && highlights.goals.length === 0
      ? "Goals"
      : highlights.mode === "achieved"
        ? "Reached goals"
        : "Closest goals";
  return (
    <section className="panel flex h-full min-w-0 flex-col gap-3 p-5" aria-labelledby="profile-goal-highlights">
      <div className="flex items-baseline justify-between gap-3">
        <SectionHeading id="profile-goal-highlights">{heading}</SectionHeading>
        <Link
          href={appPath("/goals")}
          className="text-sm font-medium text-sky-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
        >
          Open Goals
        </Link>
      </div>
      {checking && highlights.goals.length === 0 ? (
        <ContentPlaceholder label="Loading goals..." rows={3} rowClassName="h-12" />
      ) : error ? (
        <StatusNotice message={error} tone="error" />
      ) : highlights.goals.length === 0 ? (
        <p className="text-sm text-zinc-600">No goals yet.</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col divide-y divide-zinc-200">
          {highlights.goals.map((goal) => {
            const showMeter =
              highlights.mode === "closest" &&
              goalMeterVisible({ percent: goal.percent, achieved: goal.achieved });
            return (
              <li key={goal.id} className="flex flex-1 flex-col justify-center py-3 first:pt-0 last:pb-0">
                <ExerciseName slug={goal.slug}>
                  <Link
                    href={goal.href}
                    className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                  >
                    {goal.label}
                  </Link>
                </ExerciseName>
                <p className="text-sm text-zinc-600">{goal.targetLabel}</p>
                {highlights.mode === "achieved" && goal.achievedAt ? (
                  <p className="mt-0.5 text-sm tabular-nums text-zinc-800">
                    Achieved {formatAchievedOn(goal.achievedAt)}
                  </p>
                ) : null}
                {showMeter ? (
                  <GoalProgressMeter
                    percent={goal.percent}
                    label={`${goal.label}, ${goal.targetLabel}`}
                    valueText={goalMeterValueText({
                      percent: goal.percent,
                      pastDue: goal.pastDue,
                      achieved: false,
                    })}
                  />
                ) : null}
                {highlights.mode === "closest" && goal.percent == null ? (
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {goalMeterValueText({ percent: null, pastDue: goal.pastDue, achieved: false })}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
