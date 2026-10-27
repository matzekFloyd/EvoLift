import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  LEGAL_NOTICE_HREF,
  OPERATOR_EMAIL,
  OPERATOR_NAME,
  OPERATOR_POSTAL_ADDRESS,
  legalNoticeSections,
} from "./legal-notice";

const text = legalNoticeSections
  .flatMap((section) => [section.heading, ...section.paragraphs])
  .join(" ");

describe("legal notice", () => {
  it("is a public page and names the operator, a postal address, and an email", () => {
    assert.equal(LEGAL_NOTICE_HREF, "/legal");
    assert.equal(OPERATOR_NAME, "Mathias Mayrhofer");
    assert.equal(OPERATOR_EMAIL, "evolift@mathiasmayrhofer.at");
    assert.equal(OPERATOR_POSTAL_ADDRESS, "-");
    for (const phrase of [OPERATOR_NAME, OPERATOR_EMAIL, OPERATOR_POSTAL_ADDRESS, "runs EvoLift"]) {
      assert.ok(text.includes(phrase), phrase);
    }
  });

  it("does not describe ads, sale of data, or analytics", () => {
    assert.doesNotMatch(text, /\bads\b|\banalytics\b|\bsell\b|sale of data|\bcookie\b/i);
  });
});
