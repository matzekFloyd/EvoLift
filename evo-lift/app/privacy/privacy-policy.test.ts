import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PRIVACY_POLICY_HREF, privacyPolicySections } from "./privacy-policy";

const text = privacyPolicySections
  .flatMap((section) => [section.heading, ...section.paragraphs])
  .join(" ");

describe("privacy policy", () => {
  it("is a public page and covers the data the account stores", () => {
    assert.equal(PRIVACY_POLICY_HREF, "/privacy");
    for (const phrase of [
      "https://evo-lift.vercel.app",
      "email",
      "password held by Supabase Auth",
      "workout sessions and sets",
      "templates",
      "plans",
      "goals",
      "bodyweight",
      "height",
      "sex",
      "date of birth",
      "personal API tokens",
      "used to run the account",
      "Delete account",
    ]) {
      assert.ok(text.includes(phrase), phrase);
    }
  });

  it("does not describe ads, sale of data, or analytics", () => {
    assert.doesNotMatch(text, /ads|analytics|sell|sale of data|cookie/i);
  });
});
