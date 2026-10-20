import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CI_IMAGE_REGISTRY,
  CI_RESERVED_HOST_PORTS,
  CI_SUPABASE_EXCLUDE,
  hostPortIsReserved,
  prepareCiConfig,
} from "./ci-supabase-start.mjs";

const seedBlock = `[db.seed]
# If enabled, seeds the database after migrations during a db reset.
enabled = true
# Specifies an ordered list of seed files to load during db reset.
sql_paths = ["./seeds/*.sql"]
`;

test("the checked-in config keeps Auth and the API, and turns the rest off for CI", () => {
  const toml = readFileSync("supabase/config.toml", "utf8");
  const next = prepareCiConfig(toml);
  for (const section of ["db.seed", "realtime", "studio", "inbucket", "storage", "edge_runtime", "analytics"]) {
    const escaped = section.replaceAll(".", "\\.");
    assert.match(next, new RegExp(`\\[${escaped}\\](?:\\r?\\n#[^\\n]*)*\\r?\\nenabled = false`));
  }
  assert.match(next, /\[storage\.s3_protocol\]\r?\nenabled = false/);
  assert.match(next, /\[api\]\r?\nenabled = true/);
  assert.match(next, /\[auth\]\r?\nenabled = true/);
  assert.match(next, /\[db\.migrations\][\s\S]*?\r?\nenabled = true/);
  assert.match(toml, /\[realtime\]\r?\nenabled = true/);
});

test("CI seed switch turns off only the db.seed block", () => {
  const toml = `[db.migrations]
enabled = true

${seedBlock}
[api]
enabled = true

[auth]
enabled = true

[realtime]
enabled = true

[studio]
enabled = true

[inbucket]
enabled = true

[storage]
enabled = true

[storage.s3_protocol]
enabled = true

[edge_runtime]
enabled = true

[analytics]
enabled = true
`;
  const next = prepareCiConfig(toml);
  assert.match(next, /\[db\.seed\]\n# If enabled[\s\S]*?\nenabled = false\n/);
  assert.match(next, /\[db\.migrations\]\nenabled = true/);
  assert.match(next, /\[api\]\nenabled = true/);
  assert.match(next, /\[auth\]\nenabled = true/);
  assert.match(next, /\[realtime\]\nenabled = false/);
  assert.match(next, /sql_paths = \["\.\/seeds\/\*\.sql"\]/);
});

test("CI starts Postgres, Auth, and the API only", () => {
  assert.deepEqual(CI_SUPABASE_EXCLUDE, [
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
  ]);
  for (const kept of ["gotrue", "kong", "postgrest"]) {
    assert.equal(CI_SUPABASE_EXCLUDE.includes(kept), false, kept);
  }
  assert.equal(CI_IMAGE_REGISTRY, "ghcr.io");
  assert.equal(hostPortIsReserved(54322), true);
  assert.equal(hostPortIsReserved(54319), false);
  const startScript = readFileSync("scripts/ci-supabase-start.mjs", "utf8");
  assert.match(startScript, /"stop", "--no-backup"/);
});

test("Lighthouse installs Puppeteer Chrome on Node 22", () => {
  const yml = readFileSync(".github/workflows/lighthouse.yml", "utf8");
  assert.match(yml, /node-version: 22/);
  assert.match(yml, /npx puppeteer browsers install chrome/);
});

test("API integration and Lighthouse share the slim start and catalog seeds", () => {
  for (const file of [".github/workflows/test.yml", ".github/workflows/lighthouse.yml"]) {
    const yml = readFileSync(file, "utf8");
    assert.match(yml, /node scripts\/ci-supabase-start\.mjs/);
    assert.match(yml, new RegExp(`ip_local_reserved_ports=${CI_RESERVED_HOST_PORTS}`));
    assert.doesNotMatch(yml, /db reset/);
    assert.match(yml, /supabase\/seeds\/001_exercises\.sql/);
    assert.match(yml, /supabase\/seeds\/002_exercise_translations\.sql/);
    assert.doesNotMatch(yml, /003_user_exercise_defaults/);
  }
});
