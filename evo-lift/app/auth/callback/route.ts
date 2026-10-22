import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { oauthCallbackDecision, oauthLoginPath } from "@/app/login/social-sign-in";
import { APP_HOME_PATH } from "@/lib/app-paths";

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Google and Apple return here. Exchange the code into the cookie session,
 * then send the lifter home. Provider error text never reaches the login panel.
 */
export async function GET(request: NextRequest) {
  const decision = oauthCallbackDecision(request.nextUrl.searchParams);
  if (decision.action === "login") {
    return NextResponse.redirect(new URL(oauthLoginPath(decision.notice), request.url));
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return NextResponse.redirect(new URL(oauthLoginPath("failed"), request.url));
  }

  let response = NextResponse.redirect(new URL(APP_HOME_PATH, request.url));
  const supabase = createServerClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[], headers?: Record<string, string>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(
    decision.code,
    decision.flowId ? { flowId: decision.flowId } : undefined,
  );
  if (error) {
    return NextResponse.redirect(new URL(oauthLoginPath("failed"), request.url));
  }
  return response;
}
