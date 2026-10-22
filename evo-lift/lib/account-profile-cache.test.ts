import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { invalidateAccountProfile, loadAccountProfile, peekAccountProfile } from "./account-profile-cache";
import { invalidateExerciseMetadataCache } from "./exercise-metadata-cache";

function tableClient(tables: Record<string, { data: unknown; error: { message: string } | null }>) {
  const client = {
    from(table: string) {
      const result = tables[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "in", "maybeSingle"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
      return builder;
    },
  };
  return client;
}

describe("account profile cache", () => {
  beforeEach(() => {
    invalidateAccountProfile();
    invalidateExerciseMetadataCache();
  });

  it("remembers profile, bodyweight, and hidden exercises", async () => {
    const client = tableClient({
      exercises: { data: [{ id: "ex-1", slug: "back-squat" }], error: null },
      exercise_translations: { data: [{ exercise_id: "ex-1", name: "Back Squat" }], error: null },
      user_profile_metrics: {
        data: {
          bodyweight_kg: 70,
          height_cm: 180,
          birth_year: 1990,
          sex: "female",
          date_of_birth: null,
        },
        error: null,
      },
      user_hidden_exercises: { data: [{ exercise_id: "ex-1" }], error: null },
      user_bodyweight_log: {
        data: [{ id: "bw-1", logged_on: "2026-02-01", bodyweight_kg: 72 }],
        error: null,
      },
      user_exercise_defaults: { data: [], error: null },
      app_users: { data: { double_progression: true }, error: null },
    });
    const first = await loadAccountProfile(client as never, "user-1");
    const second = await loadAccountProfile(client as never, "user-1");
    assert.equal(first.error, null);
    assert.equal(second.snapshot, first.snapshot);
    assert.equal(peekAccountProfile("user-1")?.bodyweightKg, "72");
    assert.equal(peekAccountProfile("user-1")?.heightCm, "180");
    assert.equal(peekAccountProfile("user-1")?.sex, "female");
    assert.equal(peekAccountProfile("user-1")?.birthYearFallback, 1990);
    assert.deepEqual(peekAccountProfile("user-1")?.hiddenExerciseIds, ["ex-1"]);
    assert.equal(peekAccountProfile("user-1")?.exerciseOptions[0]?.label, "Back Squat");
    assert.equal(peekAccountProfile("user-1")?.doubleProgression, true);
  });

  it("names a profile load failure", async () => {
    const client = tableClient({
      exercises: { data: [], error: null },
      exercise_translations: { data: [], error: null },
      user_profile_metrics: { data: null, error: { message: "down" } },
      user_bodyweight_log: { data: [], error: null },
      user_hidden_exercises: { data: [], error: null },
      user_exercise_defaults: { data: [], error: null },
      app_users: { data: null, error: null },
    });
    assert.equal((await loadAccountProfile(client as never, "user-1")).error, "profile");
  });
});
