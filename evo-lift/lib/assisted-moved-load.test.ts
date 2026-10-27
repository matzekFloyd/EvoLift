import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { assistedMovedLoadKg } from "./assisted-moved-load";

describe("assistedMovedLoadKg", () => {
  it("subtracts assistance from bodyweight, including 0 kg assistance", () => {
    assert.equal(assistedMovedLoadKg(80, 20), 60);
    assert.equal(assistedMovedLoadKg(80, 0), 80);
    assert.equal(assistedMovedLoadKg(80, 80), 0);
  });

  it("omits a moved load when bodyweight is missing or assistance is greater", () => {
    assert.equal(assistedMovedLoadKg(null, 10), null);
    assert.equal(assistedMovedLoadKg(0, 0), null);
    assert.equal(assistedMovedLoadKg(80, 80.1), null);
    assert.equal(assistedMovedLoadKg(80, Number.NaN), null);
  });
});

describe("Assistance glossary", () => {
  it("uses bodyweight minus assistance for estimated 1RM and session volume", () => {
    const glossary = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../app/(shell)/glossary/page.tsx"),
      "utf8",
    );
    const definition = glossary.slice(
      glossary.indexOf('term: "Assistance (kg)"'),
      glossary.indexOf('term: "Authenticator app"'),
    );
    assert.match(definition, /bodyweight minus assistance/);
    assert.match(definition, /estimated 1RM and session volume/);
    assert.doesNotMatch(definition, /not used for estimated 1RM or training volume/);
  });
});
