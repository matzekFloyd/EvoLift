import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { PUBLIC_PAGE_PATHS } from "./auth-route-access";
import { PUBLIC_APP_ORIGIN } from "./public-app-origin";
import { crawlerRobots, publicSitemap, signedInRobots } from "./search-index";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "app");

describe("search index", () => {
  it("allows the public pages and disallows signed-in screens and the API", () => {
    const robots = crawlerRobots();
    assert.equal(PUBLIC_APP_ORIGIN, "https://evolift.at");
    assert.deepEqual(robots.rules, {
      userAgent: "*",
      allow: ["/", "/login", "/privacy", "/terms", "/legal", "/glossary"],
      disallow: ["/app", "/api/"],
    });
    assert.deepEqual([...PUBLIC_PAGE_PATHS], robots.rules.allow);
    assert.equal(robots.sitemap, "https://evolift.at/sitemap.xml");
  });

  it("lists each public page once on the canonical origin", () => {
    assert.deepEqual(publicSitemap(), [
      { url: "https://evolift.at" },
      { url: "https://evolift.at/login" },
      { url: "https://evolift.at/privacy" },
      { url: "https://evolift.at/terms" },
      { url: "https://evolift.at/legal" },
      { url: "https://evolift.at/glossary" },
    ]);
    const urls = publicSitemap().map((entry) => entry.url);
    assert.equal(new Set(urls).size, urls.length);
    for (const url of urls) {
      assert.equal(url.startsWith("https://evolift.at"), true);
      assert.equal(url.includes("/app"), false);
      assert.equal(url.includes("/api"), false);
    }
  });

  it("sends noindex from the signed-in /app layout only", () => {
    assert.deepEqual(signedInRobots, { index: false });

    const read = (...parts: string[]) => readFileSync(join(appDir, ...parts), "utf8");
    assert.match(read("(shell)", "app", "layout.tsx"), /signedInRobots/);

    for (const parts of [
      ["layout.tsx"],
      ["page.tsx"],
      ["(shell)", "layout.tsx"],
      ["(shell)", "glossary", "page.tsx"],
      ["(shell)", "privacy", "page.tsx"],
      ["(shell)", "terms", "page.tsx"],
      ["(shell)", "legal", "page.tsx"],
      ["login", "layout.tsx"],
    ] as const) {
      assert.doesNotMatch(read(...parts), /signedInRobots|noindex/);
    }
  });
});
