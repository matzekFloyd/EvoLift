import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { friendlyAuthError } from "./friendly-auth-error";

describe("friendlyAuthError", () => {
  it("rewrites known auth failures", () => {
    assert.equal(
      friendlyAuthError("User already registered"),
      "This email is already registered. Try logging in instead.",
    );
    assert.equal(
      friendlyAuthError("This email has already been registered"),
      "This email is already registered. Try logging in instead.",
    );
    assert.equal(friendlyAuthError("Invalid login credentials"), "Invalid email or password.");
    assert.equal(
      friendlyAuthError("Email not confirmed"),
      "Confirm your email first, then try logging in.",
    );
    assert.equal(
      friendlyAuthError("Email rate limit exceeded"),
      "Too many attempts. Wait a few minutes, then try again.",
    );
    assert.equal(
      friendlyAuthError("Password should contain at least one character of each"),
      "Password must be at least 8 characters and include a letter and a number.",
    );
  });

  it("never returns the raw provider message", () => {
    assert.equal(
      friendlyAuthError("Database error querying schema"),
      "Could not sign in. Check your email and password, then try again.",
    );
    assert.equal(
      friendlyAuthError("unexpected gotrue panic", "register"),
      "Could not create the account. Please try again.",
    );
    assert.equal(
      friendlyAuthError("AuthApiError: something internal", "account"),
      "Could not update account settings. Please try again.",
    );
  });
});
