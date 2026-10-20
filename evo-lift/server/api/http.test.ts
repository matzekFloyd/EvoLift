import assert from "node:assert/strict";
import { NextResponse, type NextRequest } from "next/server";
import { afterEach, describe, it, vi } from "vitest";
import {
  API_UNEXPECTED_ERROR_MESSAGE,
  ApiHttpError,
  handleApi,
  jsonUnexpectedError,
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
import {
  API_USER_LIMIT_PER_WINDOW,
  RATE_LIMIT_MESSAGE,
  resetRateLimitStore,
} from "@/server/rate-limit";

const authenticateApiRequest = vi.fn();

vi.mock("@/server/auth/api-request", () => ({
  authenticateApiRequest: (...args: unknown[]) => authenticateApiRequest(...args),
}));

afterEach(() => {
  authenticateApiRequest.mockReset();
  resetRateLimitStore();
});

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

describe("API auth failures", () => {
  it("logs a structured security event without echoing credentials", async () => {
    authenticateApiRequest.mockResolvedValue({
      status: 401,
      error: "Missing bearer token. Use a personal API token from Account or a session access token.",
    });
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const request = {
        method: "GET",
        nextUrl: { pathname: "/api/sessions" },
        headers: new Headers(),
      } as NextRequest;
      const response = await handleApi(request, async () => {
        throw new Error("handler should not run");
      });
      assert.equal(response.status, 401);
      assert.equal(consoleInfo.mock.calls.length, 1);
      const line = String(consoleInfo.mock.calls[0]?.[0] ?? "");
      const parsed = JSON.parse(line) as Record<string, unknown>;
      assert.equal(parsed.channel, "security");
      assert.equal(parsed.type, "api_auth_failed");
      assert.equal(parsed.reason, "missing_bearer");
      assert.equal(parsed.path, "/api/sessions");
      assert.equal(line.includes("Bearer"), false);
      assert.equal(line.includes("evo_"), false);
    } finally {
      consoleInfo.mockRestore();
    }
  });
});

describe("API rate limits", () => {
  it("returns 429 with Retry-After after the per-user budget is spent", async () => {
    authenticateApiRequest.mockResolvedValue({
      userId: "user-rate",
      client: {},
      bypassesRls: false,
    });
    const request = {
      method: "GET",
      nextUrl: { pathname: "/api/sessions" },
      headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
    } as NextRequest;

    for (let i = 0; i < API_USER_LIMIT_PER_WINDOW; i += 1) {
      const ok = await handleApi(request, async () => new NextResponse(null, { status: 204 }));
      assert.equal(ok.status, 204);
    }

    const limited = await handleApi(request, async () => {
      throw new Error("handler should not run when rate limited");
    });
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { error: RATE_LIMIT_MESSAGE });
    assert.ok(Number(limited.headers.get("Retry-After")) >= 1);
  });
});

describe("unexpected API errors", () => {
  it("returns a generic 500 body and logs the real error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const leaked = new Error(
        'Failed to list workout sessions: relation "workout_sessions" does not exist',
      );
      const response = jsonUnexpectedError(leaked);
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: API_UNEXPECTED_ERROR_MESSAGE });
      assert.match(API_UNEXPECTED_ERROR_MESSAGE, /try again/i);
      assert.equal(API_UNEXPECTED_ERROR_MESSAGE.includes("relation"), false);
      assert.equal(consoleError.mock.calls.length, 1);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps ApiHttpError copy and hides unexpected handler failures", async () => {
    authenticateApiRequest.mockResolvedValue({
      userId: "user-1",
      client: {},
      bypassesRls: false,
    });

    const okRequest = {
      method: "GET",
      nextUrl: { pathname: "/api/sessions" },
      headers: new Headers(),
    } as NextRequest;
    const validation = await handleApi(okRequest, async () => {
      throw new ApiHttpError(400, "Please enter a valid reps.");
    });
    assert.equal(validation.status, 400);
    assert.deepEqual(await validation.json(), { error: "Please enter a valid reps." });

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const unexpected = await handleApi(okRequest, async () => {
        throw new Error('duplicate key value violates unique constraint "workout_sets_pkey"');
      });
      assert.equal(unexpected.status, 500);
      const body = await unexpected.json();
      assert.deepEqual(body, { error: API_UNEXPECTED_ERROR_MESSAGE });
      assert.equal(String(body.error).includes("duplicate key"), false);
      assert.equal(consoleError.mock.calls.length, 1);
    } finally {
      consoleError.mockRestore();
    }
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
