import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  authenticatorAssuranceLevelFromJwt,
  MFA_SESSION_REQUIRED,
  needsAuthenticatorChallenge,
} from "@/lib/mfa-assurance";
import {
  createPublicServerClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import {
  findActiveApiTokenByHash,
  hashPersonalApiToken,
  isPersonalApiToken,
  isSupabaseJwt,
  touchApiTokenLastUsed,
} from "@/server/db/api-tokens";

export function getBearerCredential(request: NextRequest): string | undefined {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return undefined;
  }

  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || rest.length === 0) {
    return undefined;
  }

  const token = rest.join(" ").replace(/^Bearer\s+/i, "").trim();
  return token || undefined;
}

export type ApiRequestAuth = {
  userId: string;
  client: SupabaseClient<Database>;
  /**
   * Personal API tokens use the service-role client, so Postgres RLS does not
   * apply. Every user-owned query must filter by `userId` (see `server/db/owned.ts`).
   */
  bypassesRls: boolean;
};

export async function authenticateBearer(
  credential: string | undefined,
): Promise<ApiRequestAuth | { error: string; status: 401 }> {
  if (!credential) {
    return {
      status: 401,
      error:
        "Missing bearer token. Use a personal API token from Account or a session access token.",
    };
  }

  if (isPersonalApiToken(credential)) {
    const admin = createServiceRoleClient();
    const match = await findActiveApiTokenByHash(admin, hashPersonalApiToken(credential));
    if (!match) {
      return {
        status: 401,
        error: "Invalid or revoked personal API token.",
      };
    }

    void touchApiTokenLastUsed(admin, match.id).catch(() => undefined);

    return {
      userId: match.userId,
      client: admin,
      bypassesRls: true,
    };
  }

  if (!isSupabaseJwt(credential)) {
    return {
      status: 401,
      error:
        "Invalid bearer token. Use a personal API token (evo_…) or a session access token.",
    };
  }

  const client = createPublicServerClient(credential);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(credential);
  if (error || !user) {
    return {
      status: 401,
      error: "Invalid or expired session access token.",
    };
  }

  if (
    needsAuthenticatorChallenge({
      currentLevel: authenticatorAssuranceLevelFromJwt(credential),
      factors: user.factors,
    })
  ) {
    return {
      status: 401,
      error: MFA_SESSION_REQUIRED,
    };
  }

  return { userId: user.id, client, bypassesRls: false };
}

/**
 * Authenticate an `/api/*` request.
 * Personal API tokens are resolved with the service role (`bypassesRls: true`).
 * Session JWTs use the user-scoped client with RLS. Either way, user-owned
 * queries must filter by `userId` (helpers in `server/db/owned.ts`).
 */
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<ApiRequestAuth | { error: string; status: 401 }> {
  return authenticateBearer(getBearerCredential(request));
}
