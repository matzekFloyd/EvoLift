import { NextRequest } from "next/server";
import { ApiHttpError, handleApi, jsonData, readJsonObject } from "@/server/api/http";
import {
  countActiveApiTokens,
  generatePersonalApiToken,
  insertApiToken,
  listActiveApiTokens,
  MAX_API_TOKENS_PER_USER,
  type ApiTokenListItem,
} from "@/server/db/api-tokens";

function tokenItem(item: ApiTokenListItem) {
  return {
    id: item.id,
    name: item.name,
    token_prefix: item.tokenPrefix,
    created_at: item.createdAt,
    last_used_at: item.lastUsedAt,
  };
}

function tokenName(value: unknown): string {
  if (value === undefined || value === null) {
    return "Personal token";
  }
  if (typeof value !== "string") {
    throw new ApiHttpError(400, "name must be a string.");
  }
  const trimmed = value.trim();
  return (trimmed || "Personal token").slice(0, 40);
}

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const tokens = await listActiveApiTokens(auth.client, auth.userId);
    return jsonData(tokens.map(tokenItem));
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const activeCount = await countActiveApiTokens(auth.client, auth.userId);
    if (activeCount >= MAX_API_TOKENS_PER_USER) {
      throw new ApiHttpError(
        400,
        `You can have at most ${MAX_API_TOKENS_PER_USER} active API tokens. Revoke one first.`,
      );
    }
    const generated = generatePersonalApiToken();
    const item = await insertApiToken(auth.client, {
      userId: auth.userId,
      name: tokenName(body.name),
      tokenHash: generated.tokenHash,
      tokenPrefix: generated.tokenPrefix,
    });
    return jsonData({ token: generated.token, ...tokenItem(item) }, 201);
  });
}
