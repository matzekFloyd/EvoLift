import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionGateDecision } from "@/lib/auth-route-access";

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Refresh the auth cookie and gate protected app routes with `getUser()`.
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

  const pathname = request.nextUrl.pathname;
  const decision = sessionGateDecision({ pathname, hasUser: Boolean(user) });

  if (decision === "redirect_login" || decision === "redirect_home") {
    const url = request.nextUrl.clone();
    url.pathname = decision === "redirect_login" ? "/login" : "/";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });
    return redirect;
  }

  return supabaseResponse;
}
