/**
 * GitHub Release helpers for the product version in evo-lift/app-version.json.
 * Tag names match the site footer label (vMAJOR.MINOR.PATCH). See VERSIONING.md.
 */

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * @param {string} version Product version without a leading v.
 * @returns {string} GitHub release tag, as in v1.1.0.
 */
export function releaseTagName(version) {
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    throw new Error(
      `App version must be MAJOR.MINOR.PATCH, as in 1.0.0. Received ${JSON.stringify(version)}. See VERSIONING.md.`,
    );
  }
  const [, minor, patch] = version.split(".").map(Number);
  if (minor > 999 || patch > 999) {
    throw new Error(
      `Minor and patch must be 0–999 so the Play version code stays ordered. Received "${version}". See VERSIONING.md.`,
    );
  }
  return `v${version}`;
}

/**
 * @param {{ version?: unknown }} appVersionJson Parsed evo-lift/app-version.json.
 * @returns {string} GitHub release tag.
 */
export function releaseTagFromAppVersionJson(appVersionJson) {
  if (appVersionJson == null || typeof appVersionJson !== "object") {
    throw new Error("app-version.json must be an object with a version string. See VERSIONING.md.");
  }
  return releaseTagName(/** @type {{ version?: unknown }} */ (appVersionJson).version);
}
