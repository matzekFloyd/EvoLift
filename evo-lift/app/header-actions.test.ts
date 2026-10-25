// @vitest-environment happy-dom
import assert from "node:assert/strict";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { HeaderActions } from "./header-actions";

const { getUser, onAuthStateChange } = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

const pathname = vi.hoisted(() => ({ current: "/app/templates" }));

vi.mock("next/link", () => ({
  default: function NextLink(props: {
    href: string;
    children?: ReactNode;
    className?: string;
    onClick?: () => void;
  }) {
    const { href, children, ...rest } = props;
    return createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowserClient: {
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
    },
  },
}));

const DESTINATIONS = ["Home", "Exercises", "Insights", "Goals", "Plans", "Templates", "Account", "Log out"];

type MediaListener = () => void;

function installMatchMedia() {
  let matches = false;
  const listeners = new Set<MediaListener>();
  const media = {
    media: "(min-width: 64rem)",
    get matches() {
      return matches;
    },
    addEventListener(_event: string, listener: MediaListener) {
      listeners.add(listener);
    },
    removeEventListener(_event: string, listener: MediaListener) {
      listeners.delete(listener);
    },
    addListener(listener: MediaListener) {
      listeners.add(listener);
    },
    removeListener(listener: MediaListener) {
      listeners.delete(listener);
    },
    onchange: null,
    dispatchEvent() {
      return false;
    },
  };
  window.matchMedia = () => media as unknown as MediaQueryList;
  return {
    goDesktop() {
      matches = true;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

function labelsIn(root: ParentNode): string[] {
  return [...root.querySelectorAll("a, button")].map((element) => element.textContent?.trim() ?? "");
}

describe("header and navigation baseline", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let media: ReturnType<typeof installMatchMedia> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    pathname.current = "/app/templates";
    getUser.mockReset();
    onAuthStateChange.mockReset();
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    media = installMatchMedia();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    document.documentElement.style.overflow = "";
  });

  async function renderHeader() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(HeaderActions));
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  function row(): HTMLElement {
    const element = container?.querySelector(".lg\\:flex");
    assert.ok(element instanceof HTMLElement);
    return element;
  }

  function menuButton(): HTMLButtonElement {
    const element = container?.querySelector("button[aria-controls='compact-header-menu']");
    assert.ok(element instanceof HTMLButtonElement);
    return element;
  }

  async function openMenu() {
    await act(async () => {
      menuButton().click();
    });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }

  it("stays hidden until a signed-in user is ready", async () => {
    let resolveUser: (value: unknown) => void = () => undefined;
    getUser.mockReturnValue(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );

    await renderHeader();
    assert.equal(container?.textContent, "");

    await act(async () => {
      resolveUser({ data: { user: null }, error: null });
      await Promise.resolve();
    });
    assert.equal(container?.textContent, "");
  });

  it("draws the desktop row as icon plus label, with an underline for the current page", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "lifter@example.com" } },
      error: null,
    });
    await renderHeader();

    assert.equal(container?.querySelector("header")?.className.includes("from-sky-200"), true);
    assert.equal(labelsIn(row()).join("|"), DESTINATIONS.join("|"));
    assert.equal(container?.querySelector("[role='dialog']"), null);
    assert.equal(container?.querySelector(".grid-cols-2"), null);

    const current = row().querySelector("[aria-current='page']");
    assert.ok(current instanceof HTMLElement);
    assert.equal(current.textContent?.trim(), "Templates");
    assert.match(current.className, /underline/);
    assert.match(current.className, /decoration-sky-700/);
    assert.match(current.className, /px-1\.5/);
    assert.doesNotMatch(current.className, /bg-sky-700/);
    assert.match(current.querySelector("svg")?.getAttribute("class") ?? "", /h-4/);

    const home = [...row().querySelectorAll("a")].find((element) => element.textContent?.trim() === "Home");
    assert.ok(home instanceof HTMLElement);
    assert.doesNotMatch(home.className, /underline/);
    assert.match(home.className, /text-zinc-900/);

    const logOut = row().querySelector("button");
    assert.equal(logOut?.textContent?.trim(), "Log out");
    assert.match(logOut?.parentElement?.className ?? "", /border-s/);
    assert.match(logOut?.parentElement?.className ?? "", /border-zinc-400/);

    const account = [...row().querySelectorAll("a")].find((element) => element.textContent?.trim() === "Account");
    assert.equal(account?.getAttribute("title"), "Account — lifter@example.com");
    assert.equal(menuButton().getAttribute("aria-label"), "Open navigation menu");
    assert.equal(menuButton().getAttribute("aria-expanded"), "false");
  });

  it("opens a two-column tile sheet and closes it from Escape back to the menu button", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "lifter@example.com" } },
      error: null,
    });
    await renderHeader();
    await openMenu();

    const dialog = container?.querySelector("[role='dialog']");
    assert.ok(dialog instanceof HTMLElement);
    assert.equal(dialog.getAttribute("aria-label"), "Navigation menu");
    assert.equal(dialog.getAttribute("aria-modal"), "true");
    assert.equal(document.documentElement.style.overflow, "hidden");

    const grid = dialog.querySelector(".grid-cols-2");
    assert.ok(grid instanceof HTMLElement);
    assert.match(grid.className, /grid /);
    assert.equal(labelsIn(grid).join("|"), DESTINATIONS.join("|"));

    const tiles = [...grid.querySelectorAll("a, button")];
    const current = tiles.find((element) => element.getAttribute("aria-current") === "page");
    const home = tiles.find((element) => element.textContent?.trim() === "Home");
    const logOut = tiles.find((element) => element.textContent?.trim() === "Log out");
    assert.ok(current instanceof HTMLElement);
    assert.ok(home instanceof HTMLElement);
    assert.ok(logOut instanceof HTMLButtonElement);
    assert.match(current.className, /bg-sky-700/);
    assert.match(current.className, /text-white/);
    assert.doesNotMatch(current.className, /underline/);
    assert.match(current.querySelector("svg")?.getAttribute("class") ?? "", /h-6/);
    assert.match(current.querySelector("svg")?.getAttribute("class") ?? "", /text-white/);
    assert.match(home.className, /bg-white/);
    assert.match(home.className, /text-zinc-800/);
    assert.match(home.querySelector("svg")?.getAttribute("class") ?? "", /text-sky-700/);
    assert.match(logOut.className, /bg-white/);
    assert.equal(logOut.parentElement, grid);

    const legal = dialog.querySelector("nav[aria-label='Legal']");
    assert.ok(legal instanceof HTMLElement);
    assert.equal(labelsIn(legal).join("|"), "Glossary|Terms of use|Privacy policy");
    assert.equal(menuButton().getAttribute("aria-label"), "Close navigation menu");
    assert.equal(document.activeElement, tiles[0]);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve(undefined));
      });
    });

    assert.equal(container?.querySelector("[role='dialog']"), null);
    assert.equal(document.documentElement.style.overflow, "");
    assert.equal(document.activeElement, menuButton());
    assert.equal(menuButton().getAttribute("aria-expanded"), "false");
  });

  it("closes the sheet when a destination is chosen or the desktop row takes over", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "lifter@example.com" } },
      error: null,
    });
    await renderHeader();
    await openMenu();

    const home = [...(container?.querySelectorAll("#compact-header-menu a") ?? [])].find(
      (element) => element.textContent?.trim() === "Home",
    );
    assert.ok(home instanceof HTMLElement);
    await act(async () => {
      home.click();
    });
    assert.equal(container?.querySelector("[role='dialog']"), null);

    await openMenu();
    assert.ok(container?.querySelector("[role='dialog']"));
    await act(async () => {
      media?.goDesktop();
    });
    assert.equal(container?.querySelector("[role='dialog']"), null);
  });
});
