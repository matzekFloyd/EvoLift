import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { fetchWorkoutSessionsByIds } from "./workout-sessions-by-ids";

function rpcClient(handler: (args: {
  p_ids: string[];
  p_user_id: string;
}) => { data: unknown; error: { message: string; code?: string } | null }) {
  return {
    rpc(_name: string, args: { p_ids: string[]; p_user_id: string }) {
      return Promise.resolve(handler(args));
    },
  };
}

describe("fetchWorkoutSessionsByIds", () => {
  it("returns nothing when there are no ids", async () => {
    let calls = 0;
    const result = await fetchWorkoutSessionsByIds(
      rpcClient(() => {
        calls += 1;
        return { data: [], error: null };
      }) as never,
      ["", ""],
      "user-1",
    );
    assert.equal(calls, 0);
    assert.deepEqual(result, { data: [], error: null });
  });

  it("chunks ids and maps rows", async () => {
    const chunks: number[] = [];
    const ids = Array.from({ length: 201 }, (_, index) => `id-${index}`);
    const result = await fetchWorkoutSessionsByIds(
      rpcClient(({ p_ids, p_user_id }) => {
        assert.equal(p_user_id, "user-1");
        chunks.push(p_ids.length);
        return {
          data: p_ids.map((id) => ({
            id,
            performed_on: "2026-10-14",
            created_at: "2026-10-14T09:00:00Z",
          })),
          error: null,
        };
      }) as never,
      ids,
      "user-1",
    );
    assert.deepEqual(chunks, [200, 1]);
    assert.equal(result.error, null);
    assert.equal(result.data.length, 201);
    assert.equal(result.data[0]?.performed_on, "2026-10-14");
  });

  it("stops on the first RPC error", async () => {
    const result = await fetchWorkoutSessionsByIds(
      rpcClient(() => ({ data: null, error: { message: "down", code: "57014" } })) as never,
      ["session-1"],
      "user-1",
    );
    assert.deepEqual(result, { data: [], error: { message: "down", code: "57014" } });
  });
});
