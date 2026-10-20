import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MCP_API_PATH_ERROR, buildMcpApiUrl, parseMcpApiPath } from "./api-path";

describe("parseMcpApiPath", () => {
  it("accepts a normal /api route", () => {
    assert.deepEqual(parseMcpApiPath("/api/sessions"), { pathname: "/api/sessions" });
    assert.deepEqual(parseMcpApiPath("  /api/exercises?lang=en  "), {
      pathname: "/api/exercises",
    });
  });

  it("rejects paths that are not relative /api routes", () => {
    const rejected = [
      "",
      "api/sessions",
      "/sessions",
      "https://evil.example/api/sessions",
      "//evil.example/api/sessions",
      "/api/../secret",
      "/api/foo/../../secret",
      "/api/foo/../../../etc/passwd",
      "/api\\..\\secret",
      "/api/%2e%2e/secret",
      "/api/%2E%2E/secret",
      "/api/foo%2f%2e%2e%2fsecret",
      "/api//evil",
      "/api/mcp",
      "/api/mcp/",
      "/api/mcp/tools",
      "/api/mcp?x=1",
    ];
    for (const path of rejected) {
      assert.deepEqual(parseMcpApiPath(path), { error: MCP_API_PATH_ERROR }, path);
    }
  });
});

describe("buildMcpApiUrl", () => {
  const origin = "https://evo-lift.vercel.app";

  it("builds a same-origin URL and applies query params", () => {
    const built = buildMcpApiUrl("/api/exercises", origin, { lang: "de" });
    assert.ok(!("error" in built));
    if ("error" in built) {
      return;
    }
    assert.equal(built.url.origin, origin);
    assert.equal(built.url.pathname, "/api/exercises");
    assert.equal(built.url.searchParams.get("lang"), "de");
  });

  it("rejects host escape and recursive mcp paths after URL resolution", () => {
    assert.deepEqual(buildMcpApiUrl("https://evil.example/api/x", origin), {
      error: MCP_API_PATH_ERROR,
    });
    assert.deepEqual(buildMcpApiUrl("/api/mcp", origin), { error: MCP_API_PATH_ERROR });
    assert.deepEqual(buildMcpApiUrl("/api/../openapi", origin), {
      error: MCP_API_PATH_ERROR,
    });
  });

  it("keeps the resolved path on the deployment origin", () => {
    const built = buildMcpApiUrl("/api/sessions", "https://evo-lift.vercel.app/");
    assert.ok(!("error" in built));
    if ("error" in built) {
      return;
    }
    assert.equal(built.url.href, "https://evo-lift.vercel.app/api/sessions");
  });
});
