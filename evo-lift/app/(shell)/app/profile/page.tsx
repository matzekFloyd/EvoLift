"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { OverallLevelPanel } from "@/app/components/overall-level-panel";
import { ProfileGoalColumn } from "@/app/profile/profile-goal-column";
import { ProfileRecordsList } from "@/app/profile/profile-records-list";
import { formatGoalBodyweightTarget } from "@/app/goals/goal-bodyweight-label";
import { definitionFromRow, storedFromRow } from "@/app/goals/goal-row";
import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { loadGoalsList, peekGoalsList, type GoalMilestoneRow } from "@/lib/goals-list-cache";
import { loadCachedInsightsHistory, loadUserStrengthProfile } from "@/lib/insights-data";
import { profileOverallLevel, type ProfileOverallLevel } from "@/lib/profile-overall-level";
import { formatMilestoneTarget, type GoalProgress } from "@/lib/milestone-progress";
import { profileGoalHighlights, type ProfileGoalCandidate } from "@/lib/profile-goal-highlights";
import { buildProfileRecords, profileExerciseHref, type ProfileRecordRow } from "@/lib/profile-summary";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

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
  const [level, setLevel] = useState<ProfileOverallLevel | null>(null);
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
        const hiddenExerciseIds = new Set(goalsResult.snapshot?.hiddenExerciseIds ?? []);
        setRecords(
          buildProfileRecords(
            historyResult.history.exerciseSets,
            strengthResult?.bodyweightEntries ?? [],
          ),
        );
        setLevel(
          profileOverallLevel({
            samples: historyResult.history.exerciseSets,
            hiddenExerciseIds,
            profile: strengthResult,
            today: getTodayYyyyMmDd(),
          }),
        );
        setRecordsError(null);
      } else {
        setLevel(null);
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

  const goalCandidates = useMemo(() => {
    const today = getTodayYyyyMmDd();
    const goals: ProfileGoalCandidate[] = [];
    for (const row of goalRows) {
      const progress = progressById.get(row.id);
      const exercise = exerciseById.get(row.exercise_id);
      if (!progress || !exercise) {
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
        achievedAt: progress.kind === "achieved" ? progress.achievedAt : null,
        percent: progress.kind === "missing_bodyweight" ? null : progress.percent,
        pastDue: progress.pastDue,
        achieved: progress.kind === "achieved",
      });
    }
    return goals;
  }, [bodyweightEntries, exerciseById, goalRows, progressById]);

  const goalHighlights = useMemo(() => profileGoalHighlights(goalCandidates), [goalCandidates]);

  return (
    <PageShell>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">Your overall level, personal records, and latest reached goals.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {isChecking ? (
          <ContentPlaceholder label="Loading overall level..." rows={2} rowClassName="h-16" />
        ) : recordsError || !level ? (
          <div />
        ) : (
          <OverallLevelPanel
            overall={level.overall}
            hint={level.hint}
            facts={{
              sex: level.sex,
              ageYears: level.ageYears,
              ageIsApproximate: level.ageIsApproximate,
              bodyweightKg: level.bodyweightKg,
            }}
          />
        )}
        <ProfileGoalColumn highlights={goalHighlights} error={goalsError} checking={isChecking} />
      </div>

      <section className="panel flex min-w-0 flex-col gap-3 p-5">
        <SectionHeading>Personal records</SectionHeading>
        <p className="text-sm text-zinc-800">
          Estimated 1RM uses working sets of 12 reps or fewer. The date is when that mark was first hit.
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
    </PageShell>
  );
}
