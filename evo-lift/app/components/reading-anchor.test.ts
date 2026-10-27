import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { readingAnchorId, uniqueReadingAnchorIds } from "./reading-anchor";

describe("reading anchor ids", () => {
  it("slugs a section heading into a fragment", () => {
    assert.equal(readingAnchorId("What the account stores"), "what-the-account-stores");
  });

  it("slugs glossary terms that include units or digits", () => {
    assert.equal(readingAnchorId("Loaded (kg)"), "loaded-kg");
    assert.equal(readingAnchorId("1RM"), "1rm");
    assert.equal(readingAnchorId("Target weight (kg)"), "target-weight-kg");
  });

  it("keeps a repeated heading on the same page distinct", () => {
    assert.deepEqual(uniqueReadingAnchorIds(["Email", "Email"]), ["email", "email-2"]);
  });
});
