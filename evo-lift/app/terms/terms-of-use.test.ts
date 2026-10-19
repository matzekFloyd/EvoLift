import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";
import { TERMS_OF_USE_HREF, termsOfUseSections } from "./terms-of-use";

const text = termsOfUseSections
  .flatMap((section) => [section.heading, ...section.paragraphs])
  .join(" ");

describe("terms of use", () => {
  it("is a public page and covers accounts, API tokens, and the Play app", () => {
    assert.equal(TERMS_OF_USE_HREF, "/terms");
    for (const phrase of [
      PUBLIC_APP_ORIGIN,
      "email and password",
      "delete the account",
      "privacy policy",
      "personal API tokens",
      "Google Play",
      "Not medical advice",
      "agree to these terms",
    ]) {
      assert.ok(text.includes(phrase), phrase);
    }
  });

  it("stays plain and does not sell the product with hype", () => {
    assert.doesNotMatch(text, /guaranteed| forever|revolutionary|best app/i);
  });
});
