import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "workout-exercise-draft-list.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("exercise list build actions", () => {
  it("gives Add exercise, Done, and Add next a soft sky surface", () => {
    assert.equal((source.match(/buildActionClassName/g) ?? []).length, 5);
    assert.equal((source.match(/iconColor="sky"/g) ?? []).length, 4);
    assert.match(source, /!bg-sky-50 !text-sky-800/);
  });
});
