#!/usr/bin/env node
/**
 * Fail CI when production dependencies have high/critical advisories,
 * after subtracting IDs listed in .github/npm-audit-allowlist.json.
 *
 * Usage: node scripts/npm-audit-ci.mjs [dir ...]
 * Default dirs: ., evo-lift, mcp/evo-api
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { collectBlocking, loadAllowlistFromObject } from "./npm-audit-ci-lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowlistPath = join(repoRoot, ".github", "npm-audit-allowlist.json");

const dirs = (process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : [".", "evo-lift", "mcp/evo-api"]
).map((d) => resolve(repoRoot, d));

function loadAllowlist() {
  return loadAllowlistFromObject(JSON.parse(readFileSync(allowlistPath, "utf8")));
}

function auditDir(cwd, allowlist) {
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd,
    encoding: "utf8",
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });

  let json;
  try {
    json = JSON.parse(result.stdout || "{}");
  } catch {
    console.error(`npm audit produced non-JSON output in ${cwd}`);
    console.error(result.stdout);
    console.error(result.stderr);
    return { ok: false, blocking: [{ name: "(audit parse)", severity: "high", ids: [] }] };
  }

  if (result.error) {
    console.error(result.error);
    return { ok: false, blocking: [{ name: "(audit spawn)", severity: "high", ids: [] }] };
  }

  const blocking = collectBlocking(json, allowlist);
  return { ok: blocking.length === 0, blocking, cwd };
}

const allowlist = loadAllowlist();
let failed = false;

for (const cwd of dirs) {
  const { ok, blocking } = auditDir(cwd, allowlist);
  const label = cwd.replace(repoRoot, "").replace(/^[\\/]/, "") || ".";
  if (ok) {
    console.log(`npm audit (prod, high+): OK — ${label}`);
    continue;
  }
  failed = true;
  console.error(`npm audit (prod, high+): FAIL — ${label}`);
  for (const item of blocking) {
    console.error(
      `  - ${item.name} [${item.severity}] ${item.ids.join(", ")}${item.range ? ` (${item.range})` : ""}`,
    );
  }
}

if (failed) {
  console.error(
    "\nPolicy: production high/critical advisories fail CI. Add a temporary GHSA to .github/npm-audit-allowlist.json and document it in SECURITY.md, or upgrade the dependency.",
  );
  process.exit(1);
}

console.log("All package trees passed production npm audit (high/critical).");
