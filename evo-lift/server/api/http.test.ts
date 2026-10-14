import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { describe, it, vi } from "vitest";
import {
  ApiHttpError,
  MAX_SESSION_NOTES_LENGTH,
  parseOptionalDateQuery,
  parseOptionalNonNegativeNumber,
  parseOptionalNotes,
  parseOptionalPositiveInt,
  parseOptionalUuid,
  parseRequiredDate,
  parseRequiredPositiveInt,
  readJsonObject,
  requireUuid,
} from "./http";

vi.mock("@/server/auth/api-request", () => ({
  authenticateApiRequest: async () => ({ error: "Unauthorized", status: 401 }),
}));

const EXERCISE_ID = "123e4567-e89b-12d3-a456-426614174000";

function requestReturning(body: () => Promise<unknown>): NextRequest {
  return { json: body } as unknown as NextRequest;
}

function messageOf(run: () => void): string {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof ApiHttpError);
    assert.equal(error.status, 400);
    return error.message;
  }
  assert.fail("expected an ApiHttpError");
}

describe("API ids and dates", () => {
  it("accepts a UUID and rejects anything else", () => {
    assert.equal(requireUuid(EXERCISE_ID, "exercise_id"), EXERCISE_ID);
    assert.equal(requireUuid(EXERCISE_ID.toUpperCase(), "exercise_id"), EXERCISE_ID.toUpperCase());
    assert.equal(messageOf(() => requireUuid("not-a-uuid", "exercise_id")), "Please provide a valid exercise_id.");
    assert.equal(parseOptionalUuid(undefined, "source_template_id"), undefined);
    assert.equal(parseOptionalUuid(null, "source_template_id"), undefined);
    assert.equal(parseOptionalUuid(EXERCISE_ID, "source_template_id"), EXERCISE_ID);
    assert.equal(
      messageOf(() => parseOptionalUuid("not-a-uuid", "source_template_id")),
      "Please provide a valid source_template_id.",
    );
  });

  it("requires YYYY-MM-DD and lets an empty query date through", () => {
    assert.equal(parseRequiredDate("2026-10-14", "performed_on"), "2026-10-14");
    assert.equal(
      messageOf(() => parseRequiredDate("2026-10-14T00:00:00Z", "performed_on")),
      "Please enter a valid performed_on (YYYY-MM-DD).",
    );
    assert.equal(
      messageOf(() => parseRequiredDate(20261014, "performed_on")),
      "Please enter a valid performed_on (YYYY-MM-DD).",
    );
    assert.equal(parseOptionalDateQuery(null, "from"), undefined);
    assert.equal(parseOptionalDateQuery("", "from"), undefined);
    assert.equal(parseOptionalDateQuery("2026-01-01", "from"), "2026-01-01");
    assert.equal(
      messageOf(() => parseOptionalDateQuery("01-01-2026", "from")),
      "Please enter a valid from (YYYY-MM-DD).",
    );
  });
});

describe("API reps, loaded weight, and notes", () => {
  it("requires a positive whole number of reps", () => {
    assert.equal(parseRequiredPositiveInt(1, "reps"), 1);
    assert.equal(parseRequiredPositiveInt(12, "reps"), 12);
    assert.equal(messageOf(() => parseRequiredPositiveInt(0, "reps")), "Please enter a valid reps.");
    assert.equal(messageOf(() => parseRequiredPositiveInt(1.5, "reps")), "Please enter a valid reps.");
    assert.equal(messageOf(() => parseRequiredPositiveInt(-1, "reps")), "Please enter a valid reps.");
    assert.equal(messageOf(() => parseRequiredPositiveInt("8", "reps")), "Please enter a valid reps.");
    assert.equal(parseOptionalPositiveInt(undefined, "target_reps"), undefined);
    assert.equal(parseOptionalPositiveInt(null, "target_reps"), null);
    assert.equal(parseOptionalPositiveInt(8, "target_reps"), 8);
    assert.equal(
      messageOf(() => parseOptionalPositiveInt(0, "target_reps")),
      "Please enter a valid target_reps.",
    );
  });

  it("allows a loaded weight of 0 kg and rejects a negative or non-numeric weight", () => {
    assert.equal(parseOptionalNonNegativeNumber(undefined, "weight_kg"), undefined);
    assert.equal(parseOptionalNonNegativeNumber(null, "weight_kg"), null);
    assert.equal(parseOptionalNonNegativeNumber(0, "weight_kg"), 0);
    assert.equal(parseOptionalNonNegativeNumber(62.5, "weight_kg"), 62.5);
    assert.equal(
      messageOf(() => parseOptionalNonNegativeNumber(-0.1, "weight_kg")),
      "Please enter a valid weight_kg.",
    );
    assert.equal(
      messageOf(() => parseOptionalNonNegativeNumber(Number.NaN, "weight_kg")),
      "Please enter a valid weight_kg.",
    );
    assert.equal(
      messageOf(() => parseOptionalNonNegativeNumber("60", "weight_kg")),
      "Please enter a valid weight_kg.",
    );
  });

  it("trims notes and stops at 500 characters", () => {
    assert.equal(parseOptionalNotes(undefined, "notes"), undefined);
    assert.equal(parseOptionalNotes(null, "notes"), null);
    assert.equal(parseOptionalNotes("  pause  ", "notes"), "pause");
    assert.equal(parseOptionalNotes("   ", "notes"), null);
    assert.equal(parseOptionalNotes("a".repeat(MAX_SESSION_NOTES_LENGTH), "notes")?.length, 500);
    assert.equal(
      messageOf(() => parseOptionalNotes("a".repeat(MAX_SESSION_NOTES_LENGTH + 1), "notes")),
      "notes cannot be longer than 500 characters.",
    );
    assert.equal(messageOf(() => parseOptionalNotes(12, "notes")), "notes must be a string or null.");
  });
});

describe("readJsonObject", () => {
  it("requires a JSON object", async () => {
    assert.deepEqual(
      await readJsonObject(requestReturning(async () => ({ performed_on: "2026-10-14" }))),
      { performed_on: "2026-10-14" },
    );

    await assert.rejects(
      () => readJsonObject(requestReturning(async () => Promise.reject(new Error("bad")))),
      (error: unknown) => {
        assert.ok(error instanceof ApiHttpError);
        assert.equal(error.message, "Request body must be valid JSON.");
        return true;
      },
    );
    await assert.rejects(
      () => readJsonObject(requestReturning(async () => [])),
      (error: unknown) => {
        assert.ok(error instanceof ApiHttpError);
        assert.equal(error.message, "Request body must be a JSON object.");
        return true;
      },
    );
  });
});
