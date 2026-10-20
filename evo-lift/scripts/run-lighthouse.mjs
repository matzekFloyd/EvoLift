/**
 * Starts `next start`, then runs public + authenticated Lighthouse CI suites.
 * Expects `npm run build` (and a seeded local demo user for the app suite) already done.
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

import { installedChromePath } from "./lighthouse-chrome.mjs";

const require = createRequire(import.meta.url);
if (!process.env.CHROME_PATH) {
  let chromePath;
  try {
    const puppeteer = require("puppeteer");
    chromePath = await installedChromePath(() => puppeteer.executablePath());
  } catch (error) {
    console.error("Could not resolve Puppeteer's Chrome path.");
    console.error(error);
    process.exit(1);
  }
  if (!chromePath) {
    console.error("Chrome was not found.");
    console.error("Run `npx puppeteer browsers install chrome` from evo-lift/.");
    process.exit(1);
  }
  process.env.CHROME_PATH = chromePath;
}
console.log(`Using Chrome at ${process.env.CHROME_PATH}`);

const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";
const port = Number(new URL(baseUrl).port || 3000);

const server = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
  env: process.env,
});

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

function shutdown(code) {
  if (!server.killed) {
    server.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

const deadline = Date.now() + 120_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch(`${baseUrl}/login`);
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    // Server still starting.
  }
  if (server.exitCode != null) {
    console.error(`next start exited early with code ${server.exitCode}`);
    shutdown(server.exitCode || 1);
  }
  await sleep(500);
}

if (!ready) {
  console.error(`Timed out waiting for ${baseUrl}/login`);
  shutdown(1);
}

function runLhci(configPath) {
  const result = spawnSync("npx", ["lhci", "autorun", `--config=${configPath}`], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    shutdown(result.status ?? 1);
  }
}

runLhci("lighthouserc.public.cjs");
runLhci("lighthouserc.app.cjs");
shutdown(0);
