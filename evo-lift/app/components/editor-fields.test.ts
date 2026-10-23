import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { editorTitle, optionalNotesMode } from "./editor-fields";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("editor fields", () => {
  it("uses the typed name as the title", () => {
    assert.equal(editorTitle("  3-Day Strength  ", "New plan"), "3-Day Strength");
    assert.equal(editorTitle("   ", "New plan"), "New plan");
  });

  it("keeps existing notes as a preview until they are opened", () => {
    assert.equal(optionalNotesMode("", false), "add");
    assert.equal(optionalNotesMode("   ", false), "add");
    assert.equal(optionalNotesMode("Three full-body days.", false), "preview");
    assert.equal(optionalNotesMode("Three full-body days.", true), "edit");
    assert.equal(optionalNotesMode("", true), "edit");
  });

  it("shares the heading and notes on the plan and template editors", () => {
    const plan = readRepo("evo-lift", "app", "plans", "plan-editor-client.tsx");
    const template = readRepo("evo-lift", "app", "templates", "template-editor-client.tsx");
    for (const source of [plan, template]) {
      assert.match(source, /EditorHeading/);
      assert.match(source, /OptionalNotesField/);
      assert.match(source, /editorTitle/);
      assert.equal(source.includes("EditorSaveBar"), false);
      assert.equal(source.includes("stickyAction"), false);
    }
    assert.equal(plan.includes("Editing a template does not change this plan"), false);
    assert.equal(template.includes("Templates save exercise order"), false);
    assert.match(plan, /Add the days in the order you train them\./);
    assert.match(template, /Add the exercises in the order you train them\./);
  });
});
