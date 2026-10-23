export type KpiBadgeTone = "neutral" | "sky" | "success";

/** What the number measures. Color follows this, not whether the number is an average or a max. */
export type KpiMetricRole = "count" | "strength";

/** Counts, including Volume (kg), stay zinc. Loaded weight, Total, and assistance are strength (sky). */
export function kpiBadgeTone(role: KpiMetricRole): KpiBadgeTone {
  if (role === "strength") {
    return "sky";
  }
  return "neutral";
}
