"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { markedOverallLevel } from "@/app/components/overall-level-figure";
import { OverallLevelBody } from "@/app/components/overall-level-body";
import { OverallLevelProgressBar, OverallLevelProgressExplanation } from "@/app/components/overall-level-progress-bar";
import { StatusNotice } from "@/app/components/status-notice";
import { appPath } from "@/lib/app-paths";
import { loadCachedInsightsHistory, loadUserStrengthProfile } from "@/lib/insights-data";
import { clearOverallLevelHint, readOverallLevelHint } from "@/lib/overall-level-hint-storage";
import { profileOverallLevel, type ProfileOverallLevel } from "@/lib/profile-overall-level";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type HomeOverallLevelBadgeProps = {
  userId: string;
};

export function HomeOverallLevelBadge({ userId }: HomeOverallLevelBadgeProps) {
  const [level, setLevel] = useState<ProfileOverallLevel | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hint, setHint] = useState<string | null>(() => readOverallLevelHint());

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const today = getTodayYyyyMmDd();
        const [history, profile, hidden] = await Promise.all([
          loadCachedInsightsHistory(supabaseBrowserClient, userId, { from: "", to: "" }),
          loadUserStrengthProfile(supabaseBrowserClient, userId),
          supabaseBrowserClient.from("user_hidden_exercises").select("exercise_id").eq("user_id", userId),
        ]);
        if (!isMounted || hidden.error) {
          return;
        }
        const snapshot = profileOverallLevel({
          samples: history.exerciseSets,
          hiddenExerciseIds: new Set((hidden.data ?? []).map((row) => row.exercise_id)),
          profile,
          today,
        });
        if (!isMounted) {
          return;
        }
        setLevel(snapshot.overall ? snapshot : null);
        setLoaded(true);
      } catch {
        if (isMounted) {
          setLevel(null);
          setLoaded(true);
        }
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const overall = level?.overall;
  const marked = markedOverallLevel(overall?.badge ?? null);
  if (loaded && !overall && !hint) {
    return null;
  }

  return (
    <section className="h-full w-full max-w-full lg:w-max lg:justify-self-start" aria-label="Overall level">
      {!loaded && !hint ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">Loading overall level...</p>
      ) : null}
      {hint || overall ? (
        <div
          className={[
            "h-full rounded-xl border border-zinc-200 bg-white p-5 transition-colors",
            overall ? "hover:border-sky-300 hover:bg-sky-50" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {hint ? (
            <StatusNotice
              message={hint}
              tone="success"
              className={overall ? "mb-3" : undefined}
              onDismiss={() => {
                clearOverallLevelHint();
                setHint(null);
              }}
            />
          ) : null}
          {overall ? (
            <Link
              href={appPath("/profile")}
              className={[
                "flex h-full flex-col rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-inset",
                hint ? "" : "-m-5 p-5",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="flex w-full items-center gap-4">
                {marked ? <OverallLevelBody level={marked} className="h-28 shrink-0 sm:h-32" /> : null}
                <div
                  className={
                    overall.progress.nextLabel || overall.progress.fraction == null
                      ? "min-w-0 flex-1 lg:w-52 lg:flex-none"
                      : undefined
                  }
                >
                  {marked == null ? <p className="text-sm text-zinc-600">Overall level</p> : null}
                  <p className="text-lg font-medium text-zinc-950">{overall.badge}</p>
                  {overall.progress.nextLabel ? (
                    <div className="mt-2">
                      <OverallLevelProgressBar progress={overall.progress} className="max-w-none" />
                    </div>
                  ) : null}
                  {overall.progress.fraction == null ? (
                    <p className="mt-2 text-sm text-zinc-700">{overall.meta}</p>
                  ) : null}
                </div>
              </span>
              <OverallLevelProgressExplanation
                badge={overall.badge}
                progress={overall.progress}
                lifts={overall.lifts}
                className="lg:max-w-sm"
              />
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
