import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutTemplateListItem } from "@/server/db/templates";
import { createUserMemoryCache } from "@/lib/user-memory-cache";
import type { Database } from "@/lib/supabase/database.types";

type TemplateQueryRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  workout_template_exercises: Array<{ id: string }> | null;
};

const cache = createUserMemoryCache<WorkoutTemplateListItem[]>();

export function peekTemplatesList(userId: string): WorkoutTemplateListItem[] | null {
  return cache.peek(userId);
}

export function invalidateTemplatesList() {
  cache.invalidate();
}

export function templatesListEpoch(): number {
  return cache.epoch();
}

export async function loadTemplatesList(
  client: SupabaseClient<Database>,
  userId: string,
  options?: { fresh?: boolean },
): Promise<{ rows: WorkoutTemplateListItem[]; error: string | null }> {
  try {
    const rows = await cache.load(
      userId,
      async () => {
        const { data, error } = await client
          .from("workout_templates")
          .select("id, name, notes, created_at, updated_at, workout_template_exercises(id)")
          .order("updated_at", { ascending: false });
        if (error) {
          throw new Error("Could not load templates.");
        }
        return ((data ?? []) as unknown as TemplateQueryRow[]).map((row) => ({
          id: row.id,
          name: row.name,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
          exerciseCount: row.workout_template_exercises?.length ?? 0,
        }));
      },
      options,
    );
    return { rows, error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Could not load templates.",
    };
  }
}
