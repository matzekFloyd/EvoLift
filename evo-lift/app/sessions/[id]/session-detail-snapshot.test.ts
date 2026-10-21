import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { OpenedSessionSnapshot } from "@/lib/opened-session-cache";
import { buildSessionSnapshot, computeSessionNumber, joinedName } from "./session-detail-snapshot";

describe("joinedName", () => {
  it("reads an object or the first array item and trims it", () => {
    assert.equal(joinedName({ name: " Push " }), "Push");
    assert.equal(joinedName([{ name: "Pull" }, { name: "Legs" }]), "Pull");
  });

  it("returns null for missing or blank names", () => {
    assert.equal(joinedName(null), null);
    assert.equal(joinedName(undefined), null);
    assert.equal(joinedName([]), null);
    assert.equal(joinedName({ name: "   " }), null);
  });
});

describe("computeSessionNumber", () => {
  it("adds the prior session count to the rank among equal created_at values", () => {
    assert.equal(computeSessionNumber(4, [{ id: "a" }, { id: "b" }], "b"), 6);
    assert.equal(computeSessionNumber(0, [{ id: "a" }], "a"), 1);
  });

  it("treats an unknown rank as first and a null count as zero", () => {
    assert.equal(computeSessionNumber(2, [{ id: "a" }], "missing"), 3);
    assert.equal(computeSessionNumber(null, [], "a"), 1);
  });
});

describe("buildSessionSnapshot", () => {
  const sessionRow = {
    id: "s1",
    user_id: "u1",
    performed_on: "2026-01-02",
    notes: "Notes",
    source_template_id: null,
    plan_id: null,
    plan_day_id: null,
    started_at: undefined,
    completed_at: undefined,
    created_at: "2026-01-02T08:00:00Z",
    updated_at: "2026-01-02T09:00:00Z",
  } as unknown as OpenedSessionSnapshot["session"];

  const base = {
    sessionRow,
    joined: {},
    sessionExercises: [],
    workoutSets: [],
    sessionNumber: 3,
    exerciseMetadata: [
      { id: "e1", slug: "back-squat", label: "Back Squat" },
      { id: "e2", slug: "bench-press", label: "Bench Press" },
    ],
    hiddenExerciseRows: [{ exercise_id: "e2" }, { exercise_id: "e2" }],
  };

  it("copies session fields, defaulting lifecycle timestamps to null", () => {
    const snapshot = buildSessionSnapshot(base);
    assert.equal(snapshot.session.id, "s1");
    assert.equal(snapshot.session.started_at, null);
    assert.equal(snapshot.session.completed_at, null);
    assert.equal(snapshot.sessionNumber, 3);
  });

  it("builds labels, options, and de-duplicated hidden ids", () => {
    const snapshot = buildSessionSnapshot(base);
    assert.deepEqual(snapshot.exerciseLabels, [
      ["e1", "Back Squat"],
      ["e2", "Bench Press"],
    ]);
    assert.deepEqual(snapshot.exerciseOptions[0], { id: "e1", label: "Back Squat", slug: "back-squat" });
    assert.deepEqual(snapshot.hiddenExerciseIds, ["e2"]);
  });

  it("falls back to the template name when there is no plan source", () => {
    const snapshot = buildSessionSnapshot({
      ...base,
      joined: { workout_templates: [{ name: " Upper A " }] },
    });
    assert.equal(snapshot.createdFromLabel, "Upper A");
  });

  it("has no created-from label without joined names", () => {
    assert.equal(buildSessionSnapshot(base).createdFromLabel, null);
  });
});
