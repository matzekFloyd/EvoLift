import { invalidateAccountProfile, loadAccountProfile } from "@/lib/account-profile-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** Drops the cached account profile and reloads it in the background. */
export function refillAccountCache(currentUserId: string) {
  invalidateAccountProfile();
  void loadAccountProfile(supabaseBrowserClient, currentUserId, { fresh: true });
}
