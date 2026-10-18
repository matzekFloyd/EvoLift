import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  compareByName,
  sortRowsByName,
  toggleNamedListSortDirection,
} from "./named-list-sort";

describe("named-list-sort", () => {
  it("compares names case-insensitively", () => {
    assert.equal(compareByName("bench", "Deadlift", "asc") < 0, true);
    assert.equal(compareByName("bench", "Deadlift", "desc") > 0, true);
  });

  it("sorts rows by name ascending by default order", () => {
    const rows = [{ name: "Zebra" }, { name: "apple" }, { name: "Bench" }];
    assert.deepEqual(
      sortRowsByName(rows, "asc").map((row) => row.name),
      ["apple", "Bench", "Zebra"],
    );
  });

  it("sorts rows by name descending", () => {
    const rows = [{ name: "Zebra" }, { name: "apple" }, { name: "Bench" }];
    assert.deepEqual(
      sortRowsByName(rows, "desc").map((row) => row.name),
      ["Zebra", "Bench", "apple"],
    );
  });

  it("does not mutate the input array", () => {
    const rows = [{ name: "b" }, { name: "a" }];
    const sorted = sortRowsByName(rows, "asc");
    assert.notEqual(sorted, rows);
    assert.deepEqual(
      rows.map((row) => row.name),
      ["b", "a"],
    );
  });

  it("toggles sort direction", () => {
    assert.equal(toggleNamedListSortDirection("asc"), "desc");
    assert.equal(toggleNamedListSortDirection("desc"), "asc");
  });
});
