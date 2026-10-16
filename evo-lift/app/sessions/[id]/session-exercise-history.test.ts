import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  SHORT_EXERCISE_HISTORY_EMPTY,
  SHORT_EXERCISE_HISTORY_LOAD_ERROR,
  SHORT_EXERCISE_HISTORY_MORE,
  SHORT_EXERCISE_HISTORY_SESSION_LIMIT,
  buildShortExerciseHistory,
  shortExerciseHistorySetLine,
  warmupSetsLabel,
  type ShortExerciseHistoryInputSet,
} from "./session-exercise-history";

function setRow(
  overrides: Partial<ShortExerciseHistoryInputSet> & Pick<ShortExerciseHistoryInputSet, "sessionId">,
): ShortExerciseHistoryInputSet {
  return {
    performedOn: "2026-10-10",
    sessionCreatedAt: "2026-10-10T10:00:00Z",
    setNumber: 1,
    reps: 5,
    loadedKg: 100,
    isWarmup: false,
    ...overrides,
  };
}

describe("short exercise history lines", () => {
  it("writes loaded weight and reps the same way the session log does", () => {
    assert.equal(shortExerciseHistorySetLine(195, 5), "195 kg, 5 reps");
    assert.equal(shortExerciseHistorySetLine(null, 8), "- kg, 8 reps");
  });

  it("uses a singular warmup label for one set", () => {
    assert.equal(warmupSetsLabel(1), "1 warmup set");
    assert.equal(warmupSetsLabel(2), "2 warmup sets");
  });
});

describe("buildShortExerciseHistory", () => {
  it("leaves out the session on screen and keeps earlier working sets in log order", () => {
    const result = buildShortExerciseHistory(
      [
        setRow({ sessionId: "current", performedOn: "2026-10-14", setNumber: 3, loadedKg: 195 }),
        setRow({
          sessionId: "earlier",
          performedOn: "2026-10-07",
          setNumber: 4,
          loadedKg: 190,
          reps: 5,
        }),
        setRow({
          sessionId: "earlier",
          performedOn: "2026-10-07",
          setNumber: 1,
          loadedKg: 100,
          reps: 5,
          isWarmup: true,
        }),
        setRow({
          sessionId: "earlier",
          performedOn: "2026-10-07",
          setNumber: 3,
          loadedKg: 190,
          reps: 4,
        }),
      ],
      { excludeSessionId: "current" },
    );

    assert.equal(result.hasMore, false);
    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0]?.performedOn, "2026-10-07");
    assert.deepEqual(
      result.sessions[0]?.workingSets.map((set) => set.line),
      ["190 kg, 4 reps", "190 kg, 5 reps"],
    );
    assert.equal(result.sessions[0]?.warmupCount, 1);
  });

  it("puts the newest session first and stops after the short limit", () => {
    const sets = ["2026-10-01", "2026-10-08", "2026-09-20", "2026-10-03", "2026-09-27"].map(
      (performedOn, index) =>
        setRow({
          sessionId: `session-${index}`,
          performedOn,
          sessionCreatedAt: `${performedOn}T10:00:00Z`,
        }),
    );

    const result = buildShortExerciseHistory(sets);

    assert.equal(SHORT_EXERCISE_HISTORY_SESSION_LIMIT, 4);
    assert.equal(result.hasMore, true);
    assert.deepEqual(
      result.sessions.map((session) => session.performedOn),
      ["2026-10-08", "2026-10-03", "2026-10-01", "2026-09-27"],
    );
    assert.equal(SHORT_EXERCISE_HISTORY_MORE, "Older sessions are on the full history.");
  });

  it("orders two sessions on the same day by when they were created", () => {
    const result = buildShortExerciseHistory([
      setRow({
        sessionId: "morning",
        performedOn: "2026-10-10",
        sessionCreatedAt: "2026-10-10T08:00:00Z",
        loadedKg: 80,
      }),
      setRow({
        sessionId: "evening",
        performedOn: "2026-10-10",
        sessionCreatedAt: "2026-10-10T18:00:00Z",
        loadedKg: 90,
      }),
    ]);

    assert.deepEqual(
      result.sessions.map((session) => session.sessionId),
      ["evening", "morning"],
    );
  });

  it("keeps a warmup-only session as a count", () => {
    const result = buildShortExerciseHistory([
      setRow({ sessionId: "warmups", setNumber: 1, isWarmup: true }),
      setRow({ sessionId: "warmups", setNumber: 2, isWarmup: true }),
    ]);

    assert.equal(result.sessions[0]?.workingSets.length, 0);
    assert.equal(result.sessions[0]?.warmupCount, 2);
    assert.equal(warmupSetsLabel(result.sessions[0]?.warmupCount ?? 0), "2 warmup sets");
  });

  it("says there are no earlier sets when the only rows are the current session", () => {
    const result = buildShortExerciseHistory([setRow({ sessionId: "current" })], {
      excludeSessionId: "current",
    });

    assert.deepEqual(result.sessions, []);
    assert.equal(result.hasMore, false);
    assert.equal(SHORT_EXERCISE_HISTORY_EMPTY, "No earlier sets for this exercise.");
    assert.equal(SHORT_EXERCISE_HISTORY_LOAD_ERROR, "Could not load recent sets.");
  });
});
