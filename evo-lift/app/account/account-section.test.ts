import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { accountSectionFromSearchParam } from "@/app/account/account-section";

describe("account section search param", () => {
  it("selects Profile for the first-login tour", () => {
    assert.equal(accountSectionFromSearchParam("profile"), "profile");
  });

  it("accepts the other account tabs", () => {
    assert.equal(accountSectionFromSearchParam("security"), "security");
    assert.equal(accountSectionFromSearchParam("exercises"), "exercises");
    assert.equal(accountSectionFromSearchParam("data"), "data");
  });

  it("ignores a missing or unknown section", () => {
    assert.equal(accountSectionFromSearchParam(null), null);
    assert.equal(accountSectionFromSearchParam("login"), null);
    assert.equal(accountSectionFromSearchParam(""), null);
  });
});
