import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { activityDayOpen, activityDaySessionIds, type ActivityDaySession } from "./home-activity-day";

const sessions: ActivityDaySession[] = [
  { id: "later", performedOn: "2026-10-14T18:00:00", createdAt: "2026-10-14T18:00:00Z" },
  { id: "other-day", performedOn: "2026-10-12", createdAt: "2026-10-12T08:00:00Z" },
  { id: "earlier", performedOn: "2026-10-14", createdAt: "2026-10-14T08:00:00Z" },
];

describe("activity day open", () => {
  it("lists sessions on that day, earliest first", () => {
    assert.deepEqual(activityDaySessionIds(sessions, "2026-10-14"), ["earlier", "later"]);
    assert.deepEqual(activityDaySessionIds(sessions, "2026-10-12"), ["other-day"]);
    assert.deepEqual(activityDaySessionIds(sessions, "2026-10-01"), []);
  });

  it("opens one session and asks for a choice when a day has several", () => {
    assert.deepEqual(activityDayOpen([]), { kind: "none" });
    assert.deepEqual(activityDayOpen(["only"]), { kind: "session", sessionId: "only" });
    assert.deepEqual(activityDayOpen(["earlier", "later"]), {
      kind: "choose",
      sessionIds: ["earlier", "later"],
    });
  });
});
