"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { ExerciseName } from "@/app/components/exercise-badge-chip";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { ProfileRecordsList } from "@/app/profile/profile-records-list";
import { formatGoalBodyweightTarget } from "@/app/goals/goal-bodyweight-label";
import { definitionFromRow, storedFromRow } from "@/app/goals/goal-row";
import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { loadGoalsList, peekGoalsList, type GoalMilestoneRow } from "@/lib/goals-list-cache";
import { loadCachedInsightsHistory, loadUserStrengthProfile } from "@/lib/insights-data";
import { formatMilestoneTarget, type GoalProgress } from "@/lib/milestone-progress";
import { appPath } from "@/lib/app-paths";
import {
  buildProfileRecords,
  profileExerciseHref,
  sortProfileAchievedGoals,
  type ProfileAchievedGoal,
  type ProfileRecordRow,
} from "@/lib/profile-summary";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

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

export default function ProfilePage() {
  const router = useRouter();
  const [cachedGoals] = useState(() => {
    const remembered = rememberedUserId();
    return remembered ? peekGoalsList(remembered) : null;
  });
  const [isChecking, setIsChecking] = useState(true);
  const [records, setRecords] = useState<ProfileRecordRow[]>([]);
  const [goalRows, setGoalRows] = useState<GoalMilestoneRow[]>(cachedGoals?.rows ?? []);
  const [progressById, setProgressById] = useState<Map<string, GoalProgress>>(
    () => new Map(cachedGoals?.progressEntries ?? []),
  );
  const [exerciseById, setExerciseById] = useState(
    () => new Map((cachedGoals?.exerciseOptions ?? []).map((option) => [option.id, option])),
  );
  const [bodyweightEntries, setBodyweightEntries] = useState(cachedGoals?.bodyweightEntries ?? []);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const visit = await confirmSignedInUser();
      if (!isMounted) {
        return;
      }
      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }

      const [historyResult, strengthResult, goalsResult] = await Promise.all([
        loadCachedInsightsHistory(supabaseBrowserClient, visit.userId, { from: "", to: "" }).then(
          (history) => ({ history, error: null as string | null }),
          () => ({ history: null, error: "Could not load personal records." }),
        ),
        loadUserStrengthProfile(supabaseBrowserClient, visit.userId).then(
          (profile) => profile,
          () => null,
        ),
        loadGoalsList(supabaseBrowserClient, visit.userId, { fresh: visit.showCached }),
      ]);

      if (!isMounted) {
        return;
      }

      if (historyResult.history) {
        setRecords(
          buildProfileRecords(
            historyResult.history.exerciseSets,
            strengthResult?.bodyweightEntries ?? [],
          ),
        );
        setRecordsError(null);
      } else {
        setRecordsError(historyResult.error);
      }

      if (goalsResult.error || !goalsResult.snapshot) {
        setGoalsError(goalsResult.error ?? "Could not load goals.");
      } else {
        setGoalRows(goalsResult.snapshot.rows);
        setProgressById(new Map(goalsResult.snapshot.progressEntries));
        setExerciseById(new Map(goalsResult.snapshot.exerciseOptions.map((option) => [option.id, option])));
        setBodyweightEntries(goalsResult.snapshot.bodyweightEntries);
        setGoalsError(null);
      }
      setIsChecking(false);
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const achievedGoals = useMemo(() => {
    const today = getTodayYyyyMmDd();
    const goals: ProfileAchievedGoal[] = [];
    for (const row of goalRows) {
      const progress = progressById.get(row.id);
      const exercise = exerciseById.get(row.exercise_id);
      if (!progress || progress.kind !== "achieved" || !exercise) {
        continue;
      }
      const definition = definitionFromRow(row);
      const targetLabel =
        isAssistanceExercise(exercise.slug) && definition.milestoneType === "absolute"
          ? formatMilestoneTarget(definition, { assistance: true })
          : formatGoalBodyweightTarget({
              definition,
              progress,
              achievedBodyweightKg: storedFromRow(row).achievedBodyweightKg,
              bodyweightEntries,
              today,
            });
      goals.push({
        id: row.id,
        label: exercise.label,
        slug: exercise.slug,
        href: profileExerciseHref(exercise.slug),
        targetLabel,
        achievedAt: progress.achievedAt,
      });
    }
    return sortProfileAchievedGoals(goals);
  }, [bodyweightEntries, exerciseById, goalRows, progressById]);

  return (
    <PageShell>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">Personal records and goals you have reached.</p>
      </section>

      <section className="panel flex min-w-0 flex-col gap-3 p-5">
        <SectionHeading>Personal records</SectionHeading>
        <p className="text-sm text-zinc-800">
          Best weight is the highest Loaded (kg), or the lowest assistance on Assisted Dip and Assisted
          Pull-Up. Estimated 1RM uses working sets of 12 reps or fewer, and the date is when that mark
          was first hit.
        </p>
        {isChecking ? (
          <ContentPlaceholder label="Loading personal records..." rows={4} rowClassName="h-12" />
        ) : recordsError ? (
          <StatusNotice message={recordsError} tone="error" />
        ) : records.length === 0 ? (
          <p className="text-sm text-zinc-600">No working sets with a logged load yet.</p>
        ) : (
          <ProfileRecordsList rows={records} />
        )}
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <SectionHeading>Achieved goals</SectionHeading>
        <p className="text-sm text-zinc-800">
          Goals you have already reached.{" "}
          <Link href={appPath("/goals")} className="font-medium text-sky-800 underline-offset-2 hover:underline">
            Open Goals
          </Link>{" "}
          to change them.
        </p>
        {isChecking && achievedGoals.length === 0 ? (
          <ContentPlaceholder label="Loading achieved goals..." rows={2} rowClassName="h-12" />
        ) : goalsError ? (
          <StatusNotice message={goalsError} tone="error" />
        ) : achievedGoals.length === 0 ? (
          <p className="text-sm text-zinc-600">No achieved goals yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white">
            {achievedGoals.map((goal) => (
              <li key={goal.id} className="px-3 py-2.5">
                <ExerciseName slug={goal.slug}>
                  <Link
                    href={goal.href}
                    className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
                  >
                    {goal.label}
                  </Link>
                </ExerciseName>
                <p className="mt-1 text-sm text-zinc-800">{goal.targetLabel}</p>
                {goal.achievedAt ? (
                  <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                    Achieved {formatAchievedOn(goal.achievedAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
