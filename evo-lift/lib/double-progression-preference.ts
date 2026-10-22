import type { SupabaseClient } from "@supabase/supabase-js";
import { doubleProgressionEnabled } from "@/lib/target-weight-suggestion";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type CachedPreference = {
  userId: string;
  enabled: boolean;
};

let cached: CachedPreference | null = null;
let inflight: Promise<boolean> | null = null;
let inflightUserId: string | null = null;

/** Drops the in-memory account switch so the next load reads the database. */
export function invalidateDoubleProgressionPreference() {
  cached = null;
  inflight = null;
  inflightUserId = null;
}

/**
 * Account double-progression switch for the signed-in user.
 * Missing rows, errors, and false all stay off.
 */
export async function loadDoubleProgressionPreference(client: Client): Promise<boolean> {
  const { data: authData, error: authError } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (authError || !userId) {
    return false;
  }
  if (cached?.userId === userId) {
    return cached.enabled;
  }
  if (inflight && inflightUserId === userId) {
    return inflight;
  }

  inflightUserId = userId;
  inflight = readPreference(client, userId).then((enabled) => {
    cached = { userId, enabled };
    inflight = null;
    inflightUserId = null;
    return enabled;
  });
  return inflight;
}

async function readPreference(client: Client, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("app_users")
    .select("double_progression")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    return false;
  }
  return doubleProgressionEnabled(data.double_progression);
}
