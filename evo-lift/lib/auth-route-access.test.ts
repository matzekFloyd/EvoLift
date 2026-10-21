import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  isPublicAppPath,
  requiresAppSession,
  sessionGateDecision,
} from "./auth-route-access";

describe("auth-route-access", () => {
  it("treats login and legal pages as public", () => {
    assert.equal(isPublicAppPath("/login"), true);
    assert.equal(isPublicAppPath("/privacy"), true);
    assert.equal(isPublicAppPath("/terms"), true);
    assert.equal(isPublicAppPath("/glossary"), true);
  });

  it("leaves API routes to their own auth", () => {
    assert.equal(isPublicAppPath("/api/openapi"), true);
    assert.equal(isPublicAppPath("/api/sessions"), true);
    assert.equal(isPublicAppPath("/api/perf"), true);
    assert.equal(isPublicAppPath("/api/security/events"), true);
  });

  it("requires a session for app shells", () => {
    for (const path of ["/", "/account", "/sessions/new", "/insights", "/docs", "/plans"]) {
      assert.equal(requiresAppSession(path), true);
      assert.equal(isPublicAppPath(path), false);
    }
  });

  it("redirects anonymous users away from private shells", () => {
    assert.equal(
      sessionGateDecision({ pathname: "/account", hasUser: false }),
      "redirect_login",
    );
    assert.equal(sessionGateDecision({ pathname: "/api/sessions", hasUser: false }), "allow");
    assert.equal(sessionGateDecision({ pathname: "/login", hasUser: false }), "allow");
    assert.equal(sessionGateDecision({ pathname: "/login", hasUser: true }), "redirect_home");
    assert.equal(sessionGateDecision({ pathname: "/", hasUser: true }), "allow");
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
