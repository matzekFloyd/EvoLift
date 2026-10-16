import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PRODUCTION_SITE_URL,
  PRODUCTION_SUPABASE_HOST,
  backLeavesTheApp,
  screenStaysAwake,
  createCapacitorConfig,
  mayLoadInShell,
  readDebugServerFile,
} from "./server-config.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function productionConfig() {
  return createCapacitorConfig({ env: {}, debugServer: null });
}

test("default shell opens production EvoLift and its Supabase host", () => {
  const config = productionConfig();

  assert.equal(config.appId, "app.evolift");
  assert.equal(config.appName, "EvoLift");
  assert.equal(config.server.url, PRODUCTION_SITE_URL);
  assert.equal(config.server.url, "https://evo-lift.vercel.app");
  assert.equal(config.server.cleartext, undefined);
  assert.equal(config.android.adjustMarginsForEdgeToEdge, "force");
  assert.deepEqual(config.server.allowNavigation, [PRODUCTION_SUPABASE_HOST]);
  assert.equal(
    mayLoadInShell(config.server.url, config.server.allowNavigation, "https://evo-lift.vercel.app/login"),
    true,
  );
  assert.equal(
    mayLoadInShell(config.server.url, config.server.allowNavigation, "https://evo-lift.vercel.app/register"),
    true,
  );
  assert.equal(
    mayLoadInShell(
      config.server.url,
      config.server.allowNavigation,
      `https://${PRODUCTION_SUPABASE_HOST}/auth/v1/token`,
    ),
    true,
  );
});

test("pages outside the site and its Supabase host stay out of the shell", () => {
  const config = productionConfig();
  const blocked = [
    "https://exrx.net/Lists/ExList/ChestWt",
    "https://example.com",
    "https://evil.supabase.co",
    "https://evo-lift.vercel.app.evil.com",
    "http://evo-lift.vercel.app",
    "https://not-tiivtvejwxzgzgkmojuj.supabase.co",
  ];

  for (const url of blocked) {
    assert.equal(mayLoadInShell(config.server.url, config.server.allowNavigation, url), false, url);
  }
});

test("a release build ignores the debug server and loads production", () => {
  const config = createCapacitorConfig({
    env: {
      CAPACITOR_RELEASE: " 1 ",
      CAPACITOR_SERVER_URL: "http://10.0.2.2:3000",
      CAPACITOR_ALLOW_NAVIGATION: "example.com",
    },
    debugServer: {
      serverUrl: "http://192.168.1.20:3000",
      allowNavigation: ["192.168.1.8"],
    },
  });

  assert.equal(config.server.url, PRODUCTION_SITE_URL);
  assert.equal(config.server.url, "https://evo-lift.vercel.app");
  assert.equal(config.server.cleartext, undefined);
  assert.deepEqual(config.server.allowNavigation, [PRODUCTION_SUPABASE_HOST]);
});

test("debug server URL overrides the loaded site and leaves the production default in place", () => {
  const config = createCapacitorConfig({
    env: { CAPACITOR_SERVER_URL: " http://10.0.2.2:3000/ " },
    debugServer: null,
  });

  assert.equal(PRODUCTION_SITE_URL, "https://evo-lift.vercel.app");
  assert.equal(config.server.url, "http://10.0.2.2:3000");
  assert.equal(config.server.cleartext, true);
  assert.equal(mayLoadInShell(config.server.url, config.server.allowNavigation, "http://10.0.2.2:3000/login"), true);
  assert.equal(mayLoadInShell(config.server.url, config.server.allowNavigation, "http://10.0.2.2:54321"), true);
  assert.equal(mayLoadInShell(config.server.url, config.server.allowNavigation, PRODUCTION_SITE_URL), false);
});

test("environment server URL wins over the debug file", () => {
  const config = createCapacitorConfig({
    env: {
      CAPACITOR_SERVER_URL: "http://192.168.1.20:3000",
      CAPACITOR_ALLOW_NAVIGATION: "192.168.1.8, 10.0.2.2:54321",
    },
    debugServer: {
      serverUrl: "http://10.0.2.2:3000",
      allowNavigation: ["192.168.1.20"],
    },
  });

  assert.equal(config.server.url, "http://192.168.1.20:3000");
  assert.deepEqual(config.server.allowNavigation, [
    PRODUCTION_SUPABASE_HOST,
    "192.168.1.8",
    "10.0.2.2",
    "192.168.1.20",
  ]);
});

test("debug file is used when the environment variable is blank", () => {
  const config = createCapacitorConfig({
    env: { CAPACITOR_SERVER_URL: "   " },
    debugServer: { serverUrl: "http://10.0.2.2:3000/" },
  });

  assert.equal(config.server.url, "http://10.0.2.2:3000");
  assert.equal(config.server.cleartext, true);
});

test("rejects a server URL that is not http or https", () => {
  assert.throws(
    () => createCapacitorConfig({ env: { CAPACITOR_SERVER_URL: "file:///tmp/app" }, debugServer: null }),
    /CAPACITOR_SERVER_URL must start with http:\/\/ or https:\/\/\./,
  );
});

test("rejects an allow-list entry that would match every host", () => {
  assert.throws(
    () => createCapacitorConfig({ env: { CAPACITOR_ALLOW_NAVIGATION: "*" }, debugServer: null }),
    /CAPACITOR_ALLOW_NAVIGATION must list hostnames, separated by commas\./,
  );
});

test("reads a debug server file and ignores a missing file", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "evolift-shell-"));
  const filePath = path.join(directory, "debug-server.json");

  assert.equal(readDebugServerFile(filePath), null);

  writeFileSync(filePath, '{ "serverUrl": "http://10.0.2.2:3000" }');
  assert.deepEqual(readDebugServerFile(filePath), { serverUrl: "http://10.0.2.2:3000" });

  writeFileSync(filePath, "{");
  assert.throws(() => readDebugServerFile(filePath), /shell\/debug-server\.json must be valid JSON\./);
});

test("committed Android project opens production without cleartext", () => {
  const committed = JSON.parse(
    readFileSync(path.join(repoRoot, "android", "app", "src", "main", "assets", "capacitor.config.json"), "utf8"),
  );
  const expected = productionConfig();
  const manifest = readFileSync(path.join(repoRoot, "android", "app", "src", "main", "AndroidManifest.xml"), "utf8");

  assert.equal(committed.appId, expected.appId);
  assert.equal(committed.appName, expected.appName);
  assert.equal(committed.server.url, expected.server.url);
  assert.equal(committed.server.cleartext, undefined);
  assert.equal(committed.android.adjustMarginsForEdgeToEdge, "force");
  assert.deepEqual(committed.server.allowNavigation, expected.server.allowNavigation);
  assert.match(manifest, /android\.permission\.INTERNET/);
  assert.doesNotMatch(manifest, /usesCleartextTraffic="true"/);

  const plugins = JSON.parse(
    readFileSync(path.join(repoRoot, "android", "app", "src", "main", "assets", "capacitor.plugins.json"), "utf8"),
  );
  assert.deepEqual(plugins, []);
});

test("Android Back leaves home and returns from a session", () => {
  assert.equal(backLeavesTheApp("https://evo-lift.vercel.app/", true), true);
  assert.equal(backLeavesTheApp("https://evo-lift.vercel.app", false), true);
  assert.equal(backLeavesTheApp("http://10.0.2.2:3000/", true), true);
  assert.equal(
    backLeavesTheApp("https://evo-lift.vercel.app/sessions/session-1", true),
    false,
  );
  assert.equal(backLeavesTheApp("https://evo-lift.vercel.app/sessions/session-1", false), true);
});

test("the screen stays awake only on an open session", () => {
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/sessions/new"), true);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/sessions/session-1"), true);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/sessions/session-1/"), true);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/sessions/session-1?set=2"), true);
  assert.equal(screenStaysAwake("http://10.0.2.2:3000/sessions/session-1"), true);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/"), false);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/sessions"), false);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/sessions/session-1/edit"), false);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/insights"), false);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/goals"), false);
  assert.equal(screenStaysAwake("https://evo-lift.vercel.app/account"), false);
  assert.equal(screenStaysAwake(""), false);
  assert.equal(screenStaysAwake("not a url"), false);
});

test("rejects a debug file server URL that is not a string", () => {
  assert.throws(
    () => createCapacitorConfig({ env: {}, debugServer: { serverUrl: 3000 } }),
    /serverUrl in shell\/debug-server\.json must be a URL string\./,
  );
});
