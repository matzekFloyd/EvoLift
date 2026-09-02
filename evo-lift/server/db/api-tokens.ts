import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const PERSONAL_API_TOKEN_PREFIX = "evo_";
export const MAX_API_TOKENS_PER_USER = 5;

export type ApiTokenListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isPersonalApiToken(token: string): boolean {
  return token.startsWith(PERSONAL_API_TOKEN_PREFIX) && !token.includes(".");
}

export function isSupabaseJwt(token: string): boolean {
  return token.split(".").length === 3;
}

export function generatePersonalApiToken(): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const token = `${PERSONAL_API_TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
  return {
    token,
    tokenHash: sha256Hex(token),
    tokenPrefix: token.slice(0, 12),
  };
}

export function hashPersonalApiToken(token: string): string {
  return sha256Hex(token);
}

export async function listActiveApiTokens(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ApiTokenListItem[]> {
  const { data, error } = await client
    .from("user_api_tokens")
    .select("id, name, token_prefix, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list API tokens: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

export async function countActiveApiTokens(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("user_api_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Could not count API tokens: ${error.message}`);
  }

  return count ?? 0;
}

export async function insertApiToken(
  client: SupabaseClient<Database>,
  input: {
    userId: string;
    name: string;
    tokenHash: string;
    tokenPrefix: string;
  },
): Promise<ApiTokenListItem> {
  const { data, error } = await client
    .from("user_api_tokens")
    .insert({
      user_id: input.userId,
      name: input.name,
      token_hash: input.tokenHash,
      token_prefix: input.tokenPrefix,
    })
    .select("id, name, token_prefix, created_at, last_used_at")
    .single();

  if (error || !data) {
    throw new Error(`Could not create API token: ${error?.message ?? "Unknown error"}`);
  }

  return {
    id: data.id,
    name: data.name,
    tokenPrefix: data.token_prefix,
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at,
  };
}

export async function findActiveApiTokenByHash(
  client: SupabaseClient<Database>,
  tokenHash: string,
): Promise<{ id: string; userId: string } | null> {
  const { data, error } = await client
    .from("user_api_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not verify API token: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return { id: data.id, userId: data.user_id };
}

export async function touchApiTokenLastUsed(
  client: SupabaseClient<Database>,
  tokenId: string,
): Promise<void> {
  const { error } = await client
    .from("user_api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenId);

  if (error) {
    throw new Error(`Could not update API token last used: ${error.message}`);
  }
}

export async function revokeApiToken(
  client: SupabaseClient<Database>,
  userId: string,
  tokenId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("user_api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not revoke API token: ${error.message}`);
  }

  return Boolean(data);
}
