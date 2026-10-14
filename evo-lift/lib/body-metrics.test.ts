import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  ageFromDateOfBirth,
  approximateAge,
  birthYearFromDate,
  resolveLifterAge,
  validateBodyMetricsInput,
  type BodyMetricsFields,
} from "./body-metrics";

const TODAY = "2026-10-14";

function fields(overrides: Partial<BodyMetricsFields> = {}): BodyMetricsFields {
  return {
    bodyweightKg: "",
    heightCm: "",
    sex: "",
    dateOfBirth: "",
    ...overrides,
  };
}

describe("validateBodyMetricsInput", () => {
  it("accepts an empty profile", () => {
    assert.deepEqual(validateBodyMetricsInput(fields(), TODAY), {
      ok: true,
      value: { bodyweight_kg: null, height_cm: null, sex: null, date_of_birth: null },
    });
  });

  it("rejects a bodyweight outside 20 to 400 kg", () => {
    assert.deepEqual(validateBodyMetricsInput(fields({ bodyweightKg: "nope" }), TODAY), {
      ok: false,
      message: "Please enter a valid bodyweight.",
    });
    assert.equal(validateBodyMetricsInput(fields({ bodyweightKg: "19.9" }), TODAY).ok, false);
    assert.equal(validateBodyMetricsInput(fields({ bodyweightKg: "400.1" }), TODAY).ok, false);
    assert.equal(validateBodyMetricsInput(fields({ bodyweightKg: "20" }), TODAY).ok, true);
    assert.equal(validateBodyMetricsInput(fields({ bodyweightKg: "400" }), TODAY).ok, true);
    const low = validateBodyMetricsInput(fields({ bodyweightKg: "19.9" }), TODAY);
    assert.equal(low.ok, false);
    if (!low.ok) {
      assert.equal(low.message, "Bodyweight must be between 20 and 400 kg.");
    }
  });

  it("rejects a height outside 100 to 250 cm", () => {
    assert.deepEqual(validateBodyMetricsInput(fields({ heightCm: "tall" }), TODAY), {
      ok: false,
      message: "Please enter a valid height.",
    });
    const high = validateBodyMetricsInput(fields({ heightCm: "251" }), TODAY);
    assert.equal(high.ok, false);
    if (!high.ok) {
      assert.equal(high.message, "Height must be between 100 and 250 cm.");
    }
    assert.equal(validateBodyMetricsInput(fields({ heightCm: "100" }), TODAY).ok, true);
    assert.equal(validateBodyMetricsInput(fields({ heightCm: "250" }), TODAY).ok, true);
  });

  it("accepts female or male and rejects any other sex", () => {
    assert.deepEqual(validateBodyMetricsInput(fields({ sex: "Female" }), TODAY), {
      ok: false,
      message: "Please choose female or male, or leave sex unset.",
    });
    const parsed = validateBodyMetricsInput(fields({ sex: " female " }), TODAY);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.sex, "female");
    }
  });

  it("rejects an impossible, too-early, or future date of birth", () => {
    assert.deepEqual(validateBodyMetricsInput(fields({ dateOfBirth: "2026-02-31" }), TODAY), {
      ok: false,
      message: "Please enter a valid date of birth.",
    });
    assert.deepEqual(validateBodyMetricsInput(fields({ dateOfBirth: "1899-12-31" }), TODAY), {
      ok: false,
      message: "Date of birth must be between 1900 and today.",
    });
    assert.deepEqual(validateBodyMetricsInput(fields({ dateOfBirth: "2026-10-15" }), TODAY), {
      ok: false,
      message: "Date of birth must be between 1900 and today.",
    });
    const parsed = validateBodyMetricsInput(fields({ dateOfBirth: "1990-05-01" }), TODAY);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.date_of_birth, "1990-05-01");
    }
  });
});

describe("lifter age", () => {
  it("counts a birthday that has not happened yet", () => {
    const today = new Date(2026, 9, 14);
    assert.equal(ageFromDateOfBirth("1990-10-15", today), 35);
    assert.equal(ageFromDateOfBirth("1990-10-14", today), 36);
    assert.equal(ageFromDateOfBirth("2026-02-31"), null);
    assert.equal(approximateAge(null, 2026), null);
    assert.equal(approximateAge(1990, 2026), 36);
  });

  it("prefers a date of birth and marks a birth year as approximate", () => {
    const today = new Date(2026, 9, 14);
    assert.deepEqual(
      resolveLifterAge({ dateOfBirth: "1990-10-14", birthYear: 1980, today }),
      { ageYears: 36, ageIsApproximate: false },
    );
    assert.deepEqual(resolveLifterAge({ dateOfBirth: null, birthYear: 1990, today }), {
      ageYears: 36,
      ageIsApproximate: true,
    });
    assert.equal(resolveLifterAge({ dateOfBirth: null, birthYear: 2027, today }), null);
    assert.equal(resolveLifterAge({ dateOfBirth: null, birthYear: null, today }), null);
  });

  it("reads a birth year from the start of a date", () => {
    assert.equal(birthYearFromDate(null), null);
    assert.equal(birthYearFromDate("1990-05-01"), 1990);
    assert.equal(birthYearFromDate("abcd"), null);
  });
});
