import appVersion from "../app-version.json";

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * Product version shared by the site footer and the Android release.
 * The Play version code formula must match android/app/build.gradle.
 */
export function parseAppVersion(version: string): { major: number; minor: number; patch: number } {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error(
      `App version must be MAJOR.MINOR.PATCH, as in 1.0.0. Received "${version}". See VERSIONING.md.`,
    );
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (minor > 999 || patch > 999) {
    throw new Error(
      `Minor and patch must be 0–999 so the Play version code stays ordered. Received "${version}". See VERSIONING.md.`,
    );
  }

  return { major, minor, patch };
}

export function playVersionCode(version: string): number {
  const { major, minor, patch } = parseAppVersion(version);
  const versionCode = major * 1000000 + minor * 1000 + patch;
  if (versionCode < 1 || versionCode > 2100000000) {
    throw new Error(
      `Play version code must be from 1 through 2100000000. ${version} is ${versionCode}. See VERSIONING.md.`,
    );
  }
  return versionCode;
}

export const APP_VERSION = appVersion.version;
export const APP_VERSION_LABEL = `v${APP_VERSION}`;

playVersionCode(APP_VERSION);
