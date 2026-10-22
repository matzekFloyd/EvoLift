import { createClient } from "@supabase/supabase-js";

/**
 * Password check for account actions. Session persistence stays off so a
 * successful check cannot replace the signed-in browser session with an AAL1
 * session when an authenticator is enrolled.
 */
export const CURRENT_PASSWORD_CHECK_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export async function verifyCurrentPassword(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false }> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return { ok: false };
  }

  const client = createClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    auth: CURRENT_PASSWORD_CHECK_AUTH,
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false };
  }
  return { ok: true };
}
