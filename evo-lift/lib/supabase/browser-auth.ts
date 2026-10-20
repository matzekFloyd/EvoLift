import type { Session, User } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Verified browser user via `getUser()` (Auth server), not cookie-only `getSession()`.
 */
export async function getBrowserUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabaseBrowserClient.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

/**
 * Verified user plus session (access token) for API / server-action calls.
 * Identity comes from `getUser()`; the token is read from `getSession()` afterward.
 */
export async function getBrowserAuthSession(): Promise<Session | null> {
  const user = await getBrowserUser();
  if (!user) {
    return null;
  }
  const {
    data: { session },
  } = await supabaseBrowserClient.auth.getSession();
  if (!session?.access_token) {
    return null;
  }
  return session;
}
