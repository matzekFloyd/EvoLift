import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

/** Next.js 16 proxy (formerly middleware): cookie session refresh + UI gate. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets and image optimization.
     * Everything else runs through updateSession.
     * /api returns immediately so the bearer token is not rewritten.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
