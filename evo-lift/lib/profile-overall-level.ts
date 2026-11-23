import { resolveLifterAge } from "@/lib/body-metrics";
import {
  buildExerciseProgressReport,
  type OverallLifterLevel,
} from "@/lib/exercise-progress-insights";
import { visibleInsightExerciseSets } from "@/lib/hidden-exercise-lists";
import type { ExerciseWorkingSetSample, UserStrengthProfile } from "@/lib/insights-data";

export type ProfileOverallLevel = {
  overall: OverallLifterLevel | null;
  hint: string | null;
  sex: "female" | "male" | null;
  ageYears: number | null;
  ageIsApproximate: boolean;
  bodyweightKg: number | null;
};

/** Overall level for Profile: every session through today, with hidden exercises left out. */
export function profileOverallLevel(input: {
  samples: readonly ExerciseWorkingSetSample[];
  hiddenExerciseIds: ReadonlySet<string>;
  profile: UserStrengthProfile | null;
  today: string;
}): ProfileOverallLevel {
  const age = input.profile
    ? resolveLifterAge({
        dateOfBirth: input.profile.dateOfBirth,
        birthYear: input.profile.birthYear,
        today: new Date(`${input.today}T00:00:00`),
      })
    : null;
  const report = buildExerciseProgressReport(
    visibleInsightExerciseSets(input.samples, input.hiddenExerciseIds),
    { from: "", to: input.today },
    {
      sex: input.profile?.sex ?? null,
      bodyweightKg: input.profile?.bodyweightKg ?? null,
      bodyweightEntries: input.profile?.bodyweightEntries ?? [],
      ageYears: age?.ageYears ?? null,
      ageIsApproximate: age?.ageIsApproximate ?? false,
    },
  );
  return {
    overall: report.overallLevel,
    hint: report.comparisonHint,
    sex: input.profile?.sex ?? null,
    ageYears: age?.ageYears ?? null,
    ageIsApproximate: age?.ageIsApproximate ?? false,
    bodyweightKg: input.profile?.bodyweightKg ?? null,
  };
}
