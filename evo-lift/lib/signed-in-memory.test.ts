import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { peekAccountProfile } from "./account-profile-cache";
import { invalidateHomeSessionSummaries, loadHomeSessionSummaries, peekHomeSessionSummaries } from "./home-session-cache";
import { rememberOpenedExerciseHistory, peekOpenedExerciseHistory } from "./opened-exercise-history-cache";
import { rememberOpenedSession, peekOpenedSession } from "./opened-session-cache";
import { loadPlansList, peekPlansList } from "./plans-list-cache";
import { clearSignedInMemory, rememberedUserEmail, rememberedUserId, rememberUserId } from "./signed-in-memory";

function emptyListClient() {
  return {
    from() {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "range"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled);
      return builder;
    },
  };
}

describe("signed-in memory", () => {
  beforeEach(() => {
    clearSignedInMemory();
    invalidateHomeSessionSummaries();
  });

  it("drops every remembered list on sign-out", async () => {
    rememberUserId("user-1", "lifter@example.com");
    await loadHomeSessionSummaries(emptyListClient() as never, "user-1");
    await loadPlansList(emptyListClient() as never, "user-1");
    rememberOpenedSession("user-1", "session-1", {
      session: {
        id: "session-1",
        user_id: "user-1",
        performed_on: "2026-01-01",
        notes: null,
        source_template_id: null,
        plan_id: null,
        plan_day_id: null,
        started_at: null,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      sessionExercises: [],
      workoutSets: [],
      sessionNumber: 1,
      createdFromLabel: null,
      exerciseLabels: [],
      exerciseOptions: [],
      hiddenExerciseIds: [],
    });
    rememberOpenedExerciseHistory("user-1", "deadlift", { label: "Deadlift", rows: [] });
    clearSignedInMemory();
    assert.equal(rememberedUserId(), null);
    assert.equal(rememberedUserEmail(), null);
    assert.equal(peekHomeSessionSummaries("user-1"), null);
    assert.equal(peekPlansList("user-1"), null);
    assert.equal(peekOpenedSession("user-1", "session-1"), null);
    assert.equal(peekOpenedExerciseHistory("user-1", "deadlift"), null);
    assert.equal(peekAccountProfile("user-1"), null);
  });

  it("drops the previous account before remembering the next one", async () => {
    rememberUserId("user-1", "one@example.com");
    await loadPlansList(emptyListClient() as never, "user-1");
    rememberUserId("user-2", "two@example.com");
    assert.equal(rememberedUserId(), "user-2");
    assert.equal(rememberedUserEmail(), "two@example.com");
    assert.equal(peekPlansList("user-1"), null);
  });
});
