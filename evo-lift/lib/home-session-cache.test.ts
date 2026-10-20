import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import {
  invalidateHomeSessionSummaries,
  loadHomeSessionSummaries,
  pastSessionCountsBySlug,
  peekHomeSessionSummaries,
  type HomeSessionSummaryRow,
} from "./home-session-cache";

function row(overrides: Partial<HomeSessionSummaryRow> = {}): HomeSessionSummaryRow {
  return {
    id: "session-1",
    performed_on: "2020-01-01",
    notes: null,
    created_at: "2020-01-01T10:00:00Z",
    started_at: "2020-01-01T10:00:00Z",
    completed_at: "2020-01-01T10:00:00Z",
    set_count: 4,
    exercise_badges: [{ slug: "deadlift", has_logged_set: true }],
    ...overrides,
  };
}

function homeClient(result: { data: unknown; error: { message: string } | null }) {
  let calls = 0;
  const client = {
    from() {
      calls += 1;
      const builder = {
        select() {
          return builder;
        },
        order() {
          return builder;
        },
        range() {
          return Promise.resolve(result);
        },
      };
      return builder;
    },
  };
  return {
    client,
    get calls() {
      return calls;
    },
  };
}

describe("home session cache", () => {
  beforeEach(() => {
    invalidateHomeSessionSummaries();
  });

  it("remembers a fresh summary and counts past sessions by slug", async () => {
    const source = homeClient({
      data: [
        row(),
        row({
          id: "planned",
          performed_on: "2099-01-01",
          set_count: "nope" as unknown as number,
          exercise_badges: [{ slug: "back-squat", has_logged_set: false }],
        }),
        row({ id: "again", exercise_badges: [{ slug: "deadlift", has_logged_set: true }] }),
      ],
      error: null,
    });
    const first = await loadHomeSessionSummaries(source.client as never, "user-1");
    const second = await loadHomeSessionSummaries(source.client as never, "user-1");
    assert.equal(source.calls, 1);
    assert.deepEqual(second, first);
    assert.equal(peekHomeSessionSummaries("user-1")?.fresh, true);
    assert.equal(peekHomeSessionSummaries("someone-else"), null);
    assert.equal(first.rows[1]?.set_count, 0);
    assert.equal(pastSessionCountsBySlug("user-1")?.get("deadlift"), 2);
    assert.equal(pastSessionCountsBySlug("user-1")?.has("back-squat"), false);
  });

  it("loads again after a workout change or an explicit refresh", async () => {
    const source = homeClient({ data: [row()], error: null });
    await loadHomeSessionSummaries(source.client as never, "user-1");
    invalidateHomeSessionSummaries();
    assert.equal(peekHomeSessionSummaries("user-1"), null);
    assert.equal(pastSessionCountsBySlug("user-1"), null);
    await loadHomeSessionSummaries(source.client as never, "user-1", { fresh: true });
    assert.equal(source.calls, 2);
  });

  it("returns the session load error", async () => {
    const source = homeClient({ data: null, error: { message: "down" } });
    assert.deepEqual(await loadHomeSessionSummaries(source.client as never, "user-1"), {
      rows: [],
      error: "Could not load workout sessions.",
    });
  });
});
