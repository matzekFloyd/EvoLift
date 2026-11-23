import { resolveLifterAge } from "@/lib/body-metrics";
import { buildExerciseProgressReport, type LifterProfile } from "@/lib/exercise-progress-insights";
import { visibleInsightExerciseSets } from "@/lib/hidden-exercise-lists";
import {
  loadCachedInsightsHistory,
  loadUserStrengthProfile,
  type ExerciseWorkingSetSample,
} from "@/lib/insights-data";
import { overallLevelUpMessage } from "@/lib/overall-level-detail";
import { overallLevelSnapshotFromInputs, rememberOverallLevelCache } from "@/lib/overall-level-cache";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Compare the overall level with and without one finished session. */
export function sessionLevelUpMessage(input: {
  samples: readonly ExerciseWorkingSetSample[];
  hiddenExerciseIds: ReadonlySet<string>;
  profile: LifterProfile;
  sessionId: string;
  today: string;
}): string | null {
  const visible = visibleInsightExerciseSets(input.samples, input.hiddenExerciseIds);
  const range = { from: "", to: input.today };
  const after = buildExerciseProgressReport(visible, range, input.profile);
  const before = buildExerciseProgressReport(
    visible.filter((sample) => sample.sessionId !== input.sessionId),
    range,
    input.profile,
  );
  return overallLevelUpMessage(before.overallLevel?.badge ?? null, after.overallLevel?.badge ?? null);
}

export async function loadSessionLevelUpMessage(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  today: string,
): Promise<string | null> {
  const [history, profile, hidden] = await Promise.all([
    loadCachedInsightsHistory(client, userId, { from: "", to: "" }, { fresh: true }),
    loadUserStrengthProfile(client, userId),
    client.from("user_hidden_exercises").select("exercise_id").eq("user_id", userId),
  ]);
  if (hidden.error) {
    return null;
  }
  const hiddenExerciseIds = new Set((hidden.data ?? []).map((row) => row.exercise_id));
  rememberOverallLevelCache(
    userId,
    overallLevelSnapshotFromInputs({
      samples: history.exerciseSets,
      hiddenExerciseIds,
      profile,
      today,
    }),
  );
  const age = resolveLifterAge({
    dateOfBirth: profile.dateOfBirth,
    birthYear: profile.birthYear,
    today: new Date(`${today}T00:00:00`),
  });
  const lifter: LifterProfile = {
    sex: profile.sex,
    bodyweightKg: profile.bodyweightKg,
    bodyweightEntries: profile.bodyweightEntries,
    ageYears: age?.ageYears ?? null,
    ageIsApproximate: age?.ageIsApproximate ?? false,
  };
  return sessionLevelUpMessage({
    samples: history.exerciseSets,
    hiddenExerciseIds,
    profile: lifter,
    sessionId,
    today,
  });
}
