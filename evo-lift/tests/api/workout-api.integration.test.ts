import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, it } from "vitest";
import { GET as getExercises } from "@/app/api/exercises/route";
import { GET as getSession, PATCH as patchSession } from "@/app/api/sessions/[id]/route";
import { POST as addExercise } from "@/app/api/sessions/[id]/exercises/route";
import { POST as addSet } from "@/app/api/sessions/[id]/exercises/[sessionExerciseId]/sets/route";
import { GET as listSessions, POST as createSession } from "@/app/api/sessions/route";
import { POST as createTemplate } from "@/app/api/templates/route";
import { POST as startTemplateSession } from "@/app/api/templates/[id]/sessions/route";

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

type CatalogExercise = {
  id: string;
  slug: string;
};

type LoggedSet = {
  reps: number;
  weight_kg: number | null;
  is_warmup: boolean;
};

type SessionExercise = {
  id: string;
  exercise_id: string;
  sets: LoggedSet[];
};

type SessionDetail = {
  id: string;
  notes: string | null;
  performed_on: string;
  source_template_id: string | null;
  exercises: SessionExercise[];
};

type SessionListItem = {
  id: string;
};

const PASSWORD = "test-pass-1";
const SESSION_DATE = "2020-01-15";
const TEMPLATE_DATE = "2020-01-16";

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

function catalogId(rows: CatalogExercise[], slug: string): string {
  const match = rows.find((row) => row.slug === slug);
  assert.ok(match, `The exercise catalog is missing ${slug}.`);
  return match.id;
}

describe("workout API on local Supabase", () => {
  const admin = adminClient();
  const userIds: string[] = [];
  let ownerToken = "";
  let otherToken = "";
  let squatId = "";
  let deadliftId = "";

  beforeAll(async () => {
    const suffix = crypto.randomUUID();
    for (const name of ["owner", "other"] as const) {
      const email = `evo-api-${name}-${suffix}@example.com`;
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
        ownerToken = token;
      } else {
        otherToken = token;
      }
    }

    const signedIn = await readJson(await getExercises(buildRequest("/api/exercises", "GET", ownerToken)));
    if (signedIn.status !== 200 || !Array.isArray(signedIn.body.data)) {
      throw new Error(signedIn.body.error ?? "Could not load the exercise catalog.");
    }
    const rows = signedIn.body.data as CatalogExercise[];
    squatId = catalogId(rows, "back-squat");
    deadliftId = catalogId(rows, "deadlift");
  });

  afterAll(async () => {
    for (const userId of userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("rejects a missing token and returns the catalog for a signed-in user", async () => {
    const missing = await readJson(await getExercises(buildRequest("/api/exercises", "GET", null)));
    assert.equal(missing.status, 401);
    assert.equal(
      missing.body.error,
      "Missing bearer token. Use a personal API token from Account or a session access token.",
    );

    const signedIn = await readJson(await getExercises(buildRequest("/api/exercises", "GET", ownerToken)));
    assert.equal(signedIn.status, 200);
    const rows = signedIn.body.data as CatalogExercise[];
    assert.ok(rows.some((row) => row.slug === "back-squat"));
    assert.ok(rows.some((row) => row.slug === "deadlift"));
  });

  it("rejects a bad target reps value", async () => {
    const response = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", ownerToken, {
          performed_on: SESSION_DATE,
          exercises: [{ exercise_id: squatId, target_reps: 0 }],
        }),
      ),
    );
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Please enter a valid target_reps.");
  });

  it("creates a session, adds an exercise, logs a working set, and reads it back", async () => {
    const created = await readJson(
      await createSession(
        buildRequest("/api/sessions", "POST", ownerToken, {
          performed_on: SESSION_DATE,
          notes: "API integration",
          exercises: [
            {
              exercise_id: squatId,
              target_sets: 3,
              target_reps: 5,
              target_weight_kg: 80,
              base_weight_kg: 20,
            },
          ],
        }),
      ),
    );
    assert.equal(created.status, 201);
    const createdSession = created.body.data as SessionDetail;
    assert.equal(createdSession.performed_on, SESSION_DATE);
    assert.equal(createdSession.exercises.length, 1);
    const squatExerciseId = createdSession.exercises[0]?.id;
    assert.ok(squatExerciseId);

    const withDeadlift = await readJson(
      await addExercise(
        buildRequest(`/api/sessions/${createdSession.id}/exercises`, "POST", ownerToken, {
          exercise_id: deadliftId,
          target_reps: 3,
        }),
        { params: Promise.resolve({ id: createdSession.id }) },
      ),
    );
    assert.equal(withDeadlift.status, 201);

    const logged = await readJson(
      await addSet(
        buildRequest(
          `/api/sessions/${createdSession.id}/exercises/${squatExerciseId}/sets`,
          "POST",
          ownerToken,
          { reps: 5, weight_kg: 80, is_warmup: false },
        ),
        { params: Promise.resolve({ id: createdSession.id, sessionExerciseId: squatExerciseId }) },
      ),
    );
    assert.equal(logged.status, 201);

    const loaded = await readJson(
      await getSession(buildRequest(`/api/sessions/${createdSession.id}`, "GET", ownerToken), {
        params: Promise.resolve({ id: createdSession.id }),
      }),
    );
    assert.equal(loaded.status, 200);
    const session = loaded.body.data as SessionDetail;
    assert.equal(session.notes, "API integration");
    assert.deepEqual(
      session.exercises.map((exercise) => exercise.exercise_id).sort(),
      [deadliftId, squatId].sort(),
    );
    const squat = session.exercises.find((exercise) => exercise.exercise_id === squatId);
    assert.equal(squat?.sets.length, 1);
    assert.equal(squat?.sets[0]?.reps, 5);
    assert.equal(Number(squat?.sets[0]?.weight_kg), 80);
    assert.equal(squat?.sets[0]?.is_warmup, false);

    const ownerList = await readJson(await listSessions(buildRequest("/api/sessions", "GET", ownerToken)));
    assert.equal(ownerList.status, 200);
    assert.ok((ownerList.body.data as SessionListItem[]).some((row) => row.id === session.id));

    const otherList = await readJson(await listSessions(buildRequest("/api/sessions", "GET", otherToken)));
    assert.equal(otherList.status, 200);
    assert.equal(
      (otherList.body.data as SessionListItem[]).some((row) => row.id === session.id),
      false,
    );

    const otherRead = await readJson(
      await getSession(buildRequest(`/api/sessions/${session.id}`, "GET", otherToken), {
        params: Promise.resolve({ id: session.id }),
      }),
    );
    assert.equal(otherRead.status, 404);
    assert.equal(otherRead.body.error, "Workout session not found.");

    const otherPatch = await readJson(
      await patchSession(
        buildRequest(`/api/sessions/${session.id}`, "PATCH", otherToken, { notes: "changed" }),
        { params: Promise.resolve({ id: session.id }) },
      ),
    );
    assert.equal(otherPatch.status, 404);
    assert.equal(otherPatch.body.error, "Workout session not found.");

    const otherSet = await readJson(
      await addSet(
        buildRequest(
          `/api/sessions/${session.id}/exercises/${squatExerciseId}/sets`,
          "POST",
          otherToken,
          { reps: 1, weight_kg: 20 },
        ),
        { params: Promise.resolve({ id: session.id, sessionExerciseId: squatExerciseId }) },
      ),
    );
    assert.equal(otherSet.status, 404);
    assert.equal(otherSet.body.error, "Workout session not found.");
  });

  it("creates a template and starts a session from it", async () => {
    const template = await readJson(
      await createTemplate(
        buildRequest("/api/templates", "POST", ownerToken, {
          name: "Squat day",
          exercises: [
            {
              exercise_id: squatId,
              target_sets: 3,
              target_reps: 5,
              target_weight_kg: 80,
              base_weight_kg: 20,
            },
          ],
        }),
      ),
    );
    assert.equal(template.status, 201);
    const templateId = (template.body.data as { id: string }).id;
    assert.ok(templateId);

    const started = await readJson(
      await startTemplateSession(
        buildRequest(`/api/templates/${templateId}/sessions`, "POST", ownerToken, {
          performed_on: TEMPLATE_DATE,
        }),
        { params: Promise.resolve({ id: templateId }) },
      ),
    );
    assert.equal(started.status, 201);
    const session = started.body.data as SessionDetail;
    assert.equal(session.performed_on, TEMPLATE_DATE);
    assert.equal(session.source_template_id, templateId);
    assert.deepEqual(
      session.exercises.map((exercise) => exercise.exercise_id),
      [squatId],
    );

    const otherStart = await readJson(
      await startTemplateSession(
        buildRequest(`/api/templates/${templateId}/sessions`, "POST", otherToken, {
          performed_on: TEMPLATE_DATE,
        }),
        { params: Promise.resolve({ id: templateId }) },
      ),
    );
    assert.equal(otherStart.status, 404);
    assert.equal(otherStart.body.error, "Template not found.");
  });
});
