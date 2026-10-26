import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

describe("template row actions", () => {
  it("keeps Use secondary so Create template stays the filled action", () => {
    const page = readFileSync(path.join(repoRoot, "evo-lift", "app", "(shell)", "app", "templates", "page.tsx"), "utf8").replace(
      /\r\n/g,
      "\n",
    );
    assert.match(page, /PageAddAction href=\{appPath\("\/templates\/new"\)\} label="Create template"/);
    assert.match(page, /variant="secondary"[\s\S]{0,160}\n\s*Use\n/);
    assert.match(page, /variant="primary"[\s\S]{0,240}Start session/);
    assert.equal(page.match(/variant="primary"/g)?.length, 1);
  });
});
