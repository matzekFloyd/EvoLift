import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  API_DOCS_ROUTE,
  CHART_ROUTES,
  ROUTE_JS_ALLOWANCE_BYTES,
  ROUTE_JS_BUDGET_BYTES,
  heavyModuleLeakFailures,
  routeJsBudgetFailures,
} from "./route-js-budget.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("budgets cover the public shell and the signed-in routes from the build", () => {
  assert.equal(ROUTE_JS_ALLOWANCE_BYTES, 32 * 1024);
  assert.deepEqual(Object.keys(ROUTE_JS_BUDGET_BYTES), [
    "/",
    "/login",
    "/app",
    "/app/insights",
    "/app/exercises/[slug]",
    "/app/sessions/[id]",
    "/app/docs",
  ]);
  for (const maxBytes of Object.values(ROUTE_JS_BUDGET_BYTES)) {
    assert.ok(maxBytes > 0);
  }
});

test("route JavaScript fails only past the measured size plus the allowance", () => {
  const budgets = { "/login": 1000 };
  const under = routeJsBudgetFailures(
    [{ route: "/login", firstLoadUncompressedJsBytes: 1000 + ROUTE_JS_ALLOWANCE_BYTES }],
    budgets,
  );
  assert.deepEqual(under, []);

  const over = routeJsBudgetFailures(
    [{ route: "/login", firstLoadUncompressedJsBytes: 1001 + ROUTE_JS_ALLOWANCE_BYTES }],
    budgets,
  );
  assert.equal(over.length, 1);
  assert.match(over[0], /\/login First Load JS/);

  const missing = routeJsBudgetFailures([], budgets);
  assert.match(missing[0], /\/login is missing/);
});

test("Recharts and Swagger UI stay on the routes that render them", () => {
  const rows = [
    { route: "/app", firstLoadChunkPaths: ["chart.js"] },
    { route: "/login", firstLoadChunkPaths: ["login.js"] },
    { route: API_DOCS_ROUTE, firstLoadChunkPaths: ["docs.js"] },
    { route: "/glossary", firstLoadChunkPaths: ["shared.js"] },
  ];
  const files = {
    "chart.js": "recharts bar",
    "login.js": "sign in",
    "docs.js": "swagger-ui-dist",
    "shared.js": "shell",
  };

  assert.deepEqual(
    heavyModuleLeakFailures(rows, (chunkPath) => files[chunkPath] ?? ""),
    [],
  );
  assert.ok(CHART_ROUTES.has("/app"));
  assert.equal(CHART_ROUTES.has("/login"), false);

  const leaked = heavyModuleLeakFailures(
    [
      { route: "/login", firstLoadChunkPaths: ["shared.js"] },
      { route: "/app/sessions/[id]", firstLoadChunkPaths: ["docs.js"] },
    ],
    (chunkPath) => (chunkPath === "shared.js" ? "from recharts" : "SwaggerUIBundle"),
  );
  assert.deepEqual(leaked, [
    "/login downloads Recharts (shared.js).",
    "/app/sessions/[id] downloads Swagger UI (docs.js).",
  ]);
});

test("chart screens and API docs load those libraries with next/dynamic", () => {
  const chartLoader = readFileSync(join(appRoot, "app/components/chart-dynamic.tsx"), "utf8");
  const docsLoader = readFileSync(join(appRoot, "app/docs/api-docs-explorer-loader.tsx"), "utf8");
  const home = readFileSync(join(appRoot, "app/(shell)/app/page.tsx"), "utf8");
  const insights = readFileSync(join(appRoot, "app/(shell)/app/insights/page.tsx"), "utf8");
  const exercise = readFileSync(join(appRoot, "app/(shell)/app/exercises/[slug]/page.tsx"), "utf8");
  const sections = readFileSync(join(appRoot, "app/exercises/[slug]/exercise-chart-sections.tsx"), "utf8");
  const pace = readFileSync(join(appRoot, "app/components/exercise-progress-panel.tsx"), "utf8");
  const publicHome = readFileSync(join(appRoot, "app/public-home-figure.tsx"), "utf8");
  const docs = readFileSync(join(appRoot, "app/(shell)/app/docs/page.tsx"), "utf8");

  assert.match(chartLoader, /from "next\/dynamic"/);
  assert.doesNotMatch(chartLoader, /from "recharts"/);
  assert.match(docsLoader, /from "next\/dynamic"/);
  assert.match(docsLoader, /ssr: false/);

  assert.match(home, /from "@\/app\/components\/chart-dynamic"/);
  assert.doesNotMatch(home, /workout-activity-chart"/);
  assert.match(insights, /from "@\/app\/components\/chart-dynamic"/);
  assert.doesNotMatch(insights, /insights-weekly-volume-chart"/);
  assert.doesNotMatch(pace, /chart-dynamic|exercise-progress-pace-chart|from "recharts"/);
  assert.match(publicHome, /from "@\/app\/components\/chart-dynamic"/);
  assert.doesNotMatch(publicHome, /exercise-progress-pace-chart"/);
  assert.match(sections, /from "@\/app\/components\/chart-dynamic"/);
  assert.match(exercise, /detailPanelTab === "charts"/);
  assert.match(docs, /from "@\/app\/docs\/api-docs-explorer-loader"/);
  assert.doesNotMatch(docs, /api-docs-explorer"/);
});
