import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  APP_DOCUMENT_TITLE,
  exercisePageTitle,
  formatDocumentTitle,
  workoutSessionPageTitle,
} from "./page-title";

describe("formatDocumentTitle", () => {
  it("keeps Home as the product name", () => {
    assert.equal(formatDocumentTitle(""), APP_DOCUMENT_TITLE);
    assert.equal(formatDocumentTitle("   "), APP_DOCUMENT_TITLE);
  });

  it("prefixes the page name", () => {
    assert.equal(formatDocumentTitle("Exercises"), "EvoLift - Exercises");
    assert.equal(formatDocumentTitle(" Plans "), "EvoLift - Plans");
  });
});

describe("workoutSessionPageTitle", () => {
  it("matches the session heading", () => {
    assert.equal(workoutSessionPageTitle(3), "Workout session #3");
  });
});

describe("exercisePageTitle", () => {
  it("prefers the exercise name", () => {
    assert.equal(exercisePageTitle("Back Squat", "back-squat"), "Back Squat");
  });

  it("falls back to the slug", () => {
    assert.equal(exercisePageTitle("  ", "back-squat"), "back-squat");
    assert.equal(exercisePageTitle(null, ""), null);
  });
});
