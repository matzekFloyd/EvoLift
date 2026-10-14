import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatDateOnlyForLocale } from "./date-format";

describe("formatDateOnlyForLocale", () => {
  it("formats a calendar day for the current locale", () => {
    const formatted = formatDateOnlyForLocale("2026-10-14");
    assert.match(formatted, /2026/);
    assert.match(formatted, /14/);
  });
});
