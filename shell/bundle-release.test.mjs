import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MISSING_KEYSTORE_PROPERTIES,
  missingKeystoreField,
  missingUploadKeystore,
  releaseBundleServerProblem,
  releaseKeystoreProblem,
} from "./bundle-release.mjs";
import { PRODUCTION_SHELL_URL, PRODUCTION_SITE_URL } from "./server-config.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("a release build explains how to add the upload key", () => {
  const androidDir = mkdtempSync(path.join(tmpdir(), "evolift-keystore-"));

  assert.equal(releaseKeystoreProblem(androidDir, null), MISSING_KEYSTORE_PROPERTIES);
  assert.match(
    releaseKeystoreProblem(androidDir, "storeFile=\nstorePassword=\nkeyAlias=\nkeyPassword=\n"),
    /android\/keystore\.properties is missing storeFile\./,
  );
  assert.equal(
    releaseKeystoreProblem(
      androidDir,
      ["# local only", "storeFile=upload-keystore.jks", "storePassword=secret", "keyAlias=upload"].join("\n"),
    ),
    missingKeystoreField("keyPassword"),
  );
  assert.equal(
    releaseKeystoreProblem(
      androidDir,
      [
        "storeFile=upload-keystore.jks",
        "storePassword=secret",
        "keyAlias=upload",
        "keyPassword=secret",
      ].join("\n"),
      () => false,
    ),
    missingUploadKeystore("upload-keystore.jks"),
  );
  assert.equal(
    releaseKeystoreProblem(
      androidDir,
      [
        "storeFile=upload-keystore.jks",
        "storePassword=secret",
        "keyAlias=upload",
        "keyPassword=secret",
      ].join("\n"),
      () => true,
    ),
    null,
  );
});

test("a release bundle opens /app on the production origin", () => {
  assert.equal(PRODUCTION_SITE_URL, "https://evolift.at");
  assert.equal(PRODUCTION_SHELL_URL, "https://evolift.at/app");
  assert.equal(releaseBundleServerProblem({ url: PRODUCTION_SHELL_URL }), null);
  assert.match(
    releaseBundleServerProblem({ url: PRODUCTION_SITE_URL }),
    /The release bundle must load https:\/\/evolift\.at\/app/,
  );
  assert.match(
    releaseBundleServerProblem({ url: "https://evolift.at/app", cleartext: true }),
    /The release bundle must load https:\/\/evolift\.at\/app/,
  );
  assert.match(
    releaseBundleServerProblem({ url: "https://example.com/app" }),
    /Sync wrote https:\/\/example\.com\/app/,
  );
  assert.match(releaseBundleServerProblem(undefined), /Sync wrote no server URL/);
});

test("the Android release build uses the same upload-key errors", () => {
  const gradle = readFileSync(path.join(repoRoot, "android", "app", "build.gradle"), "utf8");

  assert.ok(gradle.includes(MISSING_KEYSTORE_PROPERTIES));
  assert.ok(gradle.includes("android/keystore.properties is missing ${key}. See android/keystore.properties.example."));
  assert.ok(gradle.includes("Upload keystore not found at android/${relative}. See README.md."));
});

test("keystore.properties is gitignored and the example file is not a real key", () => {
  const rootIgnore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  const androidIgnore = readFileSync(path.join(repoRoot, "android", ".gitignore"), "utf8");
  const example = readFileSync(path.join(repoRoot, "android", "keystore.properties.example"), "utf8");

  assert.match(rootIgnore, /^\*\.jks$/m);
  assert.match(rootIgnore, /^\*\.keystore$/m);
  assert.match(rootIgnore, /^android\/keystore\.properties$/m);
  assert.match(androidIgnore, /^keystore\.properties$/m);
  assert.match(example, /^storePassword=$/m);
  assert.match(example, /^keyPassword=$/m);
  assert.doesNotMatch(example, /storePassword=.+/);
  assert.doesNotMatch(example, /keyPassword=.+/);
});
