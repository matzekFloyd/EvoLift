import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildActivityHeatmapWeeks, type ActivityDayPoint } from "./workout-activity-weeks";

function point(date: string, sets: number): ActivityDayPoint {
  return { date, workouts: 1, sets };
}

describe("workout activity weeks", () => {
  it("shows the weeks in range and keeps only the latest 26 when the range is longer", () => {
    const short = buildActivityHeatmapWeeks([
      point("2026-10-12", 3),
      point("2026-10-14", 5),
    ]);
    assert.equal(short.length, 1);
    const visible = short[0] ?? [];
    assert.equal(visible[0]?.date, "2026-10-12");
    assert.equal(visible[0]?.sets, 3);
    assert.equal(visible[1]?.date, "2026-10-13");
    assert.equal(visible[1]?.sets, 0);
    assert.equal(visible[1]?.isInRange, true);
    assert.equal(visible[2]?.sets, 5);
    assert.equal(visible[3]?.isInRange, false);

    const fourWeeks = buildActivityHeatmapWeeks(
      Array.from({ length: 28 }, (_, index) => {
        const date = new Date(2026, 8, 17);
        date.setDate(date.getDate() + index);
        const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
        return point(key, 1);
      }),
    );
    assert.equal(fourWeeks.length, 5);
    assert.equal(fourWeeks.flat().filter((day) => day.isInRange).length, 28);
    assert.equal(fourWeeks[0]?.[0]?.date, "2026-09-14");
    assert.equal(fourWeeks.at(-1)?.[6]?.date, "2026-10-18");

    const long = buildActivityHeatmapWeeks(
      Array.from({ length: 30 }, (_, index) => {
        const date = new Date(2026, 0, 5);
        date.setDate(date.getDate() + index * 7);
        const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
        return point(key, 1);
      }),
    );
    assert.equal(long.length, 26);
    assert.equal(long[0]?.[0]?.date, "2026-02-02");
    assert.equal(long.at(-1)?.[0]?.date, "2026-07-27");
  });
});
