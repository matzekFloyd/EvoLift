import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { scheduledSessionsBesidePlan } from "./home-scheduled-sessions";

describe("scheduledSessionsBesidePlan", () => {
  const planned = [
    { id: "on-day" },
    { id: "extra" },
    { id: "other" },
  ];

  it("keeps future sessions that are not already the date on a plan day", () => {
    assert.deepEqual(
      scheduledSessionsBesidePlan(planned, ["on-day"]).map((session) => session.id),
      ["extra", "other"],
    );
  });

  it("lists every future session when no plan day is showing one", () => {
    assert.deepEqual(
      scheduledSessionsBesidePlan(planned, []).map((session) => session.id),
      ["on-day", "extra", "other"],
    );
  });
});
