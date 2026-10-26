import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  setTargetsFieldGridClassName,
  setTargetsFieldLabelClassName,
} from "./set-targets-fields-layout";

const sessionDir = dirname(fileURLToPath(import.meta.url));

describe("set targets field layout", () => {
  it("keeps a wrapped label from stretching the inputs", () => {
    assert.match(setTargetsFieldGridClassName, /grid-cols-3/);
    assert.match(setTargetsFieldGridClassName, /items-start/);
    assert.match(setTargetsFieldLabelClassName, /self-end/);
    const source = readFileSync(join(sessionDir, "set-targets-fields.tsx"), "utf8");
    assert.match(source, /<TextField/);
    assert.doesNotMatch(source, /h-full|self-stretch/);
  });

  it("puts the three labels on the row above the inputs", () => {
    const source = readFileSync(join(sessionDir, "set-targets-fields.tsx"), "utf8");
    const labelsAt = source.indexOf("Target working sets");
    const inputsAt = source.indexOf('type="number"');
    assert.ok(labelsAt >= 0);
    assert.ok(inputsAt > labelsAt);
    assert.match(source, /setTargetsFieldGridClassName/);
    assert.match(source, /Target reps \(working sets\)/);
  });
});
