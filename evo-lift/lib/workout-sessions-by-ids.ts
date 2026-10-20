import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Keep RPC payloads modest; PostgREST URL limits do not apply here. */
const ID_CHUNK_SIZE = 200;

export type WorkoutSessionByIdRow = {
  id: string;
  performed_on: string;
  created_at: string;
};

type PageError = { message: string; code?: string };

/**
 * Load session dates by primary key for one owner.
 * Uses `workout_sessions_by_ids` so Postgres joins from unnest → PK instead of
 * scanning `idx_workout_sessions_user_date` then filtering `id = ANY(...)`.
 */
export async function fetchWorkoutSessionsByIds(
  client: Client,
  sessionIds: readonly string[],
  userId: string,
): Promise<{ data: WorkoutSessionByIdRow[]; error: PageError | null }> {
  const uniqueIds = [...new Set(sessionIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { data: [], error: null };
  }

  const data: WorkoutSessionByIdRow[] = [];
  for (let index = 0; index < uniqueIds.length; index += ID_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(index, index + ID_CHUNK_SIZE);
    const { data: rows, error } = await client.rpc("workout_sessions_by_ids", {
      p_ids: chunk,
      p_user_id: userId,
    });
    if (error) {
      return { data, error: { message: error.message, code: error.code } };
    }
    for (const row of rows ?? []) {
      data.push({
        id: row.id,
        performed_on: row.performed_on,
        created_at: row.created_at,
      });
    }
  }
  return { data, error: null };
}
