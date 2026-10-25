import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { textFieldClassName } from "./text-field-classes";

describe("text field classes", () => {
  it("uses one zinc border, radius, and type size for both sizes", () => {
    for (const size of ["default", "compact"] as const) {
      const className = textFieldClassName({ size });
      assert.match(className, /border-zinc-300/);
      assert.match(className, /rounded-md/);
      assert.match(className, /\btext-sm\b/);
      assert.match(className, /bg-white/);
      assert.match(className, /disabled:opacity-60/);
      assert.doesNotMatch(className, /focus-visible:ring/);
      assert.doesNotMatch(className, /\bw-full\b|\bw-24\b|\bw-20\b/);
    }
  });

  it("uses default padding for names and numbers, and tighter padding for a short set row", () => {
    const standard = textFieldClassName({ size: "default" });
    const compact = textFieldClassName({ size: "compact" });
    assert.match(standard, /px-3 py-2/);
    assert.doesNotMatch(standard, /\bpx-2\b/);
    assert.match(compact, /px-2 py-1/);
    assert.doesNotMatch(compact, /px-3 py-2/);
  });

  it("mutes a read-only value and leaves an editable field white", () => {
    const editable = textFieldClassName({ size: "default" });
    const readOnly = textFieldClassName({ size: "default", readOnly: true });
    assert.doesNotMatch(editable, /read-only:bg-zinc-50/);
    assert.match(readOnly, /read-only:bg-zinc-50/);
    assert.match(readOnly, /read-only:text-zinc-700/);
  });

  it("keeps a caller layout class", () => {
    const className = textFieldClassName({ size: "compact", className: "w-24" });
    assert.match(className, /\bw-24\b/);
    assert.match(className, /px-2 py-1/);
  });
});
