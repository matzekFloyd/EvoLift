import assert from "node:assert/strict";
import { afterAll, beforeAll, describe, it } from "vitest";
import { POST as createToken } from "@/app/api/account/tokens/route";
import { DELETE as deleteBodyweight } from "@/app/api/account/bodyweight/[id]/route";
import { GET as getExercises } from "@/app/api/exercises/route";
import { GET as getGoal } from "@/app/api/goals/[id]/route";
import { POST as createGoal } from "@/app/api/goals/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as getSession, PATCH as patchSession } from "@/app/api/sessions/[id]/route";
import { POST as createSession } from "@/app/api/sessions/route";
import { GET as getTemplate } from "@/app/api/templates/[id]/route";
import { POST as createTemplate } from "@/app/api/templates/route";
import {
  adminClient,
  assertHttpStatus,
  assertLocalSupabase,
  buildRequest,
  catalogId,
  createTestUser,
  deleteTestUsers,
  mintPersonalToken,
  readJson,
  type CatalogExercise,
} from "./integration-helpers";

assertLocalSupabase();

const SESSION_DATE = "2020-02-01";

/**
 * Personal tokens use the service-role client (RLS bypassed). These checks assert
 * ownership filters still hide another user’s rows.
 */
describe("personal API token IDOR on local Supabase", () => {
  const admin = adminClient();
  const userIds: string[] = [];
  let ownerPersonalToken = "";
  let otherPersonalToken = "";
  let squatId = "";

  beforeAll(async () => {
    const owner = await createTestUser(admin, "evo-token-owner");
    const other = await createTestUser(admin, "evo-token-other");
    userIds.push(owner.id, other.id);
    ownerPersonalToken = await mintPersonalToken(createToken, owner.token, "owner-cli");
    otherPersonalToken = await mintPersonalToken(createToken, other.token, "other-cli");

    const catalog = await readJson(
      await getExercises(buildRequest("/api/exercises", "GET", ownerPersonalToken)),
    );
    assert.equal(catalog.status, 200);
    squatId = catalogId(catalog.body.data as CatalogExercise[], "back-squat");
  });

  afterAll(async () => {
    await deleteTestUsers(admin, userIds);
  });

  it("hides another user’s session, template, plan, goal, and bodyweight behind 404", async () => {
    const session = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", ownerPersonalToken, {
          performed_on: SESSION_DATE,
          notes: "owner session",
          exercises: [{ exercise_id: squatId }],
        }),
      ),
    );
    assertHttpStatus(session.status, 201, session.body.error);
    const sessionId = (session.body.data as { id: string }).id;

    const otherSessionGet = await readJson(
      await getSession(buildRequest(`/api/sessions/${sessionId}`, "GET", otherPersonalToken), {
        params: Promise.resolve({ id: sessionId }),
      }),
    );
    assert.equal(otherSessionGet.status, 404);
    assert.equal(otherSessionGet.body.error, "Workout session not found.");

    const otherSessionPatch = await readJson(
      await patchSession(
        buildRequest(`/api/sessions/${sessionId}`, "PATCH", otherPersonalToken, {
          notes: "hijack",
        }),
        { params: Promise.resolve({ id: sessionId }) },
      ),
    );
    assert.equal(otherSessionPatch.status, 404);

    const template = await readJson(
      await createTemplate(
        buildRequest("/api/templates", "POST", ownerPersonalToken, {
          name: "Owner template",
          exercises: [{ exercise_id: squatId, target_sets: 3, target_reps: 5 }],
        }),
      ),
    );
    assertHttpStatus(template.status, 201, template.body.error);
    const templateId = (template.body.data as { id: string }).id;
    const otherTemplate = await readJson(
      await getTemplate(buildRequest(`/api/templates/${templateId}`, "GET", otherPersonalToken), {
        params: Promise.resolve({ id: templateId }),
      }),
    );
    assert.equal(otherTemplate.status, 404);
    assert.equal(otherTemplate.body.error, "Template not found.");

    const plan = await readJson(
      await createPlan(
        buildRequest("/api/plans", "POST", ownerPersonalToken, {
          name: "Owner plan",
          days: [{ name: "Day 1", exercises: [{ exercise_id: squatId }] }],
        }),
      ),
    );
    // Plan create uses save_workout_plan (auth.uid()); personal tokens may fail closed.
    if (plan.status === 201) {
      const planId = (plan.body.data as { id: string }).id;
      const otherPlan = await readJson(
        await getPlan(buildRequest(`/api/plans/${planId}`, "GET", otherPersonalToken), {
          params: Promise.resolve({ id: planId }),
        }),
      );
      assert.equal(otherPlan.status, 404);
      assert.equal(otherPlan.body.error, "Plan not found.");
    } else {
      assert.ok(plan.status >= 400);
      const { data: insertedPlan, error: planInsertError } = await admin
        .from("workout_plans")
        .insert({ user_id: userIds[0], name: "Owner plan (admin)" })
        .select("id")
        .single();
      assert.equal(planInsertError, null);
      assert.ok(insertedPlan?.id);
      const otherPlan = await readJson(
        await getPlan(buildRequest(`/api/plans/${insertedPlan.id}`, "GET", otherPersonalToken), {
          params: Promise.resolve({ id: insertedPlan.id }),
        }),
      );
      assert.equal(otherPlan.status, 404);
      assert.equal(otherPlan.body.error, "Plan not found.");
    }

    const goal = await readJson(
      await createGoal(
        buildRequest("/api/goals", "POST", ownerPersonalToken, {
          exercise_id: squatId,
          milestone_type: "absolute",
          target_weight_kg: 100,
          min_reps: 5,
        }),
      ),
    );
    assertHttpStatus(goal.status, 201, goal.body.error);
    const goalId = (goal.body.data as { id: string }).id;
    const otherGoal = await readJson(
      await getGoal(buildRequest(`/api/goals/${goalId}`, "GET", otherPersonalToken), {
        params: Promise.resolve({ id: goalId }),
      }),
    );
    assert.equal(otherGoal.status, 404);
    assert.equal(otherGoal.body.error, "Goal not found.");

    const { data: bodyweight, error: bodyweightError } = await admin
      .from("user_bodyweight_log")
      .insert({ user_id: userIds[0], logged_on: "2020-02-01", bodyweight_kg: 80 })
      .select("id")
      .single();
    assert.equal(bodyweightError, null);
    assert.ok(bodyweight?.id);
    const otherBodyweight = await readJson(
      await deleteBodyweight(
        buildRequest(`/api/account/bodyweight/${bodyweight.id}`, "DELETE", otherPersonalToken),
        { params: Promise.resolve({ id: bodyweight.id }) },
      ),
    );
    assert.equal(otherBodyweight.status, 404);
    assert.equal(otherBodyweight.body.error, "Bodyweight entry not found.");
  });
});
