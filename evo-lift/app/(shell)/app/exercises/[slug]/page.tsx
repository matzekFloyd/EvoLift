"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Dumbbell, LayoutList, LineChart } from "lucide-react";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  EXERCISE_CHART_HEIGHT_CLASS,
  EXERCISE_HISTORY_PLACEHOLDER_ROWS,
} from "@/app/components/content-placeholder-layout";
import { externalLoadFieldLabel, isAssistanceExercise } from "@/lib/assistance-exercise";
import {
  historyPageCount,
  sliceRowsForPage,
  type HistoryPageSize,
} from "@/app/components/history-page-controls";
import {
  buildExerciseDetailFilterQueryString,
  summarizeExerciseHistory,
} from "@/app/exercises/[slug]/exercise-history-display";
import {
  parseExerciseDetailFiltersFromSearchParams,
  sortExerciseHistoryRowsCanonical,
} from "@/app/exercises/[slug]/exercise-history";
import {
  buildExerciseSetHistoryRows,
  buildGoalLabelsByAchievedAt,
  filterExerciseHistoryRows,
  fullHistoryClearDateRange as computeFullHistoryClearDateRange,
  sortExerciseHistoryTableRows,
  topRepsRowKeyFor,
  type ExerciseSetHistoryRow,
  type HistorySortDirection,
  type HistorySortKey,
} from "@/app/exercises/[slug]/exercise-detail-data";
import {
  ExerciseE1rmChartSection,
  ExerciseVolumeChartSection,
  ExerciseWeightChartSection,
} from "@/app/exercises/[slug]/exercise-chart-sections";
import { ExerciseFiltersSection } from "@/app/exercises/[slug]/exercise-filters-section";
import { ExerciseSetHistorySection } from "@/app/exercises/[slug]/exercise-set-history-section";
import { ExerciseSummarySection } from "@/app/exercises/[slug]/exercise-summary-section";
import { ExerciseInsightPanel } from "@/app/components/lift-comparison-panel";
import { DocumentTitle } from "@/app/components/document-title";
import { PageShell } from "@/app/components/page-shell";
import { SegmentedTabs } from "@/app/components/segmented-tabs";
import { StatusNotice } from "@/app/components/status-notice";
import {
  getExerciseMetadataCacheStatus,
  loadExerciseMetadata,
} from "@/lib/exercise-metadata-cache";
import {
  openedExerciseHistoryEpoch,
  peekOpenedExerciseHistory,
  rememberOpenedExerciseHistory,
} from "@/lib/opened-exercise-history-cache";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/chunked-query";
import { toExerciseBadge } from "@/lib/exercise-badge";
import { buildExerciseSessionE1rmChartPoints } from "@/lib/exercise-session-e1rm-chart";
import { buildExerciseSessionVolumeChartPoints } from "@/lib/exercise-session-volume-chart";
import { buildExerciseSessionWeightChartPoints } from "@/lib/exercise-session-weight-chart";
import { createPageLoadPerfTracker } from "@/lib/page-load-perf";
import { appPath } from "@/lib/app-paths";
import { resolveLifterAge } from "@/lib/body-metrics";
import { buildExerciseProgressReport, type LifterProfile } from "@/lib/exercise-progress-insights";
import {
  loadCachedInsightsHistory,
  loadUserStrengthProfile,
  peekInsightsExerciseSets,
  type ExerciseWorkingSetSample,
} from "@/lib/insights-data";
import {
  getDefaultRollingYearDateRange,
  getTodayYyyyMmDd,
} from "@/lib/session-date";

type ExerciseRow = {
  id: string;
  slug: string;
};

type SessionRow = {
  id: string;
  performed_on: string;
  created_at: string;
};

type SessionExerciseRow = {
  id: string;
  session_id: string;
  base_weight_kg: number | null;
};

type WorkoutSetRow = {
  session_exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number | null;
  is_warmup: boolean;
  performed_at: string;
};

/** Prefix for tab / tabpanel ids (`SegmentedTabs` + `role="tabpanel"`). */
const EXERCISE_DETAIL_A11Y_PREFIX = "exercise-detail";

type ExerciseDetailPanelTab = "data" | "charts";

export default function ExerciseDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [openedHistory] = useState(() => {
    const userId = rememberedUserId();
    if (!slug || !userId) {
      return null;
    }
    return peekOpenedExerciseHistory(userId, slug);
  });
  const [trackedSlug, setTrackedSlug] = useState(slug);
  const assistance = isAssistanceExercise(slug);
  const loadColumnLabel = externalLoadFieldLabel(slug);
  const defaultDateRange = useMemo(() => getDefaultRollingYearDateRange(), []);
  const [isLoading, setIsLoading] = useState(openedHistory == null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [exerciseLabel, setExerciseLabel] = useState(openedHistory?.label ?? "");
  const [historyRows, setHistoryRows] = useState<ExerciseSetHistoryRow[]>(openedHistory?.rows ?? []);
  const [insightSamples, setInsightSamples] = useState<ExerciseWorkingSetSample[]>([]);
  const [lifterProfile, setLifterProfile] = useState<LifterProfile>({
    sex: null,
    bodyweightKg: null,
    bodyweightEntries: [],
    ageYears: null,
    ageIsApproximate: false,
  });
  const [insightReady, setInsightReady] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [sortKey, setSortKey] = useState<HistorySortKey>("performedOn");
  const [sortDirection, setSortDirection] = useState<HistorySortDirection>("desc");
  const [historyPageSize, setHistoryPageSize] = useState<HistoryPageSize>("25");
  const [historyPage, setHistoryPage] = useState(1);
  const [detailPanelTab, setDetailPanelTab] = useState<ExerciseDetailPanelTab>("data");

  if (slug !== trackedSlug) {
    setTrackedSlug(slug);
    const userId = rememberedUserId();
    const nextHistory = slug && userId ? peekOpenedExerciseHistory(userId, slug) : null;
    if (nextHistory) {
      setExerciseLabel(nextHistory.label);
      setHistoryRows(nextHistory.rows);
      setIsLoading(false);
      setIsNotFound(false);
      setErrorMessage(null);
    } else {
      setIsLoading(true);
      setExerciseLabel("");
      setHistoryRows([]);
    }
  }

  const filterState = useMemo(
    () =>
      parseExerciseDetailFiltersFromSearchParams(
        searchParams,
        defaultDateRange,
        getTodayYyyyMmDd(),
      ),
    [searchParams, defaultDateRange],
  );
  const historyFilterKey = `${filterState.from}|${filterState.to}|${filterState.hideWarmups}`;
  const [historyPageFilterKey, setHistoryPageFilterKey] = useState(historyFilterKey);
  if (historyPageFilterKey !== historyFilterKey) {
    setHistoryPageFilterKey(historyFilterKey);
    setHistoryPage(1);
  }

  const commitExerciseFilters = useCallback(
    (patch: Partial<{ from: string; to: string; hideWarmups: boolean }>) => {
      const merged = {
        from: patch.from ?? filterState.from,
        to: patch.to ?? filterState.to,
        hideWarmups: patch.hideWarmups ?? filterState.hideWarmups,
      };
      let { from, to } = merged;
      const { hideWarmups } = merged;
      if (from > to) {
        const s = from;
        from = to;
        to = s;
      }
      const qs = buildExerciseDetailFilterQueryString(
        from,
        to,
        hideWarmups,
        defaultDateRange,
      );
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [
      defaultDateRange,
      filterState.from,
      filterState.hideWarmups,
      filterState.to,
      pathname,
      router,
    ],
  );

  useEffect(() => {
    let isMounted = true;
    const startedEpoch = openedExerciseHistoryEpoch();
    const perf = createPageLoadPerfTracker("/app/exercises/[slug]");

    async function loadData() {
      if (!slug) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      const visit = await perf.trackQuery("auth.getUser", () => confirmSignedInUser());
      if (!isMounted || startedEpoch !== openedExerciseHistoryEpoch()) {
        return;
      }
      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }
      const cached = peekOpenedExerciseHistory(visit.userId, slug);
      const keepCached = Boolean(cached && visit.showCached);
      if (keepCached && cached) {
        setExerciseLabel(cached.label);
        setHistoryRows(cached.rows);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      perf.noteCache("exerciseMetadata", getExerciseMetadataCacheStatus(5 * 60 * 1000));
      let metadataRows: Array<{ id: string; slug: string; label: string }> = [];
      try {
        metadataRows = await perf.trackQuery("exerciseMetadata.load", () =>
          loadExerciseMetadata(supabaseBrowserClient, { ttlMs: 5 * 60 * 1000 }),
        );
      } catch (error) {
        if (!keepCached) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load exercise.");
        }
        setIsLoading(false);
        perf.flush();
        return;
      }
      const exerciseData = metadataRows.find((row) => row.slug === slug);
      if (!exerciseData) {
        setIsNotFound(true);
        setIsLoading(false);
        perf.flush();
        return;
      }

      const exercise = exerciseData as ExerciseRow;

      const { data: sessionExerciseRows, error: sessionExercisesError } = await perf.trackQuery(
        "workout_session_exercises.selectByExerciseId",
        () =>
          fetchAllPages((from, to) =>
            supabaseBrowserClient
              .from("workout_session_exercises")
              .select("id, session_id, base_weight_kg")
              .eq("exercise_id", exercise.id)
              .order("id", { ascending: true })
              .range(from, to),
          ),
      );
      if (sessionExercisesError) {
        if (!keepCached) {
          setErrorMessage("Could not load exercise sessions.");
        }
        setIsLoading(false);
        perf.flush();
        return;
      }

      const typedSessionExercises = (sessionExerciseRows ?? []) as SessionExerciseRow[];
      const sessionIds = [...new Set(typedSessionExercises.map((row) => row.session_id))];
      const sessionExerciseIds = typedSessionExercises.map((row) => row.id);
      const sessionIdBySessionExerciseId = new Map<string, string>();
      const baseWeightBySessionExerciseId = new Map<string, number>();
      for (const row of typedSessionExercises) {
        sessionIdBySessionExerciseId.set(row.id, row.session_id);
        baseWeightBySessionExerciseId.set(row.id, row.base_weight_kg ?? 0);
      }

      const sessionsPromise =
        sessionIds.length === 0
          ? Promise.resolve({ data: [] as SessionRow[], error: null })
          : perf.trackQuery("workout_sessions.selectByIds", () =>
              fetchInChunks(sessionIds, (chunk, from, to) =>
                supabaseBrowserClient
                  .from("workout_sessions")
                  .select("id, performed_on, created_at")
                  .in("id", chunk)
                  .order("id", { ascending: true })
                  .range(from, to),
              ),
            );
      const setsPromise =
        sessionExerciseIds.length === 0
          ? Promise.resolve({ data: [] as WorkoutSetRow[], error: null })
          : perf.trackQuery("workout_sets.selectBySessionExerciseIds", () =>
              fetchInChunks(sessionExerciseIds, (chunk, from, to) =>
                supabaseBrowserClient
                  .from("workout_sets")
                  .select("session_exercise_id, set_number, reps, weight_kg, is_warmup, performed_at")
                  .in("session_exercise_id", chunk)
                  .order("id", { ascending: true })
                  .range(from, to),
              ),
            );
      const milestonesPromise = perf.trackQuery("strength_milestones.selectByExerciseId", () =>
        supabaseBrowserClient
          .from("strength_milestones")
          .select("milestone_type, target_weight_kg, bodyweight_multiple, min_reps, achieved_at")
          .eq("exercise_id", exercise.id)
          .not("achieved_at", "is", null),
      );
      const [sessionsResult, setsResult, milestonesResult] = await Promise.all([
        sessionsPromise,
        setsPromise,
        milestonesPromise,
      ]);
      if (sessionsResult.error) {
        if (!keepCached) {
          setErrorMessage("Could not load your workout sessions.");
        }
        setIsLoading(false);
        perf.flush();
        return;
      }
      if (setsResult.error) {
        if (!keepCached) {
          setErrorMessage("Could not load exercise sets.");
        }
        setIsLoading(false);
        perf.flush();
        return;
      }

      const sessionMetaBySessionId = new Map<string, { performedOn: string; createdAt: string }>();
      for (const row of sessionsResult.data ?? []) {
        sessionMetaBySessionId.set(row.id, {
          performedOn: row.performed_on,
          createdAt: row.created_at,
        });
      }

      const goalLabelsByAchievedAt = buildGoalLabelsByAchievedAt(
        exercise.id,
        milestonesResult.data ?? [],
      );

      let history: ExerciseSetHistoryRow[] = [];
      if (sessionExerciseIds.length > 0) {
        history = buildExerciseSetHistoryRows({
          sets: setsResult.data ?? [],
          sessionIdBySessionExerciseId,
          baseWeightBySessionExerciseId,
          sessionMetaBySessionId,
          goalLabelsByAchievedAt,
          assistance: isAssistanceExercise(slug),
        });
      }

      if (!isMounted || startedEpoch !== openedExerciseHistoryEpoch()) {
        return;
      }
      rememberOpenedExerciseHistory(visit.userId, slug, {
        label: exerciseData.label,
        rows: history.map((row) => ({ ...row })),
      });
      setExerciseLabel(exerciseData.label);
      setHistoryRows(history);
      setIsLoading(false);
      perf.flush();
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [router, slug]);

  useEffect(() => {
    let isMounted = true;

    async function loadInsight() {
      if (!slug) {
        return;
      }
      const session = await getBrowserAuthSession();
      if (!isMounted || !session) {
        return;
      }
      const historyWindow = { from: filterState.from, to: filterState.to };
      try {
        const cachedSets = peekInsightsExerciseSets(session.user.id, historyWindow);
        const [sets, profile] = await Promise.all([
          cachedSets
            ? Promise.resolve(cachedSets)
            : loadCachedInsightsHistory(supabaseBrowserClient, session.user.id, historyWindow).then(
                (history) => history.exerciseSets,
              ),
          loadUserStrengthProfile(supabaseBrowserClient, session.user.id),
        ]);
        if (!isMounted) {
          return;
        }
        const age = resolveLifterAge({
          dateOfBirth: profile.dateOfBirth,
          birthYear: profile.birthYear,
        });
        setInsightSamples(sets);
        setLifterProfile({
          sex: profile.sex,
          bodyweightKg: profile.bodyweightKg,
          bodyweightEntries: profile.bodyweightEntries,
          ageYears: age?.ageYears ?? null,
          ageIsApproximate: age?.ageIsApproximate ?? false,
        });
        setInsightReady(true);
      } catch {
        if (!isMounted) {
          return;
        }
        setInsightReady(false);
      }
    }

    void loadInsight();
    return () => {
      isMounted = false;
    };
  }, [filterState.from, filterState.to, slug]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsCompactView(mediaQuery.matches);
    apply();
    const onChange = () => apply();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  /** “Clear filters” uses the full span of loaded sets for this exercise (not the 1-year landing default). */
  const fullHistoryClearDateRange = useMemo(
    () => computeFullHistoryClearDateRange(historyRows, getTodayYyyyMmDd()),
    [historyRows],
  );

  const isExerciseFiltersFullyCleared =
    !filterState.hideWarmups &&
    filterState.from === fullHistoryClearDateRange.from &&
    filterState.to === fullHistoryClearDateRange.to;

  const exerciseInsight = useMemo(
    () =>
      buildExerciseProgressReport(
        insightSamples,
        { from: filterState.from, to: filterState.to },
        lifterProfile,
      ),
    [filterState.from, filterState.to, insightSamples, lifterProfile],
  );

  const filteredHistoryRows = useMemo(
    () =>
      filterExerciseHistoryRows(historyRows, {
        from: filterState.from,
        to: filterState.to,
        hideWarmups: filterState.hideWarmups,
      }),
    [historyRows, filterState.from, filterState.to, filterState.hideWarmups],
  );

  const hasWarmupSets = useMemo(() => historyRows.some((row) => row.isWarmup), [historyRows]);

  const workingRows = useMemo(
    () => filteredHistoryRows.filter((row) => !row.isWarmup),
    [filteredHistoryRows],
  );

  const historyStats = useMemo(
    () => summarizeExerciseHistory(filteredHistoryRows),
    [filteredHistoryRows],
  );

  const sessionWeightChartPoints = useMemo(
    () => buildExerciseSessionWeightChartPoints(filteredHistoryRows),
    [filteredHistoryRows],
  );

  const sessionE1rmChartPoints = useMemo(
    () =>
      assistance ? [] : buildExerciseSessionE1rmChartPoints(filteredHistoryRows),
    [assistance, filteredHistoryRows],
  );

  const sessionVolumeChartPoints = useMemo(
    () =>
      assistance ? [] : buildExerciseSessionVolumeChartPoints(filteredHistoryRows),
    [assistance, filteredHistoryRows],
  );

  /** Default date + session + set order (newest first, highest set first); same as Session date ↓ on wide layout. */
  const compactHistoryRows = useMemo(
    () => sortExerciseHistoryRowsCanonical([...filteredHistoryRows]),
    [filteredHistoryRows],
  );

  const topRepsRowKey = useMemo(() => topRepsRowKeyFor(workingRows), [workingRows]);

  const sortedTableRows = useMemo(
    () => sortExerciseHistoryTableRows(filteredHistoryRows, sortKey, sortDirection),
    [filteredHistoryRows, sortDirection, sortKey],
  );

  const historyTotalPages = historyPageCount(filteredHistoryRows.length, historyPageSize);
  const historyPageIndex = Math.min(historyPage, historyTotalPages);
  const pagedCompactHistoryRows = useMemo(
    () => sliceRowsForPage(compactHistoryRows, historyPageIndex, historyPageSize),
    [compactHistoryRows, historyPageIndex, historyPageSize],
  );
  const pagedTableRows = useMemo(
    () => sliceRowsForPage(sortedTableRows, historyPageIndex, historyPageSize),
    [historyPageIndex, historyPageSize, sortedTableRows],
  );

  function handleSort(nextKey: HistorySortKey) {
    setHistoryPage(1);
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "performedOn" ? "desc" : "asc");
  }

  function handleHistoryPageSize(nextSize: HistoryPageSize) {
    setHistoryPageSize(nextSize);
    setHistoryPage(1);
  }

  return (
    <PageShell>
      <DocumentTitle page={exerciseLabel.trim() ? exerciseLabel : null} />
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="inline-flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight">
              <Dumbbell className="h-5 w-5 shrink-0 text-sky-700" />
              <span className="inline-flex h-6 min-w-8 shrink-0 items-center justify-center rounded border border-zinc-300 bg-zinc-50 px-1 text-[10px] font-semibold tracking-wide text-zinc-700">
                {slug ? toExerciseBadge(slug) : "EX"}
              </span>
              <span className="truncate">{exerciseLabel || slug}</span>
            </h1>
          </div>
          {isCompactView ? null : (
            <Link
              href={appPath("/exercises")}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-sky-700" />
              Back to exercises
            </Link>
          )}
        </div>
      </section>

      <section className="panel p-5">
        {errorMessage ? (
          <StatusNotice message={errorMessage} tone="error" />
        ) : isLoading ? (
          <div className="space-y-3">
            <ContentPlaceholder
              label="Loading exercise history..."
              rowClassName={EXERCISE_CHART_HEIGHT_CLASS}
            />
            <ContentPlaceholder rows={EXERCISE_HISTORY_PLACEHOLDER_ROWS} />
          </div>
        ) : isNotFound ? (
          <p className="text-sm text-zinc-600">
            Exercise not found. Please check the link or open an exercise from the list.
          </p>
        ) : historyRows.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No sets logged yet for this exercise.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {insightReady ? <ExerciseInsightPanel report={exerciseInsight} slug={slug ?? ""} /> : null}
            <SegmentedTabs<ExerciseDetailPanelTab>
              value={detailPanelTab}
              onChange={setDetailPanelTab}
              className="w-full"
              tabListAriaLabel="Exercise detail"
              a11yIdPrefix={EXERCISE_DETAIL_A11Y_PREFIX}
              buttonLayout="equal-row"
              buttonMinWidthClassName="min-w-0"
              options={[
                {
                  value: "data",
                  label: "Stats & history",
                  icon: <LayoutList className="h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />,
                },
                {
                  value: "charts",
                  label: "Charts",
                  icon: <LineChart className="h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />,
                },
              ]}
            />

            <div
              id={`${EXERCISE_DETAIL_A11Y_PREFIX}-panel-data`}
              role="tabpanel"
              aria-labelledby={`${EXERCISE_DETAIL_A11Y_PREFIX}-tab-data`}
              hidden={detailPanelTab !== "data"}
              className="flex flex-col gap-4"
            >
              <ExerciseFiltersSection
                shownCount={filteredHistoryRows.length}
                totalCount={historyRows.length}
                from={filterState.from}
                to={filterState.to}
                hideWarmups={filterState.hideWarmups}
                hasWarmupSets={hasWarmupSets}
                isFullyCleared={isExerciseFiltersFullyCleared}
                clearRange={fullHistoryClearDateRange}
                onCommit={commitExerciseFilters}
              />
              <ExerciseSummarySection
                loggedSetCount={filteredHistoryRows.length}
                stats={historyStats}
                assistance={assistance}
              />
              <ExerciseSetHistorySection
                filteredCount={filteredHistoryRows.length}
                pagedCompactRows={pagedCompactHistoryRows}
                pagedTableRows={pagedTableRows}
                topRepsRowKey={topRepsRowKey}
                isCompactView={isCompactView}
                assistance={assistance}
                loadColumnLabel={loadColumnLabel}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                pageSize={historyPageSize}
                onPageSizeChange={handleHistoryPageSize}
                page={historyPageIndex}
                totalPages={historyTotalPages}
                onPageChange={setHistoryPage}
                onClearFilters={() =>
                  commitExerciseFilters({
                    from: fullHistoryClearDateRange.from,
                    to: fullHistoryClearDateRange.to,
                    hideWarmups: false,
                  })
                }
              />
            </div>

            <div
              id={`${EXERCISE_DETAIL_A11Y_PREFIX}-panel-charts`}
              role="tabpanel"
              aria-labelledby={`${EXERCISE_DETAIL_A11Y_PREFIX}-tab-charts`}
              hidden={detailPanelTab !== "charts"}
              className="flex flex-col gap-4"
            >
              <ExerciseWeightChartSection points={sessionWeightChartPoints} assistance={assistance} />
              <ExerciseE1rmChartSection points={sessionE1rmChartPoints} assistance={assistance} />
              <ExerciseVolumeChartSection points={sessionVolumeChartPoints} assistance={assistance} />
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
