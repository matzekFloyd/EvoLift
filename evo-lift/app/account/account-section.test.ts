import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { accountSectionFromSearchParam, accountSectionPath } from "@/app/account/account-section";
import { appPath } from "@/lib/app-paths";

describe("account section search param", () => {
  it("selects body metrics for the first-login tour", () => {
    assert.equal(accountSectionFromSearchParam("profile"), "profile");
  });

  it("opens Settings on the Body metrics tab", () => {
    assert.equal(accountSectionPath("profile"), `${appPath("/account")}?section=profile`);
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
