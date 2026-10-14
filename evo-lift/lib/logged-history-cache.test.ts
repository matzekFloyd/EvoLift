import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { invalidateHomeSessionSummaries, loadHomeSessionSummaries, peekHomeSessionSummaries } from "./home-session-cache";
import { invalidateInsightsHistory, loadCachedInsightsHistory, peekInsightsHistory } from "./insights-data";
import { invalidateLoggedHistoryCaches } from "./logged-history-cache";

function emptyClient() {
  return {
    from() {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "gte", "lte", "in", "range"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled);
      return builder;
    },
  };
}

describe("invalidateLoggedHistoryCaches", () => {
  beforeEach(() => {
    invalidateHomeSessionSummaries();
    invalidateInsightsHistory();
  });

  it("drops the Home and Insights caches together", async () => {
    const client = emptyClient();
    await loadHomeSessionSummaries(client as never, "user-1");
    await loadCachedInsightsHistory(client as never, "user-1", { from: "2026-10-01", to: "2026-10-31" });
    assert.ok(peekHomeSessionSummaries("user-1"));
    assert.ok(peekInsightsHistory("user-1", { from: "2026-10-01", to: "2026-10-31" }));
    invalidateLoggedHistoryCaches();
    assert.equal(peekHomeSessionSummaries("user-1"), null);
    assert.equal(peekInsightsHistory("user-1", { from: "2026-10-01", to: "2026-10-31" }), null);
  });
});
