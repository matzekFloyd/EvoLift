/**
 * First Load JS budgets for the public shell and the signed-in routes that
 * were the heaviest in `next build`. Bytes are uncompressed, matching
 * `.next/diagnostics/route-bundle-stats.json`.
 *
 * Allowance sits on top of the measured size so a few kilobytes of drift pass
 * and a shared Recharts or Swagger UI chunk does not.
 */
export const ROUTE_JS_ALLOWANCE_BYTES = 32 * 1024;

/** Routes that render a chart. Recharts may appear in their first-load chunks. */
export const CHART_ROUTES = new Set(["/app", "/app/insights", "/app/exercises/[slug]"]);

export const API_DOCS_ROUTE = "/app/docs";

/**
 * Measured uncompressed First Load JS. Chart and API-docs code still load only
 * on the routes that render them. Remeasured 24 Nov 2026 after signed-in pages
 * grew past the October sizes; the 32 kB allowance sits on top of these.
 * @type {Record<string, number>}
 */
export const ROUTE_JS_BUDGET_BYTES = {
  "/": 491_827,
  "/login": 766_566,
  "/app": 881_050,
  "/app/insights": 869_069,
  "/app/exercises/[slug]": 905_421,
  "/app/sessions/[id]": 944_333,
  "/app/docs": 812_339,
};

/**
 * @typedef {{ route: string, firstLoadUncompressedJsBytes: number, firstLoadChunkPaths?: string[] }} RouteBundleRow
 */

/**
 * @param {RouteBundleRow[]} rows
 * @param {Record<string, number>} [budgets]
 * @param {number} [allowanceBytes]
 * @returns {string[]}
 */
export function routeJsBudgetFailures(
  rows,
  budgets = ROUTE_JS_BUDGET_BYTES,
  allowanceBytes = ROUTE_JS_ALLOWANCE_BYTES,
) {
  const byRoute = new Map(rows.map((row) => [row.route, row]));
  /** @type {string[]} */
  const failures = [];
  for (const [route, maxBytes] of Object.entries(budgets)) {
    const row = byRoute.get(route);
    if (!row) {
      failures.push(`${route} is missing from the route bundle stats.`);
      continue;
    }
    const limit = maxBytes + allowanceBytes;
    if (row.firstLoadUncompressedJsBytes > limit) {
      failures.push(
        `${route} First Load JS is ${formatKiB(row.firstLoadUncompressedJsBytes)}, above ${formatKiB(limit)} (${formatKiB(maxBytes)} plus ${formatKiB(allowanceBytes)}).`,
      );
    }
  }
  return failures;
}

/**
 * Recharts stays on chart routes. Swagger UI stays on API docs.
 * @param {RouteBundleRow[]} rows
 * @param {(chunkPath: string) => string} readChunk
 * @returns {string[]}
 */
export function heavyModuleLeakFailures(rows, readChunk) {
  /** @type {Map<string, string>} */
  const cache = new Map();
  /** @type {string[]} */
  const failures = [];
  for (const row of rows) {
    for (const chunkPath of row.firstLoadChunkPaths ?? []) {
      let text = cache.get(chunkPath);
      if (text === undefined) {
        text = readChunk(chunkPath);
        cache.set(chunkPath, text);
      }
      if (text.includes("recharts") && !CHART_ROUTES.has(row.route)) {
        failures.push(`${row.route} downloads Recharts (${chunkPath}).`);
      }
      if (
        (text.includes("swagger-ui-dist") || text.includes("SwaggerUIBundle")) &&
        row.route !== API_DOCS_ROUTE
      ) {
        failures.push(`${row.route} downloads Swagger UI (${chunkPath}).`);
      }
    }
  }
  return [...new Set(failures)];
}

/**
 * @param {RouteBundleRow[]} rows
 * @param {Record<string, number>} [budgets]
 * @returns {string}
 */
export function formatRouteJsBudgetReport(rows, budgets = ROUTE_JS_BUDGET_BYTES) {
  const byRoute = new Map(rows.map((row) => [row.route, row]));
  const lines = ["Route                      First Load JS  Budget"];
  for (const [route, maxBytes] of Object.entries(budgets)) {
    const row = byRoute.get(route);
    const actual = row ? formatKiB(row.firstLoadUncompressedJsBytes) : "missing";
    lines.push(
      `${route.padEnd(26)} ${actual.padStart(13)}  ${formatKiB(maxBytes + ROUTE_JS_ALLOWANCE_BYTES).padStart(8)}`,
    );
  }
  return lines.join("\n");
}

/** @param {number} bytes */
export function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}
