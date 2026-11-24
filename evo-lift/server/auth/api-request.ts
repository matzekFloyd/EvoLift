import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  credentialFromRequest,
  getBearerCredential,
  hasSessionCookie,
  sameOriginBrowserRequest,
} from "@/lib/api-request-credential";

export { getBearerCredential };
import { realtimeTransportOptions } from "@/lib/supabase/realtime-transport";
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
        "Missing bearer token. Use a personal API token from Settings or a session access token.",
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

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

async function authenticateSessionCookie(
  request: NextRequest,
): Promise<ApiRequestAuth | { error: string; status: 401 } | null> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return null;
  }

  const supabase = createServerClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    ...realtimeTransportOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return null;
  }
  return authenticateBearer(session.access_token);
}

/**
 * Authenticate an `/api/*` request.
 * Personal API tokens are resolved with the service role (`bypassesRls: true`).
 * Session JWTs use the user-scoped client with RLS. Either way, user-owned
 * queries must filter by `userId` (helpers in `server/db/owned.ts`).
 * A same-origin page can also use the login cookie when the bearer header was dropped.
 */
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<ApiRequestAuth | { error: string; status: 401 }> {
  const credential = credentialFromRequest(request);
  if (credential) {
    return authenticateBearer(credential);
  }
  if (sameOriginBrowserRequest(request) && hasSessionCookie(request)) {
    const fromCookie = await authenticateSessionCookie(request);
    if (fromCookie) {
      return fromCookie;
    }
  }
  return authenticateBearer(undefined);
}
