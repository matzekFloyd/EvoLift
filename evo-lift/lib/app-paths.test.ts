import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  APP_HOME_PATH,
  appPath,
  isAppNavItemActive,
  legacySignedInRedirects,
} from "./app-paths";

describe("app paths", () => {
  it("builds signed-in URLs under /app", () => {
    assert.equal(APP_HOME_PATH, "/app");
    assert.equal(appPath("/"), "/app");
    assert.equal(appPath("/exercises"), "/app/exercises");
    assert.equal(appPath("/exercises/back-squat"), "/app/exercises/back-squat");
    assert.equal(appPath("/sessions/new?resume=1"), "/app/sessions/new?resume=1");
    assert.equal(appPath(`/sessions/${"abc"}`), "/app/sessions/abc");
    assert.equal(appPath("/plans/id/edit"), "/app/plans/id/edit");
  });

  it("marks Home and Account exactly and other nav items with their children", () => {
    assert.equal(isAppNavItemActive("/app", appPath("/"), "exact"), true);
    assert.equal(isAppNavItemActive("/app/exercises", appPath("/"), "exact"), false);
    assert.equal(isAppNavItemActive("/app/exercises", appPath("/exercises"), "section"), true);
    assert.equal(isAppNavItemActive("/app/exercises/back-squat", appPath("/exercises"), "section"), true);
    assert.equal(isAppNavItemActive("/app/account", appPath("/account"), "exact"), true);
    assert.equal(isAppNavItemActive("/app/account/extra", appPath("/account"), "exact"), false);
    assert.equal(isAppNavItemActive("/glossary", appPath("/"), "exact"), false);
  });

  it("redirects old signed-in paths to /app and bare /api to the docs page", () => {
    const redirects = legacySignedInRedirects();
    const bySource = new Map(redirects.map((redirect) => [redirect.source, redirect.destination]));

    assert.equal(bySource.get("/exercises"), "/app/exercises");
    assert.equal(bySource.get("/exercises/:slug"), "/app/exercises/:slug");
    assert.equal(bySource.get("/sessions/new"), "/app/sessions/new");
    assert.equal(bySource.get("/sessions/:id"), "/app/sessions/:id");
    assert.equal(bySource.get("/insights"), "/app/insights");
    assert.equal(bySource.get("/goals"), "/app/goals");
    assert.equal(bySource.get("/plans"), "/app/plans");
    assert.equal(bySource.get("/plans/new"), "/app/plans/new");
    assert.equal(bySource.get("/plans/:id/edit"), "/app/plans/:id/edit");
    assert.equal(bySource.get("/templates"), "/app/templates");
    assert.equal(bySource.get("/templates/new"), "/app/templates/new");
    assert.equal(bySource.get("/templates/:id/edit"), "/app/templates/:id/edit");
    assert.equal(bySource.get("/account"), "/app/account");
    assert.equal(bySource.get("/docs"), "/app/docs");
    assert.equal(bySource.get("/api"), "/app/docs");

    assert.equal(bySource.has("/"), false);
    assert.equal(bySource.has("/login"), false);
    assert.equal(bySource.has("/privacy"), false);
    assert.equal(bySource.has("/terms"), false);
    assert.equal(bySource.has("/legal"), false);
    assert.equal(bySource.has("/glossary"), false);
    assert.equal(bySource.has("/api/:path*"), false);

    const sources = redirects.map((redirect) => redirect.source);
    assert.ok(sources.indexOf("/sessions/new") < sources.indexOf("/sessions/:id"));
    assert.ok(sources.indexOf("/plans/new") < sources.indexOf("/plans/:id/edit"));
    assert.ok(sources.indexOf("/templates/new") < sources.indexOf("/templates/:id/edit"));
    assert.ok(redirects.every((redirect) => redirect.permanent === false));
  });
});
