import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildChartAxisTickLabel,
  formatChartAxisDate,
  formatDateOnlyForLocale,
} from "./date-format";

describe("formatDateOnlyForLocale", () => {
  it("formats a calendar day for the current locale", () => {
    const formatted = formatDateOnlyForLocale("2026-10-14");
    assert.match(formatted, /2026/);
    assert.match(formatted, /14/);
  });
});

describe("chart axis date labels", () => {
  it("uses a short month and day by default", () => {
    const formatted = formatChartAxisDate("2026-10-14");
    assert.match(formatted, /14/);
    assert.equal(formatted.includes("2026"), false);
  });

  it("includes the year when requested", () => {
    assert.match(formatChartAxisDate("2026-10-14", { includeYear: true }), /2026/);
  });

  it("adds a suffix for later sessions on the same day", () => {
    assert.equal(buildChartAxisTickLabel("2026-10-14", 1, 2).includes("("), false);
    assert.match(buildChartAxisTickLabel("2026-10-14", 2, 2), /\(2\)/);
  });
});
