import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  DESKTOP_NAV_MEDIA_QUERY,
  HEADER_LOG_OUT_LABEL,
  compactMenuButtonClassName,
  compactMenuButtonLabel,
  compactMenuFocusable,
  compactMenuInitialFocusVisible,
  compactMenuShouldClose,
  focusHeaderControl,
  headerLogOutGroupClassName,
  headerNavItemClassName,
  headerNavTileClassName,
} from "./header-nav";

const appDir = dirname(fileURLToPath(import.meta.url));

describe("compact menu names and focus", () => {
  it("names the menu button for the icon it shows", () => {
    assert.equal(compactMenuButtonLabel(false), "Open navigation menu");
    assert.equal(compactMenuButtonLabel(true), "Close navigation menu");
    assert.equal(HEADER_LOG_OUT_LABEL, "Log out");
  });

  it("gives compact controls a visible focus ring", () => {
    assert.match(compactMenuButtonClassName, /focus-visible:ring-sky-700/);
    assert.match(headerNavItemClassName(false), /focus-visible:ring-sky-700/);
    assert.match(headerNavItemClassName(true), /focus-visible:ring-sky-700/);
    assert.match(headerNavItemClassName(true), /focus-visible:ring-offset-sky-100/);
  });

  it("marks the current page with a dark label and an underline on the header", () => {
    const current = headerNavItemClassName(true);
    const other = headerNavItemClassName(false);

    assert.match(current, /text-sky-950/);
    assert.match(current, /underline/);
    assert.match(current, /decoration-sky-700/);
    assert.match(current, /hover:!text-sky-950/);
    assert.match(current, /hover:bg-white\/60/);
    assert.doesNotMatch(current, /bg-sky-700/);
    assert.match(other, /text-zinc-900/);
    assert.match(other, /px-1\.5/);
    assert.match(other, /hover:!text-zinc-900/);
    assert.match(other, /hover:bg-white\/60/);
    assert.doesNotMatch(other, /underline/);
    assert.match(headerLogOutGroupClassName(), /border-s/);
    assert.match(headerLogOutGroupClassName(), /border-zinc-400/);
  });

  it("marks the current page as a filled tile in the compact menu", () => {
    const current = headerNavTileClassName(true);
    const other = headerNavTileClassName(false);

    assert.match(current, /bg-sky-700/);
    assert.match(current, /text-white/);
    assert.match(current, /hover:bg-sky-600/);
    assert.match(current, /focus-visible:ring-white/);
    assert.match(other, /bg-white/);
    assert.match(other, /px-3/);
    assert.match(other, /text-zinc-800/);
    assert.match(other, /hover:bg-sky-50/);
    assert.match(other, /focus-visible:ring-sky-700/);
    assert.doesNotMatch(other, /bg-sky-700/);
    assert.equal(DESKTOP_NAV_MEDIA_QUERY, "(min-width: 64rem)");
    assert.equal(compactMenuShouldClose(true), true);
    assert.equal(compactMenuShouldClose(false), false);
  });

  it("keeps the wordmark and menu button in the tab cycle ahead of the links", () => {
    const logo = { id: "logo" } as HTMLElement;
    const trigger = { id: "trigger" } as HTMLElement;
    const home = { id: "home" } as HTMLElement;
    const glossary = { id: "glossary" } as HTMLElement;

    assert.deepEqual(compactMenuFocusable({ logo, trigger, dialogItems: [home, glossary] }), [
      logo,
      trigger,
      home,
      glossary,
    ]);
    assert.deepEqual(compactMenuFocusable({ logo: null, trigger: null, dialogItems: [home] }), [home]);
  });

  it("shows the opening focus ring only for keyboard activation", () => {
    assert.equal(compactMenuInitialFocusVisible(0), true);
    assert.equal(compactMenuInitialFocusVisible(1), false);
  });

  it("asks the browser to show the focus ring unless a tap opened the menu", () => {
    const calls: FocusOptions[] = [];
    const element = {
      focus(options?: FocusOptions) {
        if (options) {
          calls.push(options);
        }
      },
    } as HTMLElement;

    focusHeaderControl(element);
    focusHeaderControl(element, { focusVisible: false });
    focusHeaderControl(null);

    assert.deepEqual(calls, [{ focusVisible: true }, { focusVisible: false }]);
  });
});

describe("header keyboard contract", () => {
  it("traps focus in the compact menu and names every header control", () => {
    const header = readFileSync(join(appDir, "header-actions.tsx"), "utf8");
    const navLink = readFileSync(join(appDir, "components", "app-header-nav-link.tsx"), "utf8");
    const footer = readFileSync(join(appDir, "components", "app-footer.tsx"), "utf8");

    assert.match(header, /resolveDialogKeyAction/);
    assert.match(header, /compactMenuFocusable/);
    assert.match(header, /returnFocus: true/);
    assert.match(header, /focusHeaderControl/);
    assert.match(header, /compactMenuInitialFocusVisible\(event\.detail\)/);
    assert.match(header, /focusVisible: compactMenuInitialFocusVisibleRef\.current/);
    assert.match(header, /aria-label="Main"/);
    assert.match(header, /aria-label="Navigation menu"/);
    assert.match(header, /aria-label="Legal"/);
    assert.match(header, /aria-expanded=\{isCompactMenuOpen\}/);
    assert.match(header, /DESKTOP_NAV_MEDIA_QUERY/);
    assert.match(header, /compactMenuShouldClose/);
    assert.match(header, /legalLinkAriaCurrent/);
    assert.match(header, /aria-hidden/);
    assert.equal(header.match(/<AppHeaderNavLink/g)?.length, 2);
    assert.equal(header.match(/<AppHeaderNavButton/g)?.length, 2);
    assert.equal(header.match(/headerLogOutGroupClassName\(/g)?.length, 1);
    assert.equal(header.match(/layout="tile"/g)?.length, 2);
    assert.doesNotMatch(header, /compactNavTileClassName|bg-sky-700/);
    assert.doesNotMatch(header, /role="button"|role="link"|role="navigation"/);

    assert.match(navLink, /headerNavItemClassName\(isActive\)/);
    assert.match(navLink, /<span>\{label\}<\/span>/);
    assert.doesNotMatch(navLink, /aria-label=\{label\}/);
    assert.doesNotMatch(navLink, /grid-cols-\[0fr\]|bg-sky-700/);
    assert.match(navLink, /aria-current=\{isActive \? "page" : undefined\}/);
    assert.match(navLink, /aria-hidden/);

    assert.match(footer, /legalLinkAriaCurrent/);
    assert.match(footer, /legalLinkClassNameFor/);
  });
});
