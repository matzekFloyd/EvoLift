import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { CURRENT_PASSWORD_CHECK_AUTH } from "./verify-current-password";

describe("verifyCurrentPassword", () => {
  it("checks the password on a client that does not store a session", () => {
    assert.equal(CURRENT_PASSWORD_CHECK_AUTH.persistSession, false);
    assert.equal(CURRENT_PASSWORD_CHECK_AUTH.autoRefreshToken, false);
    assert.equal(CURRENT_PASSWORD_CHECK_AUTH.detectSessionInUrl, false);
  });

  it("keeps the account password form off the browser session client", () => {
    const hookPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../app/account/use-account-password.ts",
    );
    const source = readFileSync(hookPath, "utf8");
    assert.match(source, /verifyCurrentPassword/);
    assert.doesNotMatch(source, /signInWithPassword/);
  });
});
