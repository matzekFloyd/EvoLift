import assert from "node:assert/strict";
import { afterAll, beforeAll, describe, it } from "vitest";
import { GET as getOpenApi } from "@/app/api/openapi/route";
import { POST as postSecurityEvent } from "@/app/api/security/events/route";
import { GET as getExercises } from "@/app/api/exercises/route";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as duplicatePlan } from "@/app/api/plans/[id]/duplicate/route";
import { GET as getSession } from "@/app/api/sessions/[id]/route";
import {
  DELETE as deleteSessionExercise,
  PATCH as patchSessionExercise,
} from "@/app/api/sessions/[id]/exercises/[sessionExerciseId]/route";
import { POST as addSet } from "@/app/api/sessions/[id]/exercises/[sessionExerciseId]/sets/route";
import {
  DELETE as deleteSet,
  PATCH as patchSet,
} from "@/app/api/sessions/[id]/exercises/[sessionExerciseId]/sets/[setId]/route";
import { POST as createSession } from "@/app/api/sessions/route";
import {
  DELETE as deleteTemplate,
  PUT as putTemplate,
} from "@/app/api/templates/[id]/route";
import { POST as createTemplate } from "@/app/api/templates/route";
import {
  adminClient,
  assertLocalSupabase,
  buildRequest,
  catalogId,
  createTestUser,
  deleteTestUsers,
  readJson,
  type CatalogExercise,
} from "./integration-helpers";

assertLocalSupabase();

type SessionDetail = {
  id: string;
  exercises: Array<{
    id: string;
    exercise_id: string;
    target_reps: number | null;
    not_done?: boolean;
    sets: Array<{ id: string; reps: number; weight_kg: number | null }>;
  }>;
};

describe("session mutations, plan duplicate, openapi, security events", () => {
  const admin = adminClient();
  const userIds: string[] = [];
  let ownerToken = "";
  let otherToken = "";
  let squatId = "";
  let deadliftId = "";

  beforeAll(async () => {
    const owner = await createTestUser(admin, "evo-mut-owner");
    const other = await createTestUser(admin, "evo-mut-other");
    userIds.push(owner.id, other.id);
    ownerToken = owner.token;
    otherToken = other.token;
    const catalog = await readJson(await getExercises(buildRequest("/api/exercises", "GET", ownerToken)));
    const rows = catalog.body.data as CatalogExercise[];
    squatId = catalogId(rows, "back-squat");
    deadliftId = catalogId(rows, "deadlift");
  });

  afterAll(async () => {
    await deleteTestUsers(admin, userIds);
  });

  it("updates and deletes a set and a session exercise", async () => {
    const created = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", ownerToken, {
          performed_on: "2020-03-01",
          exercises: [
            { exercise_id: squatId, target_reps: 5 },
            { exercise_id: deadliftId, target_reps: 3 },
          ],
        }),
      ),
    );
    assert.equal(created.status, 201, created.body.error);
    const session = created.body.data as SessionDetail;
    const squatExercise = session.exercises.find((row) => row.exercise_id === squatId);
    const deadliftExercise = session.exercises.find((row) => row.exercise_id === deadliftId);
    assert.ok(squatExercise && deadliftExercise);

    const logged = await readJson(
      await addSet(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${squatExercise.id}/sets`,
          "POST",
          ownerToken,
          { reps: 5, weight_kg: 80 },
        ),
        { params: Promise.resolve({ id: session.id, sessionExerciseId: squatExercise.id }) },
      ),
    );
    assert.equal(logged.status, 201, logged.body.error);
    const setId = (logged.body.data as SessionDetail).exercises
      .flatMap((exercise) => exercise.sets)
      .find((set) => set.reps === 5)?.id;
    assert.ok(setId);

    const patchedSet = await readJson(
      await patchSet(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${squatExercise.id}/sets/${setId}`,
          "PATCH",
          ownerToken,
          { reps: 3, weight_kg: 90 },
        ),
        {
          params: Promise.resolve({
            id: session.id,
            sessionExerciseId: squatExercise.id,
            setId,
          }),
        },
      ),
    );
    assert.equal(patchedSet.status, 200, patchedSet.body.error);
    const afterPatch = patchedSet.body.data as SessionDetail;
    const updated = afterPatch.exercises
      .flatMap((exercise) => exercise.sets)
      .find((set) => set.id === setId);
    assert.equal(updated?.reps, 3);
    assert.equal(Number(updated?.weight_kg), 90);

    const emptyPatch = await readJson(
      await patchSet(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${squatExercise.id}/sets/${setId}`,
          "PATCH",
          ownerToken,
          {},
        ),
        {
          params: Promise.resolve({
            id: session.id,
            sessionExerciseId: squatExercise.id,
            setId,
          }),
        },
      ),
    );
    assert.equal(emptyPatch.status, 400);
    assert.equal(emptyPatch.body.error, "Provide at least one field to update.");

    const otherSet = await readJson(
      await patchSet(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${squatExercise.id}/sets/${setId}`,
          "PATCH",
          otherToken,
          { reps: 1 },
        ),
        {
          params: Promise.resolve({
            id: session.id,
            sessionExerciseId: squatExercise.id,
            setId,
          }),
        },
      ),
    );
    assert.equal(otherSet.status, 404);

    const deletedSet = await readJson(
      await deleteSet(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${squatExercise.id}/sets/${setId}`,
          "DELETE",
          ownerToken,
        ),
        {
          params: Promise.resolve({
            id: session.id,
            sessionExerciseId: squatExercise.id,
            setId,
          }),
        },
      ),
    );
    assert.equal(deletedSet.status, 200, deletedSet.body.error);
    const afterDeleteSet = deletedSet.body.data as SessionDetail;
    assert.equal(
      afterDeleteSet.exercises.flatMap((exercise) => exercise.sets).some((set) => set.id === setId),
      false,
    );

    const patchedExercise = await readJson(
      await patchSessionExercise(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${deadliftExercise.id}`,
          "PATCH",
          ownerToken,
          { target_reps: 8, not_done: true },
        ),
        { params: Promise.resolve({ id: session.id, sessionExerciseId: deadliftExercise.id }) },
      ),
    );
    assert.equal(patchedExercise.status, 200, patchedExercise.body.error);
    const afterExercisePatch = patchedExercise.body.data as SessionDetail;
    const patchedRow = afterExercisePatch.exercises.find((row) => row.id === deadliftExercise.id);
    assert.equal(patchedRow?.target_reps, 8);
    assert.equal(patchedRow?.not_done, true);

    const deletedExercise = await readJson(
      await deleteSessionExercise(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${deadliftExercise.id}`,
          "DELETE",
          ownerToken,
        ),
        { params: Promise.resolve({ id: session.id, sessionExerciseId: deadliftExercise.id }) },
      ),
    );
    assert.equal(deletedExercise.status, 200, deletedExercise.body.error);
    const afterExerciseDelete = deletedExercise.body.data as SessionDetail;
    assert.equal(
      afterExerciseDelete.exercises.some((row) => row.id === deadliftExercise.id),
      false,
    );

    const finalRead = await readJson(
      await getSession(buildRequest(`/api/sessions/${session.id}`, "GET", ownerToken), {
        params: Promise.resolve({ id: session.id }),
      }),
    );
    assert.equal(finalRead.status, 200);
    assert.equal((finalRead.body.data as SessionDetail).exercises.length, 1);
  });

  it("duplicates a plan and updates then deletes a template", async () => {
    const plan = await readJson(
      await createPlan(
        buildRequest("/api/plans", "POST", ownerToken, {
          name: "Source plan",
          days: [{ name: "A", exercises: [{ exercise_id: squatId, target_reps: 5 }] }],
        }),
      ),
    );
    assert.equal(plan.status, 201, plan.body.error);
    const planId = (plan.body.data as { id: string }).id;

    const duplicated = await readJson(
      await duplicatePlan(buildRequest(`/api/plans/${planId}/duplicate`, "POST", ownerToken), {
        params: Promise.resolve({ id: planId }),
      }),
    );
    assert.equal(duplicated.status, 201, duplicated.body.error);
    const copy = duplicated.body.data as { id: string; name: string };
    assert.ok(copy.id);
    assert.notEqual(copy.id, planId);
    assert.equal(copy.name, "Source plan copy");

    const otherDup = await readJson(
      await duplicatePlan(buildRequest(`/api/plans/${planId}/duplicate`, "POST", otherToken), {
        params: Promise.resolve({ id: planId }),
      }),
    );
    assert.equal(otherDup.status, 404);

    const template = await readJson(
      await createTemplate(
        buildRequest("/api/templates", "POST", ownerToken, {
          name: "Mutable",
          exercises: [{ exercise_id: squatId, target_sets: 3, target_reps: 5 }],
        }),
      ),
    );
    assert.equal(template.status, 201, template.body.error);
    const templateId = (template.body.data as { id: string }).id;

    const updated = await readJson(
      await putTemplate(
        buildRequest(`/api/templates/${templateId}`, "PUT", ownerToken, {
          name: "Mutable renamed",
          exercises: [{ exercise_id: deadliftId, target_sets: 2, target_reps: 3 }],
        }),
        { params: Promise.resolve({ id: templateId }) },
      ),
    );
    assert.equal(updated.status, 200, updated.body.error);
    assert.equal((updated.body.data as { name: string }).name, "Mutable renamed");

    const removed = await readJson(
      await deleteTemplate(buildRequest(`/api/templates/${templateId}`, "DELETE", ownerToken), {
        params: Promise.resolve({ id: templateId }),
      }),
    );
    assert.equal(removed.status, 200, removed.body.error);
    assert.deepEqual(removed.body.data, { deleted: true });

    const otherDelete = await readJson(
      await deleteTemplate(buildRequest(`/api/templates/${templateId}`, "DELETE", otherToken), {
        params: Promise.resolve({ id: templateId }),
      }),
    );
    assert.equal(otherDelete.status, 404);
  });

  it("serves OpenAPI JSON without auth", async () => {
    const response = await getOpenApi(buildRequest("/api/openapi", "GET", null));
    assert.equal(response.status, 200);
    const spec = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    assert.match(spec.openapi, /^3\./);
    assert.ok(spec.paths["/api/sessions"]);
    assert.ok(spec.paths["/api/exercises"]);
  });

  it("records a public login_failed security event and rejects a bad type", async () => {
    const bad = await readJson(
      await postSecurityEvent(
        buildRequest("/api/security/events", "POST", null, { type: "not_a_real_event" }),
      ),
    );
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error, "Please provide a valid security event type.");

    const recorded = await readJson(
      await postSecurityEvent(
        buildRequest("/api/security/events", "POST", null, {
          type: "login_failed",
          email: "lifter@example.com",
        }),
      ),
    );
    assert.equal(recorded.status, 200, recorded.body.error);
    assert.deepEqual(recorded.body.data, { recorded: true });
  });
});
