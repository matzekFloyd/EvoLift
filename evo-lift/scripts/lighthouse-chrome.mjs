import { existsSync } from "node:fs";

/**
 * Puppeteer 25's executablePath() returns a Promise. Await it, then keep the
 * path only when that Chrome binary is on disk.
 */
export async function installedChromePath(resolveExecutablePath, exists = existsSync) {
  const chromePath = await resolveExecutablePath();
  if (typeof chromePath !== "string" || !exists(chromePath)) {
    return null;
  }
  return chromePath;
}
