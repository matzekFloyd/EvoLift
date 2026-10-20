import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/** Exposed for rare cases that need the raw env (e.g. ad-hoc auth clients). */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Default password for users created by {@link createTestUser}. */
export const TEST_PASSWORD = "test-pass-1";

export type ApiBody = {
  data?: unknown;
  error?: string;
};

export type CatalogExercise = {
  id: string;
  slug: string;
};

/**
 * Assert an HTTP status and surface an optional API error string on failure.
 * Node 26 `assert.equal` message params are `string`, not `string | undefined`.
 */
export function assertHttpStatus(
  actual: number,
  expected: number,
  errorMessage?: string,
): void {
  assert.equal(actual, expected, errorMessage ?? `expected HTTP ${expected}`);
}

/**
 * Fail fast unless env points at local Supabase.
 * Call once at module load in every API integration file.
 */
export function assertLocalSupabase(): void {
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

export function adminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function buildRequest(
  pathname: string,
  method: string,
  token: string | null,
  body?: unknown,
): NextRequest {
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

export async function readJson(response: Response): Promise<{ status: number; body: ApiBody }> {
  const text = await response.text();
  const body = text ? (JSON.parse(text) as ApiBody) : {};
  return { status: response.status, body };
}

export async function signIn(email: string, password = TEST_PASSWORD): Promise<string> {
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Could not sign in the test user.");
  }
  return data.session.access_token;
}

export type TestUser = {
  id: string;
  email: string;
  token: string;
};

/** Create a confirmed user with a unique email and return a session JWT. */
export async function createTestUser(
  admin: SupabaseClient,
  emailPrefix: string,
  password = TEST_PASSWORD,
): Promise<TestUser> {
  const email = `${emailPrefix}-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create a test user.");
  }
  const token = await signIn(email, password);
  return { id: data.user.id, email, token };
}

export async function deleteTestUsers(admin: SupabaseClient, userIds: readonly string[]): Promise<void> {
  for (const userId of userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

export function catalogId(rows: CatalogExercise[], slug: string): string {
  const match = rows.find((row) => row.slug === slug);
  assert.ok(match, `The exercise catalog is missing ${slug}.`);
  return match.id;
}

/** Create a personal API token via the account API; returns the plaintext `evo_…` secret. */
export async function mintPersonalToken(
  createToken: (request: NextRequest) => Promise<Response>,
  sessionJwt: string,
  name: string,
): Promise<string> {
  const created = await readJson(
    await createToken(buildRequest("/api/account/tokens", "POST", sessionJwt, { name })),
  );
  assert.equal(created.status, 201, created.body.error ?? "Could not create a personal API token.");
  const token = (created.body.data as { token: string }).token;
  assert.match(token, /^evo_/);
  return token;
}
