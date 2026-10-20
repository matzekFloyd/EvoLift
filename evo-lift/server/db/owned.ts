import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ApiHttpError } from "@/server/api/errors";

type Client = SupabaseClient<Database>;

type OwnedTable =
  | "workout_sessions"
  | "workout_templates"
  | "workout_plans"
  | "strength_milestones"
  | "user_bodyweight_log"
  | "user_api_tokens";

/**
 * Fail-closed guard for API/db code that scopes by `user_id`.
 * Personal API tokens use the service-role client (RLS bypassed), so an empty
 * userId must never reach a query.
 */
export function assertApiUserId(userId: string): string {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new ApiHttpError(401, "You must be logged in.");
  }
  return userId;
}

/**
 * Ownership gate for user_id-keyed tables under JWT or service-role clients.
 * Missing or foreign rows look the same to the caller (404).
 */
export async function requireOwnedRow(
  client: Client,
  table: OwnedTable,
  userId: string,
  id: string,
  notFoundMessage: string,
): Promise<{ id: string }> {
  const ownedUserId = assertApiUserId(userId);
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("user_id", ownedUserId)
    .maybeSingle();
  if (error) {
    throw new Error(`Ownership check failed on ${table}: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, notFoundMessage);
  }
  return data;
}

export async function requireOwnedPlanId(
  client: Client,
  userId: string,
  planId: string,
): Promise<string> {
  const row = await requireOwnedRow(client, "workout_plans", userId, planId, "Plan not found.");
  return row.id;
}

export async function requireOwnedTemplateId(
  client: Client,
  userId: string,
  templateId: string,
): Promise<string> {
  const row = await requireOwnedRow(
    client,
    "workout_templates",
    userId,
    templateId,
    "Template not found.",
  );
  return row.id;
}

export async function requireOwnedGoalId(
  client: Client,
  userId: string,
  goalId: string,
): Promise<string> {
  const row = await requireOwnedRow(
    client,
    "strength_milestones",
    userId,
    goalId,
    "Goal not found.",
  );
  return row.id;
}

export async function requireOwnedBodyweightEntryId(
  client: Client,
  userId: string,
  entryId: string,
): Promise<string> {
  const row = await requireOwnedRow(
    client,
    "user_bodyweight_log",
    userId,
    entryId,
    "Bodyweight entry not found.",
  );
  return row.id;
}

export async function requireOwnedApiTokenId(
  client: Client,
  userId: string,
  tokenId: string,
): Promise<string> {
  const row = await requireOwnedRow(
    client,
    "user_api_tokens",
    userId,
    tokenId,
    "API token not found.",
  );
  return row.id;
}
