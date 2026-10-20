import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  shouldEnableHsts,
  shouldIncludeLocalSupabase,
} from "./security-headers";

describe("buildContentSecurityPolicy", () => {
  it("allows self and hosted Supabase, and blocks framing", () => {
    const csp = buildContentSecurityPolicy();
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /https:\/\/\*\.supabase\.co/);
    assert.match(csp, /wss:\/\/\*\.supabase\.co/);
    assert.equal(csp.includes("127.0.0.1"), false);
    assert.match(csp, /object-src 'none'/);
  });

  it("can allow local Supabase for development", () => {
    const csp = buildContentSecurityPolicy({ includeLocalSupabase: true });
    assert.match(csp, /http:\/\/127\.0\.0\.1:54321/);
    assert.match(csp, /ws:\/\/localhost:54321/);
  });
});

describe("buildSecurityHeaders", () => {
  it("sets the baseline headers and optional HSTS", () => {
    const withoutHsts = buildSecurityHeaders({ enableHsts: false });
    const keys = withoutHsts.map((header) => header.key);
    assert.deepEqual(
      keys.sort(),
      [
        "Content-Security-Policy",
        "Permissions-Policy",
        "Referrer-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ].sort(),
    );
    assert.equal(
      withoutHsts.some((header) => header.key === "Strict-Transport-Security"),
      false,
    );

    const withHsts = buildSecurityHeaders({ enableHsts: true });
    const hsts = withHsts.find((header) => header.key === "Strict-Transport-Security");
    assert.ok(hsts?.value.includes("max-age="));
  });
});

describe("shouldEnableHsts", () => {
  it("enables HSTS only for Vercel production (or NODE_ENV production off Vercel)", () => {
    assert.equal(shouldEnableHsts({ VERCEL_ENV: "production" }), true);
    assert.equal(shouldEnableHsts({ VERCEL_ENV: "preview" }), false);
    assert.equal(shouldEnableHsts({ VERCEL_ENV: "development" }), false);
    assert.equal(shouldEnableHsts({ NODE_ENV: "production" }), true);
    assert.equal(shouldEnableHsts({ NODE_ENV: "development" }), false);
  });
});

describe("shouldIncludeLocalSupabase", () => {
  it("skips local allowlists on Vercel production only", () => {
    assert.equal(shouldIncludeLocalSupabase({ VERCEL_ENV: "production" }), false);
    assert.equal(shouldIncludeLocalSupabase({ VERCEL_ENV: "preview" }), true);
    assert.equal(shouldIncludeLocalSupabase({ NODE_ENV: "development" }), true);
  });
});
