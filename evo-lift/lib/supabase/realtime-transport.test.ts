import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

describe("realtimeTransportOptions", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("returns no realtime options when WebSocket is already global", async () => {
    vi.stubGlobal("WebSocket", class FakeWebSocket {});
    const { realtimeTransportOptions } = await import("./realtime-transport");
    assert.deepEqual(realtimeTransportOptions(), {});
  });

  it("supplies the ws package as transport when WebSocket is missing", async () => {
    const previous = globalThis.WebSocket;
    // @ts-expect-error — intentionally remove native WebSocket for this case
    delete globalThis.WebSocket;
    try {
      const { realtimeTransportOptions } = await import("./realtime-transport");
      const options = realtimeTransportOptions();
      assert.equal(typeof options.realtime?.transport, "function");
    } finally {
      if (previous) {
        globalThis.WebSocket = previous;
      }
    }
  });
});
