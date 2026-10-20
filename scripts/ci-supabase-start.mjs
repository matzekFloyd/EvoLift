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
 * `public.ecr.aws` answers GitHub-hosted runners with `toomanyrequests` and the CLI
 * waits through two retries before using ghcr.io. Point the pull at ghcr.io directly.
 */
export const CI_IMAGE_REGISTRY = "ghcr.io";

/**
 * Host ports Supabase publishes. On GitHub runners these sit inside the ephemeral
 * range, so an image pull can occupy 54322 and the database container then fails
 * to bind it.
 */
export const CI_RESERVED_HOST_PORTS = "54320-54329";

export function hostPortIsReserved(port, spec = CI_RESERVED_HOST_PORTS) {
  const [start, end] = spec.split("-").map((part) => Number(part));
  return Number.isInteger(port) && start <= port && port <= end;
}

/**
 * Sections turned off in the CI working copy only. `--exclude` still downloads the
 * Realtime and Storage images when those services stay enabled, because the CLI uses
 * them to migrate a fresh database. Auth, the API, and migrations stay enabled.
 */
export const CI_DISABLED_SECTIONS = [
  "db.seed",
  "realtime",
  "studio",
  "inbucket",
  "storage",
  "storage.s3_protocol",
  "edge_runtime",
  "analytics",
];

/**
 * A fresh `supabase start` applies `[db.seed] sql_paths`, which includes
 * `003_user_exercise_defaults_barbell_20kg.sql`. CI loads only the catalog
 * seeds in the following step.
 */
export function prepareCiConfig(toml) {
  let next = toml;
  for (const section of CI_DISABLED_SECTIONS) {
    const escaped = section.replaceAll(".", "\\.");
    const pattern = new RegExp(`(\\[${escaped}\\]\\r?\\n(?:#[^\\n]*\\r?\\n)*)enabled = true`);
    if (!pattern.test(next)) {
      throw new Error(`supabase/config.toml [${section}] enabled = true was not found.`);
    }
    next = next.replace(pattern, "$1enabled = false");
  }
  return next;
}

function exitCode(result) {
  return result.status === null ? 1 : result.status;
}

function supabase(args) {
  return spawnSync("supabase", args, {
    stdio: "inherit",
    env: { ...process.env, SUPABASE_INTERNAL_IMAGE_REGISTRY: CI_IMAGE_REGISTRY },
  });
}

function reserveCiHostPorts() {
  if (process.env.GITHUB_ACTIONS !== "true") {
    return;
  }
  const result = spawnSync(
    "sudo",
    ["sysctl", "-w", `net.ipv4.ip_local_reserved_ports=${CI_RESERVED_HOST_PORTS}`],
    { stdio: "inherit" },
  );
  if (exitCode(result) !== 0) {
    process.exit(exitCode(result));
  }
}

function main() {
  const configPath = "supabase/config.toml";
  writeFileSync(configPath, prepareCiConfig(readFileSync(configPath, "utf8")));
  reserveCiHostPorts();
  const startArgs = ["start", ...CI_SUPABASE_EXCLUDE.flatMap((name) => ["--exclude", name])];
  let result = supabase(startArgs);
  if (exitCode(result) !== 0) {
    supabase(["stop", "--no-backup"]);
    result = supabase(startArgs);
  }
  process.exit(exitCode(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
