import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { historyPageCount, sliceRowsForPage } from "./history-paging";

const rows = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];

describe("history page count and slicing", () => {
  it("uses one page when the list is empty or the size is all", () => {
    assert.equal(historyPageCount(0, "10"), 1);
    assert.equal(historyPageCount(40, "all"), 1);
  });

  it("rounds a partial last page up", () => {
    assert.equal(historyPageCount(11, "10"), 2);
    assert.equal(historyPageCount(25, "25"), 1);
    assert.equal(historyPageCount(51, "50"), 2);
  });

  it("returns the rows for the requested page", () => {
    assert.deepEqual(sliceRowsForPage(rows, 2, "10"), ["k"]);
    assert.deepEqual(sliceRowsForPage(rows, 1, "10"), rows.slice(0, 10));
  });

  it("treats a page before 1 as the first page and returns every row for all", () => {
    assert.deepEqual(sliceRowsForPage(rows, 0, "10"), rows.slice(0, 10));
    assert.deepEqual(sliceRowsForPage(rows, 3, "all"), rows);
  });
});
