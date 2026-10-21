import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { APP_LEGAL_LINKS, GLOSSARY_HREF } from "./app-legal-links";
import { PRIVACY_POLICY_HREF } from "@/app/privacy/privacy-policy";
import { TERMS_OF_USE_HREF } from "@/app/terms/terms-of-use";

describe("APP_LEGAL_LINKS", () => {
  it("lists Glossary, Terms of use, and Privacy policy with footer labels", () => {
    assert.deepEqual(APP_LEGAL_LINKS, [
      { href: GLOSSARY_HREF, label: "Glossary" },
      { href: TERMS_OF_USE_HREF, label: "Terms of use" },
      { href: PRIVACY_POLICY_HREF, label: "Privacy policy" },
    ]);
    assert.equal(GLOSSARY_HREF, "/glossary");
    assert.equal(TERMS_OF_USE_HREF, "/terms");
    assert.equal(PRIVACY_POLICY_HREF, "/privacy");
  });
});
