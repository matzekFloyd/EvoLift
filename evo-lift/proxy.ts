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
     * Everything else (including /api) runs through updateSession;
     * /api paths are not redirected — they keep bearer auth.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
