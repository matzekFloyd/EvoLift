import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { fetchAllPages, fetchInChunks } from "./chunked-query";

describe("fetchAllPages", () => {
  it("follows a full page and stops on a short page", async () => {
    const calls: Array<[number, number]> = [];
    const result = await fetchAllPages<number>((from, to) => {
      calls.push([from, to]);
      const rows = from === 0 ? Array.from({ length: 1000 }, (_, index) => index) : [1000];
      return Promise.resolve({ data: rows, error: null });
    });
    assert.deepEqual(calls, [
      [0, 999],
      [1000, 1999],
    ]);
    assert.equal(result.error, null);
    assert.equal(result.data.length, 1001);
    assert.equal(result.data[1000], 1000);
  });

  it("stops on an unsatisfiable range and returns a real error", async () => {
    const exhausted = await fetchAllPages(() =>
      Promise.resolve({ data: null, error: { message: "range", code: "PGRST103" } }),
    );
    assert.deepEqual(exhausted, { data: [], error: null });

    const failed = await fetchAllPages(() =>
      Promise.resolve({ data: [{ id: 1 }], error: { message: "down" } }),
    );
    assert.deepEqual(failed, { data: [], error: { message: "down" } });
  });
});

describe("fetchInChunks", () => {
  it("does not query when there are no ids", async () => {
    let calls = 0;
    const result = await fetchInChunks([], () => {
      calls += 1;
      return Promise.resolve({ data: [], error: null });
    });
    assert.equal(calls, 0);
    assert.deepEqual(result, { data: [], error: null });
  });

  it("splits ids into URL-sized chunks", async () => {
    const chunks: number[] = [];
    const ids = Array.from({ length: 81 }, (_, index) => `id-${index}`);
    const result = await fetchInChunks(ids, (chunk) => {
      chunks.push(chunk.length);
      return Promise.resolve({ data: chunk.map((id) => ({ id })), error: null });
    });
    assert.deepEqual(chunks, [80, 1]);
    assert.equal(result.data.length, 81);
  });
});
