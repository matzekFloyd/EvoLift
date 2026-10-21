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

  it("wires keyboard and screen-reader affordances on log in and register", () => {
    const login = readFileSync(join(appDir, "login", "page.tsx"), "utf8");
    const statusNotice = readFileSync(join(appDir, "components", "status-notice.tsx"), "utf8");
    const passwordField = readFileSync(join(appDir, "components", "password-field.tsx"), "utf8");

    assert.match(login, /a11yIdPrefix=\{LOGIN_A11Y_PREFIX\}/);
    assert.match(login, /role:\s*"tabpanel"/);
    assert.match(login, /autoComplete="email"/);
    assert.match(login, /autoComplete=\{mode === "login" \? "current-password" : "new-password"\}/);
    assert.match(login, /PASSWORD_STRENGTH_HINT/);
    assert.match(login, /PASSWORD_CONFIRM_HINT/);
    assert.match(login, /quietLinkClassName/);
    assert.match(login, /PasswordField/);
    assert.doesNotMatch(login, /No account yet\?/);
    assert.doesNotMatch(login, /Already have an account\?/);
    assert.doesNotMatch(login, /\bMail\b/);

    assert.match(statusNotice, /role="status"/);
    assert.match(statusNotice, /aria-live="polite"/);

    assert.match(passwordField, /Show \$\{label\.toLowerCase\(\)\}/);
    assert.match(passwordField, /Hide \$\{label\.toLowerCase\(\)\}/);
    assert.match(passwordField, /autoComplete/);
    assert.match(passwordField, /aria-describedby/);
    assert.doesNotMatch(passwordField, /\bLock\b/);
  });
});
