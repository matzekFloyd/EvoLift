import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildActivityHeatmapWeeks,
  buildCompactActivityWeeks,
  type ActivityDayPoint,
} from "./workout-activity-weeks";

function point(date: string, sets: number): ActivityDayPoint {
  return { date, workouts: 1, sets };
}

describe("workout activity weeks", () => {
  const today = new Date(2026, 9, 14);

  it("keeps the latest ten weeks and labels the current week", () => {
    const weeks = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2026, 6, 27);
      date.setDate(date.getDate() + index * 7);
      const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
      return point(key, index + 1);
    });
    const compact = buildCompactActivityWeeks(
      [point("2026-10-12", 4), point("2026-10-14", 2), ...weeks.slice(0, 10)],
      today,
    );
    assert.equal(compact.length, 10);
    assert.equal(compact.at(-1)?.weekStart, "2026-10-12");
    assert.equal(compact.at(-1)?.sets, 6);
    assert.equal(compact.at(-1)?.isCurrentWeek, true);
    assert.equal(compact.at(-1)?.weekLabel, "This week");
    assert.notEqual(compact[0]?.weekLabel, "This week");
    assert.match(compact[0]?.weekLabel ?? "", /-/);
  });

  it("pads the heatmap to 26 weeks and marks only days inside the range", () => {
    const weeks = buildActivityHeatmapWeeks([
      point("2026-10-12", 3),
      point("2026-10-14", 5),
    ]);
    assert.equal(weeks.length, 26);
    assert.equal(weeks[0]?.[0]?.isInRange, false);
    assert.equal(weeks[0]?.[0]?.sets, 0);
    const visible = weeks.at(-1) ?? [];
    assert.equal(visible[0]?.date, "2026-10-12");
    assert.equal(visible[0]?.sets, 3);
    assert.equal(visible[1]?.date, "2026-10-13");
    assert.equal(visible[1]?.sets, 0);
    assert.equal(visible[1]?.isInRange, true);
    assert.equal(visible[2]?.sets, 5);
    assert.equal(visible[3]?.isInRange, false);
  });
});
