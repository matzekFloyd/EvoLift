import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";
import { OPERATOR_EMAIL, OPERATOR_NAME } from "@/app/legal/legal-notice";
import { PRIVACY_POLICY_HREF, privacyPolicySections } from "./privacy-policy";

const text = privacyPolicySections
  .flatMap((section) => [section.heading, ...section.paragraphs])
  .join(" ");

describe("privacy policy", () => {
  it("is a public page and covers the data the account stores", () => {
    assert.equal(PRIVACY_POLICY_HREF, "/privacy");
    for (const phrase of [
      PUBLIC_APP_ORIGIN,
      "email",
      "password held by Supabase Auth",
      "Google or Apple",
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
      OPERATOR_NAME,
      OPERATOR_EMAIL,
      "legal notice",
      "Supabase stores the account and the workout data",
      "Vercel hosts the site",
      "Resend sends confirm, reset, and email-change messages",
      "receives the sign-in only when you use that button",
      "kept while the account exists",
      "ask for a copy or a correction",
    ]) {
      assert.ok(text.includes(phrase), phrase);
    }
  });

  it("does not describe ads, sale of data, or analytics", () => {
    assert.doesNotMatch(text, /ads|analytics|sell|sale of data|cookie/i);
  });
});
