import type { SupabaseClient } from "@supabase/supabase-js";
import { mainLiftStagnationWeeksFromStored } from "@/lib/main-lift-stagnation";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type CachedWeeks = {
  userId: string;
  weeks: number;
};

let cached: CachedWeeks | null = null;
let inflight: Promise<number> | null = null;
let inflightUserId: string | null = null;

/** Drops the in-memory weeks so the next load reads the database. */
export function invalidateMainLiftStagnationWeeks() {
  cached = null;
  inflight = null;
  inflightUserId = null;
}

/**
 * Account weeks before Insights notes a stalled main lift.
 * A missing row or a read error uses the default.
 */
export async function loadMainLiftStagnationWeeks(client: Client): Promise<number> {
  const { data: authData, error: authError } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (authError || !userId) {
    return mainLiftStagnationWeeksFromStored(null);
  }
  if (cached?.userId === userId) {
    return cached.weeks;
  }
  if (inflight && inflightUserId === userId) {
    return inflight;
  }

  inflightUserId = userId;
  inflight = readWeeks(client, userId).then((weeks) => {
    cached = { userId, weeks };
    inflight = null;
    inflightUserId = null;
    return weeks;
  });
  return inflight;
}

async function readWeeks(client: Client, userId: string): Promise<number> {
  const { data, error } = await client
    .from("app_users")
    .select("main_lift_stagnation_weeks")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    return mainLiftStagnationWeeksFromStored(null);
  }
  return mainLiftStagnationWeeksFromStored(data.main_lift_stagnation_weeks);
}
