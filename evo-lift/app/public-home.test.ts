import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";
import {
  PUBLIC_HOME_CTA_HREF,
  PUBLIC_HOME_CTA_LABEL,
  PUBLIC_HOME_HEADING,
  PUBLIC_HOME_PRIVACY_LABEL,
  PUBLIC_HOME_TERMS_LABEL,
  publicHomeMetadata,
} from "./public-home";

const appDir = dirname(fileURLToPath(import.meta.url));

describe("public home", () => {
  it("uses the product name and one-line statement as the search snippet", () => {
    assert.equal(PUBLIC_HOME_HEADING, "Log workouts, plans, and progress.");
    assert.deepEqual(publicHomeMetadata, {
      title: { absolute: APP_DOCUMENT_TITLE },
      description: PUBLIC_HOME_HEADING,
      alternates: { canonical: PUBLIC_APP_ORIGIN },
    });
    assert.equal(APP_DOCUMENT_TITLE, "EvoLift");
    assert.equal(PUBLIC_APP_ORIGIN, "https://evolift.at");
    assert.equal("openGraph" in publicHomeMetadata, false);
  });

  it("sends Start lifting to the login page", () => {
    assert.equal(PUBLIC_HOME_CTA_LABEL, "Start lifting");
    assert.equal(PUBLIC_HOME_CTA_HREF, "/login");
    assert.equal(PUBLIC_HOME_TERMS_LABEL, "Terms of use");
    assert.equal(PUBLIC_HOME_PRIVACY_LABEL, "Privacy policy");
  });

  it("renders one heading outside the signed-in shell", () => {
    const page = readFileSync(join(appDir, "page.tsx"), "utf8");

    assert.equal(page.match(/<h1\b/g)?.length, 1);
    assert.match(page, /PUBLIC_HOME_HEADING/);
    assert.match(page, /text-balance text-center text-3xl font-medium leading-tight tracking-tight text-zinc-900/);
    assert.match(page, /flex w-full flex-col items-center text-center/);
    assert.match(page, /from-sky-200 via-sky-100 to-sky-50/);
    assert.match(page, /markClassName="h-12 w-12"/);
    assert.match(page, /PageFrame/);
    assert.match(page, /EvoLiftBrand/);
    assert.match(page, /ActionLink/);
    assert.match(page, /variant="primary"/);
    assert.match(page, /PUBLIC_HOME_CTA_LABEL/);
    assert.match(page, /prefetch=\{false\}/);
    assert.doesNotMatch(page, /max-w-\[28rem\]|mt-auto|PUBLIC_HOME_REGISTER/);
    assert.doesNotMatch(page, /HeaderActions|header-actions|PageShell|AppFooter|className="panel/);
    assert.doesNotMatch(page, /openGraph/);
  });
});
