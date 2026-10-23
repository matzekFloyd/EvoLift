import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { resolveActionButtonIconColor } from "./action-button-icon";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("resolveActionButtonIconColor", () => {
  it("follows the button variant unless a color is chosen", () => {
    assert.equal(resolveActionButtonIconColor("primary", "auto"), "white");
    assert.equal(resolveActionButtonIconColor("secondary", "auto"), "zinc");
    assert.equal(resolveActionButtonIconColor("danger", "auto"), "red");
    assert.equal(resolveActionButtonIconColor("secondary", "amber"), "amber");
    assert.equal(resolveActionButtonIconColor("secondary", "sky"), "sky");
  });
});

describe("plan and template editor icons", () => {
  it("puts a save icon on the filled save button", () => {
    const plan = readRepo("evo-lift", "app", "plans", "plan-editor-client.tsx");
    const template = readRepo("evo-lift", "app", "templates", "template-editor-client.tsx");
    assert.match(plan, /<Save className="h-4 w-4" aria-hidden \/>\s*\{isSaving \? "Saving…" : "Save plan"\}/);
    assert.match(
      template,
      /<Save className="h-4 w-4" aria-hidden \/>\s*\{isSaving \? "Saving…" : "Save template"\}/,
    );
  });

  it("uses a red trash icon for remove, including the confirm", () => {
    const plan = readRepo("evo-lift", "app", "plans", "plan-editor-client.tsx");
    const draft = readRepo("evo-lift", "app", "components", "workout-exercise-draft-list.tsx");
    assert.match(plan, /<Trash2 className="h-4 w-4" aria-hidden \/>\s*Remove/);
    assert.match(draft, /variant="danger"[\s\S]{0,240}<Trash2 className="h-3\.5 w-3\.5" aria-hidden \/>\s*Remove/);
    assert.equal(draft.includes("ChevronRight className=\"h-3.5 w-3.5 text-sky-700\""), false);
    assert.match(draft, /<ChevronLeft className="h-3\.5 w-3\.5" aria-hidden \/>\s*Previous exercise/);
  });
});
