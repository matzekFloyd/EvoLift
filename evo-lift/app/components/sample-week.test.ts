import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  SAMPLE_WEEK_DAY_LABEL,
  SAMPLE_WEEK_HEADING,
  SAMPLE_WEEK_REST_LABEL,
  sampleWeek,
  sampleWeekDayCountLabel,
  type SampleWeekCell,
} from "./sample-week";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function labels(cells: readonly SampleWeekCell[]): string[] {
  return cells.map((cell) => (cell === "day" ? SAMPLE_WEEK_DAY_LABEL : SAMPLE_WEEK_REST_LABEL));
}

describe("sampleWeek", () => {
  it("hides the sample week when a plan has no days", () => {
    assert.deepEqual(sampleWeek(0), { kind: "hidden" });
    assert.deepEqual(sampleWeek(-1), { kind: "hidden" });
  });

  it("spaces 1 to 7 days, including rest, and counts them", () => {
    assert.deepEqual(labels(week(1).cells), ["Day", "Rest", "Rest", "Rest", "Rest", "Rest", "Rest"]);
    assert.equal(week(1).countLine, "1 day and 6 rest days.");

    assert.deepEqual(labels(week(2).cells), ["Day", "Rest", "Rest", "Day", "Rest", "Rest", "Rest"]);
    assert.equal(week(2).countLine, "2 days and 5 rest days.");

    assert.deepEqual(labels(week(3).cells), ["Day", "Rest", "Day", "Rest", "Day", "Rest", "Rest"]);
    assert.equal(week(3).countLine, "3 days and 4 rest days.");

    assert.deepEqual(labels(week(4).cells), ["Day", "Day", "Rest", "Day", "Day", "Rest", "Rest"]);
    assert.equal(week(4).countLine, "4 days and 3 rest days.");

    assert.deepEqual(labels(week(5).cells), ["Day", "Day", "Day", "Day", "Day", "Rest", "Rest"]);
    assert.equal(week(5).countLine, "5 days and 2 rest days.");

    assert.deepEqual(labels(week(6).cells), ["Day", "Day", "Day", "Day", "Day", "Day", "Rest"]);
    assert.equal(week(6).countLine, "6 days and 1 rest day.");

    assert.deepEqual(labels(week(7).cells), ["Day", "Day", "Day", "Day", "Day", "Day", "Day"]);
    assert.equal(week(7).countLine, "7 days across the week.");
  });

  it("describes a cycle longer than one week without a row", () => {
    assert.deepEqual(sampleWeek(8), {
      kind: "longer",
      message: "This cycle runs longer than one week. 8 days.",
    });
    assert.equal(sampleWeekDayCountLabel(8), "8 days");
  });

  it("places the day count beside the sample week and hides it when there are no days", () => {
    assert.equal(sampleWeekDayCountLabel(0), null);
    assert.equal(sampleWeekDayCountLabel(1), "1 day");
    assert.equal(sampleWeekDayCountLabel(4), "4 days");
    const row = readFileSync(path.join(repoRoot, "evo-lift/app/components/sample-week-row.tsx"), "utf8");
    assert.match(row, /sampleWeekDayCountLabel/);
    assert.match(row, /\{view\.message\}/);
  });

  it("shows the sample week in the plan editor, not on the plans list", () => {
    const plans = readFileSync(
      path.join(repoRoot, "evo-lift/app/(shell)/app/plans/page.tsx"),
      "utf8",
    );
    const editor = readFileSync(
      path.join(repoRoot, "evo-lift/app/plans/plan-editor-client.tsx"),
      "utf8",
    );
    assert.equal(plans.includes("<SampleWeek"), false);
    assert.match(plans, /sampleWeekDayCountLabel/);
    assert.match(editor, /<SampleWeek dayCount=\{days\.length\}/);
    assert.equal(SAMPLE_WEEK_HEADING, "Sample week");
  });
});

function week(dayCount: number): { cells: readonly SampleWeekCell[]; countLine: string } {
  const view = sampleWeek(dayCount);
  assert.equal(view.kind, "week");
  if (view.kind !== "week") {
    throw new Error("expected a sample week row");
  }
  return view;
}
