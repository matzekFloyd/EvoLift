import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, it } from "vitest";
import { DELETE as deleteAccount } from "@/app/api/account/route";
import { GET as getExercises } from "@/app/api/exercises/route";
import { GET as listSessions, POST as createSession } from "@/app/api/sessions/route";
import { POST as addSet } from "@/app/api/sessions/[id]/exercises/[sessionExerciseId]/sets/route";
import { realtimeTransportOptions } from "@/lib/supabase/realtime-transport";
import {
  adminClient,
  anonKey,
  assertLocalSupabase,
  buildRequest,
  catalogId,
  createTestUser,
  deleteTestUsers,
  readJson,
  signIn,
  supabaseUrl,
  TEST_PASSWORD,
  type CatalogExercise,
} from "./integration-helpers";

assertLocalSupabase();

const WRONG_PASSWORD = "wrong-pass-1";

type SessionDetail = {
  id: string;
  exercises: Array<{ id: string; sets?: Array<{ id: string }> }>;
};

describe("account delete on local Supabase", () => {
  const admin = adminClient();
  let ownerEmail = "";
  let otherEmail = "";
  let ownerId = "";
  let otherId = "";
  let ownerToken = "";
  let squatId = "";
  let ownerSessionId = "";
  let ownerSetId = "";
  let otherSessionId = "";
  let catalogCount = 0;

  beforeAll(async () => {
    const owner = await createTestUser(admin, "evo-delete-owner");
    const other = await createTestUser(admin, "evo-delete-other");
    ownerId = owner.id;
    ownerEmail = owner.email;
    ownerToken = owner.token;
    otherId = other.id;
    otherEmail = other.email;

    const catalog = await readJson(await getExercises(buildRequest("/api/exercises", "GET", ownerToken)));
    assert.equal(catalog.status, 200);
    const rows = catalog.body.data as CatalogExercise[];
    catalogCount = rows.length;
    squatId = catalogId(rows, "back-squat");

    const created = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", ownerToken, {
          performed_on: "2020-02-02",
          exercises: [{ exercise_id: squatId, target_reps: 5 }],
        }),
      ),
    );
    assert.equal(created.status, 201);
    const session = created.body.data as SessionDetail;
    ownerSessionId = session.id;
    const sessionExerciseId = session.exercises[0]?.id;
    assert.ok(sessionExerciseId);
    const logged = await readJson(
      await addSet(
        buildRequest(`/api/sessions/${ownerSessionId}/exercises/${sessionExerciseId}/sets`, "POST", ownerToken, {
          reps: 5,
          weight_kg: 60,
          is_warmup: false,
        }),
        { params: Promise.resolve({ id: ownerSessionId, sessionExerciseId }) },
      ),
    );
    assert.equal(logged.status, 201);
    const loggedSession = logged.body.data as SessionDetail;
    const loggedSet = loggedSession.exercises
      .flatMap((exercise) => exercise.sets ?? [])
      .find((set) => set.id);
    assert.ok(loggedSet);
    ownerSetId = loggedSet.id;

    const otherCreated = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", await signIn(otherEmail), {
          performed_on: "2020-02-03",
          exercises: [{ exercise_id: squatId, target_reps: 5 }],
        }),
      ),
    );
    assert.equal(otherCreated.status, 201);
    otherSessionId = (otherCreated.body.data as SessionDetail).id;

    const tokenHash = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const inserts = await Promise.all([
      admin.from("workout_templates").insert({ user_id: ownerId, name: "Delete me" }),
      admin.from("workout_plans").insert({ user_id: ownerId, name: "Delete plan" }),
      admin.from("strength_milestones").insert({
        user_id: ownerId,
        exercise_id: squatId,
        milestone_type: "absolute",
        target_weight_kg: 100,
        min_reps: 1,
      }),
      admin.from("user_bodyweight_log").insert({
        user_id: ownerId,
        logged_on: "2020-02-02",
        bodyweight_kg: 80,
      }),
      admin.from("user_exercise_defaults").insert({
        user_id: ownerId,
        exercise_id: squatId,
        default_target_reps: 5,
      }),
      admin.from("user_api_tokens").insert({
        user_id: ownerId,
        name: "Delete token",
        token_prefix: "evo_delete1",
        token_hash: tokenHash,
      }),
      admin.from("user_hidden_exercises").insert({ user_id: ownerId, exercise_id: squatId }),
      admin.from("user_profile_metrics").insert({ user_id: ownerId, height_cm: 180 }),
      admin.from("workout_templates").insert({ user_id: otherId, name: "Keep me" }),
    ]);
    for (const result of inserts) {
      if (result.error) {
        throw new Error(result.error.message);
      }
    }
  });

  afterAll(async () => {
    await deleteTestUsers(admin, [ownerId, otherId].filter(Boolean));
  });

  it("leaves the account in place when the current password is wrong", async () => {
    const response = await readJson(
      await deleteAccount(buildRequest("/api/account", "DELETE", ownerToken, { currentPassword: WRONG_PASSWORD })),
    );
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Current password is incorrect.");

    const { data: userData, error } = await admin.auth.admin.getUserById(ownerId);
    assert.equal(error, null);
    assert.equal(userData.user?.email, ownerEmail);
    assert.equal(await countRows("workout_sessions", ownerId), 1);
  });

  it("deletes the auth user and that user's workout data only", async () => {
    const response = await readJson(
      await deleteAccount(buildRequest("/api/account", "DELETE", ownerToken, { currentPassword: TEST_PASSWORD })),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, { deleted: true });

    const { data: userData } = await admin.auth.admin.getUserById(ownerId);
    assert.equal(userData.user, null);

    const signInAgain = await createClient(supabaseUrl, anonKey, {
      ...realtimeTransportOptions(),
      auth: { autoRefreshToken: false, persistSession: false },
    }).auth.signInWithPassword({ email: ownerEmail, password: TEST_PASSWORD });
    assert.ok(signInAgain.error);

    const oldSession = await readJson(await listSessions(buildRequest("/api/sessions", "GET", ownerToken)));
    assert.equal(oldSession.status, 401);

    for (const table of [
      "app_users",
      "workout_sessions",
      "workout_templates",
      "workout_plans",
      "strength_milestones",
      "user_bodyweight_log",
      "user_exercise_defaults",
      "user_api_tokens",
      "user_hidden_exercises",
      "user_profile_metrics",
    ]) {
      assert.equal(await countRows(table, ownerId), 0, table);
    }
    const { count: setCount } = await admin
      .from("workout_sets")
      .select("id", { count: "exact", head: true })
      .eq("id", ownerSetId);
    assert.equal(setCount, 0);

    assert.equal(await countRows("workout_sessions", otherId), 1);
    assert.equal(await countRows("workout_templates", otherId), 1);
    const { data: otherSession } = await admin.from("workout_sessions").select("id").eq("id", otherSessionId);
    assert.equal(otherSession?.length, 1);

    const catalog = await readJson(
      await getExercises(buildRequest("/api/exercises", "GET", await signIn(otherEmail))),
    );
    assert.equal(catalog.status, 200);
    const rows = catalog.body.data as CatalogExercise[];
    assert.equal(rows.length, catalogCount);
    assert.ok(rows.some((row) => row.slug === "back-squat"));
  });

  async function countRows(table: string, userId: string): Promise<number> {
    const column = table === "app_users" ? "id" : "user_id";
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, userId);
    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  }
});
