import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CI_SUPABASE_EXCLUDE, disableCiSeed } from "./ci-supabase-start.mjs";

const seedBlock = `[db.seed]
# If enabled, seeds the database after migrations during a db reset.
enabled = true
# Specifies an ordered list of seed files to load during db reset.
sql_paths = ["./seeds/*.sql"]
`;

test("the checked-in config can turn CI seeding off", () => {
  const toml = readFileSync("supabase/config.toml", "utf8");
  const next = disableCiSeed(toml);
  assert.match(next, /\[db\.seed\][\s\S]*?\r?\nenabled = false\r?\n/);
  assert.match(next, /\[auth\]\r?\nenabled = true/);
  assert.equal(toml.includes("enabled = true"), true);
});

test("CI seed switch turns off only the db.seed block", () => {
  const toml = `[analytics]
enabled = true

${seedBlock}
[realtime]
enabled = true
`;
  const next = disableCiSeed(toml);
  assert.match(next, /\[db\.seed\]\r?\n# If enabled[\s\S]*?\nenabled = false\n/);
  assert.match(next, /\[analytics\]\nenabled = true/);
  assert.match(next, /\[realtime\]\nenabled = true/);
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
});

test("API integration and Lighthouse share the slim start and catalog seeds", () => {
  for (const file of [".github/workflows/test.yml", ".github/workflows/lighthouse.yml"]) {
    const yml = readFileSync(file, "utf8");
    assert.match(yml, /node scripts\/ci-supabase-start\.mjs/);
    assert.doesNotMatch(yml, /db reset/);
    assert.match(yml, /supabase\/seeds\/001_exercises\.sql/);
    assert.match(yml, /supabase\/seeds\/002_exercise_translations\.sql/);
    assert.doesNotMatch(yml, /003_user_exercise_defaults/);
  }
});
