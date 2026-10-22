import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { loginNeedsAuthenticatorChallenge } from "./login-mfa";

function jwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.sig`;
}

describe("loginNeedsAuthenticatorChallenge", () => {
  it("asks for a code only when a verified authenticator exists and the session is not AAL2", () => {
    const token = jwt({ aal: "aal1" });
    assert.equal(
      loginNeedsAuthenticatorChallenge({
        accessToken: token,
        factors: [{ id: "factor-1", factor_type: "totp", status: "verified" }],
      }),
      true,
    );
    assert.equal(
      loginNeedsAuthenticatorChallenge({
        accessToken: jwt({ aal: "aal2" }),
        factors: [{ id: "factor-1", factor_type: "totp", status: "verified" }],
      }),
      false,
    );
    assert.equal(
      loginNeedsAuthenticatorChallenge({
        accessToken: token,
        factors: [],
      }),
      false,
    );
    assert.equal(
      loginNeedsAuthenticatorChallenge({
        accessToken: null,
        factors: [{ id: "factor-1", factor_type: "totp", status: "verified" }],
      }),
      false,
    );
  });
});
