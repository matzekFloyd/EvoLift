import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  friendlyAuthError,
  loginEmailError,
  loginPasswordError,
  normalizeLoginEmail,
} from "./login-form";

describe("login form", () => {
  it("trims and lowercases the email before checking it", () => {
    assert.equal(normalizeLoginEmail("  Ada@Example.com "), "ada@example.com");
    assert.equal(loginEmailError("ada@example.com"), null);
    assert.equal(loginEmailError("not-an-email"), "Please enter a valid email address.");
  });

  it("requires a letter, a number, and eight characters", () => {
    assert.equal(
      loginPasswordError({ password: "short1", confirmPassword: "", mode: "login" }),
      "Password must be at least 8 characters.",
    );
    assert.equal(
      loginPasswordError({ password: "longpassword", confirmPassword: "", mode: "login" }),
      "Password must include at least one letter and one number.",
    );
    assert.equal(
      loginPasswordError({ password: "longpass1", confirmPassword: "", mode: "login" }),
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

  it("rewrites known auth failures and keeps other messages", () => {
    assert.equal(
      friendlyAuthError("User already registered"),
      "This email is already registered. Try logging in instead.",
    );
    assert.equal(
      friendlyAuthError("This email has already been registered"),
      "This email is already registered. Try logging in instead.",
    );
    assert.equal(friendlyAuthError("Invalid login credentials"), "Invalid email or password.");
    assert.equal(friendlyAuthError("Email rate limit exceeded"), "Email rate limit exceeded");
  });
});
