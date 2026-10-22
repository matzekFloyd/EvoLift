import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionGateDecision, sessionGateRedirectPath } from "@/lib/auth-route-access";
import {
  authenticatorAssuranceLevelFromJwt,
  needsAuthenticatorChallenge,
} from "@/lib/mfa-assurance";
import { realtimeTransportOptions } from "@/lib/supabase/realtime-transport";

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Refresh the auth cookie and gate `/app` with `getUser()`.
 * `/` stays public for a signed-out visitor and sends a signed-in visitor to `/app`.
 * Does not gate `/api/*` (API bearer auth stays the control plane).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    ...realtimeTransportOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Verifies JWT with the Auth server (do not use getSession() here).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let needsMfa = false;
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    needsMfa = needsAuthenticatorChallenge({
      currentLevel: session?.access_token
        ? authenticatorAssuranceLevelFromJwt(session.access_token)
        : null,
      factors: user.factors,
    });
  }

  const pathname = request.nextUrl.pathname;
  const decision = sessionGateDecision({
    pathname,
    hasUser: Boolean(user),
    search: request.nextUrl.search,
    needsAuthenticatorChallenge: needsMfa,
  });

  const redirectPath = sessionGateRedirectPath(decision);
  if (redirectPath) {
    const url = request.nextUrl.clone();
    const queryIndex = redirectPath.indexOf("?");
    if (queryIndex === -1) {
      url.pathname = redirectPath;
      url.search = "";
    } else {
      url.pathname = redirectPath.slice(0, queryIndex);
      url.search = redirectPath.slice(queryIndex);
    }
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });
    return redirect;
  }

  return supabaseResponse;
}
