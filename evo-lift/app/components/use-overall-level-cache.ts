"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import {
  loadOverallLevelCache,
  peekOverallLevelCache,
  type OverallLevelCacheSnapshot,
} from "@/lib/overall-level-cache";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The shared level cache. `load` fills it when today's value is missing.
 * Insights only peeks, so a range report is not replaced by a later fetch.
 */
export function useOverallLevelCache(
  userId: string | null,
  options?: { load?: boolean },
): { snapshot: OverallLevelCacheSnapshot | null; ready: boolean } {
  const load = options?.load ?? true;
  const [snapshot, setSnapshot] = useState<OverallLevelCacheSnapshot | null>(null);
  const [ready, setReady] = useState(false);

  useIsoLayoutEffect(() => {
    if (!userId) {
      setSnapshot(null);
      setReady(false);
      return;
    }
    let cancelled = false;
    const today = getTodayYyyyMmDd();
    const cached = peekOverallLevelCache(userId);
    const current = cached != null && cached.asOf === today;
    if (cached) {
      setSnapshot(cached);
      setReady(true);
    } else {
      setSnapshot(null);
      setReady(false);
    }
    if (current || !load) {
      if (!load && !cached) {
        setReady(true);
      }
      return;
    }
    void loadOverallLevelCache(supabaseBrowserClient, userId, today, {
      fresh: cached != null,
    }).then(
      (next) => {
        if (!cancelled) {
          setSnapshot(next);
          setReady(true);
        }
      },
      () => {
        if (!cancelled) {
          setReady(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, userId]);

  return { snapshot, ready };
}
