import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages } from "@/lib/supabase/chunked-query";
import { isFutureSessionDate } from "@/lib/session-date";
import type { Database } from "@/lib/supabase/database.types";

export type HomeSessionSummaryRow = {
  id: string;
  performed_on: string;
  notes: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  set_count: number;
  exercise_badges: Array<{
    slug: string;
    has_logged_set: boolean;
    not_done?: boolean;
  }> | null;
};

const HOME_SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  userId: string;
  fetchedAt: number;
  rows: HomeSessionSummaryRow[];
};

type LoadResult = {
  rows: HomeSessionSummaryRow[];
  error: string | null;
};

let cache: CacheEntry | null = null;
let epoch = 0;
let inflight: { userId: string; epoch: number; promise: Promise<LoadResult> } | null = null;

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt <= HOME_SESSION_CACHE_TTL_MS;
}

export function peekHomeSessionSummaries(
  userId: string,
): { rows: HomeSessionSummaryRow[]; fresh: boolean } | null {
  if (!cache || cache.userId !== userId) {
    return null;
  }
  return { rows: cache.rows, fresh: isFresh(cache) };
}

export function invalidateHomeSessionSummaries() {
  epoch += 1;
  cache = null;
  inflight = null;
}

async function fetchHomeSessionSummaries(
  client: SupabaseClient<Database>,
): Promise<LoadResult> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("home_session_summaries")
      .select("id, performed_on, notes, created_at, started_at, completed_at, set_count, exercise_badges")
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (error) {
    return { rows: [], error: "Could not load workout sessions." };
  }
  const rows = ((data ?? []) as HomeSessionSummaryRow[]).map((row) => ({
    ...row,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    set_count: Number.isFinite(Number(row.set_count)) ? Number(row.set_count) : 0,
    exercise_badges: Array.isArray(row.exercise_badges) ? row.exercise_badges : null,
  }));
  return { rows, error: null };
}

export function loadHomeSessionSummaries(
  client: SupabaseClient<Database>,
  userId: string,
  options?: { fresh?: boolean },
): Promise<LoadResult> {
  if (!options?.fresh) {
    const peeked = peekHomeSessionSummaries(userId);
    if (peeked?.fresh) {
      return Promise.resolve({ rows: peeked.rows, error: null });
    }
  }
  if (inflight && inflight.userId === userId && inflight.epoch === epoch) {
    return inflight.promise;
  }

  const startedEpoch = epoch;
  const promise = fetchHomeSessionSummaries(client).then((result) => {
    if (startedEpoch === epoch && !result.error) {
      cache = { userId, fetchedAt: Date.now(), rows: result.rows };
    }
    if (inflight?.promise === promise) {
      inflight = null;
    }
    return result;
  });
  inflight = { userId, epoch: startedEpoch, promise };
  return promise;
}

/** Start the home summary fetch without waiting. Sign-in uses this so Home can paint from memory. */
export function prefetchHomeSessionSummaries(client: SupabaseClient<Database>, userId: string) {
  void loadHomeSessionSummaries(client, userId).catch(() => {
    // Home retries when it mounts. A failed warm-up should not affect sign-in.
  });
}

/** Session counts by exercise slug, excluding planned sessions. Null when Home has not loaded. */
export function pastSessionCountsBySlug(userId: string): Map<string, number> | null {
  if (!cache || cache.userId !== userId) {
    return null;
  }
  const counts = new Map<string, number>();
  for (const row of cache.rows) {
    if (isFutureSessionDate(row.performed_on)) {
      continue;
    }
    for (const badge of row.exercise_badges ?? []) {
      if (typeof badge.slug !== "string" || badge.slug.length === 0) {
        continue;
      }
      counts.set(badge.slug, (counts.get(badge.slug) ?? 0) + 1);
    }
  }
  return counts;
}
