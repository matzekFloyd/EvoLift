import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, it } from "vitest";
import { GET as exportAccount } from "@/app/api/account/export/route";
import { POST as importAccount } from "@/app/api/account/import/route";
import { PUT as putDefaults } from "@/app/api/account/exercise-defaults/[exerciseId]/route";
import { PUT as putHidden } from "@/app/api/account/exercises/hidden/route";
import { PUT as putProfile } from "@/app/api/account/profile/route";
import { POST as createBodyweight } from "@/app/api/account/bodyweight/route";
import { POST as createToken } from "@/app/api/account/tokens/route";
import { GET as getExercises } from "@/app/api/exercises/route";
import { POST as createGoal } from "@/app/api/goals/route";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as createSession } from "@/app/api/sessions/route";
import { POST as addSet } from "@/app/api/sessions/[id]/exercises/[sessionExerciseId]/sets/route";
import { POST as createTemplate } from "@/app/api/templates/route";
import { accountTransferToCsvFiles } from "@/lib/account-transfer-csv";
import { parseAccountTransferJson, type AccountTransfer } from "@/lib/account-transfer";
import { blobFromBytes } from "@/lib/account-file-download";
import { zipStoredFiles } from "@/lib/account-transfer-zip";
import {
  adminClient,
  assertLocalSupabase,
  assertHttpStatus,
  buildRequest,
  catalogId,
  createTestUser,
  deleteTestUsers,
  mintPersonalToken,
  readJson,
  type CatalogExercise,
} from "./integration-helpers";

assertLocalSupabase();

const TODAY = new Date();
const TODAY_ISO = `${TODAY.getFullYear()}-${`${TODAY.getMonth() + 1}`.padStart(2, "0")}-${`${TODAY.getDate()}`.padStart(2, "0")}`;

type SessionDetail = {
  id: string;
  exercises: Array<{ id: string }>;
};

describe("account export and import on local Supabase", () => {
  const admin = adminClient();
  const userIds: string[] = [];
  let ownerToken = "";
  let ownerId = "";
  let otherId = "";
  let squatId = "";
  let catalogCount = 0;
  let exported = "";

  beforeAll(async () => {
    const owner = await createTestUser(admin, "evo-transfer-owner");
    const other = await createTestUser(admin, "evo-transfer-other");
    userIds.push(owner.id, other.id);
    ownerId = owner.id;
    ownerToken = owner.token;
    otherId = other.id;

    const catalog = await readJson(await getExercises(buildRequest("/api/exercises", "GET", ownerToken)));
    assert.equal(catalog.status, 200);
    const rows = catalog.body.data as CatalogExercise[];
    catalogCount = rows.length;
    squatId = catalogId(rows, "back-squat");

    const created = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", ownerToken, {
          performed_on: "2020-02-02",
          notes: "owner-secret",
          exercises: [{ exercise_id: squatId, target_reps: 5, base_weight_kg: 20 }],
        }),
      ),
    );
    assertHttpStatus(created.status, 201, created.body.error);
    const session = created.body.data as SessionDetail;
    const sessionExerciseId = session.exercises[0]?.id;
    assert.ok(sessionExerciseId);
    const warmup = await readJson(
      await addSet(
        buildRequest(`/api/sessions/${session.id}/exercises/${sessionExerciseId}/sets`, "POST", ownerToken, {
          reps: 5,
          weight_kg: 60,
          is_warmup: true,
        }),
        { params: Promise.resolve({ id: session.id, sessionExerciseId }) },
      ),
    );
    assertHttpStatus(warmup.status, 201, warmup.body.error);
    const working = await readJson(
      await addSet(
        buildRequest(`/api/sessions/${session.id}/exercises/${sessionExerciseId}/sets`, "POST", ownerToken, {
          reps: 5,
          weight_kg: 100,
          is_warmup: false,
        }),
        { params: Promise.resolve({ id: session.id, sessionExerciseId }) },
      ),
    );
    assertHttpStatus(working.status, 201, working.body.error);

    const template = await readJson(
      await createTemplate(
        buildRequest("/api/templates", "POST", ownerToken, {
          name: "Transfer template",
          exercises: [{ exercise_id: squatId, target_reps: 5 }],
        }),
      ),
    );
    assertHttpStatus(template.status, 201, template.body.error);
    const plan = await readJson(
      await createPlan(
        buildRequest("/api/plans", "POST", ownerToken, {
          name: "Transfer plan",
          is_active: true,
          days: [{ name: "Day A", exercises: [{ exercise_id: squatId, target_reps: 5 }] }],
        }),
      ),
    );
    assertHttpStatus(plan.status, 201, plan.body.error);
    const goal = await readJson(
      await createGoal(
        buildRequest("/api/goals", "POST", ownerToken, {
          exercise_id: squatId,
          milestone_type: "absolute",
          target_weight_kg: 140,
          min_reps: 1,
        }),
      ),
    );
    assertHttpStatus(goal.status, 201, goal.body.error);
    const profile = await readJson(
      await putProfile(
        buildRequest("/api/account/profile", "PUT", ownerToken, {
          height_cm: 180,
          sex: "male",
          date_of_birth: "1990-01-02",
        }),
      ),
    );
    assertHttpStatus(profile.status, 200, profile.body.error);
    const weight = await readJson(
      await createBodyweight(
        buildRequest("/api/account/bodyweight", "POST", ownerToken, {
          logged_on: "2020-02-02",
          bodyweight_kg: 80,
        }),
      ),
    );
    assertHttpStatus(weight.status, 201, weight.body.error);
    const hidden = await readJson(
      await putHidden(buildRequest("/api/account/exercises/hidden", "PUT", ownerToken, { exercise_ids: [squatId] })),
    );
    assertHttpStatus(hidden.status, 200, hidden.body.error);
    const defaults = await readJson(
      await putDefaults(
        buildRequest(`/api/account/exercise-defaults/${squatId}`, "PUT", ownerToken, {
          default_base_weight_kg: 20,
          default_target_reps: 5,
          suggest_warmups: true,
          suggest_target: true,
        }),
        { params: Promise.resolve({ exerciseId: squatId }) },
      ),
    );
    assertHttpStatus(defaults.status, 200, defaults.body.error);
    await mintPersonalToken(createToken, ownerToken, "evo-token-should-stay");
    const marked = await admin.from("app_users").update({ double_progression: true }).eq("id", ownerId);
    assert.equal(marked.error, null);

    const otherSession = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", other.token, {
          performed_on: "2020-03-03",
          notes: "other-user-session",
          exercises: [{ exercise_id: squatId, target_reps: 5 }],
        }),
      ),
    );
    assertHttpStatus(otherSession.status, 201, otherSession.body.error);
  });

  afterAll(async () => {
    await deleteTestUsers(admin, userIds);
  });

  it("downloads only the signed-in user's data", async () => {
    const response = await exportAccount(buildRequest("/api/account/export?format=json", "GET", ownerToken));
    assert.equal(response.status, 200);
    exported = await response.text();
    assert.equal(exported.includes("other-user-session"), false);
    assert.equal(exported.includes("evo-token-should-stay"), false);
    assert.equal(exported.includes("test-pass-1"), false);
    const document = JSON.parse(exported) as AccountTransfer;
    assert.equal(document.sessions.some((session) => session.notes === "owner-secret"), true);
    const sets = document.sessions.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets));
    assert.equal(sets.some((set) => set.warmup && set.loadedKg === 60 && set.reps === 5), true);
    assert.equal(sets.some((set) => !set.warmup && set.loadedKg === 100), true);
    assert.equal(document.templates.some((template) => template.name === "Transfer template"), true);
    assert.equal(document.plans.some((plan) => plan.name === "Transfer plan" && plan.active), true);
    assert.equal(document.goals.some((goal) => goal.exercise === "back-squat" && goal.targetWeightKg === 140), true);
    assert.equal(document.bodyweightLog.some((entry) => entry.loggedOn === "2020-02-02" && entry.bodyweightKg === 80), true);
    assert.equal(document.profile.heightCm, 180);
    assert.equal(document.profile.sex, "male");
    assert.equal(document.profile.dateOfBirth, "1990-01-02");
    assert.equal(document.hiddenExercises.includes("back-squat"), true);
    assert.equal(document.exerciseDefaults.some((row) => row.exercise === "back-squat" && row.baseWeightKg === 20), true);

    const { count } = await admin
      .from("exercises")
      .select("id", { count: "exact", head: true });
    assert.equal(count, catalogCount);
  });

  it("restores JSON and CSV into an account and leaves existing rows unless replaced", async () => {
    const destination = await createTestUser(admin, "evo-transfer-dest");
    userIds.push(destination.id);
    const imported = await readJson(await importAccount(importRequest(destination.token, "replace", exported)));
    assertHttpStatus(imported.status, 200, imported.body.error);
    await assertRestored(destination.id);

    const csvUser = await createTestUser(admin, "evo-transfer-csv");
    userIds.push(csvUser.id);
    const document = parseAccountTransferJson(exported, TODAY_ISO);
    const csvFiles = accountTransferToCsvFiles(document);
    const zip = zipStoredFiles(csvFiles.map((file) => ({ name: file.name, bytes: new TextEncoder().encode(file.text) })));
    const csvImported = await readJson(
      await importAccount(importRequest(csvUser.token, "replace", zip, "evolift-account.csv.zip", "application/zip")),
    );
    assertHttpStatus(csvImported.status, 200, csvImported.body.error);
    await assertRestored(csvUser.id);

    const before = await admin.from("workout_sessions").select("id").eq("user_id", ownerId);
    assert.equal(before.error, null);
    const ownerCount = before.data?.length ?? 0;
    const rejected = await readJson(
      await importAccount(importRequest(ownerToken, "add", `{"format":"nope"}`)),
    );
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body.error, "This file is not an EvoLift account export.");
    const afterReject = await admin.from("workout_sessions").select("id").eq("user_id", ownerId);
    assert.equal(afterReject.data?.length, ownerCount);

    const extra = parseAccountTransferJson(exported, TODAY_ISO);
    extra.templates = extra.templates.map((template) => ({ ...template, name: "Added template" }));
    extra.plans = extra.plans.map((plan, index) => ({
      ...plan,
      name: `Added plan ${index + 1}`,
      active: false,
    }));
    extra.sessions = extra.sessions.map((session) => ({
      ...session,
      notes: "added-session",
      templateRef: null,
      planRef: null,
      planDayRef: null,
      startedAt: null,
      completedAt: null,
    }));
    const added = await readJson(
      await importAccount(importRequest(ownerToken, "add", `${JSON.stringify(extra)}\n`)),
    );
    assertHttpStatus(added.status, 200, added.body.error);
    const afterAdd = await admin.from("workout_sessions").select("id, notes").eq("user_id", ownerId);
    assert.equal((afterAdd.data?.length ?? 0) > ownerCount, true);
    assert.equal(afterAdd.data?.some((row) => row.notes === "owner-secret"), true);

    const replaced = await readJson(
      await importAccount(importRequest(ownerToken, "replace", exported)),
    );
    assertHttpStatus(replaced.status, 200, replaced.body.error);
    const afterReplace = await admin.from("workout_sessions").select("notes").eq("user_id", ownerId);
    assert.equal(afterReplace.data?.some((row) => row.notes === "added-session"), false);
    assert.equal(afterReplace.data?.some((row) => row.notes === "owner-secret"), true);

    const tokens = await admin.from("user_api_tokens").select("name").eq("user_id", ownerId);
    assert.equal(tokens.data?.some((row) => row.name === "evo-token-should-stay"), true);
    const progression = await admin.from("app_users").select("double_progression").eq("id", ownerId).single();
    assert.equal(progression.data?.double_progression, true);
    const otherSessions = await admin.from("workout_sessions").select("notes").eq("user_id", otherId);
    assert.equal(otherSessions.data?.some((row) => row.notes === "other-user-session"), true);
    const { count } = await admin.from("exercises").select("id", { count: "exact", head: true });
    assert.equal(count, catalogCount);
  });

  it("lists an unknown exercise and does not create it", async () => {
    const document = parseAccountTransferJson(exported, TODAY_ISO);
    document.hiddenExercises.push("not-a-real-lift");
    document.sessions[0]?.exercises.push({
      exercise: "not-a-real-lift",
      targetSets: null,
      targetReps: 5,
      targetWeightKg: null,
      baseWeightKg: null,
      notes: null,
      notDone: false,
      sets: [],
    });
    const user = await createTestUser(admin, "evo-transfer-unknown");
    userIds.push(user.id);
    const response = await readJson(
      await importAccount(importRequest(user.token, "replace", `${JSON.stringify(document)}\n`)),
    );
    assertHttpStatus(response.status, 200, response.body.error);
    assert.deepEqual(response.body.data, { skippedExercises: ["not-a-real-lift"] });
    const { count } = await admin.from("exercises").select("id", { count: "exact", head: true });
    assert.equal(count, catalogCount);
    const sessions = await admin
      .from("workout_sessions")
      .select("id, workout_session_exercises(exercise_id)")
      .eq("user_id", user.id);
    const exerciseIds = (sessions.data ?? []).flatMap((session) =>
      (session.workout_session_exercises ?? []).map((row) => row.exercise_id),
    );
    assert.equal(exerciseIds.includes(squatId), true);
    assert.equal(exerciseIds.length, 1);
  });

  async function assertRestored(userId: string) {
    const sessions = await admin
      .from("workout_sessions")
      .select("notes, workout_session_exercises(base_weight_kg, workout_sets(reps, weight_kg, is_warmup))")
      .eq("user_id", userId);
    assert.equal(sessions.error, null);
    const match = sessions.data?.find((row) => row.notes === "owner-secret");
    assert.ok(match);
    const sets = (match.workout_session_exercises ?? []).flatMap((exercise) => exercise.workout_sets ?? []);
    assert.equal(sets.some((set) => set.is_warmup && Number(set.weight_kg) === 60 && set.reps === 5), true);
    assert.equal(sets.some((set) => !set.is_warmup && Number(set.weight_kg) === 100 && set.reps === 5), true);
    assert.equal(Number(match.workout_session_exercises?.[0]?.base_weight_kg), 20);

    const templates = await admin.from("workout_templates").select("name").eq("user_id", userId);
    assert.equal(templates.data?.some((row) => row.name === "Transfer template"), true);
    const plans = await admin.from("workout_plans").select("name, is_active").eq("user_id", userId);
    assert.equal(plans.data?.some((row) => row.name === "Transfer plan" && row.is_active), true);
    const goals = await admin
      .from("strength_milestones")
      .select("target_weight_kg, milestone_type")
      .eq("user_id", userId)
      .eq("exercise_id", squatId)
      .eq("milestone_type", "absolute");
    assert.equal(goals.data?.some((row) => Number(row.target_weight_kg) === 140), true);
    const weights = await admin.from("user_bodyweight_log").select("logged_on, bodyweight_kg").eq("user_id", userId);
    assert.equal(
      weights.data?.some((row) => row.logged_on.slice(0, 10) === "2020-02-02" && Number(row.bodyweight_kg) === 80),
      true,
    );
    const profile = await admin
      .from("user_profile_metrics")
      .select("height_cm, sex, date_of_birth, bodyweight_kg")
      .eq("user_id", userId)
      .single();
    assert.equal(Number(profile.data?.height_cm), 180);
    assert.equal(profile.data?.sex, "male");
    assert.equal(profile.data?.date_of_birth?.slice(0, 10), "1990-01-02");
    assert.equal(Number(profile.data?.bodyweight_kg), 80);
    const hidden = await admin.from("user_hidden_exercises").select("exercise_id").eq("user_id", userId);
    assert.equal(hidden.data?.some((row) => row.exercise_id === squatId), true);
    const defaults = await admin
      .from("user_exercise_defaults")
      .select("default_base_weight_kg, default_target_reps")
      .eq("user_id", userId)
      .eq("exercise_id", squatId)
      .maybeSingle();
    assert.equal(Number(defaults.data?.default_base_weight_kg), 20);
    assert.equal(defaults.data?.default_target_reps, 5);
  }
});

function importRequest(
  token: string,
  mode: "add" | "replace",
  contents: string | Uint8Array,
  filename = "evolift-account.json",
  mediaType = "application/json",
): NextRequest {
  const form = new FormData();
  form.set("mode", mode);
  const bytes = typeof contents === "string" ? new TextEncoder().encode(contents) : contents;
  form.set("file", new File([blobFromBytes(bytes, mediaType)], filename, { type: mediaType }));
  return new NextRequest("http://127.0.0.1/api/account/import", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
}
