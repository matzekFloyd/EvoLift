import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, it } from "vitest";
import { GET as getAccount, DELETE as deleteAccount } from "@/app/api/account/route";
import { PATCH as patchEmail } from "@/app/api/account/email/route";
import { PATCH as patchPassword } from "@/app/api/account/password/route";
import { GET as getProfile, PUT as putProfile } from "@/app/api/account/profile/route";
import { GET as listBodyweight, POST as createBodyweight } from "@/app/api/account/bodyweight/route";
import { DELETE as deleteBodyweight } from "@/app/api/account/bodyweight/[id]/route";
import { PUT as putHidden } from "@/app/api/account/exercises/hidden/route";
import {
  DELETE as clearDefaults,
  PUT as putDefaults,
} from "@/app/api/account/exercise-defaults/[exerciseId]/route";
import { GET as listTokens, POST as createToken } from "@/app/api/account/tokens/route";
import { DELETE as revokeToken } from "@/app/api/account/tokens/[id]/route";
import { GET as getActivity } from "@/app/api/activity/route";
import { GET as getExercises } from "@/app/api/exercises/route";
import { GET as getHistory } from "@/app/api/exercises/[slug]/history/route";
import { GET as listGoals, POST as createGoal } from "@/app/api/goals/route";
import { DELETE as deleteGoal } from "@/app/api/goals/[id]/route";
import { GET as getInsights } from "@/app/api/insights/route";
import { GET as listPlans, POST as createPlan } from "@/app/api/plans/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { POST as setActive } from "@/app/api/plans/[id]/active/route";
import { POST as startPlanDay } from "@/app/api/plans/[id]/days/[dayId]/sessions/route";
import { POST as createSession } from "@/app/api/sessions/route";
import { POST as addSet } from "@/app/api/sessions/[id]/exercises/[sessionExerciseId]/sets/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function assertLocalSupabase() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Integration tests need local Supabase credentials.");
  }
  const host = new URL(supabaseUrl).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Integration tests only run against local Supabase.");
  }
}

assertLocalSupabase();

type ApiBody = { data?: unknown; error?: string };

const PASSWORD = "test-pass-1";
const NEXT_PASSWORD = "test-pass-2";

function adminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildRequest(pathname: string, method: string, token: string, body?: unknown): NextRequest {
  const headers = new Headers({ authorization: `Bearer ${token}` });
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
  return { status: response.status, body: text ? (JSON.parse(text) as ApiBody) : {} };
}

async function signIn(email: string, password = PASSWORD): Promise<string> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Could not sign in the test user.");
  }
  return data.session.access_token;
}

describe("app API on local Supabase", () => {
  const admin = adminClient();
  const userIds: string[] = [];
  let ownerEmail = "";
  let ownerToken = "";
  let otherToken = "";
  let squatId = "";

  beforeAll(async () => {
    const suffix = crypto.randomUUID();
    for (const name of ["owner", "other"] as const) {
      const email = `evo-app-${name}-${suffix}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(error?.message ?? "Could not create a test user.");
      }
      userIds.push(data.user.id);
      const token = await signIn(email);
      if (name === "owner") {
        ownerEmail = email;
        ownerToken = token;
      } else {
        otherToken = token;
      }
    }
    const catalog = await readJson(await getExercises(buildRequest("/api/exercises", "GET", ownerToken)));
    const rows = catalog.body.data as Array<{ id: string; slug: string }>;
    squatId = rows.find((row) => row.slug === "back-squat")?.id ?? "";
    assert.ok(squatId);
  });

  afterAll(async () => {
    for (const userId of userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("rejects a plan without a name and saves one the other user cannot read", async () => {
    const missing = await readJson(
      await createPlan(buildRequest("/api/plans", "POST", ownerToken, { days: [] })),
    );
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error, "Please enter a plan name.");

    const created = await readJson(
      await createPlan(
        buildRequest("/api/plans", "POST", ownerToken, {
          name: "API plan",
          is_active: true,
          days: [
            {
              name: "Day A",
              exercises: [{ exercise_id: squatId, target_sets: 3, target_reps: 5, target_weight_kg: 100 }],
            },
          ],
        }),
      ),
    );
    assert.equal(created.status, 201);
    const plan = created.body.data as {
      id: string;
      is_active: boolean;
      days: Array<{ id: string; exercises: Array<{ exercise_id: string }> }>;
    };
    assert.equal(plan.is_active, true);
    const dayId = plan.days[0]?.id;
    assert.ok(dayId);

    const hidden = await readJson(
      await getPlan(buildRequest(`/api/plans/${plan.id}`, "GET", otherToken), {
        params: Promise.resolve({ id: plan.id }),
      }),
    );
    assert.equal(hidden.status, 404);
    assert.equal(hidden.body.error, "Plan not found.");

    const started = await readJson(
      await startPlanDay(
        buildRequest(`/api/plans/${plan.id}/days/${dayId}/sessions`, "POST", ownerToken, {
          performed_on: "2020-02-01",
        }),
        { params: Promise.resolve({ id: plan.id, dayId }) },
      ),
    );
    assert.equal(started.status, 201);
    const session = started.body.data as { plan_id: string; exercises: Array<{ exercise_id: string }> };
    assert.equal(session.plan_id, plan.id);
    assert.equal(session.exercises[0]?.exercise_id, squatId);

    const listed = await readJson(await listPlans(buildRequest("/api/plans", "GET", ownerToken)));
    assert.equal(
      (listed.body.data as Array<{ id: string }>).some((row) => row.id === plan.id),
      true,
    );
    await setActive(
      buildRequest(`/api/plans/${plan.id}/active`, "POST", ownerToken, { is_active: false }),
      { params: Promise.resolve({ id: plan.id }) },
    );
  });

  it("seeds default bodyweight goals once on signup", async () => {
    const first = await readJson(await listGoals(buildRequest("/api/goals", "GET", ownerToken)));
    assert.equal(first.status, 200);
    const rows = first.body.data as Array<{
      exercise_id: string;
      milestone_type: string;
      bodyweight_multiple: number | null;
      min_reps: number;
    }>;
    assert.equal(rows.length, 4);
    assert.ok(rows.every((row) => row.milestone_type === "bodyweight_multiple"));
    assert.ok(rows.every((row) => row.min_reps === 1));

    const byExercise = new Map(rows.map((row) => [row.exercise_id, Number(row.bodyweight_multiple)]));
    assert.equal(byExercise.get(squatId), 1.5);

    const catalog = await readJson(await getExercises(buildRequest("/api/exercises", "GET", ownerToken)));
    const exercises = catalog.body.data as Array<{ id: string; slug: string }>;
    const idBySlug = new Map(exercises.map((row) => [row.slug, row.id]));
    assert.equal(byExercise.get(idBySlug.get("barbell-bench-press") ?? ""), 1);
    assert.equal(byExercise.get(idBySlug.get("deadlift") ?? ""), 2);
    assert.equal(byExercise.get(idBySlug.get("overhead-press") ?? ""), 0.75);

    const again = await readJson(await listGoals(buildRequest("/api/goals", "GET", ownerToken)));
    assert.equal((again.body.data as unknown[]).length, 4);
  });

  it("stores a reached goal from a logged working set", async () => {
    const created = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", ownerToken, {
          performed_on: "2020-03-01",
          exercises: [{ exercise_id: squatId }],
        }),
      ),
    );
    const session = created.body.data as { id: string; exercises: Array<{ id: string }> };
    await addSet(
      buildRequest(`/api/sessions/${session.id}/exercises/${session.exercises[0]?.id}/sets`, "POST", ownerToken, {
        reps: 5,
        weight_kg: 100,
      }),
      { params: Promise.resolve({ id: session.id, sessionExerciseId: session.exercises[0]?.id ?? "" }) },
    );

    const goal = await readJson(
      await createGoal(
        buildRequest("/api/goals", "POST", ownerToken, {
          exercise_id: squatId,
          milestone_type: "absolute",
          target_weight_kg: 100,
          min_reps: 5,
        }),
      ),
    );
    assert.equal(goal.status, 201);
    const row = goal.body.data as { id: string; achieved_at: string | null };
    assert.ok(row.achieved_at);

    const other = await readJson(await listGoals(buildRequest("/api/goals", "GET", otherToken)));
    assert.equal(
      (other.body.data as Array<{ id: string }>).some((item) => item.id === row.id),
      false,
    );
    const removed = await readJson(
      await deleteGoal(buildRequest(`/api/goals/${row.id}`, "DELETE", ownerToken), {
        params: Promise.resolve({ id: row.id }),
      }),
    );
    assert.equal(removed.status, 200);
  });

  it("saves profile, bodyweight, hidden exercises, and defaults", async () => {
    const short = await readJson(
      await putProfile(buildRequest("/api/account/profile", "PUT", ownerToken, { height_cm: 50 })),
    );
    assert.equal(short.status, 400);
    assert.equal(short.body.error, "Height must be between 100 and 250 cm.");

    const saved = await readJson(
      await putProfile(
        buildRequest("/api/account/profile", "PUT", ownerToken, {
          height_cm: 180,
          sex: "male",
          date_of_birth: "1990-01-02",
          bodyweight_kg: 82,
        }),
      ),
    );
    assert.equal(saved.status, 200);
    const profile = saved.body.data as { height_cm: number; bodyweight_kg: number; sex: string };
    assert.equal(profile.height_cm, 180);
    assert.equal(profile.sex, "male");
    assert.equal(profile.bodyweight_kg, 82);

    const logged = await readJson(await listBodyweight(buildRequest("/api/account/bodyweight", "GET", ownerToken)));
    const todayEntry = (logged.body.data as Array<{ logged_on: string }>).at(-1);
    assert.ok(todayEntry);
    const duplicate = await readJson(
      await createBodyweight(
        buildRequest("/api/account/bodyweight", "POST", ownerToken, {
          logged_on: todayEntry.logged_on,
          bodyweight_kg: 83,
        }),
      ),
    );
    assert.equal(duplicate.status, 400);
    assert.equal(duplicate.body.error, "That date already has a bodyweight.");

    const added = await readJson(
      await createBodyweight(
        buildRequest("/api/account/bodyweight", "POST", ownerToken, {
          logged_on: "2020-04-01",
          bodyweight_kg: 80,
        }),
      ),
    );
    assert.equal(added.status, 201);
    const entry = added.body.data as { id: string };
    const listed = await readJson(await listBodyweight(buildRequest("/api/account/bodyweight", "GET", ownerToken)));
    assert.ok((listed.body.data as Array<{ id: string }>).some((row) => row.id === entry.id));
    await deleteBodyweight(buildRequest(`/api/account/bodyweight/${entry.id}`, "DELETE", ownerToken), {
      params: Promise.resolve({ id: entry.id }),
    });
    const afterDelete = await readJson(await getProfile(buildRequest("/api/account/profile", "GET", ownerToken)));
    assert.equal((afterDelete.body.data as { bodyweight_kg: number }).bodyweight_kg, 82);

    const hidden = await readJson(
      await putHidden(buildRequest("/api/account/exercises/hidden", "PUT", ownerToken, { exercise_ids: [squatId] })),
    );
    assert.deepEqual(hidden.body.data, { exercise_ids: [squatId] });

    const defaults = await readJson(
      await putDefaults(
        buildRequest(`/api/account/exercise-defaults/${squatId}`, "PUT", ownerToken, {
          suggest_warmups: true,
          suggest_target: true,
          default_target_sets: 5,
          max_suggested_warmup_sets: 3,
        }),
        { params: Promise.resolve({ exerciseId: squatId }) },
      ),
    );
    assert.equal(defaults.status, 200);
    const savedDefaults = defaults.body.data as {
      exercises: Array<{
        exercise_id: string;
        default_target_sets: number;
        max_suggested_warmup_sets: number | null;
      }>;
    };
    const squatDefaults = savedDefaults.exercises.find((row) => row.exercise_id === squatId);
    assert.equal(squatDefaults?.default_target_sets, 5);
    assert.equal(squatDefaults?.max_suggested_warmup_sets, 3);

    const cleared = await readJson(
      await clearDefaults(buildRequest(`/api/account/exercise-defaults/${squatId}`, "DELETE", ownerToken), {
        params: Promise.resolve({ exerciseId: squatId }),
      }),
    );
    const clearedRow = (cleared.body.data as { exercises: Array<{ exercise_id: string; default_target_sets: number | null; suggest_warmups: boolean }> }).exercises.find(
      (row) => row.exercise_id === squatId,
    );
    assert.equal(clearedRow?.default_target_sets, null);
    assert.equal(clearedRow?.suggest_warmups, true);
  });

  it("changes the password, creates a token, and reads insights for the logged set", async () => {
    const wrong = await readJson(
      await patchPassword(
        buildRequest("/api/account/password", "PATCH", ownerToken, {
          current_password: "wrong-pass",
          new_password: NEXT_PASSWORD,
          confirm_new_password: NEXT_PASSWORD,
        }),
      ),
    );
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error, "Current password is incorrect.");

    const changed = await readJson(
      await patchPassword(
        buildRequest("/api/account/password", "PATCH", ownerToken, {
          current_password: PASSWORD,
          new_password: NEXT_PASSWORD,
          confirm_new_password: NEXT_PASSWORD,
        }),
      ),
    );
    assert.equal(changed.status, 200);
    ownerToken = await signIn(ownerEmail, NEXT_PASSWORD);

    const account = await readJson(await getAccount(buildRequest("/api/account", "GET", ownerToken)));
    assert.equal((account.body.data as { email: string; has_password: boolean }).email, ownerEmail);
    assert.equal((account.body.data as { has_password: boolean }).has_password, true);

    const created = await readJson(
      await createToken(buildRequest("/api/account/tokens", "POST", ownerToken, { name: "Phone" })),
    );
    assert.equal(created.status, 201);
    const token = created.body.data as { id: string; token: string; token_prefix: string };
    assert.match(token.token, /^evo_/);
    assert.equal(token.token.startsWith(token.token_prefix), true);
    const tokens = await readJson(await listTokens(buildRequest("/api/account/tokens", "GET", ownerToken)));
    assert.equal((tokens.body.data as Array<{ token?: string }>).some((row) => "token" in row && row.token), false);
    const revoked = await readJson(
      await revokeToken(buildRequest(`/api/account/tokens/${token.id}`, "DELETE", ownerToken), {
        params: Promise.resolve({ id: token.id }),
      }),
    );
    assert.equal(revoked.status, 200);

    const insights = await readJson(
      await getInsights(buildRequest("/api/insights?range=all", "GET", ownerToken)),
    );
    assert.equal(insights.status, 200);
    assert.ok((insights.body.data as { totals: { workouts: number } }).totals.workouts >= 1);

    const activity = await readJson(await getActivity(buildRequest("/api/activity", "GET", ownerToken)));
    assert.ok((activity.body.data as { sessions: unknown[] }).sessions.length >= 1);

    const history = await readJson(
      await getHistory(buildRequest("/api/exercises/back-squat/history?from=2020-01-01&to=2020-12-31&hide_warmups=false", "GET", ownerToken), {
        params: Promise.resolve({ slug: "back-squat" }),
      }),
    );
    assert.equal(history.status, 200);
    const historyBody = history.body.data as { stats: { set_count: number; best_loaded_kg: number } };
    assert.ok(historyBody.stats.set_count >= 1);
    assert.equal(historyBody.stats.best_loaded_kg, 100);

    const missingExercise = await readJson(
      await getHistory(buildRequest("/api/exercises/not-a-lift/history", "GET", ownerToken), {
        params: Promise.resolve({ slug: "not-a-lift" }),
      }),
    );
    assert.equal(missingExercise.status, 404);
    assert.equal(missingExercise.body.error, "Exercise not found.");
  });

  it("rejects a bad new email and leaves delete on the current password", async () => {
    const email = await readJson(
      await patchEmail(
        buildRequest("/api/account/email", "PATCH", ownerToken, {
          email: "not-an-email",
          current_password: NEXT_PASSWORD,
        }),
      ),
    );
    assert.equal(email.status, 400);
    assert.equal(email.body.error, "Please enter a valid new email address.");

    const removed = await readJson(
      await deleteAccount(buildRequest("/api/account", "DELETE", ownerToken, { currentPassword: "nope" })),
    );
    assert.equal(removed.status, 400);
    assert.equal(removed.body.error, "Current password is incorrect.");
  });
});
