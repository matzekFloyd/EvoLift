import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));

describe("signed-in header placement", () => {
  it("loads the header from the shell layout, not the login page", () => {
    const root = readFileSync(join(appDir, "layout.tsx"), "utf8");
    const shell = readFileSync(join(appDir, "(shell)", "layout.tsx"), "utf8");
    const login = readFileSync(join(appDir, "login", "page.tsx"), "utf8");

    assert.doesNotMatch(root, /header-actions/);
    assert.match(shell, /HeaderActions/);
    assert.doesNotMatch(login, /header-actions/);
    assert.match(login, /prefetch=\{false\}/);
  });
});
