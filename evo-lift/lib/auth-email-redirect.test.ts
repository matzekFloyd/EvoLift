import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  AUTH_EMAIL_VERIFIED_PATH,
  authEmailRedirectUrl,
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

  it("returns null when no origin is available", () => {
    assert.equal(resolveAppOrigin({ envAppUrl: null, windowOrigin: null }), null);
    assert.equal(authEmailRedirectUrl({ envAppUrl: " ", windowOrigin: "" }), null);
  });
});
