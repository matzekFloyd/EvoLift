import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function assertLocalSupabase() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Integration tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY from local `supabase status`.",
    );
  }
  let host = "";
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    host = "";
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Integration tests only run against local Supabase at 127.0.0.1 or localhost.");
  }
}

assertLocalSupabase();

type ApiBody = {
  data?: unknown;
  error?: string;
};

const PASSWORD = "test-pass-1";
const SESSION_DATE = "2020-02-01";

function adminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildRequest(pathname: string, method: string, token: string | null, body?: unknown): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new NextRequest(`http://127.0.0.1${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<{ status: number; body: ApiBody }> {
  const text = await response.text();
  const body = text ? (JSON.parse(text) as ApiBody) : {};
  return { status: response.status, body };
}

async function signIn(email: string): Promise<string> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Could not sign in the test user.");
  }
  return data.session.access_token;
}

async function mintPersonalToken(sessionJwt: string, name: string): Promise<string> {
  const created = await readJson(
    await createToken(buildRequest("/api/account/tokens", "POST", sessionJwt, { name })),
  );
  assert.equal(created.status, 201, created.body.error ?? "Could not create a personal API token.");
  const token = (created.body.data as { token: string }).token;
  assert.match(token, /^evo_/);
  return token;
}

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
    const suffix = crypto.randomUUID();
    const emails: Record<"owner" | "other", string> = {
      owner: `evo-token-owner-${suffix}@example.com`,
      other: `evo-token-other-${suffix}@example.com`,
    };
    for (const name of ["owner", "other"] as const) {
      const { data, error } = await admin.auth.admin.createUser({
        email: emails[name],
        password: PASSWORD,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(error?.message ?? "Could not create a test user.");
      }
      userIds.push(data.user.id);
      const sessionJwt = await signIn(emails[name]);
      const personal = await mintPersonalToken(sessionJwt, `${name}-cli`);
      if (name === "owner") {
        ownerPersonalToken = personal;
      } else {
        otherPersonalToken = personal;
      }
    }

    const catalog = await readJson(
      await getExercises(buildRequest("/api/exercises", "GET", ownerPersonalToken)),
    );
    assert.equal(catalog.status, 200);
    const rows = catalog.body.data as Array<{ id: string; slug: string }>;
    const squat = rows.find((row) => row.slug === "back-squat");
    assert.ok(squat, "The exercise catalog is missing back-squat.");
    squatId = squat.id;
  });

  afterAll(async () => {
    for (const userId of userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
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
    assert.equal(session.status, 201, session.body.error);
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
    assert.equal(template.status, 201, template.body.error);
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
    assert.equal(goal.status, 201, goal.body.error);
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
