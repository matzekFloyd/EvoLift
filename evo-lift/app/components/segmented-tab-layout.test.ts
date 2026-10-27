import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import {
  segmentedTabButtonHeightClassName,
  segmentedTabButtonWidthClassName,
  segmentedTabRowClassName,
} from "@/app/components/segmented-tab-layout";

describe("segmented tab layout", () => {
  it("wraps a narrow equal row into two columns, then one row from sm", () => {
    assert.match(segmentedTabRowClassName("equal-row", true), /flex-wrap/);
    assert.match(segmentedTabButtonWidthClassName("equal-row", true), /w-\[calc\(50%-0\.25rem\)\]/);
    assert.match(segmentedTabButtonWidthClassName("equal-row", true), /sm:flex-1/);
    assert.match(segmentedTabButtonHeightClassName("equal-row", true), /min-h-9/);
  });

  it("keeps an equal row on one line when it does not wrap", () => {
    assert.equal(segmentedTabRowClassName("equal-row", false).includes("flex-wrap"), false);
    assert.match(segmentedTabButtonWidthClassName("equal-row", false), /flex-1/);
    assert.equal(segmentedTabButtonHeightClassName("equal-row", false), "h-9");
  });

  it("stacks the default layout until sm", () => {
    assert.match(segmentedTabRowClassName("default", false), /sm:inline-flex/);
    assert.match(segmentedTabButtonWidthClassName("default", false), /w-full/);
  });
});

describe("account tabs", () => {
  it("wraps Account tabs so Login, Profile, and Data stay tappable when narrow", () => {
    const page = readFileSync(new URL("../(shell)/app/account/page.tsx", import.meta.url), "utf8");
    const sections = readFileSync(new URL("../account/account-section.ts", import.meta.url), "utf8");
    assert.match(page, /equalRowWrap/);
    assert.match(sections, /Login/);
    assert.match(sections, /Profile/);
    assert.match(sections, /Data/);
  });
});
