"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { NAMED_LIST_PLACEHOLDER_ROWS } from "@/app/components/content-placeholder-layout";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { NamedListTable, NamedListTableRow } from "@/app/components/named-list-table";
import { PageShell } from "@/app/components/page-shell";
import { SelectField } from "@/app/components/select-field";
import { StatusNotice } from "@/app/components/status-notice";
import { TextField } from "@/app/components/text-field";
import { exercisesForList } from "@/lib/hidden-exercise-lists";
import {
  getExerciseMetadataCacheStatus,
  loadExerciseMetadata,
} from "@/lib/exercise-metadata-cache";
import { createPageLoadPerfTracker } from "@/lib/page-load-perf";
import { pastSessionCountsBySlug } from "@/lib/home-session-cache";
import { toggleNamedListSortDirection } from "@/lib/named-list-sort";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  EXERCISE_LIST_EMPTY_ALL,
  EXERCISE_LIST_EMPTY_SEARCH,
  EXERCISE_LIST_EMPTY_USED,
  EXERCISE_LIST_INTRO,
  exerciseDetailHref,
  exerciseSessionCountLabel,
  visibleExerciseListRows,
  type ExerciseListSort,
} from "./exercise-list";

type ExerciseListItem = {
  id: string;
  slug: string;
  label: string;
  sessionCount: number;
};

function ExerciseListFilters({
  searchText,
  onSearchTextChange,
  scopeAll,
  onScope,
  disabled = false,
}: {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  scopeAll: boolean;
  onScope: (next: "used" | "all") => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem] sm:items-end">
      <label className="block min-w-0 text-sm font-medium text-zinc-800">
        Search exercises
        <TextField
          type="search"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          disabled={disabled}
          className="mt-1 w-full"
          placeholder="Search by name or badge"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className="block min-w-0 text-sm font-medium text-zinc-800">
        Show
        <SelectField
          value={scopeAll ? "all" : "used"}
          disabled={disabled}
          onChange={(event) => onScope(event.target.value === "all" ? "all" : "used")}
          className="mt-1 w-full"
        >
          <option value="used">With session history</option>
          <option value="all">All exercises</option>
        </SelectField>
      </label>
    </div>
  );
}

function ExercisesLoadingPanel() {
  return (
    <section className="panel p-5">
      <p className="text-sm text-zinc-600">{EXERCISE_LIST_INTRO}</p>
      <ExerciseListFilters
        searchText=""
        onSearchTextChange={() => {}}
        scopeAll={false}
        onScope={() => {}}
        disabled
      />
      <ContentPlaceholder
        label="Loading exercises..."
        rows={NAMED_LIST_PLACEHOLDER_ROWS}
        className="mt-4"
      />
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
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(() => new Set());
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<ExerciseListSort>({ key: "name", direction: "asc" });
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

  function toggleSort(key: ExerciseListSort["key"]) {
    setSort((current) =>
      current.key === key
        ? { key, direction: toggleNamedListSortDirection(current.direction) }
        : { key, direction: "asc" },
    );
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
      const hiddenPromise = perf.trackQuery("user_hidden_exercises.selectByUserId", () =>
        supabaseBrowserClient
          .from("user_hidden_exercises")
          .select("exercise_id")
          .eq("user_id", session.user.id),
      );
      const [metadataResult, countsResult, hiddenResult] = await Promise.all([
        metadataPromise,
        countsPromise ?? Promise.resolve(null),
        hiddenPromise,
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
      if (hiddenResult.error) {
        setErrorMessage("Could not load exercise visibility.");
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
      setHiddenExerciseIds(new Set((hiddenResult.data ?? []).map((row) => row.exercise_id)));
      setIsLoading(false);
      perf.flush();
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const displayItems = useMemo(
    () => exercisesForList(exercises, hiddenExerciseIds, scopeAll ? "all" : "used"),
    [exercises, hiddenExerciseIds, scopeAll],
  );
  const visibleItems = useMemo(
    () => visibleExerciseListRows(displayItems, debouncedSearch, sort),
    [debouncedSearch, displayItems, sort],
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
    <section className="panel p-5">
      <p className="text-sm text-zinc-600">{EXERCISE_LIST_INTRO}</p>
      {errorMessage ? (
        <StatusNotice className="mt-4" message={errorMessage} tone="error" />
      ) : isLoading ? (
        <>
          <ExerciseListFilters
            searchText={searchText}
            onSearchTextChange={setSearchText}
            scopeAll={scopeAll}
            onScope={setScope}
            disabled
          />
          <ContentPlaceholder
            label="Loading exercises..."
            rows={NAMED_LIST_PLACEHOLDER_ROWS}
            className="mt-4"
          />
        </>
      ) : (
        <>
          <ExerciseListFilters
            searchText={searchText}
            onSearchTextChange={setSearchText}
            scopeAll={scopeAll}
            onScope={setScope}
          />
          {displayItems.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">
              {scopeAll ? EXERCISE_LIST_EMPTY_ALL : EXERCISE_LIST_EMPTY_USED}
            </p>
          ) : visibleItems.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">{EXERCISE_LIST_EMPTY_SEARCH}</p>
          ) : (
            <NamedListTable
              className="mt-4"
              sortDirection={sort.direction}
              nameSortActive={sort.key === "name"}
              onToggleSort={() => toggleSort("name")}
              countSort={{
                label: "Sessions",
                active: sort.key === "sessions",
                direction: sort.direction,
                onToggle: () => toggleSort("sessions"),
                tracks: "count",
              }}
              embedActions
              actions={false}
              contained
            >
              {visibleItems.map((exercise) => {
                const href = exerciseDetailHref(exercise.slug);
                return (
                  <NamedListTableRow
                    key={exercise.id}
                    name={exercise.label}
                    href={href}
                    prefetch={false}
                    onOpenIntent={() => prefetchExercisePage(href)}
                    leading={<ExerciseBadgeChip slug={exercise.slug} />}
                    detailInline
                    detail={
                      <p className="justify-self-end text-sm whitespace-nowrap text-zinc-600 md:justify-self-start">
                        {exerciseSessionCountLabel(exercise.sessionCount)}
                      </p>
                    }
                  />
                );
              })}
            </NamedListTable>
          )}
        </>
      )}
    </section>
  );
}

export default function ExercisesPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight">Exercises</h1>
      <Suspense fallback={<ExercisesLoadingPanel />}>
        <ExercisesMain />
      </Suspense>
    </PageShell>
  );
}
