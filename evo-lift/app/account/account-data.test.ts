import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { accountImportSelectionLabel } from "@/app/account/account-data";

describe("account import selection", () => {
  it("names one file and counts a CSV set", () => {
    assert.equal(accountImportSelectionLabel([]), "");
    assert.equal(accountImportSelectionLabel(["evolift-account.json"]), "evolift-account.json");
    assert.equal(accountImportSelectionLabel(["a.csv", "b.csv", "c.csv"]), "3 files");
  });
});
