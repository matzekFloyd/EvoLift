import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);

function loadPublicConfig(suite) {
  const previous = process.env.LHCI_PUBLIC_SUITE;
  if (suite) process.env.LHCI_PUBLIC_SUITE = suite;
  else delete process.env.LHCI_PUBLIC_SUITE;
  const key = require.resolve("../lighthouserc.public.cjs");
  delete require.cache[key];
  try {
    return require("../lighthouserc.public.cjs");
  } finally {
    if (previous === undefined) delete process.env.LHCI_PUBLIC_SUITE;
    else process.env.LHCI_PUBLIC_SUITE = previous;
  }
}

function pathsOf(config) {
  return config.ci.collect.url.map((url) => new URL(url).pathname);
}

test("public SEO suite scores the indexable pages at 0.9", () => {
  const config = loadPublicConfig("seo");

  assert.deepEqual(config.ci.collect.settings.onlyCategories, ["seo"]);
  assert.deepEqual(pathsOf(config), ["/", "/login", "/privacy", "/terms", "/legal", "/glossary"]);
  assert.deepEqual(config.ci.assert.assertions["categories:seo"], ["error", { minScore: 0.9 }]);
  assert.equal(config.ci.assert.assertions["categories:performance"], undefined);
  assert.equal(config.ci.upload.outputDir, ".lighthouseci/public-seo");
});

test("public performance suite stays on login at 0.7", () => {
  const config = loadPublicConfig();

  assert.deepEqual(config.ci.collect.settings.onlyCategories, ["performance"]);
  assert.deepEqual(pathsOf(config), ["/login"]);
  assert.deepEqual(config.ci.assert.assertions["categories:performance"], [
    "error",
    { minScore: 0.7 },
  ]);
  assert.equal(config.ci.assert.assertions["categories:seo"], undefined);
  assert.equal(config.ci.upload.outputDir, ".lighthouseci/public");
});

test("authenticated lighthouse stays performance-only", () => {
  const config = require("../lighthouserc.app.cjs");

  assert.deepEqual(config.ci.collect.settings.onlyCategories, ["performance"]);
  assert.deepEqual(pathsOf(config), ["/app", "/app/insights"]);
  assert.equal(
    config.ci.assert.assertMatrix[0].assertions["categories:performance"][1].minScore,
    0.55,
  );
  assert.equal(
    config.ci.assert.assertMatrix[1].assertions["categories:performance"][1].minScore,
    0.5,
  );
  assert.equal(config.ci.assert.assertMatrix[0].assertions["categories:seo"], undefined);
  assert.equal(config.ci.assert.assertMatrix[1].assertions["categories:seo"], undefined);
});

test("lighthouse runner collects public SEO without changing the app suite", () => {
  const source = readFileSync(new URL("./run-lighthouse.mjs", import.meta.url), "utf8");
  const publicRuns = source.match(/runLhci\("lighthouserc\.public\.cjs"/g);

  assert.equal(publicRuns?.length, 2);
  assert.match(source, /LHCI_PUBLIC_SUITE:\s*"seo"/);
  assert.match(source, /runLhci\("lighthouserc\.app\.cjs"\)/);
});
