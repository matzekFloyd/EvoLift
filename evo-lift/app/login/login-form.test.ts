import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  friendlyAuthError,
  loginEmailError,
  loginPasswordError,
  loginResetPasswordError,
  normalizeLoginEmail,
} from "./login-form";

describe("login form", () => {
  it("trims and lowercases the email before checking it", () => {
    assert.equal(normalizeLoginEmail("  Ada@Example.com "), "ada@example.com");
    assert.equal(loginEmailError("ada@example.com"), null);
    assert.equal(loginEmailError("not-an-email"), "Please enter a valid email address.");
  });

  it("requires a password on login without strength rules", () => {
    assert.equal(
      loginPasswordError({ password: "", confirmPassword: "", mode: "login" }),
      "Please enter your password.",
    );
    assert.equal(
      loginPasswordError({ password: "short", confirmPassword: "", mode: "login" }),
      null,
    );
  });

  it("requires a letter, a number, and eight characters when registering", () => {
    assert.equal(
      loginPasswordError({ password: "short1", confirmPassword: "short1", mode: "register" }),
      "Password must be at least 8 characters.",
    );
    assert.equal(
      loginPasswordError({
        password: "longpassword",
        confirmPassword: "longpassword",
        mode: "register",
      }),
      "Password must include at least one letter and one number.",
    );
    assert.equal(
      loginPasswordError({ password: "longpass1", confirmPassword: "longpass1", mode: "register" }),
      null,
    );
  });

  it("checks that the two passwords match only when registering", () => {
    assert.equal(
      loginPasswordError({
        password: "longpass1",
        confirmPassword: "longpass2",
        mode: "login",
      }),
      null,
    );
    assert.equal(
      loginPasswordError({
        password: "longpass1",
        confirmPassword: "longpass2",
        mode: "register",
      }),
      "Passwords do not match.",
    );
  });

  it("validates the recovery new-password form", () => {
    assert.equal(
      loginResetPasswordError({ password: "short1", confirmPassword: "short1" }),
      "New password must be at least 8 characters.",
    );
    assert.equal(
      loginResetPasswordError({
        password: "longpassword",
        confirmPassword: "longpassword",
      }),
      "New password must include at least one letter and one number.",
    );
    assert.equal(
      loginResetPasswordError({
        password: "longpass1",
        confirmPassword: "longpass2",
      }),
      "New password and confirmation do not match.",
    );
    assert.equal(
      loginResetPasswordError({
        password: "longpass1",
        confirmPassword: "longpass1",
      }),
      null,
    );
  });

  it("rewrites known auth failures and never returns raw provider text", () => {
    assert.equal(
      friendlyAuthError("User already registered"),
      "This email is already registered. Try logging in instead.",
    );
    assert.equal(friendlyAuthError("Invalid login credentials"), "Invalid email or password.");
    assert.equal(
      friendlyAuthError("Email rate limit exceeded"),
      "Too many attempts. Wait a few minutes, then try again.",
    );
    assert.equal(
      friendlyAuthError("Database error querying schema"),
      "Could not sign in. Check your email and password, then try again.",
    );
    assert.equal(
      friendlyAuthError("Database error querying schema", "forgot"),
      "Could not send a reset link. Please try again.",
    );
    assert.equal(
      friendlyAuthError("Database error querying schema", "reset"),
      "Could not update your password. Please try again.",
    );
  });
});
