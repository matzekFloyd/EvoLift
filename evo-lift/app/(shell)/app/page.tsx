"use client";

import { FilterX, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { CollapsibleSection } from "@/app/components/collapsible-section";
import { PageAddAction } from "@/app/components/page-add-action";
import { DateInput } from "@/app/components/date-input";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { ActivePlanPanel } from "@/app/components/active-plan-panel";
import { NewSessionDraftCallout } from "@/app/components/new-session-draft-callout";
import { SessionsTable, type SessionsTableRow } from "@/app/components/sessions-table";
import { ActivityDaySessionDialog } from "@/app/components/activity-day-session-dialog";
import { WorkoutActivityChart } from "@/app/components/chart-dynamic";
import { activityDayOpen, activityDaySessionIds } from "@/app/home-activity-day";
import { sessionDetailExercisePath } from "@/app/sessions/[id]/session-detail-query";
import { appPath } from "@/lib/app-paths";
import { PRODUCT_TOUR_TARGET_IDS } from "@/lib/product-tour";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { loadGoalReachedSessionDates } from "@/lib/goal-reached-dates";
import {
  loadHomeSessionSummaries,
  peekHomeSessionSummaries,
  type HomeSessionSummaryRow,
} from "@/lib/home-session-cache";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { homeExerciseBadgeTone, homeExerciseBadges, homeSetCount } from "@/app/home-sessions";
import { getDefaultHomeDateRange } from "@/app/home-date-range";
import {
  homeCompetingCtaVariant,
  homeSessionTableStartsOpen,
} from "@/app/home-next-action-layout";
import { HOME_PAST_WORKOUT_PLACEHOLDER_ROWS } from "@/app/home-loading-layout";
import type { ScheduledHomeSession } from "@/app/home-scheduled-sessions";
import {
  formatDateToYyyyMmDd,
  getTodayYyyyMmDd,
  normalizeSessionDateOnly,
} from "@/lib/session-date";
import { partitionHomeSessions } from "@/lib/session-lifecycle";

type WorkoutSessionRow = {
  id: string;
  performed_on: string;
  notes: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type SessionExerciseBadge = {
  slug: string;
  hasLoggedSet: boolean;
  skipped: boolean;
};

function homeView(loadedSessions: HomeSessionSummaryRow[]) {
  const sessions = loadedSessions.map((row) => ({
    id: row.id,
    performed_on: row.performed_on,
    notes: row.notes,
    created_at: row.created_at,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
  }));
  const setCountBySessionId = new Map<string, number>();
  const exerciseBadgesBySessionId = new Map<string, SessionExerciseBadge[]>();
  for (const row of loadedSessions) {
    setCountBySessionId.set(row.id, homeSetCount(row.set_count));
    exerciseBadgesBySessionId.set(row.id, homeExerciseBadges(row.exercise_badges));
  }
  return { sessions, setCountBySessionId, exerciseBadgesBySessionId };
}

function initialHomeView() {
  const userId = rememberedUserId();
  if (!userId) {
    return null;
  }
  const cached = peekHomeSessionSummaries(userId);
  if (!cached) {
    return null;
  }
  return { userId, ...homeView(cached.rows) };
}

export default function Home() {
  const router = useRouter();
  const todayYyyyMmDd = getTodayYyyyMmDd();
  const defaultDateRange = useMemo(() => getDefaultHomeDateRange(new Date()), []);
  const [cachedHome] = useState(initialHomeView);
  const [isSmallPhone, setIsSmallPhone] = useState(false);
  const [isChecking, setIsChecking] = useState(cachedHome == null);
  const [sessions, setSessions] = useState<WorkoutSessionRow[]>(cachedHome?.sessions ?? []);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from);
  const [dateTo, setDateTo] = useState(defaultDateRange.to);
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null);
  const [highlightedActivityDates, setHighlightedActivityDates] = useState<string[] | null>(null);
  const [dayChoiceIds, setDayChoiceIds] = useState<string[] | null>(null);
  const [exerciseBadgesBySessionId, setExerciseBadgesBySessionId] = useState<
    Map<string, SessionExerciseBadge[]>
  >(cachedHome?.exerciseBadgesBySessionId ?? new Map());
  const [setCountBySessionId, setSetCountBySessionId] = useState<Map<string, number>>(
    cachedHome?.setCountBySessionId ?? new Map(),
  );
  const [userId, setUserId] = useState<string | null>(cachedHome?.userId ?? null);
  const [goalReachedByDate, setGoalReachedByDate] = useState<Record<string, string>>({});
  const [planOpenSessionIds, setPlanOpenSessionIds] = useState<string[]>([]);
  const reloadHomeSessionsRef = useRef<() => void>(() => {});

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const visit = await confirmSignedInUser();

      if (!isMounted) {
        return;
      }

      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }

      setUserId(visit.userId);

      function applyHomeSummaries(loadedSessions: HomeSessionSummaryRow[]) {
        const view = homeView(loadedSessions);
        setSessions(view.sessions);
        setSetCountBySessionId(view.setCountBySessionId);
        setExerciseBadgesBySessionId(view.exerciseBadgesBySessionId);
        setSessionsError(null);
      }

      if (!visit.showCached) {
        setSessions([]);
        setSetCountBySessionId(new Map());
        setExerciseBadgesBySessionId(new Map());
        setIsChecking(true);
      }

      const goalDatesPromise = loadGoalReachedSessionDates(
        supabaseBrowserClient,
        visit.userId,
      ).catch(() => ({}));
      const cached = peekHomeSessionSummaries(visit.userId);
      if (cached && visit.showCached) {
        applyHomeSummaries(cached.rows);
        setIsChecking(false);
        if (cached.fresh) {
          const goalDates = await goalDatesPromise;
          if (isMounted) {
            setGoalReachedByDate(goalDates);
          }
          return;
        }
      }

      const [{ rows, error }, goalDates] = await Promise.all([
        loadHomeSessionSummaries(supabaseBrowserClient, visit.userId, {
          fresh: cached != null && visit.showCached,
        }),
        goalDatesPromise,
      ]);

      if (!isMounted) {
        return;
      }

      setGoalReachedByDate(goalDates);

      if (error) {
        if (!cached) {
          setSessionsError(error);
          setIsChecking(false);
        }
        return;
      }

      applyHomeSummaries(rows);
      setIsChecking(false);
    }

    reloadHomeSessionsRef.current = () => {
      void checkSession();
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        reloadHomeSessionsRef.current();
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        reloadHomeSessionsRef.current();
      }
    }
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const { inProgressSessions, plannedSessions, historySessions } = useMemo(() => {
    const partitioned = partitionHomeSessions(
      sessions.map((session) => ({
        id: session.id,
        performedOn: session.performed_on,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        row: session,
      })),
      todayYyyyMmDd,
    );
    return {
      inProgressSessions: partitioned.inProgress.map((item) => item.row),
      plannedSessions: partitioned.planned.map((item) => item.row),
      historySessions: partitioned.history.map((item) => item.row),
    };
  }, [sessions, todayYyyyMmDd]);

  const planOpenSessionIdSet = useMemo(() => new Set(planOpenSessionIds), [planOpenSessionIds]);
  const standaloneInProgressSessions = useMemo(
    () => inProgressSessions.filter((session) => !planOpenSessionIdSet.has(session.id)),
    [inProgressSessions, planOpenSessionIdSet],
  );

  const handlePlanOpenSessionIdsChange = useCallback((ids: string[]) => {
    const sorted = [...ids].sort();
    setPlanOpenSessionIds((prev) => {
      if (prev.length === sorted.length && prev.every((id, index) => id === sorted[index])) {
        return prev;
      }
      return sorted;
    });
  }, []);

  /** History plus open sessions for activity chart / day picker (not planned). */
  const activitySessions = useMemo(() => {
    return [...historySessions, ...inProgressSessions];
  }, [historySessions, inProgressSessions]);

  const filteredSessions = useMemo(() => {
    return activitySessions.filter((session) => {
      const performedOn = normalizeSessionDateOnly(session.performed_on);
      if (dateFrom && performedOn < dateFrom) {
        return false;
      }
      if (dateTo && performedOn > dateTo) {
        return false;
      }
      return true;
    });
  }, [activitySessions, dateFrom, dateTo]);

  const filteredHistorySessions = useMemo(() => {
    return historySessions.filter((session) => {
      const performedOn = normalizeSessionDateOnly(session.performed_on);
      if (dateFrom && performedOn < dateFrom) {
        return false;
      }
      if (dateTo && performedOn > dateTo) {
        return false;
      }
      return true;
    });
  }, [historySessions, dateFrom, dateTo]);

  const workoutActivityData = useMemo(() => {
    const chartSessions = filteredSessions.filter(
      (session) => normalizeSessionDateOnly(session.performed_on) <= todayYyyyMmDd,
    );
    const sortedCompletedDates = chartSessions
      .map((session) => normalizeSessionDateOnly(session.performed_on))
      .sort();
    const fallbackTo = todayYyyyMmDd;
    const fallbackFromDate = new Date(`${fallbackTo}T00:00:00`);
    fallbackFromDate.setDate(fallbackFromDate.getDate() - 26 * 7 + 1);
    const fallbackFrom = formatDateToYyyyMmDd(fallbackFromDate);
    const effectiveFrom = dateFrom || sortedCompletedDates[0] || fallbackFrom;
    const requestedTo = dateTo || sortedCompletedDates[sortedCompletedDates.length - 1] || fallbackTo;
    const effectiveTo = requestedTo > todayYyyyMmDd ? todayYyyyMmDd : requestedTo;
    if (!effectiveFrom || !effectiveTo) {
      return [];
    }

    const points: Array<{ date: string; workouts: number; sets: number }> = [];
    const current = new Date(`${effectiveFrom}T00:00:00`);
    const end = new Date(`${effectiveTo}T00:00:00`);
    const workoutsByDate = new Map<string, number>();
    const setsByDate = new Map<string, number>();
    for (const session of chartSessions) {
      const day = normalizeSessionDateOnly(session.performed_on);
      workoutsByDate.set(day, (workoutsByDate.get(day) ?? 0) + 1);
      setsByDate.set(day, (setsByDate.get(day) ?? 0) + (setCountBySessionId.get(session.id) ?? 0));
    }
    while (current <= end) {
      const day = formatDateToYyyyMmDd(current);
      points.push({
        date: day,
        workouts: workoutsByDate.get(day) ?? 0,
        sets: setsByDate.get(day) ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }
    return points;
  }, [dateFrom, dateTo, filteredSessions, setCountBySessionId, todayYyyyMmDd]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsSmallPhone(mediaQuery.matches);
    apply();
    const onChange = () => apply();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  const historyTableRows: SessionsTableRow[] = useMemo(
    () =>
      filteredHistorySessions.map((session) => ({
        id: session.id,
        performedOn: session.performed_on,
        notes: session.notes ?? "",
        isPlanned: false,
        badges: exerciseBadgesBySessionId.get(session.id) ?? [],
      })),
    [exerciseBadgesBySessionId, filteredHistorySessions],
  );

  function openSession(sessionId: string, exerciseId?: string | null) {
    if (openingSessionId) {
      return;
    }
    setDayChoiceIds(null);
    setOpeningSessionId(sessionId);
    router.push(appPath(sessionDetailExercisePath(sessionId, exerciseId ?? null)));
  }

  function openActivityDay(date: string) {
    const sessionIds = activityDaySessionIds(
      filteredSessions.map((session) => ({
        id: session.id,
        performedOn: session.performed_on,
        createdAt: session.created_at,
      })),
      date,
    );
    const target = activityDayOpen(sessionIds);
    if (target.kind === "session") {
      openSession(target.sessionId);
      return;
    }
    if (target.kind === "choose") {
      setDayChoiceIds(target.sessionIds);
    }
  }

  const dayChoiceSessions = useMemo(() => {
    if (!dayChoiceIds) {
      return [];
    }
    const rowById = new Map(
      filteredSessions.map((session) => [
        session.id,
        {
          id: session.id,
          notes: session.notes ?? "",
          badges: exerciseBadgesBySessionId.get(session.id) ?? [],
          performedOn: session.performed_on,
        },
      ]),
    );
    return dayChoiceIds.flatMap((id) => {
      const row = rowById.get(id);
      return row ? [row] : [];
    });
  }, [dayChoiceIds, exerciseBadgesBySessionId, filteredSessions]);

  const scheduledSessions: ScheduledHomeSession[] = useMemo(
    () =>
      plannedSessions.map((session) => ({
        id: session.id,
        performedOn: session.performed_on,
        notes: session.notes ?? "",
        badges: exerciseBadgesBySessionId.get(session.id) ?? [],
      })),
    [exerciseBadgesBySessionId, plannedSessions],
  );

  const pastRangeControls = (
    <div className="grid w-full grid-cols-2 items-end gap-2 sm:flex sm:w-auto sm:flex-nowrap">
      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600">
        <span>From</span>
        <DateInput
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          max={todayYyyyMmDd}
          className="w-full rounded-md border bg-white px-2 py-1 text-sm sm:w-[9.5rem]"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600">
        <span>To</span>
        <DateInput
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          max={todayYyyyMmDd}
          className="w-full rounded-md border bg-white px-2 py-1 text-sm sm:w-[9.5rem]"
        />
      </label>
      <ActionButton
        type="button"
        onClick={() => {
          setDateFrom(defaultDateRange.from);
          setDateTo(defaultDateRange.to);
        }}
        disabled={dateFrom === defaultDateRange.from && dateTo === defaultDateRange.to}
        variant="secondary"
        size="sm"
        className="col-span-2 w-full justify-center text-sm font-normal text-amber-800 hover:text-amber-900 sm:col-auto sm:w-auto sm:shrink-0"
        iconColor="amber"
      >
        <FilterX className="h-3.5 w-3.5" />
        Clear filters
      </ActionButton>
    </div>
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Workout sessions</h1>
        <PageAddAction
          id={PRODUCT_TOUR_TARGET_IDS.createSession}
          href={appPath("/sessions/new")}
          label="Create session"
          variant={homeCompetingCtaVariant(standaloneInProgressSessions.length > 0)}
        />
      </div>
      {userId ? <NewSessionDraftCallout userId={userId} /> : null}
      {standaloneInProgressSessions.length > 0 ? (
        <section className="panel p-5" aria-label="In progress">
          <div className="mb-2">
            <SectionHeading>In progress</SectionHeading>
          </div>
          <ul className="space-y-2">
            {standaloneInProgressSessions.map((session) => {
              const badges = exerciseBadgesBySessionId.get(session.id) ?? [];
              return (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {formatDateOnlyForLocale(session.performed_on)}
                    </p>
                    {session.notes?.trim() ? (
                      <p className="truncate text-xs text-zinc-600">{session.notes.trim()}</p>
                    ) : null}
                    {badges.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {badges.map((badge) => (
                          <ExerciseBadgeChip
                            key={`${session.id}-${badge.slug}`}
                            slug={badge.slug}
                            variant={homeExerciseBadgeTone(badge)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">No exercises yet.</p>
                    )}
                  </div>
                  <ActionButton
                    type="button"
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    disabled={openingSessionId === session.id}
                    onClick={() => openSession(session.id)}
                  >
                    <Play className="h-3.5 w-3.5 text-white" />
                    {openingSessionId === session.id ? "Opening..." : "Continue"}
                  </ActionButton>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <ActivePlanPanel
        scheduledSessions={scheduledSessions}
        hasStandaloneInProgress={standaloneInProgressSessions.length > 0}
        openingSessionId={openingSessionId}
        onOpenSession={openSession}
        onPlanOpenSessionIdsChange={handlePlanOpenSessionIdsChange}
      />
      <section className="panel p-5" aria-busy={isChecking}>
        {sessionsError ? (
          <p className="text-sm text-red-600">{sessionsError}</p>
        ) : (
          <div className="space-y-3">
            <SectionHeading>Past workouts</SectionHeading>
            {isChecking && workoutActivityData.length === 0 ? (
              <p className="text-sm text-zinc-500">Loading workouts...</p>
            ) : (
              <WorkoutActivityChart
                data={workoutActivityData}
                isCompactView={isSmallPhone}
                highlightedDates={highlightedActivityDates}
                onHighlightDatesChange={setHighlightedActivityDates}
                goalReachedByDate={goalReachedByDate}
                onDayClick={openActivityDay}
              />
            )}
            <div className="flex w-full flex-col sm:items-end">{pastRangeControls}</div>
            <CollapsibleSection
              key={isSmallPhone ? "sessions-compact" : "sessions-desktop"}
              title="Sessions"
              inset={false}
              titleTone="chrome"
              defaultOpen={homeSessionTableStartsOpen(isSmallPhone)}
            >
              {isChecking ? (
                <ContentPlaceholder
                  label="Loading workouts..."
                  rows={HOME_PAST_WORKOUT_PLACEHOLDER_ROWS}
                />
              ) : (
                <SessionsTable
                  rows={historyTableRows}
                  dateHeaderLabel="Performed on"
                  emptyMessage="No workout sessions in the selected timeframe."
                  showNotesColumn={!isSmallPhone}
                  compactMode={isSmallPhone}
                  openingRowId={openingSessionId}
                  highlightedPerformedOnDates={highlightedActivityDates}
                  goalReachedByDate={goalReachedByDate}
                  onOpenRow={openSession}
                />
              )}
            </CollapsibleSection>
          </div>
        )}
      </section>
      {dayChoiceSessions.length > 1 ? (
        <ActivityDaySessionDialog
          dateLabel={formatDateOnlyForLocale(dayChoiceSessions[0].performedOn)}
          sessions={dayChoiceSessions}
          onOpen={openSession}
          onClose={() => setDayChoiceIds(null)}
        />
      ) : null}
    </PageShell>
  );
}
