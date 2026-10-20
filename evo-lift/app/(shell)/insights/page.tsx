"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarRange,
  ChartLine,
  Dumbbell,
  FilterX,
  Gauge,
  Hash,
  Weight,
} from "lucide-react";
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
import { ExerciseProgressPanel } from "@/app/components/exercise-progress-panel";
import { InsightsCompoundE1rmChart } from "@/app/components/insights-compound-e1rm-chart";
import { LiftComparisonPanel } from "@/app/components/lift-comparison-panel";
import { PersonalBestsPanel } from "@/app/components/personal-bests-panel";
import { InsightsWeeklyVolumeChart } from "@/app/components/insights-weekly-volume-chart";
import { DateInput } from "@/app/components/date-input";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { buildExerciseProgressReport, type LifterProfile } from "@/lib/exercise-progress-insights";
import { buildInsightsComparisonSentence } from "@/lib/insights-chart-summary";
import { buildInsightsCompoundE1rmSeries } from "@/lib/insights-compound-e1rm";
import { resolveLifterAge } from "@/lib/body-metrics";
import { loadExerciseMetadata } from "@/lib/exercise-metadata-cache";
import {
  applyInsightsRange,
  loadCachedInsightsHistory,
  loadUserStrengthProfile,
  peekInsightsHistory,
  type ExerciseWorkingSetSample,
  type InsightsRange,
  type WeeklyVolumePoint,
  type WorkoutActivityPoint,
} from "@/lib/insights-data";
import { buildPersonalBestRows } from "@/lib/personal-bests";
import { withWeeklyMovingAverage } from "@/app/insights/insights-weekly-chart-data";
import { getInsightsPresetRange } from "@/app/insights/insights-presets";
import { getTodayYyyyMmDd } from "@/lib/session-date";

type RangeOption = {
  value: InsightsRange;
  label: string;
};

const rangeOptions: RangeOption[] = [
  { value: "4w", label: "4w" },
  { value: "12w", label: "12w" },
  { value: "6m", label: "6m" },
  { value: "all", label: "All" },
];
const defaultInsightsRange: InsightsRange = "12w";

/** Grey inset fill for summary KPI panels on the white Insights panel. */
const insightsKpiClassName =
  "border-zinc-200 bg-zinc-50/80 shadow-none hover:shadow-none";

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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<InsightsRange>(defaultInsightsRange);
  const [dateFrom, setDateFrom] = useState(() => getInsightsPresetRange(defaultInsightsRange, new Date()).from);
  const [dateTo, setDateTo] = useState(() => getInsightsPresetRange(defaultInsightsRange, new Date()).to);
  const [basePoints, setBasePoints] = useState<WorkoutActivityPoint[]>([]);
  const [weeklyVolumeBase, setWeeklyVolumeBase] = useState<WeeklyVolumePoint[]>([]);
  const [exerciseSets, setExerciseSets] = useState<ExerciseWorkingSetSample[]>([]);
  const [catalogExercises, setCatalogExercises] = useState<
    Array<{ id: string; slug: string; label: string }>
  >([]);
  const [hideEmptyPersonalBests, setHideEmptyPersonalBests] = useState(true);
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
        const [history, profile, catalog] = await Promise.all([
          loadCachedInsightsHistory(supabaseBrowserClient, session.user.id, historyWindow, {
            fresh: mode === "refresh",
          }),
          loadUserStrengthProfile(supabaseBrowserClient, session.user.id),
          loadExerciseMetadata(supabaseBrowserClient, { ttlMs: 5 * 60 * 1000 }),
        ]);
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

  const rangedPoints = useMemo(
    () => applyInsightsRange(basePoints, selectedRange),
    [basePoints, selectedRange],
  );

  const filteredPoints = useMemo(
    () =>
      rangedPoints.filter((point) => {
        if (dateFrom && point.date < dateFrom) {
          return false;
        }
        if (dateTo && point.date > dateTo) {
          return false;
        }
        return true;
      }),
    [dateFrom, dateTo, rangedPoints],
  );

  const summary = useMemo(() => {
    const workouts = filteredPoints.reduce((sum, item) => sum + item.workouts, 0);
    const sets = filteredPoints.reduce((sum, item) => sum + item.sets, 0);
    const loadedKg = filteredPoints.reduce((sum, item) => sum + item.loadedKg, 0);
    return { workouts, sets, loadedKg };
  }, [filteredPoints]);

  const weeklyVolumeRanged = useMemo(() => {
    const asDailyPoints = weeklyVolumeBase.map((item) => ({
      date: item.weekStart,
      workouts: item.sessionCount,
      sets: item.workingSets,
      loadedKg: item.volumeKg,
    }));
    const ranged = applyInsightsRange(asDailyPoints, selectedRange);
    const rangedDates = new Set(ranged.map((item) => item.date));
    return weeklyVolumeBase.filter((item) => rangedDates.has(item.weekStart));
  }, [selectedRange, weeklyVolumeBase]);

  const weeklyVolumeFiltered = useMemo(
    () =>
      weeklyVolumeRanged.filter((point) => {
        if (dateFrom && point.weekStart < dateFrom) {
          return false;
        }
        if (dateTo && point.weekStart > dateTo) {
          return false;
        }
        return true;
      }),
    [dateFrom, dateTo, weeklyVolumeRanged],
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

  const comparisonPeriodName = useMemo(() => {
    if (!dateFrom || !dateTo) {
      return null;
    }
    const preset = getInsightsPresetRange(selectedRange, new Date());
    if (dateFrom !== preset.from || dateTo !== preset.to) {
      return null;
    }
    if (selectedRange === "4w") {
      return "4 weeks";
    }
    if (selectedRange === "12w") {
      return "12 weeks";
    }
    if (selectedRange === "6m") {
      return "6 months";
    }
    return null;
  }, [dateFrom, dateTo, selectedRange]);

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

  const exerciseProgress = useMemo(
    () => buildExerciseProgressReport(exerciseSets, { from: dateFrom, to: dateTo }, lifterProfile),
    [dateFrom, dateTo, exerciseSets, lifterProfile],
  );

  const compoundE1rmSeries = useMemo(() => {
    const inRange = exerciseSets.filter((sample) => {
      if (dateFrom && sample.performedOn < dateFrom) {
        return false;
      }
      if (dateTo && sample.performedOn > dateTo) {
        return false;
      }
      return true;
    });
    return buildInsightsCompoundE1rmSeries(inRange);
  }, [dateFrom, dateTo, exerciseSets]);

  const personalBestRows = useMemo(
    () =>
      buildPersonalBestRows(catalogExercises, exerciseSets, {
        hideEmpty: hideEmptyPersonalBests,
      }),
    [catalogExercises, exerciseSets, hideEmptyPersonalBests],
  );

  const hasTrendChartData = weeklyVolumeFiltered.length > 0;

  return (
    <PageShell>
      <section>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-6 w-6 text-sky-700" />
          Insights
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          See which lifts are moving, and which ones have more room than a steady rate.
        </p>
      </section>

      <section className="panel space-y-3 p-5">
        <CollapsibleSection title="Date filter" icon={<CalendarRange />} alwaysOpen>
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <label className="block text-xs font-medium text-zinc-600">
                From
                <DateInput
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  max={todayYyyyMmDd}
                  className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                To
                <DateInput
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  max={todayYyyyMmDd}
                  className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                />
              </label>
              <div>
                <p className="text-xs font-medium text-zinc-600">Range</p>
                <div className="mt-1 grid w-full grid-cols-4 gap-1 rounded-md border border-zinc-300 bg-white p-1 sm:inline-flex sm:w-auto">
                  {rangeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSelectedRange(option.value);
                        const preset = getInsightsPresetRange(option.value, new Date());
                        setDateFrom(preset.from);
                        setDateTo(preset.to);
                      }}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        selectedRange === option.value
                          ? "bg-sky-100 text-sky-900"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ActionButton
              type="button"
              onClick={() => {
                setSelectedRange("all");
                setDateFrom("");
                setDateTo("");
              }}
              disabled={selectedRange === "all" && dateFrom === "" && dateTo === ""}
              variant="secondary"
              size="sm"
              className="mt-1 w-full text-sm font-normal text-amber-800 hover:text-amber-900 sm:mt-0 sm:w-auto sm:self-end"
              iconColor="amber"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear filters
            </ActionButton>
          </div>
        </CollapsibleSection>
      </section>

      <section className="panel p-5">
        <SectionHeading className="inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          Workouts, sets & volume
        </SectionHeading>
        {errorMessage ? (
          <StatusNotice message={errorMessage} tone="error" className="mt-3" />
        ) : isLoading ? (
          <div className="mt-3 space-y-3">
            <ContentPlaceholder
              label="Loading insights..."
              rows={INSIGHTS_KPI_PLACEHOLDER_COUNT}
              rowClassName={INSIGHTS_KPI_PLACEHOLDER_CLASS}
              barsClassName="grid gap-2 sm:grid-cols-3"
            />
            <ContentPlaceholder rowClassName={INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS} />
          </div>
        ) : filteredPoints.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            No workout data in this range yet. Log sessions to unlock insights.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <KpiBadge
                label="Workouts"
                value={String(summary.workouts)}
                icon={<Dumbbell className="h-4 w-4 text-zinc-600" />}
                description="Total workout sessions in the selected filter window."
                tone="neutral"
                className={insightsKpiClassName}
              />
              <KpiBadge
                label="Sets"
                value={String(summary.sets)}
                icon={<Hash className="h-4 w-4 text-zinc-600" />}
                description="Total logged sets in the selected filter window."
                tone="neutral"
                className={insightsKpiClassName}
              />
              <KpiBadge
                label="Volume (kg)"
                value={summary.loadedKg.toFixed(1)}
                icon={<Weight className="h-4 w-4 text-zinc-600" />}
                description="Total weekly training volume (loaded kg × reps) in the selected filter window."
                tone="neutral"
                className={insightsKpiClassName}
              />
            </div>
            <ExerciseProgressPanel report={exerciseProgress} />
            <CollapsibleSection
              title="Estimated one-rep max (1RM)"
              icon={<Gauge />}
              defaultOpen={false}
            >
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
            <PersonalBestsPanel
              rows={personalBestRows}
              hideEmpty={hideEmptyPersonalBests}
              onHideEmptyChange={setHideEmptyPersonalBests}
            />
            <CollapsibleSection
              title="Weekly sessions, volume & sets"
              icon={<ChartLine />}
              defaultOpen={false}
            >
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
