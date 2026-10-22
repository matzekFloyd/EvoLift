const fs = require("node:fs");
const path = require("node:path");

/** Production site origin. A debug setting must not replace this host. */
const PRODUCTION_SITE_URL = "https://evolift.at";

/** Signed-in home. Back on this path leaves the app. The site root stays outside the shell. */
const SHELL_HOME_PATH = "/app";

/** Release WebView start URL. Same origin as the site, opened on the signed-in home. */
const PRODUCTION_SHELL_URL = `${PRODUCTION_SITE_URL}${SHELL_HOME_PATH}`;

/**
 * Public Supabase API host embedded in the production web app.
 * The shell may navigate here. Other hosts stay outside the WebView.
 */
const PRODUCTION_SUPABASE_HOST = "tiivtvejwxzgzgkmojuj.supabase.co";

const DEBUG_SERVER_FILE = path.join(__dirname, "debug-server.json");

/**
 * Capacitor loads `server.url` in the WebView and opens every other host in
 * the system browser, except hosts listed in `server.allowNavigation`.
 * `Bridge.launchIntent` matches the server URL by scheme and host (any port).
 * Allow-list entries are exact hosts, compared without case sensitivity.
 */
function createCapacitorConfig({ env = {}, debugServer = null } = {}) {
  if (stringValue(env.CAPACITOR_RELEASE) === "1") {
    env = {};
    debugServer = null;
  }

  const envUrl = stringValue(env.CAPACITOR_SERVER_URL);
  if (
    debugServer &&
    Object.prototype.hasOwnProperty.call(debugServer, "serverUrl") &&
    typeof debugServer.serverUrl !== "string"
  ) {
    throw new Error("serverUrl in shell/debug-server.json must be a URL string.");
  }
  const fileUrl = debugServer ? stringValue(debugServer.serverUrl) : "";
  const serverUrl = normalizeServerUrl(
    envUrl || fileUrl || PRODUCTION_SHELL_URL,
    envUrl ? "CAPACITOR_SERVER_URL" : fileUrl ? "serverUrl in shell/debug-server.json" : "production site URL",
  );

  const allowNavigation = [PRODUCTION_SUPABASE_HOST];
  for (const host of splitAllowHosts(env.CAPACITOR_ALLOW_NAVIGATION, "CAPACITOR_ALLOW_NAVIGATION")) {
    addHost(allowNavigation, host);
  }
  if (debugServer && Object.prototype.hasOwnProperty.call(debugServer, "allowNavigation")) {
    if (!Array.isArray(debugServer.allowNavigation)) {
      throw new Error("allowNavigation in shell/debug-server.json must be a list of hosts.");
    }
    for (const entry of debugServer.allowNavigation) {
      if (typeof entry !== "string") {
        throw new Error("allowNavigation in shell/debug-server.json must be a list of hosts.");
      }
      addHost(allowNavigation, normalizeAllowHost(entry, "allowNavigation in shell/debug-server.json"));
    }
  }

  const server = {
    url: serverUrl,
    allowNavigation,
  };
  if (serverUrl.startsWith("http://")) {
    server.cleartext = true;
  }

  return {
    appId: "app.evolift",
    appName: "EvoLift",
    webDir: "www",
    android: {
      // Android 15 draws the WebView under the status bar and gesture area.
      // Force Capacitor to inset the WebView by those system bars and the cutout.
      adjustMarginsForEdgeToEdge: "force",
    },
    server,
  };
}

/**
 * `/app` always leaves the app. Any other page goes back when page history exists.
 * MainActivity treats WebView history and the in-page Navigation API as that history.
 */
function backLeavesTheApp(url, canGoBack) {
  if (isShellHome(url)) {
    return true;
  }
  return !canGoBack;
}

/**
 * True while a workout session is open.
 * Matches /app/sessions/new and /app/sessions/[id], including a trailing slash or query.
 * /app/sessions and /app/sessions/[id]/edit do not match.
 * Mirrors MainActivity.screenStaysAwake.
 */
function screenStaysAwake(url) {
  if (typeof url !== "string" || url.trim() === "") {
    return false;
  }
  try {
    return /^\/app\/sessions\/[^/]+$/.test(shellPathname(url));
  } catch {
    return false;
  }
}

function isShellHome(url) {
  if (typeof url !== "string" || url.trim() === "") {
    return true;
  }
  try {
    return shellPathname(url) === SHELL_HOME_PATH;
  } catch {
    return true;
  }
}

/** Pathname with a trailing slash removed. The site root stays `/`. */
function shellPathname(url) {
  return new URL(url).pathname.replace(/\/+$/, "") || "/";
}

function readDebugServerFile(filePath = DEBUG_SERVER_FILE) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("shell/debug-server.json must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("shell/debug-server.json must be a JSON object.");
  }

  return parsed;
}

/**
 * True when Capacitor will load this URL inside the shell.
 * The configured site matches on scheme and host. The Supabase host, and any
 * debug hosts, match as exact allow-list entries.
 */
function mayLoadInShell(serverUrl, allowNavigation, targetUrl) {
  let target;
  let app;
  try {
    target = new URL(targetUrl);
    app = new URL(serverUrl);
  } catch {
    return false;
  }

  if (target.username || target.password || app.username || app.password) {
    return false;
  }

  const targetScheme = target.protocol.replace(":", "");
  const appScheme = app.protocol.replace(":", "");
  if (target.hostname.toLowerCase() === app.hostname.toLowerCase() && targetScheme === appScheme) {
    return true;
  }

  return allowNavigation.some((mask) => mask.toLowerCase() === target.hostname.toLowerCase());
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeServerUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must start with http:// or https://.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must start with http:// or https://.`);
  }

  if (url.username || url.password) {
    throw new Error(`${label} cannot include a username or password.`);
  }

  if (!url.hostname) {
    throw new Error(`${label} must include a host.`);
  }

  url.hash = "";
  const serialized = url.toString();
  if (url.pathname === "/" && serialized.endsWith("/")) {
    return serialized.slice(0, -1);
  }
  return serialized;
}

function splitAllowHosts(value, label) {
  const text = stringValue(value);
  if (!text) {
    return [];
  }

  return text
    .split(",")
    .map((part) => normalizeAllowHost(part, label))
    .filter(Boolean);
}

function normalizeAllowHost(value, label) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let host = trimmed;
  if (trimmed.includes("://")) {
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Error(`${label} must list hostnames, separated by commas.`);
    }
    if (url.username || url.password) {
      throw new Error(`${label} cannot include a username or password.`);
    }
    host = url.hostname;
  } else if (trimmed.includes(":")) {
    host = trimmed.slice(0, trimmed.indexOf(":"));
  }

  if (!host || host.includes("/") || host.includes(":") || host.includes("*") || host.includes(" ")) {
    throw new Error(`${label} must list hostnames, separated by commas.`);
  }

  return host;
}

function addHost(hosts, host) {
  if (!host) {
    return;
  }
  if (hosts.some((existing) => existing.toLowerCase() === host.toLowerCase())) {
    return;
  }
  hosts.push(host);
}

module.exports = {
  PRODUCTION_SITE_URL,
  PRODUCTION_SHELL_URL,
  SHELL_HOME_PATH,
  PRODUCTION_SUPABASE_HOST,
  createCapacitorConfig,
  readDebugServerFile,
  mayLoadInShell,
  backLeavesTheApp,
  screenStaysAwake,
};
