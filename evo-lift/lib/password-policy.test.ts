import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_CONFIRM_HINT,
  PASSWORD_STRENGTH_HINT,
  passwordStrengthError,
} from "./password-policy";

describe("password policy", () => {
  it("requires eight characters plus a letter and a number", () => {
    assert.equal(MIN_PASSWORD_LENGTH, 8);
    assert.equal(
      PASSWORD_STRENGTH_HINT,
      "At least 8 characters, with a letter and a number.",
    );
    assert.equal(PASSWORD_CONFIRM_HINT, "Enter the same password again.");
    assert.equal(passwordStrengthError("short1"), "Password must be at least 8 characters.");
    assert.equal(
      passwordStrengthError("longpassword"),
      "Password must include at least one letter and one number.",
    );
    assert.equal(passwordStrengthError("longpass1"), null);
  });

  it("uses the New password label for account updates", () => {
    assert.equal(
      passwordStrengthError("short1", "New password"),
      "New password must be at least 8 characters.",
    );
    assert.equal(
      passwordStrengthError("longpassword", "New password"),
      "New password must include at least one letter and one number.",
    );
  });
});
