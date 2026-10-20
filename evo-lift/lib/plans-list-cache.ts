import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserMemoryCache } from "@/lib/user-memory-cache";
import type { Database } from "@/lib/supabase/database.types";

export type PlanListRow = {
  id: string;
  name: string;
  isActive: boolean;
  dayCount: number;
};

type PlanQueryRow = {
  id: string;
  name: string;
  is_active: boolean;
  workout_plan_days: Array<{ id: string }> | null;
};

const cache = createUserMemoryCache<PlanListRow[]>();

export function peekPlansList(userId: string): PlanListRow[] | null {
  return cache.peek(userId);
}

export function invalidatePlansList() {
  cache.invalidate();
}

export function plansListEpoch(): number {
  return cache.epoch();
}

export async function loadPlansList(
  client: SupabaseClient<Database>,
  userId: string,
  options?: { fresh?: boolean },
): Promise<{ rows: PlanListRow[]; error: string | null }> {
  try {
    const rows = await cache.load(
      userId,
      async () => {
        const { data, error } = await client
          .from("workout_plans")
          .select("id, name, is_active, workout_plan_days(id)")
          .order("updated_at", { ascending: false });
        if (error) {
          throw new Error("Could not load plans.");
        }
        return ((data ?? []) as PlanQueryRow[]).map((row) => ({
          id: row.id,
          name: row.name,
          isActive: row.is_active,
          dayCount: row.workout_plan_days?.length ?? 0,
        }));
      },
      options,
    );
    return { rows, error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Could not load plans.",
    };
  }
}
