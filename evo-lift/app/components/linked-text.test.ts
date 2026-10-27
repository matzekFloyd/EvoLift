import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { linkedTextOpensInNewTab, linkedTextParts } from "./linked-text";

describe("linked text", () => {
  it("turns a site address, an email, and a named page into anchors", () => {
    assert.deepEqual(
      linkedTextParts("EvoLift at https://evolift.at stores the data needed to run your account."),
      [
        { type: "text", value: "EvoLift at " },
        { type: "link", value: "https://evolift.at", href: "https://evolift.at" },
        { type: "text", value: " stores the data needed to run your account." },
      ],
    );
    assert.deepEqual(linkedTextParts("Email contact@evolift.at."), [
      { type: "text", value: "Email " },
      { type: "link", value: "contact@evolift.at", href: "mailto:contact@evolift.at" },
      { type: "text", value: "." },
    ]);
    assert.deepEqual(linkedTextParts("Email contact@evolift.at with questions about the service."), [
      { type: "text", value: "Email " },
      { type: "link", value: "contact@evolift.at", href: "mailto:contact@evolift.at" },
      { type: "text", value: " with questions about the service." },
    ]);
    assert.deepEqual(linkedTextParts("named on the legal notice. How that data is stored is described in the privacy policy."), [
      { type: "text", value: "named on the " },
      { type: "link", value: "legal notice", href: "/legal" },
      { type: "text", value: ". How that data is stored is described in the " },
      { type: "link", value: "privacy policy", href: "/privacy" },
      { type: "text", value: "." },
    ]);
  });

  it("leaves ordinary sentences as text", () => {
    assert.deepEqual(linkedTextParts("You can delete the account from Account."), [
      { type: "text", value: "You can delete the account from Account." },
    ]);
  });

  it("opens only an outside website in a new tab", () => {
    assert.equal(linkedTextOpensInNewTab("https://evolift.at"), false);
    assert.equal(linkedTextOpensInNewTab("mailto:contact@evolift.at"), false);
    assert.equal(linkedTextOpensInNewTab("/legal"), false);
    assert.equal(linkedTextOpensInNewTab("https://exrx.net"), true);
  });
});
