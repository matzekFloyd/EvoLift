"use client";

import Link from "next/link";
import { useState } from "react";
import { markedOverallLevel } from "@/app/components/overall-level-figure";
import { OverallLevelBody } from "@/app/components/overall-level-body";
import { OverallLevelProgressBar } from "@/app/components/overall-level-progress-bar";
import { StatusNotice } from "@/app/components/status-notice";
import { useOverallLevelCache } from "@/app/components/use-overall-level-cache";
import { appPath } from "@/lib/app-paths";
import { clearOverallLevelHint, readOverallLevelHint } from "@/lib/overall-level-hint-storage";

type HomeOverallLevelBadgeProps = {
  userId: string;
};

function HomeOverallLevelSkeleton() {
  return (
    <section className="h-full w-full max-w-full lg:w-max lg:justify-self-start" aria-label="Overall level" aria-busy="true">
      <div className="h-full rounded-xl border border-zinc-200 bg-white p-5">
        <span className="flex w-full items-center gap-4">
          <span className="aspect-[100/204] h-28 shrink-0 rounded-md bg-zinc-100 sm:h-32" aria-hidden />
          <span className="min-w-0 flex-1 lg:w-52 lg:flex-none" aria-hidden>
            <span className="block h-7 w-28 rounded-md bg-zinc-100" />
            <span className="mt-2 block h-4 w-36 rounded-md bg-zinc-100" />
            <span className="mt-1 block h-2 w-full rounded-full bg-zinc-100" />
          </span>
        </span>
        <p className="sr-only" role="status">
          Loading overall level...
        </p>
      </div>
    </section>
  );
}

export function HomeOverallLevelBadge({ userId }: HomeOverallLevelBadgeProps) {
  const { snapshot, ready } = useOverallLevelCache(userId);
  const [hint, setHint] = useState<string | null>(() => readOverallLevelHint());
  const level = snapshot?.level ?? null;
  const overall = level?.overall ?? null;
  const marked = markedOverallLevel(overall?.badge ?? null);
  if (!ready) {
    return (
      <div className="grid gap-4">
        {hint ? (
          <StatusNotice
            message={hint}
            tone="success"
            onDismiss={() => {
              clearOverallLevelHint();
              setHint(null);
            }}
          />
        ) : null}
        <HomeOverallLevelSkeleton />
      </div>
    );
  }
  if (!overall && !hint) {
    return null;
  }

  return (
    <section className="h-full w-full max-w-full lg:w-max lg:justify-self-start" aria-label="Overall level">
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
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
