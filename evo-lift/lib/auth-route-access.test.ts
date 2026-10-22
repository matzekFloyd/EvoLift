import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  isPublicAppPath,
  PUBLIC_PAGE_PATHS,
  requiresAppSession,
  sessionGateDecision,
  sessionGateRedirectPath,
} from "./auth-route-access";

describe("auth-route-access", () => {
  it("treats the marketing page, login, and legal pages as public", () => {
    assert.deepEqual([...PUBLIC_PAGE_PATHS], ["/", "/login", "/privacy", "/terms", "/glossary"]);
    for (const path of PUBLIC_PAGE_PATHS) {
      assert.equal(isPublicAppPath(path), true);
      assert.equal(requiresAppSession(path), false);
    }
  });

  it("leaves API routes to their own auth", () => {
    assert.equal(isPublicAppPath("/api/openapi"), true);
    assert.equal(isPublicAppPath("/api/sessions"), true);
    assert.equal(isPublicAppPath("/api/perf"), true);
    assert.equal(isPublicAppPath("/api/security/events"), true);
    assert.equal(requiresAppSession("/api/sessions"), false);
    assert.equal(sessionGateDecision({ pathname: "/api/sessions", hasUser: false }), "allow");
  });

  it("requires a session only under /app", () => {
    for (const path of ["/app", "/app/account", "/app/sessions/new", "/app/insights", "/app/docs", "/app/plans"]) {
      assert.equal(requiresAppSession(path), true);
      assert.equal(isPublicAppPath(path), false);
    }
    for (const path of ["/", "/account", "/privacy", "/glossary", "/apple", "/application"]) {
      assert.equal(requiresAppSession(path), false);
    }
  });

  it("keeps signed-out visitors on / and sends signed-in visitors to /app", () => {
    assert.equal(sessionGateDecision({ pathname: "/app/account", hasUser: false }), "redirect_login");
    assert.equal(sessionGateDecision({ pathname: "/app", hasUser: true }), "allow");
    assert.equal(sessionGateDecision({ pathname: "/", hasUser: false }), "allow");
    assert.equal(sessionGateDecision({ pathname: "/", hasUser: true }), "redirect_home");
    assert.equal(sessionGateDecision({ pathname: "/login", hasUser: false }), "allow");
    assert.equal(sessionGateDecision({ pathname: "/login", hasUser: true }), "redirect_home");
    assert.equal(sessionGateDecision({ pathname: "/privacy", hasUser: false }), "allow");
    assert.equal(sessionGateDecision({ pathname: "/glossary", hasUser: true }), "allow");
    assert.equal(sessionGateRedirectPath("redirect_login"), "/login");
    assert.equal(sessionGateRedirectPath("redirect_home"), "/app");
    assert.equal(sessionGateRedirectPath("redirect_mfa"), "/login?mfa=1");
    assert.equal(sessionGateRedirectPath("allow"), null);
  });

  it("sends an authenticator challenge back to login and does not require enrollment", () => {
    assert.equal(
      sessionGateDecision({
        pathname: "/app",
        hasUser: true,
        needsAuthenticatorChallenge: true,
      }),
      "redirect_mfa",
    );
    assert.equal(
      sessionGateDecision({
        pathname: "/app/account",
        hasUser: true,
        needsAuthenticatorChallenge: true,
      }),
      "redirect_mfa",
    );
    assert.equal(
      sessionGateDecision({
        pathname: "/",
        hasUser: true,
        needsAuthenticatorChallenge: true,
      }),
      "redirect_mfa",
    );
    assert.equal(
      sessionGateDecision({
        pathname: "/login",
        hasUser: true,
        needsAuthenticatorChallenge: true,
      }),
      "allow",
    );
    assert.equal(
      sessionGateDecision({
        pathname: "/login",
        hasUser: true,
        search: "?recovery=1",
        needsAuthenticatorChallenge: true,
      }),
      "allow",
    );
    assert.equal(
      sessionGateDecision({
        pathname: "/glossary",
        hasUser: true,
        needsAuthenticatorChallenge: true,
      }),
      "allow",
    );
    assert.equal(
      sessionGateDecision({ pathname: "/app", hasUser: true, needsAuthenticatorChallenge: false }),
      "allow",
    );
  });

  it("keeps signed-in users on the password-recovery login callback", () => {
    assert.equal(
      sessionGateDecision({
        pathname: "/login",
        hasUser: true,
        search: "?recovery=1",
      }),
      "allow",
    );
    assert.equal(
      sessionGateDecision({
        pathname: "/login",
        hasUser: true,
        search: "recovery=1&code=abc",
      }),
      "allow",
    );
    assert.equal(
      sessionGateDecision({
        pathname: "/login",
        hasUser: true,
        search: "?verified=1",
      }),
      "redirect_home",
    );
  });
});
