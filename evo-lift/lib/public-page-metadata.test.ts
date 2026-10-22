import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { APP_DOCUMENT_TITLE } from "./page-title";
import { PUBLIC_APP_ORIGIN } from "./public-app-origin";
import {
  glossaryMetadata,
  loginMetadata,
  privacyMetadata,
  publicCanonicalUrl,
  termsMetadata,
} from "./public-page-metadata";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "app");

describe("public page metadata", () => {
  it("resolves each public path on the canonical origin", () => {
    assert.equal(publicCanonicalUrl("/"), "https://evolift.at");
    assert.equal(publicCanonicalUrl("/login"), "https://evolift.at/login");
    assert.equal(publicCanonicalUrl("/glossary"), "https://evolift.at/glossary");
    assert.equal(publicCanonicalUrl("/privacy"), "https://evolift.at/privacy");
    assert.equal(publicCanonicalUrl("/terms"), "https://evolift.at/terms");
    assert.equal(PUBLIC_APP_ORIGIN, "https://evolift.at");
  });

  it("describes logging in on the login page", () => {
    assert.deepEqual(loginMetadata, {
      title: "Log in",
      description: "Log in to your EvoLift account.",
      alternates: { canonical: "https://evolift.at/login" },
      openGraph: {
        title: "EvoLift - Log in",
        description: "Log in to your EvoLift account.",
        url: "https://evolift.at/login",
        siteName: APP_DOCUMENT_TITLE,
        type: "website",
      },
    });
  });

  it("keeps the glossary, privacy, and terms snippets and adds canonical share fields", () => {
    assert.deepEqual(glossaryMetadata, {
      title: "Glossary",
      description: "Definitions for the words EvoLift uses.",
      alternates: { canonical: "https://evolift.at/glossary" },
      openGraph: {
        title: "EvoLift - Glossary",
        description: "Definitions for the words EvoLift uses.",
        url: "https://evolift.at/glossary",
        siteName: APP_DOCUMENT_TITLE,
        type: "website",
      },
    });
    assert.deepEqual(privacyMetadata, {
      title: "Privacy policy",
      description: "What EvoLift stores for an account, and how to delete it.",
      alternates: { canonical: "https://evolift.at/privacy" },
      openGraph: {
        title: "EvoLift - Privacy policy",
        description: "What EvoLift stores for an account, and how to delete it.",
        url: "https://evolift.at/privacy",
        siteName: APP_DOCUMENT_TITLE,
        type: "website",
      },
    });
    assert.deepEqual(termsMetadata, {
      title: "Terms of use",
      description: "Terms for using EvoLift accounts, the app, and personal API tokens.",
      alternates: { canonical: "https://evolift.at/terms" },
      openGraph: {
        title: "EvoLift - Terms of use",
        description: "Terms for using EvoLift accounts, the app, and personal API tokens.",
        url: "https://evolift.at/terms",
        siteName: APP_DOCUMENT_TITLE,
        type: "website",
      },
    });
  });

  it("sets metadataBase on the root layout and uses these snippets on the public pages", () => {
    const read = (...parts: string[]) => readFileSync(join(appDir, ...parts), "utf8");

    assert.match(read("layout.tsx"), /metadataBase: new URL\(PUBLIC_APP_ORIGIN\)/);
    assert.match(read("login", "layout.tsx"), /loginMetadata/);
    assert.match(read("(shell)", "glossary", "page.tsx"), /glossaryMetadata/);
    assert.match(read("(shell)", "privacy", "page.tsx"), /privacyMetadata/);
    assert.match(read("(shell)", "terms", "page.tsx"), /termsMetadata/);
  });
});
