import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { goalCardStatusMark, goalStatusMark } from "./goal-status";

describe("goal status mark", () => {
  it("leaves an in-progress goal without a badge", () => {
    assert.equal(goalStatusMark({ pastDue: false, achieved: false }), null);
  });

  it("marks a late goal as a warning, including when it is also reached", () => {
    assert.deepEqual(goalStatusMark({ pastDue: true, achieved: false }), {
      tone: "warning",
      label: "Past due",
      description: "The due date has passed. This goal stays active.",
    });
    assert.equal(goalStatusMark({ pastDue: true, achieved: true })?.label, "Past due");
  });

  it("marks a reached goal as success", () => {
    assert.deepEqual(goalStatusMark({ pastDue: false, achieved: true }), {
      tone: "success",
      label: "Achieved",
    });
  });

  it("drops the achieved badge on a card that already shows the date", () => {
    assert.equal(
      goalCardStatusMark({ pastDue: false, achieved: true, achievedDetail: true }),
      null,
    );
    assert.equal(
      goalCardStatusMark({ pastDue: false, achieved: true, achievedDetail: false })?.label,
      "Achieved",
    );
    assert.equal(
      goalCardStatusMark({ pastDue: true, achieved: true, achievedDetail: true })?.label,
      "Past due",
    );
  });
});
