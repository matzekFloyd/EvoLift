import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isSelectableInputType } from "./selectable-text-control";

describe("selectable text controls", () => {
  it("selects text-like fields and skips secrets and buttons", () => {
    assert.equal(isSelectableInputType("text"), true);
    assert.equal(isSelectableInputType("email"), true);
    assert.equal(isSelectableInputType("number"), true);
    assert.equal(isSelectableInputType("password"), false);
    assert.equal(isSelectableInputType("checkbox"), false);
    assert.equal(isSelectableInputType("submit"), false);
  });
});
