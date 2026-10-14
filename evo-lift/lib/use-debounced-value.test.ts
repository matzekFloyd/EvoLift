// @vitest-environment happy-dom
import assert from "node:assert/strict";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, it, vi } from "vitest";
import { useDebouncedValue } from "./use-debounced-value";

const latest = { value: "" };

function Harness(props: { value: string; delayMs: number }) {
  const debounced = useDebouncedValue(props.value, props.delayMs);
  useEffect(() => {
    latest.value = debounced;
  }, [debounced]);
  return null;
}

describe("useDebouncedValue", () => {
  let root: Root | null = null;
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.useRealTimers();
  });

  it("waits out the delay and keeps only the latest value", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Harness, { value: "first", delayMs: 300 }));
    });
    assert.equal(latest.value, "first");

    await act(async () => {
      root?.render(createElement(Harness, { value: "second", delayMs: 300 }));
    });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    assert.equal(latest.value, "first");

    await act(async () => {
      root?.render(createElement(Harness, { value: "third", delayMs: 300 }));
    });
    assert.equal(latest.value, "first");
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    assert.equal(latest.value, "third");
  });
});
