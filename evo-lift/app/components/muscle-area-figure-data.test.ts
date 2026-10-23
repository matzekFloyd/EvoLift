import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MUSCLE_AREAS, type MuscleArea } from "@/lib/muscle-areas";
import { FRONT_MUSCLE_PATHS, REAR_MUSCLE_PATHS, muscleFigureRole } from "./muscle-area-figure-data";

function areas(paths: readonly { area: MuscleArea }[]): Set<MuscleArea> {
  return new Set(paths.map((path) => path.area));
}

describe("muscle area figure", () => {
  it("draws every catalog area on the front, the rear, or both", () => {
    const front = areas(FRONT_MUSCLE_PATHS);
    const rear = areas(REAR_MUSCLE_PATHS);
    for (const area of MUSCLE_AREAS) {
      assert.equal(front.has(area) || rear.has(area), true, area);
    }
    assert.deepEqual(
      [...front].sort(),
      ["biceps", "calves", "chest", "core", "quads", "shoulders"],
    );
    assert.deepEqual(
      [...rear].sort(),
      ["back", "calves", "glutes", "hamstrings", "shoulders", "triceps"],
    );
  });

  it("fills the primary, stripes the secondary, and leaves the other areas quiet", () => {
    const tagged = { primary: "quads" as const, secondary: "glutes" as const };
    assert.equal(muscleFigureRole("quads", tagged), "primary");
    assert.equal(muscleFigureRole("glutes", tagged), "secondary");
    for (const area of MUSCLE_AREAS) {
      if (area === "quads" || area === "glutes") {
        continue;
      }
      assert.equal(muscleFigureRole(area, tagged), "rest", area);
    }
    assert.equal(muscleFigureRole("glutes", { primary: "quads", secondary: null }), "rest");
    assert.equal(muscleFigureRole("quads", { primary: "quads", secondary: "quads" }), "primary");
  });
});
