import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createOpenedPageCache, createUserMemoryCache } from "./user-memory-cache";

describe("user memory cache", () => {
  it("reuses a stored list until a refresh or a drop", async () => {
    const cache = createUserMemoryCache<string[]>();
    let calls = 0;
    const first = await cache.load("user-1", async () => {
      calls += 1;
      return ["a"];
    });
    const second = await cache.load("user-1", async () => {
      calls += 1;
      return ["b"];
    });
    assert.equal(calls, 1);
    assert.deepEqual(second, first);
    assert.deepEqual(cache.peek("user-1"), ["a"]);
    assert.equal(cache.peek("user-2"), null);

    const refreshed = await cache.load(
      "user-1",
      async () => {
        calls += 1;
        return ["c"];
      },
      { fresh: true },
    );
    assert.deepEqual(refreshed, ["c"]);
    assert.equal(calls, 2);

    const epoch = cache.epoch();
    cache.invalidate();
    assert.equal(cache.peek("user-1"), null);
    assert.notEqual(cache.epoch(), epoch);
  });

  it("does not store a list when the cache was dropped mid-load", async () => {
    const cache = createUserMemoryCache<string>();
    let release: (value: string) => void = () => {};
    const pending = cache.load(
      "user-1",
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    cache.invalidate();
    release("late");
    assert.equal(await pending, "late");
    assert.equal(cache.peek("user-1"), null);
  });
});

describe("opened page cache", () => {
  it("remembers the latest pages for one user and drops them together", () => {
    const cache = createOpenedPageCache<string>();
    cache.remember("user-1", "a", "session-a");
    cache.remember("user-1", "b", "session-b");
    assert.equal(cache.peek("user-1", "a"), "session-a");
    assert.equal(cache.peek("user-2", "a"), null);
    cache.remember("user-2", "a", "other");
    assert.equal(cache.peek("user-1", "a"), null);
    cache.invalidate();
    assert.equal(cache.peek("user-2", "a"), null);
  });

  it("keeps only the eight newest pages", () => {
    const cache = createOpenedPageCache<number>();
    for (let index = 0; index < 9; index += 1) {
      cache.remember("user-1", `s${index}`, index);
    }
    assert.equal(cache.peek("user-1", "s0"), null);
    assert.equal(cache.peek("user-1", "s8"), 8);
  });
});
