import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { accountHasEmailPassword } from "./account-has-password";

describe("accountHasEmailPassword", () => {
  it("treats a missing identity list as a password account", () => {
    assert.equal(accountHasEmailPassword(undefined), true);
    assert.equal(accountHasEmailPassword(null), true);
  });

  it("is true only when an email identity is present", () => {
    assert.equal(accountHasEmailPassword([{ provider: "email" }]), true);
    assert.equal(
      accountHasEmailPassword([{ provider: "google" }, { provider: "email" }]),
      true,
    );
    assert.equal(accountHasEmailPassword([{ provider: "google" }]), false);
    assert.equal(accountHasEmailPassword([{ provider: "apple" }]), false);
    assert.equal(accountHasEmailPassword([]), false);
  });
});
