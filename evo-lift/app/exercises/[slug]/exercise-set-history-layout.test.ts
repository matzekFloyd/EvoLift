import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  compactHistoryAssistanceGridClassName,
  compactHistoryCellPaddingClassName,
  compactHistoryFrameClassName,
  compactHistoryGridClass,
  compactHistoryGridClassName,
  historyTableClassName,
} from "./exercise-set-history-layout";

const sectionSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "exercise-set-history-section.tsx"),
  "utf8",
);

/**
 * Width the compact grid can use on a 360px phone (Zenfone 10 at 3x).
 * Page `px-4`, exercise panel `p-5` and its border, history inset border.
 * The frame cancels the section's `p-4`, then its own border sits inside that width.
 * `scrollbar-gutter: stable` may reserve space on the root.
 */
function zenfone10GridContentPx(viewportPx: number): number {
  const scrollbarGutterPx = 15;
  const pagePaddingPx = 32;
  const panelPaddingPx = 40;
  const panelBorderPx = 2;
  const sectionBorderPx = 2;
  const frameBorderPx = 2;
  return (
    viewportPx -
    scrollbarGutterPx -
    pagePaddingPx -
    panelPaddingPx -
    panelBorderPx -
    sectionBorderPx -
    frameBorderPx
  );
}

function tracksFromClass(className: string, wide: boolean): string[] {
  const pattern = wide
    ? /@min-\[22rem\]:grid-cols-\[([^\]]+)\]/
    : /(?<!@min-\[22rem\]:)grid-cols-\[([^\]]+)\]/;
  const match = className.match(pattern);
  assert.ok(match, className);
  return match[1].split("_");
}

function gridMinWidthPx(className: string, wide: boolean, remPx: number): number {
  const tracks = tracksFromClass(className, wide);
  let fixedPx = 0;
  for (const track of tracks) {
    if (track.startsWith("minmax")) {
      continue;
    }
    const rem = track.match(/^([\d.]+)rem$/);
    assert.ok(rem, track);
    fixedPx += Number(rem[1]) * remPx;
  }
  const gapPx = 0.25 * remPx;
  const paddingPx = 0.25 * remPx * 2;
  return fixedPx + gapPx * (tracks.length - 1) + paddingPx;
}

describe("compact set history layout", () => {
  it("keeps Reps on screen on a Zenfone 10 without sideways scroll", () => {
    assert.equal(compactHistoryCellPaddingClassName, "px-1");
    assert.match(compactHistoryFrameClassName, /-mx-4/);
    assert.equal(tracksFromClass(compactHistoryGridClassName, false).at(-1), "2.25rem");
    assert.equal(tracksFromClass(compactHistoryAssistanceGridClassName, false).at(-1), "2.25rem");

    const contentPx = zenfone10GridContentPx(360);
    assert.ok(gridMinWidthPx(compactHistoryGridClassName, false, 16) <= contentPx);
    assert.ok(gridMinWidthPx(compactHistoryAssistanceGridClassName, false, 16) <= contentPx);
    const datePx = contentPx - gridMinWidthPx(compactHistoryGridClassName, false, 16);
    assert.ok(datePx >= 88, `date column ${datePx}px`);
  });

  it("still fits Reps when the root font is larger, and on a 320px-wide phone", () => {
    assert.ok(gridMinWidthPx(compactHistoryGridClassName, false, 20) <= zenfone10GridContentPx(360));
    assert.ok(gridMinWidthPx(compactHistoryGridClassName, false, 16) <= zenfone10GridContentPx(320));
  });

  it("fits the type column once the grid is at least 22rem", () => {
    const widePx = 22 * 16;
    assert.ok(gridMinWidthPx(compactHistoryGridClassName, true, 16) <= widePx);
    assert.ok(gridMinWidthPx(compactHistoryAssistanceGridClassName, true, 16) <= widePx);
  });

  it("is what the set history section renders", () => {
    assert.match(sectionSource, /compactHistoryGridClass/);
    assert.match(sectionSource, /compactHistoryFrameClassName/);
    assert.match(sectionSource, /compactHistoryCellPaddingClassName/);
    assert.equal(historyTableClassName, "table-fixed");
    assert.match(sectionSource, /historyTableClassName/);
    assert.match(sectionSource, /appTableHeadRowClassName/);
    assert.match(sectionSource, /AppTable/);
    assert.doesNotMatch(sectionSource, /min-w-\[760px\]/);
  });

  it("drops the type column when warmups are hidden", () => {
    assert.equal(compactHistoryGridClass(false, true).includes("4.75rem"), true);
    assert.equal(compactHistoryGridClass(false, false).includes("4.75rem"), false);
    assert.equal(compactHistoryGridClass(true, false).includes("4.75rem"), false);
    assert.match(sectionSource, /compactHistoryGridClass\(assistance, showSetType\)/);
    assert.match(sectionSource, /const showSetType = !hideWarmups/);
    assert.match(sectionSource, /hideWarmups \? null/);
  });
});
