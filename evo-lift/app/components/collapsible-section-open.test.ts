import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  collapsibleSectionCanToggle,
  initialCollapsibleSectionOpen,
  shouldRenderCollapsibleBody,
} from "./collapsible-section-open";

describe("collapsible-section-open", () => {
  it("starts open when alwaysOpen is set, even if defaultOpen is false", () => {
    assert.equal(initialCollapsibleSectionOpen({ alwaysOpen: true, defaultOpen: false }), true);
  });

  it("starts open only when defaultOpen is true for collapsible sections", () => {
    assert.equal(initialCollapsibleSectionOpen({ defaultOpen: true }), true);
    assert.equal(initialCollapsibleSectionOpen({ defaultOpen: false }), false);
    assert.equal(initialCollapsibleSectionOpen({}), false);
  });

  it("blocks the toggle when the section must stay open", () => {
    assert.equal(collapsibleSectionCanToggle(true), false);
    assert.equal(collapsibleSectionCanToggle(false), true);
  });

  it("leaves the body unmounted until the section is open", () => {
    assert.equal(shouldRenderCollapsibleBody(false), false);
    assert.equal(shouldRenderCollapsibleBody(true), true);
  });
});
