export function toExerciseBadge(slug: string): string {
  if (slug === "deadlift" || slug === "sumo-deadlift" || slug === "trap-bar-deadlift") return "DL";
  if (slug === "barbell-romanian-deadlift" || slug === "dumbbell-romanian-deadlift") return "RDL";
  if (slug === "back-squat" || slug === "front-squat" || slug === "goblet-squat" || slug === "hack-squat") {
    return "SQ";
  }
  if (
    slug === "barbell-bench-press" ||
    slug === "barbell-incline-press" ||
    slug === "close-grip-bench-press" ||
    slug === "dumbbell-bench-press"
  ) {
    return "BP";
  }
  if (
    slug === "overhead-press" ||
    slug === "dumbbell-overhead-press" ||
    slug === "dumbbell-seated-shoulder-press" ||
    slug === "arnold-press"
  ) {
    return "OHP";
  }
  if (slug.includes("pull-up") || slug === "chin-up") return "PU";
  if (slug.includes("row")) return "ROW";
  if (slug.includes("pulldown")) return "PD";
  if (slug.includes("curl")) return "CURL";
  if (slug.includes("tricep")) return "TRI";
  if (slug.includes("lunge") || slug.includes("split-squat")) return "LNG";
  if (slug.includes("hip-thrust") || slug === "glute-bridge") return "HT";
  if (slug.includes("plank") || slug === "pallof-press") return "PLK";
  if (slug.includes("crunch")) return "CR";
  if (slug === "push-up") return "PSH";

  const compact = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return compact.slice(0, 4) || "EX";
}
