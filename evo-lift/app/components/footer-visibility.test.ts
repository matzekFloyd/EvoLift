import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { shouldHideFooter } from "./footer-visibility";

describe("footer visibility", () => {
  it("hides the footer on login and while logging a session", () => {
    assert.equal(shouldHideFooter("/login"), true);
    assert.equal(shouldHideFooter("/sessions/new"), true);
    assert.equal(shouldHideFooter("/sessions/28a7049e-7814-463f-bb24-32ec9678f0ee"), true);
  });

  it("shows the footer on other routes, including the glossary", () => {
    assert.equal(shouldHideFooter("/"), false);
    assert.equal(shouldHideFooter("/glossary"), false);
    assert.equal(shouldHideFooter("/privacy"), false);
    assert.equal(shouldHideFooter("/exercises/back-squat"), false);
    assert.equal(shouldHideFooter("/plans"), false);
    assert.equal(shouldHideFooter("/sessions/28a7049e/edit"), false);
  });
});