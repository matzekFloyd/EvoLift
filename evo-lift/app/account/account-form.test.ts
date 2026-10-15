import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  accountDeleteError,
  accountEmailUpdateError,
  accountPasswordUpdateError,
  exerciseDefaultsClearError,
  exerciseDefaultsSaveError,
  MAX_WARMUP_SETS_INVALID,
  maxWarmupSetsSaveError,
  normalizeAccountEmail,
  parseMaxWarmupSets,
} from "./account-form";

const passwordInput = {
  userEmail: "ada@example.com",
  currentPassword: "oldpass1",
  newPassword: "newpass1",
  confirmNewPassword: "newpass1",
};

const defaultsInput = {
  userId: "user-1",
  exerciseId: "ex-1",
  baseWeightKg: "",
  targetSets: "",
  targetReps: "",
  targetWeightKg: "",
  maxWarmupSets: "",
};

describe("account form", () => {
  it("rejects a new email that is not an address", () => {
    assert.equal(normalizeAccountEmail("  Ada@Example.com "), "ada@example.com");
    assert.equal(accountEmailUpdateError("ada@example.com"), null);
    assert.equal(accountEmailUpdateError("ada"), "Please enter a valid new email address.");
  });

  it("checks the current password before the new one", () => {
    assert.equal(
      accountPasswordUpdateError({ ...passwordInput, userEmail: null }),
      "Could not verify current user email. Please log in again.",
    );
    assert.equal(
      accountPasswordUpdateError({ ...passwordInput, currentPassword: "" }),
      "Please enter your current password.",
    );
    assert.equal(
      accountPasswordUpdateError({ ...passwordInput, newPassword: "short1", confirmNewPassword: "short1" }),
      "New password must be at least 8 characters.",
    );
    assert.equal(
      accountPasswordUpdateError({
        ...passwordInput,
        newPassword: "longpassword",
        confirmNewPassword: "longpassword",
      }),
      "New password must include at least one letter and one number.",
    );
    assert.equal(
      accountPasswordUpdateError({ ...passwordInput, confirmNewPassword: "newpass2" }),
      "New password and confirmation do not match.",
    );
    assert.equal(accountPasswordUpdateError(passwordInput), null);
  });

  it("requires the current password before deleting the account", () => {
    assert.equal(
      accountDeleteError({ userEmail: null, currentPassword: "oldpass1" }),
      "Could not verify current user email. Please log in again.",
    );
    assert.equal(
      accountDeleteError({ userEmail: "ada@example.com", currentPassword: "" }),
      "Please enter your current password.",
    );
    assert.equal(
      accountDeleteError({ userEmail: "ada@example.com", currentPassword: "oldpass1" }),
      null,
    );
  });

  it("allows blank exercise defaults and rejects a bad target", () => {
    assert.equal(exerciseDefaultsSaveError(defaultsInput), null);
    assert.equal(
      exerciseDefaultsSaveError({ ...defaultsInput, userId: null }),
      "Please log in again to save defaults.",
    );
    assert.equal(
      exerciseDefaultsSaveError({ ...defaultsInput, exerciseId: "" }),
      "Please select an exercise.",
    );
    assert.equal(
      exerciseDefaultsSaveError({ ...defaultsInput, baseWeightKg: "-1" }),
      "Please enter a valid base weight.",
    );
    assert.equal(
      exerciseDefaultsSaveError({ ...defaultsInput, targetSets: "0" }),
      "Please enter a valid number of target working sets.",
    );
    assert.equal(
      exerciseDefaultsSaveError({ ...defaultsInput, targetReps: "nope" }),
      "Please enter a valid target reps value for working sets.",
    );
    assert.equal(
      exerciseDefaultsSaveError({ ...defaultsInput, targetWeightKg: "-0.5" }),
      "Please enter a valid target weight (kg) for working sets.",
    );
    assert.equal(exerciseDefaultsSaveError({ ...defaultsInput, maxWarmupSets: "2" }), null);
    assert.equal(
      exerciseDefaultsSaveError({ ...defaultsInput, maxWarmupSets: "0" }),
      MAX_WARMUP_SETS_INVALID,
    );
    assert.equal(maxWarmupSetsSaveError(""), null);
    assert.equal(maxWarmupSetsSaveError("2.5"), MAX_WARMUP_SETS_INVALID);
    assert.equal(parseMaxWarmupSets(" 3 "), 3);
    assert.equal(parseMaxWarmupSets(""), null);
  });

  it("uses the clear-defaults copy when nothing is selected", () => {
    assert.equal(exerciseDefaultsClearError(null, "ex-1"), "Please log in again to clear defaults.");
    assert.equal(exerciseDefaultsClearError("user-1", ""), "Please select an exercise first.");
    assert.equal(exerciseDefaultsClearError("user-1", "ex-1"), null);
  });
});
