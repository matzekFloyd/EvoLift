import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { describe, it } from "vitest";
import { SESSION_TOKEN_HEADER } from "@/lib/session-token-header";
import { credentialFromRequest, hasSessionCookie, sameOriginBrowserRequest } from "./api-request-credential";

function request(headers: HeadersInit): NextRequest {
  return new NextRequest("https://evolift.at/api/reports", { headers });
}

describe("report request credentials", () => {
  it("reads the bearer token, then the session header", () => {
    assert.equal(credentialFromRequest(request({ authorization: "Bearer session-token" })), "session-token");
    assert.equal(credentialFromRequest(request({ [SESSION_TOKEN_HEADER]: "header-token" })), "header-token");
    assert.equal(credentialFromRequest(request({})), undefined);
  });

  it("uses the login cookie only for a same-origin browser request", () => {
    const sameOrigin = request({ "sec-fetch-site": "same-origin", cookie: "sb-abc-auth-token=value" });
    const crossSite = request({ "sec-fetch-site": "cross-site", cookie: "sb-abc-auth-token=value" });
    assert.equal(sameOriginBrowserRequest(sameOrigin), true);
    assert.equal(sameOriginBrowserRequest(crossSite), false);
    assert.equal(hasSessionCookie(sameOrigin), true);
    assert.equal(hasSessionCookie(request({ cookie: "theme=light" })), false);
  });
});
