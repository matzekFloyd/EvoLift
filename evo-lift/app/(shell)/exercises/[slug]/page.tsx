"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  FilterX,
  Hash,
  LayoutList,
  LineChart,
  Medal,
  Trophy,
  TrendingUp,
  Weight,
} from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  EXERCISE_CHART_HEIGHT_CLASS,
  EXERCISE_HISTORY_PLACEHOLDER_ROWS,
} from "@/app/components/content-placeholder-layout";
import { AppTable } from "@/app/components/app-table";
import { externalLoadFieldLabel, isAssistanceExercise } from "@/lib/assistance-exercise";
import {
  HistoryPageNav,
  HistoryPageSizeToggle,
  historyPageCount,
  sliceRowsForPage,
  type HistoryPageSize,
} from "@/app/components/history-page-controls";
import { DateInput } from "@/app/components/date-input";
import {
  buildExerciseDetailFilterQueryString,
  formatKgValue,
  historyRowSurfaceClass,
  historyRowTitle,
  historyValueClass,
  normalizeLoadedForComparison,
  summarizeExerciseHistory,
} from "@/app/exercises/[slug]/exercise-history-display";
import {
  compareExerciseSetHistoryForPerformedOn,
  isRowEarlier,
  parseExerciseDetailFiltersFromSearchParams,
  sortExerciseHistoryRowsCanonical,
} from "@/app/exercises/[slug]/exercise-history";
import { ExerciseSessionE1rmChart } from "@/app/components/exercise-session-e1rm-chart";
import { ExerciseSessionVolumeChart } from "@/app/components/exercise-session-volume-chart";
import { ExerciseWeightProgressChart } from "@/app/components/exercise-weight-progress-chart";
import { ExerciseInsightPanel } from "@/app/components/lift-comparison-panel";
import { InfoPopover } from "@/app/components/info-popover";
import { KpiBadge } from "@/app/components/kpi-badge";
import { DocumentTitle } from "@/app/components/document-title";
import { PageShell } from "@/app/components/page-shell";
import { panelInsetClass } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { SegmentedTabs } from "@/app/components/segmented-tabs";
import { SetKindIndicator } from "@/app/components/set-kind-indicator";
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
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { formatMilestoneTarget } from "@/lib/milestone-progress";
import { toExerciseBadge } from "@/lib/exercise-badge";
import { buildExerciseSessionE1rmChartPoints } from "@/lib/exercise-session-e1rm-chart";
import { buildExerciseSessionVolumeChartPoints } from "@/lib/exercise-session-volume-chart";
import { buildExerciseSessionWeightChartPoints } from "@/lib/exercise-session-weight-chart";
import { createPageLoadPerfTracker } from "@/lib/page-load-perf";
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

type ExerciseSetHistoryRow = {
  sessionId: string;
  performedOn: string;
  /** `workout_sessions.created_at` (ISO); disambiguates multiple sessions on the same `performed_on` day. */
  sessionCreatedAt: string;
  /** `workout_sets.performed_at`. Matches a goal's achieved time when this set reached it. */
  performedAt: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  totalKg: number;
  isWarmup: boolean;
  /** Set when this row is the set that reached one or more goals. */
  goalLabel: string | null;
};

type HistorySortKey =
  | "performedOn"
  | "setNumber"
  | "reps"
  | "weightKg"
  | "totalKg"
  | "isWarmup";
type HistorySortDirection = "asc" | "desc";

/** Prefix for tab / tabpanel ids (`SegmentedTabs` + `role="tabpanel"`). */
const EXERCISE_DETAIL_A11Y_PREFIX = "exercise-detail";

type ExerciseDetailPanelTab = "data" | "charts";

const COMPACT_HISTORY_GRID =
  "grid grid-cols-[minmax(6.75rem,1fr)_minmax(2.75rem,3.5rem)_2.75rem_3.25rem_2.125rem] gap-x-1.5 @min-[22rem]:grid-cols-[minmax(6.75rem,1fr)_3.5rem_minmax(1.75rem,2.25rem)_2.75rem_3.25rem_2.125rem]";

const COMPACT_HISTORY_GRID_ASSISTANCE =
  "grid grid-cols-[minmax(6.75rem,1fr)_minmax(2.75rem,3.5rem)_2.75rem_2.125rem] gap-x-1.5 @min-[22rem]:grid-cols-[minmax(6.75rem,1fr)_3.5rem_minmax(1.75rem,2.25rem)_2.75rem_2.125rem]";

const COMPACT_HISTORY_TYPE_CELL = "hidden @min-[22rem]:flex @min-[22rem]:justify-center @min-[22rem]:items-center";

function GoalReachedMark({ label }: { label: string }) {
  return (
    <Trophy
      className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-amber-500"
      strokeWidth={1.75}
      role="img"
      aria-label={`Goal reached: ${label}`}
    />
  );
}

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
    const perf = createPageLoadPerfTracker("/exercises/[slug]");

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

      const goalLabelsByAchievedAt = new Map<number, string[]>();
      for (const milestone of milestonesResult.data ?? []) {
        if (!milestone.achieved_at) {
          continue;
        }
        const achievedAtMs = new Date(milestone.achieved_at).getTime();
        if (!Number.isFinite(achievedAtMs)) {
          continue;
        }
        const label = formatMilestoneTarget({
          exerciseId: exercise.id,
          milestoneType: milestone.milestone_type,
          targetWeightKg:
            milestone.target_weight_kg == null ? null : Number(milestone.target_weight_kg),
          bodyweightMultiple:
            milestone.bodyweight_multiple == null ? null : Number(milestone.bodyweight_multiple),
          minReps: milestone.min_reps,
        });
        const labels = goalLabelsByAchievedAt.get(achievedAtMs) ?? [];
        labels.push(label);
        goalLabelsByAchievedAt.set(achievedAtMs, labels);
      }

      let history: ExerciseSetHistoryRow[] = [];
      if (sessionExerciseIds.length > 0) {
        history = (setsResult.data ?? [])
          .map((setRow) => {
            const sessionId = sessionIdBySessionExerciseId.get(setRow.session_exercise_id);
            if (!sessionId) {
              return null;
            }
            const sessionMeta = sessionMetaBySessionId.get(sessionId);
            if (!sessionMeta) {
              return null;
            }
            const baseWeightRaw = baseWeightBySessionExerciseId.get(setRow.session_exercise_id) ?? 0;
            const loadedRaw = setRow.weight_kg ?? 0;
            const baseWeightValue = Number(baseWeightRaw);
            const loadedValue = Number(loadedRaw);
            const baseWeightKg = Number.isFinite(baseWeightValue) ? baseWeightValue : 0;
            const loadedKg = Number.isFinite(loadedValue) ? loadedValue : 0;
            const performedAtMs = new Date(setRow.performed_at).getTime();
            const goalLabels = Number.isFinite(performedAtMs)
              ? goalLabelsByAchievedAt.get(performedAtMs)
              : undefined;
            return {
              sessionId,
              performedOn: sessionMeta.performedOn,
              sessionCreatedAt: sessionMeta.createdAt,
              performedAt: setRow.performed_at,
              setNumber: setRow.set_number,
              reps: setRow.reps,
              weightKg: setRow.weight_kg,
              totalKg: isAssistanceExercise(slug)
                ? loadedKg
                : loadedKg + baseWeightKg,
              isWarmup: setRow.is_warmup,
              goalLabel: goalLabels && goalLabels.length > 0 ? goalLabels.join(", ") : null,
            };
          })
          .filter((row): row is ExerciseSetHistoryRow => row !== null);
        history = sortExerciseHistoryRowsCanonical(history);
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
  const fullHistoryClearDateRange = useMemo(() => {
    const today = getTodayYyyyMmDd();
    if (historyRows.length === 0) {
      return { from: today, to: today };
    }
    let min = historyRows[0].performedOn.slice(0, 10);
    for (let i = 1; i < historyRows.length; i++) {
      const d = historyRows[i].performedOn.slice(0, 10);
      if (d < min) {
        min = d;
      }
    }
    return { from: min, to: today };
  }, [historyRows]);

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

  const filteredHistoryRows = useMemo(() => {
    const inRange = historyRows.filter((row) => {
      const d = row.performedOn.slice(0, 10);
      return d >= filterState.from && d <= filterState.to;
    });
    if (filterState.hideWarmups) {
      return inRange.filter((row) => !row.isWarmup);
    }
    return inRange;
  }, [historyRows, filterState.from, filterState.to, filterState.hideWarmups]);

  const hasWarmupSets = useMemo(() => historyRows.some((row) => row.isWarmup), [historyRows]);

  const workingRows = useMemo(
    () => filteredHistoryRows.filter((row) => !row.isWarmup),
    [filteredHistoryRows],
  );

  const historyStats = useMemo(
    () => summarizeExerciseHistory(filteredHistoryRows),
    [filteredHistoryRows],
  );
  const avgSetsText =
    historyStats.avgSetsPerSession == null ? "—" : historyStats.avgSetsPerSession.toFixed(1);
  const maxSetsText =
    historyStats.maxSetsInSession == null ? "—" : String(historyStats.maxSetsInSession);

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

  const maxLoadedText = formatKgValue(historyStats.bestLoadedKg, 1);
  const maxTotalText = formatKgValue(historyStats.bestTotalKg, 1);
  const averageLoadedText = formatKgValue(historyStats.avgLoadedKg, 1);
  const averageTotalText = formatKgValue(historyStats.avgTotalKg, 1);

  /** Default date + session + set order (newest first, highest set first); same as Session date ↓ on wide layout. */
  const compactHistoryRows = useMemo(
    () => sortExerciseHistoryRowsCanonical([...filteredHistoryRows]),
    [filteredHistoryRows],
  );

  const topRepsRowKey = useMemo(() => {
    if (workingRows.length === 0) {
      return null;
    }
    let selectedRow: ExerciseSetHistoryRow | null = null;
    for (const row of workingRows) {
      if (!selectedRow || row.reps > selectedRow.reps) {
        selectedRow = row;
        continue;
      }
      if (selectedRow && row.reps === selectedRow.reps) {
        const rowLoaded = normalizeLoadedForComparison(row.weightKg);
        const selectedLoaded = normalizeLoadedForComparison(selectedRow.weightKg);
        if (rowLoaded > selectedLoaded) {
          selectedRow = row;
          continue;
        }
        if (rowLoaded === selectedLoaded && isRowEarlier(row, selectedRow)) {
          selectedRow = row;
        }
      }
    }
    if (!selectedRow) {
      return null;
    }
    return `${selectedRow.sessionId}-${selectedRow.setNumber}`;
  }, [workingRows]);

  const sortedTableRows = useMemo(() => {
    const next = [...filteredHistoryRows];
    next.sort((left, right) => {
      let leftValue: string | number = "";
      let rightValue: string | number = "";
      if (sortKey === "performedOn") {
        return compareExerciseSetHistoryForPerformedOn(left, right, sortDirection);
      } else if (sortKey === "setNumber") {
        leftValue = left.setNumber;
        rightValue = right.setNumber;
      } else if (sortKey === "reps") {
        leftValue = left.reps;
        rightValue = right.reps;
      } else if (sortKey === "weightKg") {
        leftValue = left.weightKg ?? Number.NEGATIVE_INFINITY;
        rightValue = right.weightKg ?? Number.NEGATIVE_INFINITY;
      } else if (sortKey === "totalKg") {
        leftValue = left.totalKg;
        rightValue = right.totalKg;
      } else if (sortKey === "isWarmup") {
        leftValue = left.isWarmup ? 1 : 0;
        rightValue = right.isWarmup ? 1 : 0;
      }
      if (leftValue < rightValue) return sortDirection === "asc" ? -1 : 1;
      if (leftValue > rightValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return next;
  }, [filteredHistoryRows, sortDirection, sortKey]);

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

  function renderSortIndicator(nextKey: HistorySortKey) {
    if (sortKey !== nextKey) {
      return <span className="text-zinc-400">-</span>;
    }
    return <span>{sortDirection === "asc" ? "↑" : "↓"}</span>;
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
              href="/exercises"
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
            <div className={panelInsetClass("flex flex-col gap-3 p-3 sm:p-4")}>
              <p className="text-xs text-zinc-600">
                Showing{" "}
                <span className="font-medium text-zinc-800">{filteredHistoryRows.length}</span> of{" "}
                <span className="font-medium text-zinc-800">{historyRows.length}</span> sets
              </p>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block min-w-0 text-xs font-medium text-zinc-600">
                    From
                    <DateInput
                      value={filterState.from}
                      onChange={(event) =>
                        commitExerciseFilters({ from: event.target.value })
                      }
                      max={getTodayYyyyMmDd()}
                      className="mt-1 min-w-0 w-full max-w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block min-w-0 text-xs font-medium text-zinc-600">
                    To
                    <DateInput
                      value={filterState.to}
                      onChange={(event) => commitExerciseFilters({ to: event.target.value })}
                      max={getTodayYyyyMmDd()}
                      className="mt-1 min-w-0 w-full max-w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
                <div className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  {hasWarmupSets ? (
                    <label className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                      <input
                        type="checkbox"
                        checked={filterState.hideWarmups}
                        onChange={(event) =>
                          commitExerciseFilters({ hideWarmups: event.target.checked })
                        }
                        className="h-4 w-4 shrink-0 rounded border-zinc-300 text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                      Hide warmups
                    </label>
                  ) : null}
                  <ActionButton
                    type="button"
                    onClick={() =>
                      commitExerciseFilters({
                        from: fullHistoryClearDateRange.from,
                        to: fullHistoryClearDateRange.to,
                        hideWarmups: false,
                      })
                    }
                    disabled={isExerciseFiltersFullyCleared}
                    variant="secondary"
                    size="sm"
                    className="ml-auto shrink-0 text-sm font-normal text-amber-800 hover:text-amber-900"
                    iconColor="amber"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Clear filters
                  </ActionButton>
                </div>
              </div>
            </div>
            {/*
              Narrow: 3–2–2 rows (6-col grid). Mid: neutral row + load/total row (12-col). Wide: one row (7-col).
            */}
            <section
              className={panelInsetClass("p-4 sm:p-5")}
              aria-labelledby="exercise-detail-summary-heading"
            >
              <SectionHeading id="exercise-detail-summary-heading" className="mb-3">
                Summary
              </SectionHeading>
            <div className="@container">
              <div className="grid w-full grid-cols-6 gap-2 @min-[28rem]:grid-cols-12 @min-[56rem]:grid-cols-7">
                <KpiBadge
                  label="Logged sets"
                  value={String(filteredHistoryRows.length)}
                  icon={<Hash className="h-4 w-4 text-zinc-600" />}
                  tone="neutral"
                  className="col-span-2 min-w-0 @min-[28rem]:col-span-4 @min-[56rem]:col-span-1"
                  description="Sets in the current date range. Warmups are included unless “Hide warmups” is on."
                />
                <KpiBadge
                  label="Avg sets"
                  value={avgSetsText}
                  icon={<Hash className="h-4 w-4 text-zinc-600" />}
                  tone="neutral"
                  className="col-span-2 min-w-0 @min-[28rem]:col-span-4 @min-[56rem]:col-span-1"
                  description="Average sets per session within the current filters (respects date range and “Hide warmups”)."
                />
                <KpiBadge
                  label="Max sets"
                  value={maxSetsText}
                  icon={<Hash className="h-4 w-4 text-zinc-600" />}
                  tone="neutral"
                  className="col-span-2 min-w-0 @min-[28rem]:col-span-4 @min-[56rem]:col-span-1"
                  description="Most sets in one session within the current filters (respects date range and “Hide warmups”)."
                />
                <KpiBadge
                  label={assistance ? "Avg assistance (kg)" : "Avg loaded (kg)"}
                  value={averageLoadedText}
                  icon={<Weight className="h-4 w-4 text-sky-700" />}
                  className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
                  description={
                    assistance
                      ? "Average assistance on working sets (no warmups). Blank or 0 is unassisted bodyweight."
                      : "Average loaded weight on working sets (no warmups). Only sets where you logged a weight."
                  }
                />
                <KpiBadge
                  label={assistance ? "Max assistance (kg)" : "Max loaded (kg)"}
                  value={maxLoadedText}
                  icon={<Weight className="h-4 w-4 text-emerald-700" />}
                  className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
                  description={
                    assistance
                      ? "Highest assistance on a single working set (no warmups). Only sets with logged assistance."
                      : "Heaviest single working set by loaded weight (no warmups). Only sets with logged weight."
                  }
                  tone="success"
                />
                {assistance ? null : (
                  <>
                    <KpiBadge
                      label="Avg total (kg)"
                      value={averageTotalText}
                      icon={<TrendingUp className="h-4 w-4 text-sky-700" />}
                      className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
                      description="Mean of each working set’s Total (kg)—loaded plus base for that session—same column as in set history. No warmups; only sets with logged load."
                    />
                    <KpiBadge
                      label="Max total (kg)"
                      value={maxTotalText}
                      icon={<TrendingUp className="h-4 w-4 text-emerald-700" />}
                      className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
                      description="Heaviest single working set by Total (kg) in set history (loaded plus base). No warmups; only sets with logged load."
                      tone="success"
                    />
                  </>
                )}
              </div>
            </div>
            </section>

            <section
              className={panelInsetClass("p-4 sm:p-5")}
              aria-labelledby="exercise-detail-history-heading"
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <SectionHeading id="exercise-detail-history-heading">Set history</SectionHeading>
                  <p className="mt-1 text-xs text-zinc-600">
                    Each row is one set for this exercise. A trophy marks the set that reached a goal.
                    Open a workout session to edit or review details.
                  </p>
                </div>
                {filteredHistoryRows.length > 0 ? (
                  <HistoryPageSizeToggle value={historyPageSize} onChange={handleHistoryPageSize} />
                ) : null}
              </div>
            {filteredHistoryRows.length === 0 ? (
              <div className={panelInsetClass("p-4 text-sm text-zinc-700")}>
                <p className="text-zinc-800">No sets match the current filters.</p>
                <ActionButton
                  type="button"
                  className="mt-3 text-sm font-normal text-amber-800 hover:text-amber-900"
                  variant="secondary"
                  size="sm"
                  iconColor="amber"
                  onClick={() =>
                    commitExerciseFilters({
                      from: fullHistoryClearDateRange.from,
                      to: fullHistoryClearDateRange.to,
                      hideWarmups: false,
                    })
                  }
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Clear filters
                </ActionButton>
              </div>
            ) : isCompactView ? (
              <div className="@container overflow-x-auto rounded-md border border-zinc-200 bg-white">
                <div
                  className={`${assistance ? COMPACT_HISTORY_GRID_ASSISTANCE : COMPACT_HISTORY_GRID} border-b bg-zinc-50 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500`}
                >
                  <span>Date</span>
                  <span className={COMPACT_HISTORY_TYPE_CELL}>Type</span>
                  <span className="text-right">Set</span>
                  <span className="text-right">{assistance ? "Assist" : "Kg"}</span>
                  {assistance ? null : (
                    <span
                      className="text-right"
                      title="Loaded weight plus optional base weight for this exercise on that session."
                    >
                      Total
                    </span>
                  )}
                  <span className="text-right">Reps</span>
                </div>
                {pagedCompactHistoryRows.map((row, index) => (
                  <article
                    key={`${row.sessionId}-${row.setNumber}-${index}`}
                    className={`cursor-pointer border-b px-2 py-1.5 text-xs last:border-b-0 ${historyRowSurfaceClass(
                      `${row.sessionId}-${row.setNumber}` === topRepsRowKey,
                      Boolean(row.goalLabel),
                    )}`}
                    onClick={() => router.push(`/sessions/${row.sessionId}`)}
                    title={historyRowTitle(row, `${row.sessionId}-${row.setNumber}` === topRepsRowKey)}
                  >
                    {(() => {
                      const rowKey = `${row.sessionId}-${row.setNumber}`;
                      const isTopRepsRow = rowKey === topRepsRowKey;
                      const isGoalRow = Boolean(row.goalLabel);
                      return (
                        <div
                          className={`${assistance ? COMPACT_HISTORY_GRID_ASSISTANCE : COMPACT_HISTORY_GRID} items-center text-zinc-700`}
                        >
                          <div className="flex min-w-0 items-center gap-1">
                            <span className="truncate font-medium tabular-nums text-zinc-900">
                              {formatDateOnlyForLocale(row.performedOn)}
                            </span>
                            {isTopRepsRow ? (
                              <Medal className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                            ) : isGoalRow && row.goalLabel ? (
                              <GoalReachedMark label={row.goalLabel} />
                            ) : (
                              <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {isTopRepsRow && row.goalLabel ? (
                              <GoalReachedMark label={row.goalLabel} />
                            ) : null}
                          </div>
                          <span className={`text-zinc-600 ${COMPACT_HISTORY_TYPE_CELL}`}>
                            <SetKindIndicator isWarmup={row.isWarmup} density="compact" />
                          </span>
                          <span className="text-right font-medium tabular-nums text-zinc-900">
                            <span className="hidden @min-[22rem]:inline">{row.setNumber}</span>
                            <span className="inline-flex items-center justify-end gap-0.5 leading-none @min-[22rem]:hidden">
                              <SetKindIndicator
                                isWarmup={row.isWarmup}
                                density="compact"
                                showLabel={false}
                              />
                              <span>{row.setNumber}</span>
                            </span>
                          </span>
                          <span className={`text-right tabular-nums ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                            {row.weightKg ?? "—"}
                          </span>
                          {assistance ? null : (
                            <span className={`text-right tabular-nums ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                              {row.totalKg.toFixed(1)}
                            </span>
                          )}
                          <span className={`text-right tabular-nums ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                            {row.reps}
                          </span>
                        </div>
                      );
                    })()}
                  </article>
                ))}
              </div>
            ) : (
              <AppTable tableClassName="min-w-[760px]">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 font-medium">
                        <button type="button" onClick={() => handleSort("performedOn")} className="inline-flex items-center gap-1">
                          Session date {renderSortIndicator("performedOn")}
                        </button>
                      </th>
                      <th className="px-2 py-2 font-medium">
                        <button type="button" onClick={() => handleSort("isWarmup")} className="inline-flex items-center gap-1">
                          Type {renderSortIndicator("isWarmup")}
                        </button>
                      </th>
                      <th className="px-2 py-2 font-medium">
                        <button type="button" onClick={() => handleSort("setNumber")} className="inline-flex items-center gap-1">
                          Set # {renderSortIndicator("setNumber")}
                        </button>
                      </th>
                      <th className="px-2 py-2 font-medium">
                        <button type="button" onClick={() => handleSort("weightKg")} className="inline-flex items-center gap-1">
                          {loadColumnLabel} {renderSortIndicator("weightKg")}
                        </button>
                      </th>
                      {assistance ? null : (
                        <th className="px-2 py-2 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort("totalKg")}
                            className="inline-flex items-center gap-1"
                            title="Loaded weight plus optional base weight for this exercise on that session."
                          >
                            Total (kg) {renderSortIndicator("totalKg")}
                          </button>
                        </th>
                      )}
                      <th className="px-2 py-2 font-medium">
                        <button type="button" onClick={() => handleSort("reps")} className="inline-flex items-center gap-1">
                          Reps {renderSortIndicator("reps")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTableRows.map((row, index) => (
                      (() => {
                        const rowKey = `${row.sessionId}-${row.setNumber}`;
                        const isTopRepsRow = rowKey === topRepsRowKey;
                        const isGoalRow = Boolean(row.goalLabel);
                        return (
                      <tr
                        key={`${row.sessionId}-${row.setNumber}-${index}`}
                        className={`cursor-pointer border-b last:border-b-0 ${historyRowSurfaceClass(isTopRepsRow, isGoalRow)}`}
                        onClick={() => router.push(`/sessions/${row.sessionId}`)}
                        title={historyRowTitle(row, isTopRepsRow)}
                      >
                        <td className="px-2 py-2">
                          <span className="inline-flex items-center gap-1">
                            {formatDateOnlyForLocale(row.performedOn)}
                            {isTopRepsRow ? (
                              <Medal className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                            ) : null}
                            {row.goalLabel ? <GoalReachedMark label={row.goalLabel} /> : null}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <SetKindIndicator isWarmup={row.isWarmup} density="default" />
                        </td>
                        <td className="px-2 py-2">{row.setNumber}</td>
                        <td className={`px-2 py-2 ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                          {row.weightKg ?? "-"}
                        </td>
                        {assistance ? null : (
                          <td className={`px-2 py-2 ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                            {row.totalKg.toFixed(1)}
                          </td>
                        )}
                        <td className={`px-2 py-2 ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                          {row.reps}
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
              </AppTable>
            )}
            {filteredHistoryRows.length > 0 ? (
              <HistoryPageNav
                page={historyPageIndex}
                totalPages={historyTotalPages}
                onPageChange={setHistoryPage}
              />
            ) : null}
            </section>
            </div>

            <div
              id={`${EXERCISE_DETAIL_A11Y_PREFIX}-panel-charts`}
              role="tabpanel"
              aria-labelledby={`${EXERCISE_DETAIL_A11Y_PREFIX}-tab-charts`}
              hidden={detailPanelTab !== "charts"}
              className="flex flex-col gap-4"
            >
            <section
              className={panelInsetClass("p-4 sm:p-5")}
              aria-labelledby="exercise-detail-chart-heading"
            >
              <div className="flex items-center gap-2">
                <SectionHeading id="exercise-detail-chart-heading" className="min-w-0 flex-1">
                  Weight by session
                </SectionHeading>
                <InfoPopover label="How this chart works">
                  <div className="space-y-2">
                    {assistance ? (
                      <p>
                        Each point uses the hardest working set by assistance in that session. The chart
                        shows Assistance (kg). Blank or 0 is unassisted bodyweight. Warmups are omitted.
                      </p>
                    ) : (
                      <>
                        <p>
                          Total (kg) matches set history: loaded plus that session’s base for this
                          exercise. Each point uses the hardest working set that has a logged load (same
                          idea as your max-total stat).
                        </p>
                        <p>
                          The line starts on Loaded (kg). Switch to Total or Both to include the base.
                          Warmups and sets with no logged weight are omitted. Tap or hover a point for
                          loaded, total, and base together.
                        </p>
                      </>
                    )}
                  </div>
                </InfoPopover>
              </div>
              <div className="mt-3">
                <ExerciseWeightProgressChart
                  points={sessionWeightChartPoints}
                  assistance={assistance}
                />
              </div>
            </section>

            <section
              className={panelInsetClass("p-4 sm:p-5")}
              aria-labelledby="exercise-detail-e1rm-heading"
            >
              <div className="flex items-center gap-2">
                <SectionHeading id="exercise-detail-e1rm-heading" className="min-w-0 flex-1">
                  Estimated one-rep max (1RM)
                </SectionHeading>
                <InfoPopover label="How estimated one-rep max works">
                  <div className="space-y-2">
                    {assistance ? (
                      <p>
                        Assistance is counterweight help, not load moved. Estimated 1RM is not
                        calculated for Assisted Dip or Assisted Pull-Up.
                      </p>
                    ) : (
                      <>
                        <p>
                          Each point is one workout session. The value is the highest estimated 1RM
                          from a <span className="font-medium">working set</span> with a logged load
                          and 12 reps or fewer, using Total (kg) and the Epley formula. It is not a
                          tested max.
                        </p>
                        <p>
                          Warmups and sets above 12 reps are excluded. Tap or hover a point for the
                          set that produced the estimate.
                        </p>
                      </>
                    )}
                  </div>
                </InfoPopover>
              </div>
              <div className="mt-3">
                {assistance ? (
                  <p className="text-sm text-zinc-600">
                    Assistance is not used for estimated 1RM, so there is nothing to plot.
                  </p>
                ) : (
                  <ExerciseSessionE1rmChart points={sessionE1rmChartPoints} />
                )}
              </div>
            </section>

            <section
              className={panelInsetClass("p-4 sm:p-5")}
              aria-labelledby="exercise-detail-volume-heading"
            >
              <div className="flex items-center gap-2">
                <SectionHeading id="exercise-detail-volume-heading" className="min-w-0 flex-1">
                  Session volume
                </SectionHeading>
                <InfoPopover label="How session volume works">
                  <div className="space-y-2">
                    {assistance ? (
                      <p>
                        Assistance is counterweight help, not load moved. Session volume is not
                        calculated for Assisted Dip or Assisted Pull-Up.
                      </p>
                    ) : (
                      <>
                        <p>
                          Each point is one workout session. Volume is the sum of reps × Total (kg) on
                          the bar for every <span className="font-medium">working set</span> with a
                          logged load—same Total (kg) as set history (loaded plus base for that
                          session).
                        </p>
                        <p>
                          Warmup sets are excluded. Sets without a logged weight are not counted. Tap
                          or hover a point for session totals.
                        </p>
                      </>
                    )}
                  </div>
                </InfoPopover>
              </div>
              <div className="mt-3">
                {assistance ? (
                  <p className="text-sm text-zinc-600">
                    Assistance is not counted as training volume, so there is nothing to plot.
                  </p>
                ) : (
                  <ExerciseSessionVolumeChart points={sessionVolumeChartPoints} />
                )}
              </div>
            </section>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
