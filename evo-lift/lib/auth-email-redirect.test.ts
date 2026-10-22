import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  AUTH_EMAIL_RECOVERY_PATH,
  AUTH_EMAIL_VERIFIED_PATH,
  AUTH_OAUTH_CALLBACK_PATH,
  authEmailRedirectUrl,
  authOAuthRedirectUrl,
  isAuthEmailRecoverySearch,
  resolveAppOrigin,
} from "./auth-email-redirect";

describe("auth-email-redirect", () => {
  it("prefers NEXT_PUBLIC_APP_URL over the window origin", () => {
    assert.equal(
      resolveAppOrigin({
        envAppUrl: "https://evolift.at/",
        windowOrigin: "http://localhost:3000",
      }),
      "https://evolift.at",
    );
  });

  it("falls back to the window origin for local development", () => {
    assert.equal(
      resolveAppOrigin({
        envAppUrl: "",
        windowOrigin: "http://localhost:3000",
      }),
      "http://localhost:3000",
    );
  });

  it("adds https when the env value is host-only", () => {
    assert.equal(
      resolveAppOrigin({ envAppUrl: "evolift.at", windowOrigin: null }),
      "https://evolift.at",
    );
  });

  it("builds the verified login redirect URL", () => {
    assert.equal(AUTH_EMAIL_VERIFIED_PATH, "/login?verified=1");
    assert.equal(
      authEmailRedirectUrl({
        envAppUrl: "https://evolift.at",
        windowOrigin: null,
      }),
      "https://evolift.at/login?verified=1",
    );
  });

  it("builds the password-recovery redirect URL", () => {
    assert.equal(AUTH_EMAIL_RECOVERY_PATH, "/login?recovery=1");
    assert.equal(
      authEmailRedirectUrl({
        envAppUrl: "https://evolift.at",
        windowOrigin: null,
        path: AUTH_EMAIL_RECOVERY_PATH,
      }),
      "https://evolift.at/login?recovery=1",
    );
  });

  it("builds the Google and Apple callback on the same origin", () => {
    assert.equal(AUTH_OAUTH_CALLBACK_PATH, "/auth/callback");
    assert.equal(
      authOAuthRedirectUrl({
        envAppUrl: "https://evolift.at",
        windowOrigin: "http://localhost:3000",
      }),
      "https://evolift.at/auth/callback",
    );
    assert.equal(
      authOAuthRedirectUrl({ envAppUrl: "", windowOrigin: "http://localhost:3000" }),
      "http://localhost:3000/auth/callback",
    );
    assert.equal(authOAuthRedirectUrl({ envAppUrl: " ", windowOrigin: "" }), null);
  });

  it("detects the recovery callback query", () => {
    assert.equal(isAuthEmailRecoverySearch("recovery=1"), true);
    assert.equal(isAuthEmailRecoverySearch("?recovery=1&code=abc"), true);
    assert.equal(isAuthEmailRecoverySearch(new URLSearchParams("recovery=1")), true);
    assert.equal(isAuthEmailRecoverySearch("verified=1"), false);
    assert.equal(isAuthEmailRecoverySearch(""), false);
    assert.equal(isAuthEmailRecoverySearch(null), false);
  });

  it("returns null when no origin is available", () => {
    assert.equal(resolveAppOrigin({ envAppUrl: null, windowOrigin: null }), null);
    assert.equal(authEmailRedirectUrl({ envAppUrl: " ", windowOrigin: "" }), null);
  });
});
