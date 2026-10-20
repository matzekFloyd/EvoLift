import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { invalidateHomeSessionSummaries, loadHomeSessionSummaries, peekHomeSessionSummaries } from "./home-session-cache";
import { invalidateInsightsHistory, loadCachedInsightsHistory, peekInsightsHistory } from "./insights-data";
import { invalidateLoggedHistoryCaches } from "./logged-history-cache";
import { rememberOpenedSession, peekOpenedSession } from "./opened-session-cache";

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
    rememberOpenedSession("user-1", "session-1", {
      session: {
        id: "session-1",
        user_id: "user-1",
        performed_on: "2026-10-01",
        notes: null,
        source_template_id: null,
        plan_id: null,
        plan_day_id: null,
        started_at: null,
        completed_at: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
      sessionExercises: [],
      workoutSets: [],
      sessionNumber: 1,
      createdFromLabel: null,
      exerciseLabels: [],
      exerciseOptions: [],
      hiddenExerciseIds: [],
    });
    assert.ok(peekHomeSessionSummaries("user-1"));
    assert.ok(peekInsightsHistory("user-1", { from: "2026-10-01", to: "2026-10-31" }));
    assert.ok(peekOpenedSession("user-1", "session-1"));
    invalidateLoggedHistoryCaches();
    assert.equal(peekHomeSessionSummaries("user-1"), null);
    assert.equal(peekInsightsHistory("user-1", { from: "2026-10-01", to: "2026-10-31" }), null);
    assert.equal(peekOpenedSession("user-1", "session-1"), null);
  });
});
