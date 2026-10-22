import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  authenticatorAssuranceLevelFromJwt,
  authenticatorCodeError,
  authenticatorQrSrc,
  hasVerifiedAuthenticator,
  LOST_AUTHENTICATOR_MESSAGE,
  needsAuthenticatorChallenge,
  normalizeAuthenticatorCode,
  unverifiedTotpFactorIds,
  verifiedTotpFactorId,
} from "./mfa-assurance";

function jwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.sig`;
}

describe("mfa-assurance", () => {
  it("challenges only a verified authenticator below AAL2", () => {
    const verified = [{ id: "factor-1", factor_type: "totp", status: "verified" }];
    assert.equal(hasVerifiedAuthenticator(verified), true);
    assert.equal(verifiedTotpFactorId(verified), "factor-1");
    assert.equal(
      needsAuthenticatorChallenge({ currentLevel: "aal1", factors: verified }),
      true,
    );
    assert.equal(
      needsAuthenticatorChallenge({ currentLevel: "aal2", factors: verified }),
      false,
    );
    assert.equal(
      needsAuthenticatorChallenge({
        currentLevel: "aal1",
        factors: [{ id: "factor-2", factor_type: "totp", status: "unverified" }],
      }),
      false,
    );
    assert.equal(
      needsAuthenticatorChallenge({ currentLevel: "aal1", factors: [] }),
      false,
    );
    assert.equal(
      needsAuthenticatorChallenge({
        currentLevel: "aal1",
        factors: [{ id: "phone-1", factor_type: "phone", status: "verified" }],
      }),
      false,
    );
  });

  it("lists abandoned authenticator enrollments and ignores verified ones", () => {
    assert.deepEqual(
      unverifiedTotpFactorIds([
        { id: "keep", factor_type: "totp", status: "verified" },
        { id: "drop", factor_type: "totp", status: "unverified" },
        { id: "phone", factor_type: "phone", status: "unverified" },
      ]),
      ["drop"],
    );
  });

  it("accepts a 6-digit authenticator code and rejects anything else", () => {
    assert.equal(normalizeAuthenticatorCode("123 456"), "123456");
    assert.equal(authenticatorCodeError("123456"), null);
    assert.equal(authenticatorCodeError("123 456"), null);
    assert.equal(
      authenticatorCodeError("12345"),
      "Enter the 6-digit code from your authenticator app.",
    );
    assert.equal(
      authenticatorCodeError("abcdef"),
      "Enter the 6-digit code from your authenticator app.",
    );
  });

  it("turns authenticator QR markup into an image source", () => {
    assert.equal(
      authenticatorQrSrc("<svg xmlns='http://www.w3.org/2000/svg'/>"),
      "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg'/>",
    );
    assert.equal(
      authenticatorQrSrc("data:image/svg+xml;utf-8,already"),
      "data:image/svg+xml;utf-8,already",
    );
  });

  it("reads the aal claim from a verified JWT payload", () => {
    assert.equal(authenticatorAssuranceLevelFromJwt(jwt({ aal: "aal1" })), "aal1");
    assert.equal(authenticatorAssuranceLevelFromJwt(jwt({ aal: "aal2" })), "aal2");
    assert.equal(authenticatorAssuranceLevelFromJwt(jwt({ sub: "user" })), null);
    assert.equal(authenticatorAssuranceLevelFromJwt("not-a-jwt"), null);
  });

  it("tells a locked-out lifter that password reset does not remove the authenticator", () => {
    assert.match(LOST_AUTHENTICATOR_MESSAGE, /does not turn it off/);
    assert.doesNotMatch(LOST_AUTHENTICATOR_MESSAGE, /backup code/i);
  });
});
