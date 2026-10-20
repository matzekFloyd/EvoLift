import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildSecurityLogRecord,
  classifyApiAuthFailure,
  emailDomainFrom,
  emailFingerprint,
  formatSecurityLogLine,
  sanitizeSecurityEventFields,
  SECURITY_LOG_CHANNEL,
} from "./security-event";

describe("security-event", () => {
  it("builds a JSON log line with channel and timestamp", () => {
    const line = formatSecurityLogLine(
      { type: "login_failed", outcome: "failure", emailDomain: "example.com" },
      new Date("2026-10-20T12:00:00.000Z"),
    );
    const parsed = JSON.parse(line) as Record<string, unknown>;
    assert.equal(parsed.channel, SECURITY_LOG_CHANNEL);
    assert.equal(parsed.ts, "2026-10-20T12:00:00.000Z");
    assert.equal(parsed.type, "login_failed");
    assert.equal(parsed.emailDomain, "example.com");
  });

  it("strips secret-looking keys and bearer/evo tokens from fields", () => {
    const cleaned = sanitizeSecurityEventFields({
      type: "api_auth_failed",
      password: "secret",
      currentPassword: "x",
      token: "evo_abc",
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig",
      reason: "missing_bearer",
      leak: "evo_should_drop",
      jwt: "eyJhbGciOiJIUzI1NiJ9.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    assert.equal(cleaned.password, undefined);
    assert.equal(cleaned.currentPassword, undefined);
    assert.equal(cleaned.token, undefined);
    assert.equal(cleaned.authorization, undefined);
    assert.equal(cleaned.leak, undefined);
    assert.equal(cleaned.jwt, undefined);
    assert.equal(cleaned.reason, "missing_bearer");
    assert.equal(cleaned.type, "api_auth_failed");
  });

  it("classifies API auth failure messages", () => {
    assert.equal(
      classifyApiAuthFailure("Missing bearer token. Use a personal API token…"),
      "missing_bearer",
    );
    assert.equal(
      classifyApiAuthFailure("Invalid or revoked personal API token."),
      "invalid_personal_token",
    );
    assert.equal(
      classifyApiAuthFailure("Invalid or expired session access token."),
      "invalid_session_token",
    );
    assert.equal(
      classifyApiAuthFailure("Invalid bearer token. Use a personal API token (evo_…)…"),
      "invalid_bearer_format",
    );
  });

  it("derives email domain and a stable fingerprint", async () => {
    assert.equal(emailDomainFrom("User@Example.COM"), "example.com");
    assert.equal(emailDomainFrom("nope"), undefined);
    const a = await emailFingerprint("User@Example.COM");
    const b = await emailFingerprint("user@example.com");
    assert.equal(a, b);
    assert.equal(a.length, 16);
    assert.match(a, /^[0-9a-f]{16}$/);
  });

  it("does not put passwords into the built record even if passed", () => {
    const record = buildSecurityLogRecord({
      type: "password_changed",
      userId: "u1",
      ...({ password: "nope" } as Record<string, string>),
    } as Parameters<typeof buildSecurityLogRecord>[0]);
    assert.equal("password" in record, false);
    assert.equal(record.userId, "u1");
  });
});
