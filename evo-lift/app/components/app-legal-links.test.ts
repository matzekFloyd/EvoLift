import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  APP_LEGAL_LINKS,
  GLOSSARY_HREF,
  legalLinkAriaCurrent,
  legalLinkClassName,
  legalLinkClassNameFor,
} from "./app-legal-links";
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

  it("marks only the matching legal page as current and underlines it", () => {
    assert.equal(legalLinkAriaCurrent("/glossary", GLOSSARY_HREF), "page");
    assert.equal(legalLinkAriaCurrent("/glossary/extra", GLOSSARY_HREF), undefined);
    assert.equal(legalLinkAriaCurrent("/terms", GLOSSARY_HREF), undefined);
    assert.match(legalLinkClassName, /focus-visible:ring-2/);
    assert.equal(legalLinkClassNameFor(true).endsWith(" underline"), true);
    assert.equal(legalLinkClassNameFor(false).endsWith(" underline"), false);
  });
});
