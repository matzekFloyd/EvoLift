"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterX } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  INSIGHTS_KPI_PLACEHOLDER_CLASS,
  INSIGHTS_KPI_PLACEHOLDER_COUNT,
  INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS,
} from "@/app/components/content-placeholder-layout";
import { CollapsibleSection } from "@/app/components/collapsible-section";
import { KpiBadge } from "@/app/components/kpi-badge";
import { kpiBadgeTone } from "@/app/components/kpi-badge-tone";
import { ExerciseProgressPanel } from "@/app/components/exercise-progress-panel";
import {
  InsightsCompoundE1rmChart,
  InsightsWeeklyVolumeChart,
} from "@/app/components/chart-dynamic";
import { LiftComparisonPanel } from "@/app/components/lift-comparison-panel";
import { PersonalBestsPanel } from "@/app/components/personal-bests-panel";
import { applyDateRangePreset } from "@/app/components/date-range-presets";
import { DateRangeFields } from "@/app/components/date-range-fields";
import { PageShell } from "@/app/components/page-shell";
import { PanelInset } from "@/app/components/panel-inset";
import { StatusNotice } from "@/app/components/status-notice";
import { PRODUCT_TOUR_TARGET_IDS } from "@/lib/product-tour";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { buildExerciseProgressReport, type LifterProfile } from "@/lib/exercise-progress-insights";
import { buildInsightsComparisonSentence } from "@/lib/insights-chart-summary";
import { visibleInsightExerciseSets } from "@/lib/hidden-exercise-lists";
import { buildInsightsCompoundE1rmSeries } from "@/lib/insights-compound-e1rm";
import { resolveLifterAge } from "@/lib/body-metrics";
import { loadExerciseMetadata } from "@/lib/exercise-metadata-cache";
import {
  loadCachedInsightsHistory,
  loadUserStrengthProfile,
  peekInsightsHistory,
  type ExerciseWorkingSetSample,
  type WeeklyVolumePoint,
  type WorkoutActivityPoint,
} from "@/lib/insights-data";
import { buildPersonalBestRows } from "@/lib/personal-bests";
import { withWeeklyMovingAverage } from "@/app/insights/insights-weekly-chart-data";
import {
  insightsClearFiltersDisabled,
  insightsComparisonPeriodName,
  insightsMarkedRange,
} from "@/app/insights/insights-range";
import { getInsightsPresetRange } from "@/app/insights/insights-presets";
import { getTodayYyyyMmDd } from "@/lib/session-date";

const defaultInsightsRange = "12w" as const;

const emptyLifterProfile: LifterProfile = {
  sex: null,
  bodyweightKg: null,
  bodyweightEntries: [],
  ageYears: null,
  ageIsApproximate: false,
};

export default function InsightsPage() {
  const router = useRouter();
  const todayYyyyMmDd = getTodayYyyyMmDd();
  const presetToday = useMemo(() => new Date(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(
    () => getInsightsPresetRange(defaultInsightsRange, presetToday).from,
  );
  const [dateTo, setDateTo] = useState(() => getInsightsPresetRange(defaultInsightsRange, presetToday).to);
  const [basePoints, setBasePoints] = useState<WorkoutActivityPoint[]>([]);
  const [weeklyVolumeBase, setWeeklyVolumeBase] = useState<WeeklyVolumePoint[]>([]);
  const [exerciseSets, setExerciseSets] = useState<ExerciseWorkingSetSample[]>([]);
  const [catalogExercises, setCatalogExercises] = useState<
    Array<{ id: string; slug: string; label: string }>
  >([]);
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(() => new Set());
  const [lifterProfile, setLifterProfile] = useState<LifterProfile>(emptyLifterProfile);
  const isMountedRef = useRef(true);
  const loadRequestRef = useRef(0);

  const loadInsights = useCallback(
    async (mode: "initial" | "refresh") => {
      const requestId = ++loadRequestRef.current;
      const session = await getBrowserAuthSession();
      if (!isMountedRef.current) {
        return;
      }
      if (!session) {
        if (mode === "initial") {
          setIsLoading(false);
        }
        router.replace("/login");
        return;
      }

      const historyWindow = { from: dateFrom, to: dateTo };
      const cached = mode === "refresh" ? null : peekInsightsHistory(session.user.id, historyWindow);
      if (mode === "initial" && !cached) {
        setIsLoading(true);
      }

      try {
        const [history, profile, catalog, hiddenResult] = await Promise.all([
          loadCachedInsightsHistory(supabaseBrowserClient, session.user.id, historyWindow, {
            fresh: mode === "refresh",
          }),
          loadUserStrengthProfile(supabaseBrowserClient, session.user.id),
          loadExerciseMetadata(supabaseBrowserClient, { ttlMs: 5 * 60 * 1000 }),
          supabaseBrowserClient
            .from("user_hidden_exercises")
            .select("exercise_id")
            .eq("user_id", session.user.id),
        ]);
        if (hiddenResult.error) {
          throw new Error("Could not load exercise visibility.");
        }
        const points = history.activity;
        const weekly = history.weekly;
        const sets = history.exerciseSets;
        if (!isMountedRef.current || requestId !== loadRequestRef.current) {
          return;
        }
        const age = resolveLifterAge({
          dateOfBirth: profile.dateOfBirth,
          birthYear: profile.birthYear,
        });
        setBasePoints(points);
        setWeeklyVolumeBase(weekly);
        setExerciseSets(sets);
        setCatalogExercises(catalog.map((row) => ({ id: row.id, slug: row.slug, label: row.label })));
        setHiddenExerciseIds(new Set((hiddenResult.data ?? []).map((row) => row.exercise_id)));
        setLifterProfile({
          sex: profile.sex,
          bodyweightKg: profile.bodyweightKg,
          bodyweightEntries: profile.bodyweightEntries,
          ageYears: age?.ageYears ?? null,
          ageIsApproximate: age?.ageIsApproximate ?? false,
        });
        setErrorMessage(null);
      } catch (error) {
        if (!isMountedRef.current || requestId !== loadRequestRef.current) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Could not load insights.");
      } finally {
        if (isMountedRef.current && requestId === loadRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [dateFrom, dateTo, router],
  );

  useEffect(() => {
    isMountedRef.current = true;
    void loadInsights("initial");
    return () => {
      isMountedRef.current = false;
    };
  }, [loadInsights]);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void loadInsights("refresh");
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadInsights("refresh");
      }
    }
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadInsights]);

  const filteredPoints = useMemo(
    () =>
      basePoints.filter((point) => {
        if (dateFrom && point.date < dateFrom) {
          return false;
        }
        if (dateTo && point.date > dateTo) {
          return false;
        }
        return true;
      }),
    [basePoints, dateFrom, dateTo],
  );

  const summary = useMemo(() => {
    const workouts = filteredPoints.reduce((sum, item) => sum + item.workouts, 0);
    const sets = filteredPoints.reduce((sum, item) => sum + item.sets, 0);
    const loadedKg = filteredPoints.reduce((sum, item) => sum + item.loadedKg, 0);
    return { workouts, sets, loadedKg };
  }, [filteredPoints]);

  const weeklyVolumeFiltered = useMemo(
    () =>
      weeklyVolumeBase.filter((point) => {
        if (dateFrom && point.weekStart < dateFrom) {
          return false;
        }
        if (dateTo && point.weekStart > dateTo) {
          return false;
        }
        return true;
      }),
    [dateFrom, dateTo, weeklyVolumeBase],
  );

  const sessionsChartData = useMemo(
    () => withWeeklyMovingAverage(weeklyVolumeFiltered, "sessions"),
    [weeklyVolumeFiltered],
  );

  const volumeChartData = useMemo(
    () => withWeeklyMovingAverage(weeklyVolumeFiltered, "volume"),
    [weeklyVolumeFiltered],
  );

  const workingSetsChartData = useMemo(
    () => withWeeklyMovingAverage(weeklyVolumeFiltered, "workingSets"),
    [weeklyVolumeFiltered],
  );

  const comparisonPeriodName = useMemo(
    () => insightsComparisonPeriodName(dateFrom, dateTo, presetToday),
    [dateFrom, dateTo, presetToday],
  );

  const sessionsComparisonSentence = useMemo(
    () =>
      buildInsightsComparisonSentence({
        metric: "sessions",
        currentWeeks: weeklyVolumeFiltered,
        allWeeks: weeklyVolumeBase,
        dateFrom,
        dateTo,
        periodName: comparisonPeriodName,
      }),
    [comparisonPeriodName, dateFrom, dateTo, weeklyVolumeBase, weeklyVolumeFiltered],
  );

  const volumeComparisonSentence = useMemo(
    () =>
      buildInsightsComparisonSentence({
        metric: "volume",
        currentWeeks: weeklyVolumeFiltered,
        allWeeks: weeklyVolumeBase,
        dateFrom,
        dateTo,
        periodName: comparisonPeriodName,
      }),
    [comparisonPeriodName, dateFrom, dateTo, weeklyVolumeBase, weeklyVolumeFiltered],
  );

  const workingSetsComparisonSentence = useMemo(
    () =>
      buildInsightsComparisonSentence({
        metric: "workingSets",
        currentWeeks: weeklyVolumeFiltered,
        allWeeks: weeklyVolumeBase,
        dateFrom,
        dateTo,
        periodName: comparisonPeriodName,
      }),
    [comparisonPeriodName, dateFrom, dateTo, weeklyVolumeBase, weeklyVolumeFiltered],
  );

  const listedExerciseSets = useMemo(
    () => visibleInsightExerciseSets(exerciseSets, hiddenExerciseIds),
    [exerciseSets, hiddenExerciseIds],
  );

  const exerciseProgress = useMemo(
    () => buildExerciseProgressReport(listedExerciseSets, { from: dateFrom, to: dateTo }, lifterProfile),
    [dateFrom, dateTo, listedExerciseSets, lifterProfile],
  );

  const compoundE1rmSeries = useMemo(() => {
    const inRange = listedExerciseSets.filter((sample) => {
      if (dateFrom && sample.performedOn < dateFrom) {
        return false;
      }
      if (dateTo && sample.performedOn > dateTo) {
        return false;
      }
      return true;
    });
    return buildInsightsCompoundE1rmSeries(inRange);
  }, [dateFrom, dateTo, listedExerciseSets]);

  const personalBestRows = useMemo(
    () =>
      buildPersonalBestRows(catalogExercises, listedExerciseSets),
    [catalogExercises, listedExerciseSets],
  );

  const hasTrendChartData = weeklyVolumeFiltered.length > 0;

  return (
    <PageShell>
      <section id={PRODUCT_TOUR_TARGET_IDS.insights}>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-zinc-600">
          See which lifts are moving, and which ones have more room than a steady rate.
        </p>
      </section>

      <section className="panel flex min-w-0 flex-col gap-4 p-5">
        <PanelInset className="p-3 sm:p-4">
          <DateRangeFields
            from={dateFrom}
            to={dateTo}
            max={todayYyyyMmDd}
            marked={insightsMarkedRange(dateFrom, dateTo, presetToday)}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onSelectRange={(range) => {
              const next = applyDateRangePreset(range, presetToday, getInsightsPresetRange("all", presetToday));
              setDateFrom(next.from);
              setDateTo(next.to);
            }}
            trailing={
              <ActionButton
                type="button"
                onClick={() => {
                  const next = getInsightsPresetRange("all", presetToday);
                  setDateFrom(next.from);
                  setDateTo(next.to);
                }}
                disabled={insightsClearFiltersDisabled(dateFrom, dateTo, presetToday)}
                variant="secondary"
                size="sm"
                className="text-sm font-normal text-amber-800 hover:text-amber-900"
                iconColor="amber"
              >
                <FilterX className="h-3.5 w-3.5" aria-hidden />
                Clear filters
              </ActionButton>
            }
          />
        </PanelInset>
        {errorMessage ? (
          <StatusNotice message={errorMessage} tone="error" />
        ) : isLoading ? (
          <div className="space-y-3">
            <ContentPlaceholder
              label="Loading insights..."
              rows={INSIGHTS_KPI_PLACEHOLDER_COUNT}
              rowClassName={INSIGHTS_KPI_PLACEHOLDER_CLASS}
              barsClassName="grid gap-2 sm:grid-cols-3"
            />
            <ContentPlaceholder rowClassName={INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS} />
          </div>
        ) : filteredPoints.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No workout data in this range yet. Log sessions to unlock insights.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <KpiBadge
                label="Workouts"
                value={String(summary.workouts)}
                description="Total workout sessions in the selected filter window."
                tone={kpiBadgeTone("count")}
              />
              <KpiBadge
                label="Sets"
                value={String(summary.sets)}
                description="Total logged sets in the selected filter window."
                tone={kpiBadgeTone("count")}
              />
              <KpiBadge
                label="Volume (kg)"
                value={summary.loadedKg.toFixed(1)}
                description="Total weekly training volume (loaded kg × reps) in the selected filter window."
                tone={kpiBadgeTone("count")}
              />
            </div>
            <ExerciseProgressPanel report={exerciseProgress} defaultOpen />
            <CollapsibleSection title="Estimated one-rep max (1RM)" defaultOpen={false}>
              <p className="text-sm text-zinc-800">
                Best estimated 1RM per session for Barbell Back Squat, Bench Press, Deadlift, and
                Overhead Press.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Epley on Total (kg), working sets of 12 reps or fewer. Not a tested max. Open an
                exercise for the full chart.
              </p>
              <div className="mt-3">
                <InsightsCompoundE1rmChart series={compoundE1rmSeries} />
              </div>
            </CollapsibleSection>
            <LiftComparisonPanel report={exerciseProgress} />
            <PersonalBestsPanel rows={personalBestRows} />
            <CollapsibleSection title="Weekly sessions, volume & sets" defaultOpen={false}>
              {!hasTrendChartData ? (
                <p className="text-xs text-zinc-500">
                  No qualifying session, volume, or working set data for the current filters yet.
                </p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Sessions</p>
                    <p className="mt-1 text-sm text-zinc-800">{sessionsComparisonSentence}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Workout sessions per week. The line is a 4-week average.
                    </p>
                    <div className="mt-3">
                      <InsightsWeeklyVolumeChart data={sessionsChartData} metric="sessions" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Volume</p>
                    <p className="mt-1 text-sm text-zinc-800">{volumeComparisonSentence}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Weekly total of loaded kg × reps. The line is a 4-week average.
                    </p>
                    <div className="mt-3">
                      <InsightsWeeklyVolumeChart data={volumeChartData} metric="volume" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Working sets</p>
                    <p className="mt-1 text-sm text-zinc-800">{workingSetsComparisonSentence}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Weekly working sets, warmups excluded. The line is a 4-week average.
                    </p>
                    <div className="mt-3">
                      <InsightsWeeklyVolumeChart data={workingSetsChartData} metric="workingSets" />
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}
      </section>
    </PageShell>
  );
}
