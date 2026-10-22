/**
 * Fails the Lighthouse job when a budgeted route's uncompressed First Load JS
 * grows past the post-cut size, or when Recharts / Swagger UI show up on a
 * route that does not render them.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatRouteJsBudgetReport,
  heavyModuleLeakFailures,
  routeJsBudgetFailures,
} from "./route-js-budget.mjs";

const statsPath = resolve(".next/diagnostics/route-bundle-stats.json");

let rows;
try {
  rows = JSON.parse(readFileSync(statsPath, "utf8"));
} catch (error) {
  console.error(`Could not read ${statsPath}. Run npm run build first.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(formatRouteJsBudgetReport(rows));

const failures = [
  ...routeJsBudgetFailures(rows),
  ...heavyModuleLeakFailures(rows, (chunkPath) => {
    try {
      return readFileSync(resolve(chunkPath), "utf8");
    } catch {
      return "";
    }
  }),
];

if (failures.length > 0) {
  console.error("\nRoute JavaScript budget failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nRoute JavaScript is within budget.");
