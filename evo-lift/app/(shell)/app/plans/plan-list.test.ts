import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  PLAN_LIST_EMPTY_ACTION,
  PLAN_LIST_EMPTY_LEAD,
  PLAN_LIST_EMPTY_TAIL,
  PLAN_LIST_INTRO,
  planEditHref,
  planListStatusLabel,
  sortPlanListRows,
} from "./plan-list";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("plan list", () => {
  it("puts the active plan first and sorts the rest by name", () => {
    const rows = [
      { name: "Upper Lower", isActive: false },
      { name: "3-Day Strength", isActive: true },
      { name: "Push pull", isActive: false },
    ];
    assert.deepEqual(
      sortPlanListRows(rows, "asc").map((row) => row.name),
      ["3-Day Strength", "Push pull", "Upper Lower"],
    );
    assert.deepEqual(
      sortPlanListRows(rows, "desc").map((row) => row.name),
      ["3-Day Strength", "Upper Lower", "Push pull"],
    );
  });

  it("labels only the active plan and links its name to the editor", () => {
    assert.equal(planListStatusLabel(true), "Active");
    assert.equal(planListStatusLabel(false), null);
    assert.equal(planEditHref("plan-1"), "/app/plans/plan-1/edit");
    assert.equal(
      PLAN_LIST_INTRO,
      "A plan is an ordered cycle of days. One plan can be active. From Home, start its next session in one step.",
    );
    assert.equal(PLAN_LIST_EMPTY_LEAD, "No plans yet.");
    assert.equal(PLAN_LIST_EMPTY_ACTION, "Create a plan");
    assert.equal(PLAN_LIST_EMPTY_TAIL, "to choose the next session on Home.");
  });

  it("shares the named list table, with the active chip only on plans", () => {
    const page = readRepo("evo-lift", "app", "(shell)", "app", "plans", "page.tsx");
    const templates = readRepo("evo-lift", "app", "(shell)", "app", "templates", "page.tsx");
    const table = readRepo("evo-lift", "app", "components", "named-list-table.tsx");
    assert.match(page, /<NamedListTable/);
    assert.match(page, /planEditHref\(row\.id\)/);
    assert.match(page, /statusLabel=\{planListStatusLabel\(row\.isActive\)\}/);
    assert.match(templates, /<NamedListTable/);
    assert.match(templates, /href=\{appPath\(`\/templates\/\$\{row\.id\}\/edit`\)\}/);
    assert.equal(templates.includes("statusLabel"), false);
    assert.equal(templates.includes(">Edit<"), false);
    assert.match(table, /statusLabel \? /);
    assert.match(table, /href=\{href\}/);
    assert.match(page, /PLAN_LIST_INTRO/);
    assert.match(page, /PLAN_LIST_EMPTY_ACTION/);
    assert.match(page, /<StatusNotice/);
    assert.equal(page.includes("Inactive"), false);
    assert.equal(page.includes(">Edit<"), false);
  });
});