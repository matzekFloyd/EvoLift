import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createPageLoadPerfTracker } from "./page-load-perf";

describe("createPageLoadPerfTracker", () => {
  it("records each query, including one that fails, and the cache notes", async () => {
    const tracker = createPageLoadPerfTracker("home");
    assert.equal(await tracker.trackQuery("sessions", async () => "rows"), "rows");
    await assert.rejects(
      () => tracker.trackQuery("sets", async () => Promise.reject(new Error("fail"))),
      /fail/,
    );
    tracker.noteCache("home-sessions", "miss");
    const payload = tracker.flush();
    assert.equal(payload.page, "home");
    assert.equal(payload.queryCount, 2);
    assert.deepEqual(
      payload.queries.map((query) => query.name),
      ["sessions", "sets"],
    );
    assert.ok(payload.queries.every((query) => query.durationMs >= 0));
    assert.deepEqual(payload.cache, [{ name: "home-sessions", status: "miss" }]);
    assert.ok(payload.loadDurationMs >= 0);
  });
});
