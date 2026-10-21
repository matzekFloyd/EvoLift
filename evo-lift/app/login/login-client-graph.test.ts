import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));

describe("login client graph", () => {
  it("leaves the catalog warm-up and footer off the login page", () => {
    const login = readFileSync(join(appDir, "login", "page.tsx"), "utf8");
    const shell = readFileSync(join(appDir, "(shell)", "layout.tsx"), "utf8");

    assert.doesNotMatch(login, /exercise-metadata-cache/);
    assert.doesNotMatch(login, /page-shell/);
    assert.doesNotMatch(login, /app-footer/);
    assert.match(login, /PageFrame/);
    assert.match(shell, /ExerciseMetadataWarmup/);
  });

  it("uses the plate brand lockup and shared primary ActionButton", () => {
    const login = readFileSync(join(appDir, "login", "page.tsx"), "utf8");

    assert.match(login, /EvoLiftBrand/);
    assert.match(login, /ActionButton/);
    assert.match(login, /variant="primary"/);
    assert.doesNotMatch(login, /Dumbbell/);
  });

  it("exposes forgot-password recovery from login mode", () => {
    const login = readFileSync(join(appDir, "login", "page.tsx"), "utf8");

    assert.match(login, /Forgot password\?/);
    assert.match(login, /resetPasswordForEmail/);
    assert.match(login, /AUTH_EMAIL_RECOVERY_PATH/);
    assert.match(login, /PASSWORD_RECOVERY/);
  });
});
