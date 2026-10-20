import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  resetRateLimitStore,
} from "./rate-limit";

afterEach(() => {
  resetRateLimitStore();
});

describe("consumeRateLimit", () => {
  it("allows traffic under the limit and blocks when the window is full", () => {
    const start = 1_000_000;
    assert.equal(consumeRateLimit("k", 2, 60_000, start).ok, true);
    assert.equal(consumeRateLimit("k", 2, 60_000, start + 10).ok, true);
    const blocked = consumeRateLimit("k", 2, 60_000, start + 20);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.ok(blocked.retryAfterSec >= 1);
    }
  });

  it("frees a slot after the window slides past the oldest hit", () => {
    const start = 1_000_000;
    assert.equal(consumeRateLimit("k", 1, 1_000, start).ok, true);
    assert.equal(consumeRateLimit("k", 1, 1_000, start + 100).ok, false);
    assert.equal(consumeRateLimit("k", 1, 1_000, start + 1_001).ok, true);
  });

  it("tracks keys independently", () => {
    assert.equal(consumeRateLimit("a", 1, 60_000, 1).ok, true);
    assert.equal(consumeRateLimit("b", 1, 60_000, 1).ok, true);
    assert.equal(consumeRateLimit("a", 1, 60_000, 2).ok, false);
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers the first x-forwarded-for hop", () => {
    assert.equal(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })),
      "1.2.3.4",
    );
    assert.equal(clientIpFromHeaders(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
    assert.equal(clientIpFromHeaders(new Headers()), "unknown");
  });
});
