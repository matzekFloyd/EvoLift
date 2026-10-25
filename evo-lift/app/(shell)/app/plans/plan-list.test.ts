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
  sortPlanListRows,
} from "./plan-list";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("plan list", () => {
  it("puts the active plan first and sorts the rest by name or days", () => {
    const rows = [
      { name: "Upper Lower", isActive: false, dayCount: 4 },
      { name: "3-Day Strength", isActive: true, dayCount: 3 },
      { name: "Push pull", isActive: false, dayCount: 3 },
      { name: "Body part", isActive: false, dayCount: 5 },
    ];
    assert.deepEqual(
      sortPlanListRows(rows, { key: "name", direction: "asc" }).map((row) => row.name),
      ["3-Day Strength", "Body part", "Push pull", "Upper Lower"],
    );
    assert.deepEqual(
      sortPlanListRows(rows, { key: "name", direction: "desc" }).map((row) => row.name),
      ["3-Day Strength", "Upper Lower", "Push pull", "Body part"],
    );
    assert.deepEqual(
      sortPlanListRows(rows, { key: "days", direction: "asc" }).map((row) => row.name),
      ["3-Day Strength", "Push pull", "Upper Lower", "Body part"],
    );
    assert.deepEqual(
      sortPlanListRows(rows, { key: "days", direction: "desc" }).map((row) => row.name),
      ["3-Day Strength", "Body part", "Upper Lower", "Push pull"],
    );
  });

  it("links the plan name to the editor", () => {
    assert.equal(planEditHref("plan-1"), "/app/plans/plan-1/edit");
    assert.equal(
      PLAN_LIST_INTRO,
      "A plan is an ordered cycle of up to 7 days. One plan can be active. From Home, start its next session in one step.",
    );
    assert.equal(PLAN_LIST_EMPTY_LEAD, "No plans yet.");
    assert.equal(PLAN_LIST_EMPTY_ACTION, "Create a plan");
    assert.equal(PLAN_LIST_EMPTY_TAIL, "to choose the next session on Home.");
  });

  it("shares the named list table, and a plan row shows the name, day count, and active plan", () => {
    const page = readRepo("evo-lift", "app", "(shell)", "app", "plans", "page.tsx");
    const editor = readRepo("evo-lift", "app", "plans", "plan-editor-client.tsx");
    const templates = readRepo("evo-lift", "app", "(shell)", "app", "templates", "page.tsx");
    const table = readRepo("evo-lift", "app", "components", "named-list-table.tsx");
    assert.match(page, /<NamedListTable/);
    assert.match(page, /embedActions/);
    assert.match(page, /planEditHref\(row\.id\)/);
    assert.match(page, /<Checkbox/);
    assert.match(page, /Active plan/);
    assert.match(page, /label: "Days"/);
    assert.match(page, /toggleSort\("days"\)/);
    assert.match(page, /detailInline/);
    assert.match(page, /sampleWeekDayCountLabel\(row\.dayCount\)/);
    assert.match(table, /detailInline/);
    assert.match(table, /pairBelow="md"/);
    assert.equal(page.includes("sample week"), false);
    assert.equal(page.includes("SampleWeek"), false);
    assert.equal(page.includes("statusLabel"), false);
    assert.equal(page.includes("Set active"), false);
    assert.equal(page.includes("Deactivate"), false);
    assert.equal(page.includes("ListOrdered"), false);
    assert.match(templates, /<NamedListTable/);
    assert.match(templates, /href=\{appPath\(`\/templates\/\$\{row\.id\}\/edit`\)\}/);
    assert.match(templates, /countHeading=/);
    assert.equal(templates.includes("embedActions"), false);
    assert.equal(templates.includes("statusLabel"), false);
    assert.equal(templates.includes(">Edit<"), false);
    assert.match(table, /statusLabel \? /);
    assert.match(table, /href=\{href\}/);
    assert.match(table, /embedActions/);
    assert.match(page, /PLAN_LIST_INTRO/);
    assert.match(page, /PLAN_LIST_EMPTY_ACTION/);
    assert.match(page, /<StatusNotice/);
    assert.equal(page.includes("Inactive"), false);
    assert.equal(page.includes(">Edit<"), false);

    const editorName = editor.indexOf("<TextField");
    const editorActive = editor.indexOf("<Checkbox");
    const editorWeek = editor.indexOf("<SampleWeek");
    const editorDays = editor.indexOf("{days.map");
    const editorMuscle = editor.indexOf("<MuscleAreaCoverageChart");
    assert.ok(editorName >= 0 && editorActive > editorName);
    assert.ok(editorWeek > editorActive);
    assert.ok(editorDays > editorWeek);
    assert.ok(editorMuscle > editorDays);
    assert.match(editor, /max-md:\[&>\*\]:flex-1/);
    assert.match(editor, /Active plan/);
    assert.match(editor, /<SampleWeek dayCount=\{days\.length\}/);
  });
});