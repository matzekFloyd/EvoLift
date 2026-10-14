import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import {
  getExerciseMetadataCacheStatus,
  invalidateExerciseMetadataCache,
  loadExerciseMetadata,
} from "./exercise-metadata-cache";

const CACHE_KEY = "evolift:exercise-metadata:v1";

function metadataClient(options: {
  exercises?: unknown;
  exerciseError?: string;
  translations?: unknown;
  translationError?: string;
}) {
  let calls = 0;
  const client = {
    from(table: string) {
      calls += 1;
      const failed = table === "exercises" ? options.exerciseError : options.translationError;
      const data = table === "exercises" ? (options.exercises ?? []) : (options.translations ?? []);
      const result = failed ? { data: null, error: { message: failed } } : { data, error: null };
      const builder = {
        select() {
          return builder;
        },
        order() {
          return Promise.resolve(result);
        },
        eq() {
          return builder;
        },
        in() {
          return Promise.resolve(result);
        },
      };
      return builder;
    },
  };
  return {
    client,
    get calls() {
      return calls;
    },
  };
}

describe("exercise metadata cache", () => {
  beforeEach(() => {
    invalidateExerciseMetadataCache();
    vi.unstubAllGlobals();
  });

  it("starts as a miss and then serves the in-memory rows", async () => {
    assert.equal(getExerciseMetadataCacheStatus(), "miss");
    const source = metadataClient({
      exercises: [{ id: "1", slug: "deadlift" }],
      translations: [{ exercise_id: "1", name: "Deadlift" }],
    });
    const rows = await loadExerciseMetadata(source.client as never);
    assert.deepEqual(rows, [{ id: "1", slug: "deadlift", label: "Deadlift" }]);
    assert.equal(getExerciseMetadataCacheStatus(), "hit-memory");
    await loadExerciseMetadata(source.client as never);
    assert.equal(source.calls, 2);
  });

  it("uses the slug when the English name is missing", async () => {
    const source = metadataClient({
      exercises: [{ id: "1", slug: "deadlift" }],
      translations: [],
    });
    const rows = await loadExerciseMetadata(source.client as never);
    assert.equal(rows[0]?.label, "deadlift");
  });

  it("reads a fresh browser cache and ignores a broken one", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });
    storage.set(CACHE_KEY, "{");
    assert.equal(getExerciseMetadataCacheStatus(), "miss");
    storage.set(
      CACHE_KEY,
      JSON.stringify({
        fetchedAt: Date.now(),
        rows: [{ id: "1", slug: "deadlift", label: "Deadlift" }],
      }),
    );
    assert.equal(getExerciseMetadataCacheStatus(), "hit-local");
    const source = metadataClient({});
    const rows = await loadExerciseMetadata(source.client as never);
    assert.equal(source.calls, 0);
    assert.equal(rows[0]?.label, "Deadlift");
    invalidateExerciseMetadataCache();
    assert.equal(storage.has(CACHE_KEY), false);
  });

  it("reports a failed exercise or label read", async () => {
    await assert.rejects(
      () => loadExerciseMetadata(metadataClient({ exerciseError: "down" }).client as never),
      /Could not load exercises\./,
    );
    await assert.rejects(
      () =>
        loadExerciseMetadata(
          metadataClient({
            exercises: [{ id: "1", slug: "deadlift" }],
            translationError: "down",
          }).client as never,
        ),
      /Could not load exercise labels\./,
    );
  });
});
