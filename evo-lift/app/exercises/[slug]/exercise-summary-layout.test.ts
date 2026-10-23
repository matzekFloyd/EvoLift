import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  exerciseSummaryGridClassName,
  exerciseSummaryLoadCardClassName,
  exerciseSummarySetCardClassName,
} from "./exercise-summary-layout";

const sectionDir = dirname(fileURLToPath(import.meta.url));
const sectionSource = readFileSync(join(sectionDir, "exercise-summary-section.tsx"), "utf8");
const layoutSource = readFileSync(join(sectionDir, "exercise-summary-layout.ts"), "utf8");

describe("exercise summary layout", () => {
  it("gives assistance five equal cards on a wide row and a full pair under the sets", () => {
    const grid = exerciseSummaryGridClassName(true);
    const load = exerciseSummaryLoadCardClassName(true);
    assert.match(grid, /grid-cols-6/);
    assert.match(grid, /@min-\[28rem\]:grid-cols-12/);
    assert.match(grid, /@min-\[56rem\]:grid-cols-5/);
    assert.equal(grid.includes("grid-cols-7"), false);
    assert.match(load, /col-span-3/);
    assert.match(load, /@min-\[28rem\]:col-span-6/);
    assert.match(load, /@min-\[56rem\]:col-span-1/);
  });

  it("keeps seven loaded cards, with four sharing the mid load row", () => {
    const grid = exerciseSummaryGridClassName(false);
    const load = exerciseSummaryLoadCardClassName(false);
    assert.match(grid, /@min-\[56rem\]:grid-cols-7/);
    assert.equal(grid.includes("grid-cols-5"), false);
    assert.match(load, /^col-span-3 /);
    assert.match(load, /@min-\[28rem\]:col-span-3 /);
    assert.equal(load.includes("col-span-6"), false);
  });

  it("keeps three set cards on the narrow and mid rows", () => {
    assert.match(exerciseSummarySetCardClassName, /col-span-2/);
    assert.match(exerciseSummarySetCardClassName, /@min-\[28rem\]:col-span-4/);
    assert.match(exerciseSummarySetCardClassName, /@min-\[56rem\]:col-span-1/);
  });

  it("uses the layout helpers in the summary section", () => {
    assert.match(sectionSource, /exerciseSummaryGridClassName\(assistance\)/);
    assert.match(sectionSource, /exerciseSummarySetCardClassName/);
    assert.match(sectionSource, /exerciseSummaryLoadCardClassName\(assistance\)/);
    assert.equal(sectionSource.includes("grid-cols-7"), false);
    assert.match(layoutSource, /@min-\[28rem\]:col-span-6/);
    assert.match(layoutSource, /@min-\[56rem\]:grid-cols-5/);
    assert.equal(layoutSource.includes("${"), false);
  });
});
