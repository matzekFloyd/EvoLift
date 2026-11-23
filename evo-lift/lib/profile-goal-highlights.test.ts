import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { profileGoalHighlights, type ProfileGoalCandidate } from "./profile-goal-highlights";

function goal(overrides: Partial<ProfileGoalCandidate> & Pick<ProfileGoalCandidate, "id" | "label">): ProfileGoalCandidate {
  return {
    slug: "back-squat",
    href: "/app/exercises/back-squat",
    targetLabel: "1.5× bodyweight",
    achievedAt: null,
    percent: null,
    pastDue: false,
    achieved: false,
    ...overrides,
  };
}

describe("profileGoalHighlights", () => {
  it("keeps the three newest reached goals", () => {
    const highlights = profileGoalHighlights([
      goal({ id: "old", label: "Squat", achieved: true, achievedAt: "2026-01-01", percent: 100 }),
      goal({ id: "new", label: "Deadlift", achieved: true, achievedAt: "2026-06-01", percent: 100 }),
      goal({ id: "mid", label: "Bench", achieved: true, achievedAt: "2026-03-01", percent: 100 }),
      goal({ id: "older", label: "Press", achieved: true, achievedAt: "2025-12-01", percent: 100 }),
      goal({ id: "open", label: "Row", achieved: false, percent: 90 }),
    ]);
    assert.equal(highlights.mode, "achieved");
    assert.deepEqual(
      highlights.goals.map((item) => item.id),
      ["new", "mid", "old"],
    );
  });

  it("shows the three closest open goals when none are reached", () => {
    const highlights = profileGoalHighlights([
      goal({ id: "low", label: "Curl", percent: 12 }),
      goal({ id: "missing", label: "Dip", percent: null }),
      goal({ id: "high", label: "Squat", percent: 88 }),
      goal({ id: "mid", label: "Bench", percent: 61 }),
      goal({ id: "next", label: "Press", percent: 44 }),
    ]);
    assert.equal(highlights.mode, "closest");
    assert.deepEqual(
      highlights.goals.map((item) => item.id),
      ["high", "mid", "next"],
    );
  });
});
