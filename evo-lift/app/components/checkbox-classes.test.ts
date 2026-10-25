import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  checkboxBoxClassName,
  checkboxInputClassName,
  checkboxLabelClassName,
} from "./checkbox-classes";

describe("checkbox classes", () => {
  it("uses one box size, zinc border, and sky focus ring", () => {
    assert.match(checkboxInputClassName, /\bh-4\b/);
    assert.match(checkboxInputClassName, /\bw-4\b/);
    assert.match(checkboxInputClassName, /border-zinc-300/);
    assert.match(checkboxInputClassName, /focus-visible:ring-sky-500\/50/);
    assert.match(checkboxInputClassName, /disabled:cursor-not-allowed/);
    assert.match(checkboxBoxClassName("center"), /\bh-4\b/);
    assert.match(checkboxBoxClassName("start"), /\bh-4\b/);
  });

  it("centers a single-line label and offsets a multi-line label to the first line", () => {
    assert.match(checkboxLabelClassName({ align: "center", disabled: false }), /items-center/);
    assert.equal(checkboxBoxClassName("center").includes("mt-0.5"), false);
    assert.match(checkboxLabelClassName({ align: "start", disabled: false }), /items-start/);
    assert.match(checkboxBoxClassName("start"), /mt-0\.5/);
  });

  it("fades a disabled label and keeps the pointer off the control", () => {
    const enabled = checkboxLabelClassName({ align: "center", disabled: false });
    const disabled = checkboxLabelClassName({ align: "center", disabled: true });
    assert.match(enabled, /cursor-pointer/);
    assert.equal(enabled.includes("opacity-60"), false);
    assert.match(disabled, /cursor-not-allowed/);
    assert.match(disabled, /opacity-60/);
    assert.equal(disabled.includes("cursor-pointer"), false);
  });

  it("keeps a caller layout class on the label", () => {
    const className = checkboxLabelClassName({
      align: "center",
      disabled: false,
      className: "shrink-0 whitespace-nowrap",
    });
    assert.match(className, /shrink-0 whitespace-nowrap/);
  });
});
