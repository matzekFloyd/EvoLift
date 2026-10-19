import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PUBLIC_APP_ORIGIN } from "./public-app-origin";

describe("public app origin", () => {
  it("is an https origin with no trailing slash", () => {
    const url = new URL(PUBLIC_APP_ORIGIN);
    assert.equal(url.protocol, "https:");
    assert.equal(url.pathname, "/");
    assert.equal(PUBLIC_APP_ORIGIN.endsWith("/"), false);
    assert.equal(PUBLIC_APP_ORIGIN, `${url.protocol}//${url.host}`);
  });
});
