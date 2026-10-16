import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { APP_VERSION, APP_VERSION_LABEL, playVersionCode } from "./app-version";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const formula = "major * 1000000 + minor * 1000 + patch";

describe("app version", () => {
  it("shows the product version in the footer label", () => {
    assert.match(APP_VERSION, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
    assert.equal(APP_VERSION_LABEL, `v${APP_VERSION}`);
    assert.equal(playVersionCode(APP_VERSION) >= 1, true);
  });

  it("raises the Play version code as the product version increases", () => {
    assert.deepEqual(
      ["0.0.1", "1.0.0", "1.0.1", "1.0.999", "1.1.0", "1.2.3", "2.0.0"].map(playVersionCode),
      [1, 1000000, 1000001, 1000999, 1001000, 1002003, 2000000],
    );
    assert.equal(playVersionCode("2100.0.0"), 2100000000);
  });

  it("rejects a version Play could not order", () => {
    assert.throws(
      () => playVersionCode("7.0"),
      /App version must be MAJOR\.MINOR\.PATCH, as in 1\.0\.0\. Received "7\.0"\. See VERSIONING\.md\./,
    );
    assert.throws(
      () => playVersionCode("v1.0.0"),
      /App version must be MAJOR\.MINOR\.PATCH, as in 1\.0\.0\. Received "v1\.0\.0"\. See VERSIONING\.md\./,
    );
    assert.throws(
      () => playVersionCode("1.0.1000"),
      /Minor and patch must be 0–999 so the Play version code stays ordered\. Received "1\.0\.1000"\. See VERSIONING\.md\./,
    );
    assert.throws(
      () => playVersionCode("0.0.0"),
      /Play version code must be from 1 through 2100000000\. 0\.0\.0 is 0\. See VERSIONING\.md\./,
    );
    assert.throws(
      () => playVersionCode("2100.0.1"),
      /Play version code must be from 1 through 2100000000\. 2100\.0\.1 is 2100000001\. See VERSIONING\.md\./,
    );
  });

  it("uses the same Play version code formula as the Android release build", () => {
    const gradle = readFileSync(path.join(repoRoot, "android", "app", "build.gradle"), "utf8");
    const source = readFileSync(path.join(repoRoot, "evo-lift", "lib", "app-version.ts"), "utf8");

    assert.ok(gradle.includes(formula));
    assert.ok(source.includes(formula));
    assert.ok(gradle.includes("minor > 999 || patch > 999"));
    assert.ok(source.includes("minor > 999 || patch > 999"));
    assert.ok(gradle.includes("> 2100000000"));
    assert.ok(source.includes("> 2100000000"));
  });
});
