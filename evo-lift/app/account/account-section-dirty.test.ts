import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  accountEmailChanged,
  accountFieldsChanged,
  accountPasswordChanged,
} from "./account-section-dirty";

describe("accountFieldsChanged", () => {
  it("stays unchanged until a saved field differs", () => {
    const saved = { heightCm: "180", suggestTarget: true };
    assert.equal(accountFieldsChanged(saved, { heightCm: "180", suggestTarget: true }), false);
    assert.equal(accountFieldsChanged(saved, { heightCm: " 180 ", suggestTarget: true }), false);
    assert.equal(accountFieldsChanged(saved, { heightCm: "181", suggestTarget: true }), true);
    assert.equal(accountFieldsChanged(saved, { heightCm: "180", suggestTarget: false }), true);
  });
});

describe("accountEmailChanged", () => {
  it("ignores a blank or identical address", () => {
    assert.equal(accountEmailChanged("lifter@example.com", ""), false);
    assert.equal(accountEmailChanged("lifter@example.com", "  Lifter@example.com "), false);
    assert.equal(accountEmailChanged("lifter@example.com", "next@example.com"), true);
  });
});

describe("accountPasswordChanged", () => {
  it("stays unchanged until a password field has text", () => {
    const empty = { currentPassword: "", newPassword: "", confirmNewPassword: "" };
    assert.equal(accountPasswordChanged(empty), false);
    assert.equal(accountPasswordChanged({ ...empty, newPassword: "longer-password" }), true);
  });
});
