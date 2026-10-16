import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

vi.mock("@/server/auth/api-request", () => ({
  authenticateApiRequest: async () => ({ error: "Unauthorized", status: 401 }),
}));

import { ApiHttpError } from "./http";
import { parseGoalBody } from "./goal-body";
import { parsePlanSaveBody } from "./plan-body";
import {
  parseBodyweightWrite,
  parseEmailUpdate,
  parseExerciseDefaults,
  parsePasswordUpdate,
  parseProfileBody,
} from "./account-body";
import { parseHistoryQuery, parseInsightsQuery } from "./insights-response";

const EXERCISE_ID = "123e4567-e89b-12d3-a456-426614174000";

function message(run: () => void): string {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof ApiHttpError);
    assert.equal(error.status, 400);
    return error.message;
  }
  assert.fail("expected an ApiHttpError");
}

describe("plan request body", () => {
  it("requires a name and the plan days", () => {
    assert.equal(message(() => parsePlanSaveBody({})), "Please enter a plan name.");
    assert.equal(
      message(() => parsePlanSaveBody({ name: "Push", days: [{ name: "", exercises: [] }] })),
      "Please enter a name for each day.",
    );
    assert.equal(
      message(() => parsePlanSaveBody({ name: "x".repeat(121), days: [] })),
      "Plan name cannot be longer than 120 characters.",
    );
  });

  it("accepts a day with an exercise", () => {
    const plan = parsePlanSaveBody({
      name: " Push ",
      is_active: true,
      days: [
        {
          name: "Day A",
          exercises: [{ exercise_id: EXERCISE_ID, target_sets: 3, target_reps: 5, target_weight_kg: 100 }],
        },
      ],
    });
    assert.equal(plan.name, "Push");
    assert.equal(plan.isActive, true);
    assert.equal(plan.days[0]?.exercises[0]?.targetSets, 3);
  });
});

describe("goal request body", () => {
  it("keeps the Goals form errors", () => {
    assert.equal(
      message(() => parseGoalBody({ milestone_type: "absolute", min_reps: 5 })),
      "Please select an exercise.",
    );
    assert.equal(
      message(() =>
        parseGoalBody({
          exercise_id: EXERCISE_ID,
          milestone_type: "absolute",
          target_weight_kg: 0,
          min_reps: 5,
        }),
      ),
      "Please enter a target above 0 kg.",
    );
    assert.equal(
      message(() =>
        parseGoalBody({
          exercise_id: EXERCISE_ID,
          milestone_type: "bodyweight_multiple",
          bodyweight_multiple: 100,
          min_reps: 1,
        }),
      ),
      "Please enter a multiple of 99.99 or less.",
    );
  });

  it("reads a numeric absolute target", () => {
    const goal = parseGoalBody({
      exercise_id: EXERCISE_ID,
      milestone_type: "absolute",
      target_weight_kg: 100,
      min_reps: 5,
      note: " pause ",
    });
    assert.equal(goal.definition.targetWeightKg, 100);
    assert.equal(goal.definition.minReps, 5);
    assert.equal(goal.note, "pause");
  });
});

describe("account request body", () => {
  it("checks email, password, profile, and bodyweight", () => {
    assert.equal(message(() => parseEmailUpdate({ email: "nope", current_password: "secret1" })), "Please enter a valid new email address.");
    assert.equal(
      message(() =>
        parsePasswordUpdate(
          { current_password: "secret1", new_password: "short1", confirm_new_password: "short1" },
          "lifter@example.com",
        ),
      ),
      "New password must be at least 8 characters.",
    );
    assert.equal(
      message(() => parseProfileBody({ height_cm: 50 }, "2026-10-16")),
      "Height must be between 100 and 250 cm.",
    );
    assert.equal(
      message(() => parseBodyweightWrite({ logged_on: "2026-10-17", bodyweight_kg: 80 }, "2026-10-16", [])),
      "Please enter a date that is not in the future.",
    );
    assert.equal(
      message(() => parseBodyweightWrite({ logged_on: "2026-10-01", bodyweight_kg: 80 }, "2026-10-16", ["2026-10-01"])),
      "That date already has a bodyweight.",
    );
  });

  it("checks exercise default numbers", () => {
    assert.equal(
      message(() =>
        parseExerciseDefaults(
          { suggest_warmups: true, suggest_target: true, max_suggested_warmup_sets: 0 },
          EXERCISE_ID,
        ),
      ),
      "Please enter a valid maximum number of warmup sets.",
    );
    const parsed = parseExerciseDefaults(
      {
        suggest_warmups: false,
        suggest_target: true,
        default_target_sets: 3,
        max_suggested_warmup_sets: 2,
      },
      EXERCISE_ID,
    );
    assert.equal(parsed.targetSets, 3);
    assert.equal(parsed.maxWarmupSets, 2);
    assert.equal(parsed.updateMaxWarmupSets, true);
  });
});

describe("insights query", () => {
  const today = new Date(2026, 9, 16);

  it("defaults to the 12 week preset and rejects an unknown range", () => {
    const query = parseInsightsQuery(new URLSearchParams(), today);
    assert.equal(query.range, "12w");
    assert.equal(query.to, "2026-10-16");
    assert.equal(query.from, "2026-07-25");
    assert.equal(
      message(() => parseInsightsQuery(new URLSearchParams("range=nope"), today)),
      "Please choose a range of 4w, 12w, 6m, or all.",
    );
  });

  it("hides warmups unless the history query turns them off", () => {
    assert.equal(parseHistoryQuery(new URLSearchParams(), today).hideWarmups, true);
    assert.equal(parseHistoryQuery(new URLSearchParams("hide_warmups=false"), today).hideWarmups, false);
  });
});
