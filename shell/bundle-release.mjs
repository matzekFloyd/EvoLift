import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTION_SHELL_URL } from "./server-config.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const MISSING_KEYSTORE_PROPERTIES =
  "Release builds need android/keystore.properties. Copy android/keystore.properties.example, create an upload keystore, and fill in the passwords. See README.md.";

export function missingKeystoreField(key) {
  return `android/keystore.properties is missing ${key}. See android/keystore.properties.example.`;
}

export function missingUploadKeystore(storeFile) {
  return `Upload keystore not found at android/${storeFile}. See README.md.`;
}

export function parseKeystoreProperties(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key) {
      values[key] = value;
    }
  }
  return values;
}

/**
 * @returns {string | null} A message when the upload key is not ready, otherwise null.
 */
export function releaseKeystoreProblem(androidDir, propertiesText, fileExists = existsSync) {
  if (propertiesText == null) {
    return MISSING_KEYSTORE_PROPERTIES;
  }

  const properties = parseKeystoreProperties(propertiesText);
  for (const key of ["storeFile", "storePassword", "keyAlias", "keyPassword"]) {
    if (!properties[key]) {
      return missingKeystoreField(key);
    }
  }

  const storeFile = properties.storeFile;
  if (!fileExists(path.resolve(androidDir, storeFile))) {
    return missingUploadKeystore(storeFile);
  }

  return null;
}

export function readReleaseKeystoreProblem(androidDir, fileExists = existsSync, readFile = readFileSync) {
  const propertiesPath = path.join(androidDir, "keystore.properties");
  if (!fileExists(propertiesPath)) {
    return releaseKeystoreProblem(androidDir, null, fileExists);
  }
  return releaseKeystoreProblem(androidDir, readFile(propertiesPath, "utf8"), fileExists);
}

/**
 * The release bundle must open /app on the production origin, with cleartext off.
 * @returns {string | null} A message when the synced server URL is wrong, otherwise null.
 */
export function releaseBundleServerProblem(server) {
  const url = server?.url;
  if (url !== PRODUCTION_SHELL_URL || server?.cleartext === true) {
    return `The release bundle must load ${PRODUCTION_SHELL_URL}. Sync wrote ${url ?? "no server URL"}.`;
  }
  return null;
}

function main() {
  const androidDir = path.join(repoRoot, "android");
  const problem = readReleaseKeystoreProblem(androidDir);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }

  const capCli = path.join(repoRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor");
  if (!existsSync(capCli)) {
    console.error("Install dependencies from the repository root before building a release bundle (npm install).");
    process.exit(1);
  }

  const sync = spawnSync(process.execPath, [capCli, "sync", "android"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      CAPACITOR_RELEASE: "1",
    },
  });
  if (sync.status !== 0) {
    process.exit(sync.status ?? 1);
  }

  const configPath = path.join(androidDir, "app", "src", "main", "assets", "capacitor.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const serverProblem = releaseBundleServerProblem(config.server);
  if (serverProblem) {
    console.error(serverProblem);
    process.exit(1);
  }

  const gradlewName = process.platform === "win32" ? "gradlew.bat" : "gradlew";
  const bundle = spawnSync(path.join(androidDir, gradlewName), ["bundleRelease"], {
    cwd: androidDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (bundle.status !== 0) {
    process.exit(bundle.status ?? 1);
  }

  const version = JSON.parse(readFileSync(path.join(repoRoot, "evo-lift", "app-version.json"), "utf8"));
  console.log("");
  console.log("Signed bundle: android/app/build/outputs/bundle/release/app-release.aab");
  console.log(`Product version ${version.version}. Upload that file to the Play internal testing track.`);
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main();
}
