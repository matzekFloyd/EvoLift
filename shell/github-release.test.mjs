import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { releaseTagFromAppVersionJson, releaseTagName } from "./github-release.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("release tags match the footer vMAJOR.MINOR.PATCH label", () => {
  assert.equal(releaseTagName("1.0.0"), "v1.0.0");
  assert.equal(releaseTagName("1.1.0"), "v1.1.0");
  assert.equal(releaseTagName("2.0.3"), "v2.0.3");
});

test("release tags reject two-part labels and a leading v in the JSON value", () => {
  assert.throws(() => releaseTagName("7.0"), /MAJOR\.MINOR\.PATCH/);
  assert.throws(() => releaseTagName("v1.0.0"), /MAJOR\.MINOR\.PATCH/);
  assert.throws(() => releaseTagName("1.0.1000"), /0–999/);
});

test("app-version.json drives the GitHub release tag", () => {
  const appVersion = JSON.parse(readFileSync(path.join(repoRoot, "evo-lift", "app-version.json"), "utf8"));
  assert.equal(releaseTagFromAppVersionJson(appVersion), releaseTagName(appVersion.version));
  assert.equal(releaseTagFromAppVersionJson({ version: "1.2.3" }), "v1.2.3");
  assert.throws(() => releaseTagFromAppVersionJson(null), /app-version\.json must be an object/);
  assert.throws(() => releaseTagFromAppVersionJson({}), /MAJOR\.MINOR\.PATCH/);
});
