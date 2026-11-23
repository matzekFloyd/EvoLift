export type OverallLevelFacts = {
  sex: "female" | "male" | null;
  ageYears: number | null;
  ageIsApproximate: boolean;
  bodyweightKg: number | null;
};

export type OverallLevelFact = {
  label: "Sex" | "Age" | "Bodyweight";
  value: string;
};

/** The three body metrics shown beside the overall-level figure. */
export function overallLevelFacts(facts: OverallLevelFacts): OverallLevelFact[] {
  const sex = facts.sex === "female" ? "Female" : facts.sex === "male" ? "Male" : "Not set";
  const age =
    facts.ageYears == null ? "Not set" : facts.ageIsApproximate ? `About ${facts.ageYears}` : String(facts.ageYears);
  const bodyweight = facts.bodyweightKg == null ? "Not set" : `${facts.bodyweightKg.toFixed(1)} kg`;
  return [
    { label: "Sex", value: sex },
    { label: "Age", value: age },
    { label: "Bodyweight", value: bodyweight },
  ];
}
