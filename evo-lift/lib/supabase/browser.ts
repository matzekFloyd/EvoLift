import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

/**
 * Cookie-backed browser client so the Next.js proxy can verify the session.
 * Prefer `auth.getUser()` for identity checks; use `getSession()` only for the access token.
 */
export const supabaseBrowserClient = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);
