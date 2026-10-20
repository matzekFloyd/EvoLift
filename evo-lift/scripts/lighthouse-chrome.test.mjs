import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { installedChromePath } from "./lighthouse-chrome.mjs";

test("awaits the Chrome path Puppeteer 25 returns", async () => {
  const dir = mkdtempSync(join(tmpdir(), "evo-chrome-"));
  const chrome = join(dir, "chrome");
  writeFileSync(chrome, "");

  const path = await installedChromePath(() => Promise.resolve(chrome));

  assert.equal(path, chrome);
});

test("a missing Chrome binary is not a path", async () => {
  const path = await installedChromePath(() => Promise.resolve("/no/such/chrome"));

  assert.equal(path, null);
});
