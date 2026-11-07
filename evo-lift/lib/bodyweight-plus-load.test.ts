import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  bodyweightPlusAddedLoadKg,
  dipAddedLoadKg,
  isBodyweightPlusLoadExercise,
} from "./bodyweight-plus-load";

describe("bodyweight plus added load", () => {
  it("applies only to Dip", () => {
    assert.equal(isBodyweightPlusLoadExercise("dip"), true);
    assert.equal(isBodyweightPlusLoadExercise("assisted-dip"), false);
    assert.equal(isBodyweightPlusLoadExercise("pull-up"), false);
    assert.equal(isBodyweightPlusLoadExercise(null), false);
  });

  it("adds the belt to bodyweight, including 0 kg added", () => {
    assert.equal(bodyweightPlusAddedLoadKg(80, 10), 90);
    assert.equal(bodyweightPlusAddedLoadKg(80, 0), 80);
  });

  it("treats a blank dip load as 0 kg added", () => {
    assert.equal(dipAddedLoadKg(null), 0);
    assert.equal(dipAddedLoadKg(12.5), 12.5);
    assert.equal(dipAddedLoadKg(-1), null);
  });

  it("omits the load when bodyweight is missing", () => {
    assert.equal(bodyweightPlusAddedLoadKg(null, 0), null);
    assert.equal(bodyweightPlusAddedLoadKg(0, 0), null);
    assert.equal(bodyweightPlusAddedLoadKg(80, Number.NaN), null);
    assert.equal(bodyweightPlusAddedLoadKg(80, -1), null);
  });

  it("describes Dip charts as bodyweight plus added load", () => {
    const glossary = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../app/(shell)/glossary/page.tsx"),
      "utf8",
    );
    const definition = glossary.slice(glossary.indexOf('term: "1RM"'), glossary.indexOf('term: "Assistance (kg)"'));
    assert.match(definition, /On Dip, the estimate uses bodyweight plus added load/);
    assert.match(definition, /Without that bodyweight, the session is not plotted/);
  });
});
