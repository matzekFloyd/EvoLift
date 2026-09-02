"use server";

import { createPublicServerClient } from "@/lib/supabase/server";
import {
  countActiveApiTokens,
  generatePersonalApiToken,
  insertApiToken,
  listActiveApiTokens,
  MAX_API_TOKENS_PER_USER,
  revokeApiToken,
  type ApiTokenListItem,
} from "@/server/db/api-tokens";

async function userClient(accessToken: string) {
  const client = createPublicServerClient(accessToken);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);
  if (error || !user) {
    throw new Error("Invalid user token.");
  }
  return { client, user };
}

function normalizeTokenName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Personal token";
  }
  return trimmed.slice(0, 40);
}

export async function listUserApiTokens(accessToken: string): Promise<ApiTokenListItem[]> {
  const { client, user } = await userClient(accessToken);
  return listActiveApiTokens(client, user.id);
}

export async function createUserApiToken(input: {
  accessToken: string;
  name: string;
}): Promise<{ token: string; item: ApiTokenListItem }> {
  const { client, user } = await userClient(input.accessToken);
  const activeCount = await countActiveApiTokens(client, user.id);
  if (activeCount >= MAX_API_TOKENS_PER_USER) {
    throw new Error(
      `You can have at most ${MAX_API_TOKENS_PER_USER} active API tokens. Revoke one first.`,
    );
  }

  const generated = generatePersonalApiToken();
  const item = await insertApiToken(client, {
    userId: user.id,
    name: normalizeTokenName(input.name),
    tokenHash: generated.tokenHash,
    tokenPrefix: generated.tokenPrefix,
  });

  return { token: generated.token, item };
}

export async function revokeUserApiToken(input: {
  accessToken: string;
  tokenId: string;
}): Promise<void> {
  const { client, user } = await userClient(input.accessToken);
  const revoked = await revokeApiToken(client, user.id, input.tokenId);
  if (!revoked) {
    throw new Error("Could not revoke that API token. It may already be revoked.");
  }
}
