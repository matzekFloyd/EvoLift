import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  BODYWEIGHT_DATE_FUTURE,
  BODYWEIGHT_DATE_INVALID,
  BODYWEIGHT_DATE_TAKEN,
  BODYWEIGHT_INVALID,
  BODYWEIGHT_RANGE,
  bodyweightInputError,
  bodyweightLogEntryError,
  bodyweightOnOrBefore,
  latestBodyweightEntry,
  parseBodyweightKg,
} from "./bodyweight-log";

const entries = [
  { loggedOn: "2026-09-01", bodyweightKg: 80 },
  { loggedOn: "2026-10-10", bodyweightKg: 82.5 },
];

describe("bodyweightOnOrBefore", () => {
  it("uses the latest entry on or before the date", () => {
    assert.equal(bodyweightOnOrBefore(entries, "2026-09-01"), 80);
    assert.equal(bodyweightOnOrBefore(entries, "2026-10-09"), 80);
    assert.equal(bodyweightOnOrBefore(entries, "2026-10-10"), 82.5);
    assert.equal(bodyweightOnOrBefore(entries, "2026-10-15"), 82.5);
  });

  it("returns nothing when every entry is later", () => {
    assert.equal(bodyweightOnOrBefore(entries, "2026-08-31"), null);
    assert.equal(bodyweightOnOrBefore([], "2026-10-10"), null);
  });
});

describe("latestBodyweightEntry", () => {
  it("returns the newest date", () => {
    assert.deepEqual(latestBodyweightEntry(entries), entries[1]);
    assert.equal(latestBodyweightEntry([]), null);
  });
});

describe("bodyweight log validation", () => {
  it("names the field when the weight is missing, invalid, or out of range", () => {
    assert.equal(bodyweightInputError(""), null);
    assert.equal(bodyweightInputError("80"), null);
    assert.equal(bodyweightInputError("nope"), BODYWEIGHT_INVALID);
    assert.equal(bodyweightInputError("19.9"), BODYWEIGHT_RANGE);
    assert.equal(bodyweightInputError("400.1"), BODYWEIGHT_RANGE);
    assert.equal(
      bodyweightLogEntryError({
        bodyweightKg: "",
        loggedOn: "2026-10-01",
        today: "2026-10-15",
        takenDates: [],
      }),
      BODYWEIGHT_INVALID,
    );
    assert.equal(parseBodyweightKg("82.5"), 82.5);
    assert.equal(parseBodyweightKg("nope"), null);
  });

  it("rejects a bad date, a future date, and a date that already has an entry", () => {
    assert.equal(
      bodyweightLogEntryError({
        bodyweightKg: "80",
        loggedOn: "14 Oct",
        today: "2026-10-15",
        takenDates: [],
      }),
      BODYWEIGHT_DATE_INVALID,
    );
    assert.equal(
      bodyweightLogEntryError({
        bodyweightKg: "80",
        loggedOn: "2026-10-16",
        today: "2026-10-15",
        takenDates: [],
      }),
      BODYWEIGHT_DATE_FUTURE,
    );
    assert.equal(
      bodyweightLogEntryError({
        bodyweightKg: "80",
        loggedOn: "2026-10-01",
        today: "2026-10-15",
        takenDates: ["2026-10-01"],
      }),
      BODYWEIGHT_DATE_TAKEN,
    );
    assert.equal(
      bodyweightLogEntryError({
        bodyweightKg: "80",
        loggedOn: "2026-10-15",
        today: "2026-10-15",
        takenDates: [],
      }),
      null,
    );
  });
});
