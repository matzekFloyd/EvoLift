import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  EXERCISE_LIST_EMPTY_SEARCH,
  EXERCISE_LIST_EMPTY_USED,
  EXERCISE_LIST_INTRO,
  exerciseDetailHref,
  exerciseSessionCountLabel,
  visibleExerciseListRows,
  type ExerciseListRow,
} from "./exercise-list";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

const rows: ExerciseListRow[] = [
  { id: "ex-squat", slug: "back-squat", label: "Barbell Back Squat", sessionCount: 4 },
  { id: "ex-bench", slug: "barbell-bench-press", label: "Barbell Bench Press", sessionCount: 2 },
  { id: "ex-row", slug: "barbell-row", label: "Barbell Row", sessionCount: 2 },
];

describe("exercise list", () => {
  it("sorts by name, and keeps equal session counts in name order", () => {
    assert.deepEqual(
      visibleExerciseListRows(rows, "", { key: "name", direction: "asc" }).map((row) => row.label),
      ["Barbell Back Squat", "Barbell Bench Press", "Barbell Row"],
    );
    assert.deepEqual(
      visibleExerciseListRows(rows, "", { key: "name", direction: "desc" }).map((row) => row.label),
      ["Barbell Row", "Barbell Bench Press", "Barbell Back Squat"],
    );
    assert.deepEqual(
      visibleExerciseListRows(rows, "", { key: "sessions", direction: "asc" }).map((row) => row.label),
      ["Barbell Bench Press", "Barbell Row", "Barbell Back Squat"],
    );
    assert.deepEqual(
      visibleExerciseListRows(rows, "row", { key: "name", direction: "asc" }).map((row) => row.id),
      ["ex-row"],
    );
  });

  it("links the exercise name to its history", () => {
    assert.equal(exerciseDetailHref("back-squat"), "/app/exercises/back-squat");
    assert.equal(exerciseSessionCountLabel(1), "1 session");
    assert.equal(exerciseSessionCountLabel(4), "4 sessions");
    assert.equal(EXERCISE_LIST_INTRO, "Open an exercise to review your full set history.");
    assert.match(EXERCISE_LIST_EMPTY_USED, /All exercises/);
    assert.equal(EXERCISE_LIST_EMPTY_SEARCH, "No exercises match that search.");
  });

  it("uses the shared search field, scope select, and named list", () => {
    const page = readRepo("evo-lift", "app", "(shell)", "app", "exercises", "page.tsx");
    const table = readRepo("evo-lift", "app", "components", "named-list-table.tsx");
    assert.match(page, /<TextField/);
    assert.match(page, /<SelectField/);
    assert.match(page, /With session history/);
    assert.match(page, /All exercises/);
    assert.match(page, /<NamedListTable/);
    assert.match(page, /actions=\{false\}/);
    assert.match(page, /contained/);
    assert.match(table, /max-h-\[min\(42rem,75vh\)\]/);
    assert.match(page, /exerciseDetailHref\(exercise\.slug\)/);
    assert.match(page, /label: "Sessions"/);
    assert.match(page, /tracks: "count"/);
    assert.match(page, /sm:grid-cols-\[minmax\(0,1fr\)_16rem\]/);
    assert.equal(page.includes("ExerciseScopePills"), false);
    assert.equal(page.includes("ExerciseFilteredList"), false);
    assert.match(table, /browseCountListRowGridClassName/);
    assert.match(table, /before:inset-0/);
    assert.match(table, /pointer-events-none contents/);
    assert.match(table, /actions \? /);
  });
});
