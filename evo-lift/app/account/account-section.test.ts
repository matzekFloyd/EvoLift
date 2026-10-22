import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { ACCOUNT_SECTIONS } from "./account-section";

describe("account sections", () => {
  it("keeps sign-in first and gives the training record its own Data tab", () => {
    assert.deepEqual(
      ACCOUNT_SECTIONS.map((section) => section.label),
      ["Login", "Profile", "Exercises", "Data"],
    );
    assert.equal(ACCOUNT_SECTIONS[0]?.id, "security");
    assert.equal(ACCOUNT_SECTIONS[3]?.id, "data");
  });
});
