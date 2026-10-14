import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  coalesceNewSessionDraftPerformedOn,
  formatDateToYyyyMmDd,
  getDefaultRollingYearDateRange,
  getTodayYyyyMmDd,
  isFutureSessionDate,
  normalizeSessionDateOnly,
} from "./session-date";

function localToday(): string {
  return formatDateToYyyyMmDd(new Date());
}

function shiftDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateToYyyyMmDd(date);
}

describe("session dates", () => {
  it("keeps the calendar day from a date or a datetime", () => {
    assert.equal(normalizeSessionDateOnly("2026-10-14"), "2026-10-14");
    assert.equal(normalizeSessionDateOnly("2026-10-14T18:30:00Z"), "2026-10-14");
  });

  it("formats a local calendar day", () => {
    assert.equal(formatDateToYyyyMmDd(new Date(2026, 0, 5)), "2026-01-05");
    assert.equal(getTodayYyyyMmDd(), localToday());
  });

  it("uses today and one local year back as the default range", () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    assert.deepEqual(getDefaultRollingYearDateRange(), {
      from: formatDateToYyyyMmDd(oneYearAgo),
      to: formatDateToYyyyMmDd(today),
    });
  });

  it("replaces an invalid or past draft date with today and keeps a future date", () => {
    assert.equal(coalesceNewSessionDraftPerformedOn("not-a-date"), localToday());
    assert.equal(coalesceNewSessionDraftPerformedOn(` ${shiftDays(-3)} `), localToday());
    assert.equal(coalesceNewSessionDraftPerformedOn(shiftDays(4)), shiftDays(4));
    assert.equal(coalesceNewSessionDraftPerformedOn(localToday()), localToday());
  });

  it("treats a date after today as planned", () => {
    assert.equal(isFutureSessionDate(shiftDays(1)), true);
    assert.equal(isFutureSessionDate(localToday()), false);
    assert.equal(isFutureSessionDate(`${shiftDays(-1)}T12:00:00Z`), false);
  });
});
