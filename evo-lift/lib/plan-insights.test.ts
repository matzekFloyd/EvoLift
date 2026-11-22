import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildPlanInsights,
  planAdherenceText,
  planDurationText,
  planLiftsQuietText,
  planSessionsText,
  planSummaryText,
  type PlanInsightExercise,
  type PlanInsightSet,
} from "./plan-insights";

const today = "2026-03-01";

function exercise(partial: Partial<PlanInsightExercise> & Pick<PlanInsightExercise, "sessionId">): PlanInsightExercise {
  return {
    targetSets: 3,
    notDone: false,
    workingSetCount: 3,
    ...partial,
  };
}

function set(partial: Partial<PlanInsightSet> & Pick<PlanInsightSet, "sessionId" | "slug">): PlanInsightSet {
  return {
    performedOn: "2026-01-10",
    reps: 5,
    totalKg: 100,
    primaryMuscle: "quads",
    ...partial,
  };
}

describe("buildPlanInsights", () => {
  it("describes a plan that has never been active and has no sessions", () => {
    const insights = buildPlanInsights({
      activations: [],
      sessions: [],
      exercises: [],
      sets: [],
      today,
    });
    assert.equal(planDurationText(insights, (date) => date), "This plan has not been active.");
    assert.equal(planSummaryText(insights, (date) => date), "This plan has not been active.");
    assert.equal(planSessionsText(insights), "No sessions logged.");
    assert.equal(planAdherenceText(insights), "No target sets on finished sessions.");
    assert.equal(insights.lifts.every((lift) => lift.summary === "No working sets"), true);
    assert.deepEqual(insights.weeklyVolume, []);
  });

  it("sums each activation and keeps an open plan running through today", () => {
    const insights = buildPlanInsights({
      activations: [
        { activatedOn: "2026-01-01", deactivatedOn: "2026-01-07" },
        { activatedOn: "2026-01-15", deactivatedOn: null },
      ],
      sessions: [
        { id: "s1", performedOn: "2026-01-02", completed: true },
        { id: "s2", performedOn: "2026-02-01", completed: true },
      ],
      exercises: [],
      sets: [],
      today,
    });
    assert.equal(insights.startedOn, "2026-01-01");
    assert.equal(insights.endedOn, "2026-03-01");
    assert.equal(insights.stillActive, true);
    assert.equal(insights.activeDays, 7 + 46);
    assert.equal(planDurationText(insights, (date) => date), "2026-01-01 – today, 7.6 weeks active");
    assert.equal(planSessionsText(insights), "2 sessions, 0.3 per week");
    assert.equal(
      planSummaryText(insights, (date) => date),
      "2026-01-01 – today, 7.6 weeks active. 2 sessions, 0.3 per week. No target sets on finished sessions.",
    );
  });

  it("does not count the same day twice when activations overlap", () => {
    const insights = buildPlanInsights({
      activations: [
        { activatedOn: "2026-01-01", deactivatedOn: "2026-01-10" },
        { activatedOn: "2026-01-05", deactivatedOn: "2026-01-14" },
      ],
      sessions: [],
      exercises: [],
      sets: [],
      today,
    });
    assert.equal(insights.activeDays, 14);
    assert.equal(insights.stillActive, false);
    assert.equal(planDurationText(insights, (date) => date), "2026-01-01 – 2026-01-14, 2 weeks active");
  });

  it("counts finished target sets, including sets left short and exercises marked not done", () => {
    const insights = buildPlanInsights({
      activations: [{ activatedOn: "2026-01-01", deactivatedOn: "2026-01-07" }],
      sessions: [
        { id: "done", performedOn: "2026-01-02", completed: true },
        { id: "open", performedOn: "2026-01-03", completed: false },
      ],
      exercises: [
        exercise({ sessionId: "done", targetSets: 3, workingSetCount: 2 }),
        exercise({ sessionId: "done", targetSets: 3, notDone: true, workingSetCount: 0 }),
        exercise({ sessionId: "done", targetSets: 3, workingSetCount: 5 }),
        exercise({ sessionId: "done", targetSets: null, workingSetCount: 1 }),
        exercise({ sessionId: "open", targetSets: 3, workingSetCount: 1 }),
      ],
      sets: [],
      today,
    });
    assert.equal(insights.plannedSets, 9);
    assert.equal(insights.performedSets, 2 + 0 + 3);
    assert.equal(insights.shortSets, 1 + 3 + 0);
    assert.equal(planAdherenceText(insights), "5 of 9 target sets. 4 sets short of the target.");
  });

  it("reports estimated 1RM from the first session to the last for the main lifts", () => {
    const insights = buildPlanInsights({
      activations: [{ activatedOn: "2026-01-01", deactivatedOn: "2026-01-31" }],
      sessions: [],
      exercises: [],
      sets: [
        set({ sessionId: "a", slug: "back-squat", performedOn: "2026-01-02", reps: 5, totalKg: 100 }),
        set({ sessionId: "a", slug: "back-squat", performedOn: "2026-01-02", reps: 1, totalKg: 120 }),
        set({ sessionId: "b", slug: "back-squat", performedOn: "2026-01-20", reps: 5, totalKg: 110 }),
        set({ sessionId: "c", slug: "barbell-bench-press", performedOn: "2026-01-20", reps: 13, totalKg: 80 }),
        set({ sessionId: "d", slug: "deadlift", performedOn: "2026-01-20", reps: 3, totalKg: 140 }),
      ],
      today,
    });
    const squat = insights.lifts.find((lift) => lift.slug === "back-squat");
    const bench = insights.lifts.find((lift) => lift.slug === "barbell-bench-press");
    const deadlift = insights.lifts.find((lift) => lift.slug === "deadlift");
    const press = insights.lifts.find((lift) => lift.slug === "overhead-press");
    assert.equal(squat?.summary, "120.0 kg to 128.3 kg");
    assert.equal(squat?.changeKg, 8.3);
    assert.deepEqual(
      squat?.points.map((point) => point.e1rmKg),
      [120, 128.3],
    );
    assert.equal(planLiftsQuietText(insights.lifts), "No working sets for bench or press.");
    assert.equal(bench?.summary, "No working sets");
    assert.equal(deadlift?.summary, "154.0 kg");
    assert.equal(deadlift?.changeKg, null);
    assert.equal(press?.summary, "No working sets");
    assert.equal(planLiftsQuietText(insights.lifts.map((lift) => ({ ...lift, points: [] }))), "No working sets on the main lifts.");
  });

  it("averages working-set volume per week on the primary muscle", () => {
    const insights = buildPlanInsights({
      activations: [{ activatedOn: "2026-01-01", deactivatedOn: "2026-01-14" }],
      sessions: [],
      exercises: [],
      sets: [
        set({ sessionId: "a", slug: "back-squat", totalKg: 100, primaryMuscle: "quads" }),
        set({ sessionId: "a", slug: "back-squat", totalKg: 40, primaryMuscle: "quads" }),
        set({ sessionId: "b", slug: "barbell-bench-press", totalKg: 70, primaryMuscle: "chest" }),
        set({ sessionId: "c", slug: "crunch", totalKg: 0, primaryMuscle: "core" }),
      ],
      today,
    });
    assert.deepEqual(insights.weeklyVolume, [
      { area: "chest", label: "Chest", kgPerWeek: 35 },
      { area: "quads", label: "Quads", kgPerWeek: 70 },
    ]);
  });
});
