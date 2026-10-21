"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { History, LayoutGrid, Weight } from "lucide-react";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { EXERCISE_LIST_PLACEHOLDER_CLASS } from "@/app/components/content-placeholder-layout";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { ExerciseFilteredList } from "@/app/components/exercise-filtered-list";
import { PageShell } from "@/app/components/page-shell";
import { panelInsetClass } from "@/app/components/panel-inset";
import { StatusNotice } from "@/app/components/status-notice";
import {
  getExerciseMetadataCacheStatus,
  loadExerciseMetadata,
} from "@/lib/exercise-metadata-cache";
import { createPageLoadPerfTracker } from "@/lib/page-load-perf";
import { appPath } from "@/lib/app-paths";
import { pastSessionCountsBySlug } from "@/lib/home-session-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type ExerciseListItem = {
  id: string;
  slug: string;
  label: string;
  sessionCount: number;
};

const exerciseScopePillBase =
  "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40";
const exerciseScopePillActive = "border-sky-600 bg-sky-100 text-sky-950";
const exerciseScopePillInactive =
  "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100";

function ExerciseScopePills({
  scopeAll,
  onScope,
  disabled = false,
}: {
  scopeAll: boolean;
  onScope?: (next: "used" | "all") => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onScope?.("used")}
        className={`flex w-full flex-col items-center justify-center gap-1.5 text-center leading-tight ${exerciseScopePillBase} ${!scopeAll ? exerciseScopePillActive : exerciseScopePillInactive}`}
      >
        <History className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span>With session history</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onScope?.("all")}
        className={`flex w-full flex-col items-center justify-center gap-1.5 text-center leading-tight ${exerciseScopePillBase} ${scopeAll ? exerciseScopePillActive : exerciseScopePillInactive}`}
      >
        <LayoutGrid className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span>All exercises</span>
      </button>
    </div>
  );
}

function ExercisesLoadingPanel() {
  return (
    <section className="panel p-4 sm:p-5">
      <p className="mb-3 text-sm text-zinc-600">
        Open an exercise to review your full set history.
      </p>
      <ExerciseScopePills scopeAll={false} disabled />
      <ContentPlaceholder label="Loading exercises..." rowClassName={EXERCISE_LIST_PLACEHOLDER_CLASS} />
    </section>
  );
}

function ExercisesMain() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const prefetchedExerciseHrefs = useRef(new Set<string>());

  function prefetchExercisePage(href: string) {
    if (prefetchedExerciseHrefs.current.has(href)) {
      return;
    }
    prefetchedExerciseHrefs.current.add(href);
    // Full prefetch: this route has no loading boundary, so the default prefetch sends nothing.
    router.prefetch(href, {
      kind: "full",
    } as NonNullable<Parameters<typeof router.prefetch>[1]>);
  }

  const scopeAll = searchParams.get("scope") === "all";

  useEffect(() => {
    setSearchText(searchParams.get("q") ?? "");
  }, [searchParams]);

  const debouncedSearch = useDebouncedValue(searchText, 280);

  useEffect(() => {
    const fromUrl = searchParams.get("q")?.trim() ?? "";
    const next = debouncedSearch.trim();
    if (next === fromUrl) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("q", next);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams]);

  useEffect(() => {
    let isMounted = true;
    const perf = createPageLoadPerfTracker("/app/exercises");

    async function loadData() {
      const session = await perf.trackQuery("auth.getUser", () => getBrowserAuthSession());

      if (!isMounted) {
        return;
      }
      if (!session) {
        router.replace("/login");
        return;
      }

      const cachedCounts = pastSessionCountsBySlug(session.user.id);
      perf.noteCache("exerciseMetadata", getExerciseMetadataCacheStatus(5 * 60 * 1000));
      perf.noteCache("homeSessionCounts", cachedCounts ? "hit" : "miss");
      const metadataPromise = perf
        .trackQuery("exerciseMetadata.load", () =>
          loadExerciseMetadata(supabaseBrowserClient, { ttlMs: 5 * 60 * 1000 }),
        )
        .then(
          (rows) => ({ rows, error: null as unknown }),
          (error: unknown) => ({
            rows: [] as Array<{ id: string; slug: string; label: string }>,
            error,
          }),
        );
      const countsPromise = cachedCounts
        ? null
        : perf.trackQuery("exercise_past_session_counts", () =>
            supabaseBrowserClient.rpc("exercise_past_session_counts", {
              p_through: getTodayYyyyMmDd(),
            }),
          );
      const [metadataResult, countsResult] = await Promise.all([
        metadataPromise,
        countsPromise ?? Promise.resolve(null),
      ]);

      if (!isMounted) {
        return;
      }
      if (metadataResult.error) {
        const metadataError = metadataResult.error;
        setErrorMessage(
          metadataError instanceof Error ? metadataError.message : "Could not load exercises.",
        );
        setIsLoading(false);
        perf.flush();
        return;
      }
      if (countsResult?.error) {
        setErrorMessage("Could not load exercise history.");
        setIsLoading(false);
        perf.flush();
        return;
      }

      const cachedMetadata = metadataResult.rows;
      const sessionCountBySlug = new Map<string, number>();
      const sessionCountById = new Map<string, number>();
      if (cachedCounts) {
        for (const [slug, count] of cachedCounts) {
          sessionCountBySlug.set(slug, count);
        }
      } else {
        for (const row of countsResult?.data ?? []) {
          sessionCountById.set(row.exercise_id, row.session_count);
        }
      }

      const nextItems = cachedMetadata.map((row) => ({
        id: row.id,
        slug: row.slug,
        label: row.label,
        sessionCount: cachedCounts ? (sessionCountBySlug.get(row.slug) ?? 0) : (sessionCountById.get(row.id) ?? 0),
      }));

      setExercises(nextItems);
      setIsLoading(false);
      perf.flush();
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const displayItems = useMemo(
    () => (scopeAll ? exercises : exercises.filter((item) => item.sessionCount > 0)),
    [exercises, scopeAll],
  );

  function setScope(next: "used" | "all") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.set("scope", "all");
    } else {
      params.delete("scope");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <section className="panel p-4 sm:p-5">
      <p className="mb-3 text-sm text-zinc-600">
        Open an exercise to review your full set history.
      </p>
      {errorMessage ? (
        <StatusNotice message={errorMessage} tone="error" />
      ) : isLoading ? (
        <>
          <ExerciseScopePills scopeAll={scopeAll} onScope={setScope} />
          <ContentPlaceholder label="Loading exercises..." rowClassName={EXERCISE_LIST_PLACEHOLDER_CLASS} />
        </>
      ) : (
        <>
          <ExerciseScopePills scopeAll={scopeAll} onScope={setScope} />
          {displayItems.length === 0 ? (
            <p className="text-sm text-zinc-600">
              {scopeAll
                ? "No exercises loaded."
                : 'No exercise history yet. Choose "All exercises" above, or log a workout session first.'}
            </p>
          ) : (
            <ExerciseFilteredList
              items={displayItems}
              searchText={searchText}
              onSearchTextChange={setSearchText}
              filterLabel="Search exercises"
              searchPlaceholder="Search by name or badge"
              emptyFilterMessage="No exercises match that search."
              listClassName={panelInsetClass(
                "mt-3 max-h-[min(24rem,55vh)] space-y-2 overflow-y-auto overscroll-y-contain p-3 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0",
              )}
              renderItem={(exercise) => {
                const href = appPath(`/exercises/${exercise.slug}`);
                return (
                  <Link
                    href={href}
                    prefetch={false}
                    onMouseEnter={() => prefetchExercisePage(href)}
                    onFocus={() => prefetchExercisePage(href)}
                    onPointerDown={() => prefetchExercisePage(href)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <ExerciseBadgeChip slug={exercise.slug} />
                      <span className="truncate">{exercise.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {exercise.sessionCount}{" "}
                      {exercise.sessionCount === 1 ? "session" : "sessions"}
                    </span>
                  </Link>
                );
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

export default function ExercisesPage() {
  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Weight className="h-6 w-6 text-sky-700" />
          Exercises
        </h1>
      </div>

      <Suspense
        fallback={<ExercisesLoadingPanel />}
      >
        <ExercisesMain />
      </Suspense>
    </PageShell>
  );
}
