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
  releaseKeystoreProblem,
} from "./bundle-release.mjs";

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
