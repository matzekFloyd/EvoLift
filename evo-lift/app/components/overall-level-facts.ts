export type OverallLevelFacts = {
  sex: "female" | "male" | null;
  ageYears: number | null;
  ageIsApproximate: boolean;
  bodyweightKg: number | null;
};

export type OverallLevelFact = {
  label: "Sex" | "Age" | "Bodyweight";
  /** Null when the lifter has not set this in Settings. */
  value: string | null;
};

/** The three body metrics shown with the overall-level figure. */
export function overallLevelFacts(facts: OverallLevelFacts): OverallLevelFact[] {
  const sex = facts.sex === "female" ? "Female" : facts.sex === "male" ? "Male" : null;
  const age =
    facts.ageYears == null ? null : facts.ageIsApproximate ? `About ${facts.ageYears}` : String(facts.ageYears);
  const bodyweight = facts.bodyweightKg == null ? null : `${facts.bodyweightKg.toFixed(1)} kg`;
  return [
    { label: "Sex", value: sex },
    { label: "Age", value: age },
    { label: "Bodyweight", value: bodyweight },
  ];
}
