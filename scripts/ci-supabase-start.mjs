import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Containers CI does not start. Postgres has no exclude key and always starts.
 * Auth is `gotrue`. The API is `kong` plus `postgrest`.
 * Local `supabase start` does not use this list; `supabase/config.toml` stays the full stack.
 */
export const CI_SUPABASE_EXCLUDE = [
  "realtime",
  "storage-api",
  "imgproxy",
  "mailpit",
  "postgres-meta",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
];

/**
 * A fresh `supabase start` applies `[db.seed] sql_paths`, which includes
 * `003_user_exercise_defaults_barbell_20kg.sql`. CI loads only the catalog
 * seeds in the following step. This turns seeding off in the working copy.
 */
export function disableCiSeed(toml) {
  const pattern = /(\[db\.seed\]\r?\n(?:#[^\n]*\r?\n)*)enabled = true/;
  if (!pattern.test(toml)) {
    throw new Error("supabase/config.toml [db.seed] enabled = true was not found.");
  }
  return toml.replace(pattern, "$1enabled = false");
}

function main() {
  const configPath = "supabase/config.toml";
  writeFileSync(configPath, disableCiSeed(readFileSync(configPath, "utf8")));
  const args = ["start", ...CI_SUPABASE_EXCLUDE.flatMap((name) => ["--exclude", name])];
  const result = spawnSync("supabase", args, { stdio: "inherit" });
  process.exit(result.status === null ? 1 : result.status);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
