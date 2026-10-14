import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getTemplateDraftStorageKey, templateSaveError } from "./template-draft";

const ready = {
  isLoggedIn: true,
  name: "Upper",
  exerciseRows: [{ exerciseId: "ex-1", baseWeightKg: "20" }],
};

describe("template draft", () => {
  it("scopes the stored draft to the user and template", () => {
    assert.equal(getTemplateDraftStorageKey("user-1", "new"), "evolift:template-draft:user-1:new");
    assert.equal(
      getTemplateDraftStorageKey("user-1", "template-9"),
      "evolift:template-draft:user-1:template-9",
    );
  });

  it("requires a name and a chosen exercise before saving", () => {
    assert.equal(
      templateSaveError({ ...ready, isLoggedIn: false }),
      "You must be logged in to save a template.",
    );
    assert.equal(templateSaveError({ ...ready, name: "  " }), "Please enter a template name.");
    assert.equal(
      templateSaveError({ ...ready, exerciseRows: [] }),
      "Add at least one exercise.",
    );
    assert.equal(
      templateSaveError({ ...ready, exerciseRows: [{ exerciseId: "", baseWeightKg: "" }] }),
      "Please choose an exercise for each row.",
    );
    assert.equal(
      templateSaveError({ ...ready, exerciseRows: [{ exerciseId: "ex-1", baseWeightKg: "bar" }] }),
      "Please enter a valid base weight for each exercise.",
    );
    assert.equal(templateSaveError(ready), null);
  });
});
