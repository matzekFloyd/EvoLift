import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
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
 *
 * Cast restores `SupabaseClient<Database>` table typing; `@supabase/ssr` 0.6 +
 * supabase-js 2.105 otherwise collapses inserts/selects to `never`.
 */
export const supabaseBrowserClient: SupabaseClient<Database> = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
) as unknown as SupabaseClient<Database>;
