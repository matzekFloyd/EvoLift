"use client";

import { FilterX, Play, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, ActionLink } from "@/app/components/action-button";
import { CollapsibleSection } from "@/app/components/collapsible-section";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { DateRangeFields } from "@/app/components/date-range-fields";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { ActivePlanPanel } from "@/app/components/active-plan-panel";
import { NewSessionDraftCallout } from "@/app/components/new-session-draft-callout";
import { SessionsTable, type SessionsTableRow } from "@/app/components/sessions-table";
import { ActivityDaySessionDialog } from "@/app/components/activity-day-session-dialog";
import {
  applyDateRangePreset,
  markedDateRangePreset,
  openingDateRange,
  pastWorkoutsAllDateRange,
} from "@/app/components/date-range-presets";
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
import {
  homeDraftIsFocal,
  homeForwardActionClassName,
  homeHeaderAddVariant,
  homeInProgressCtaVariant,
  homePlanIsFocal,
  homeSessionTableStartsOpen,
} from "@/app/home-next-action-layout";
import { HOME_PAST_WORKOUT_PLACEHOLDER_ROWS } from "@/app/home-loading-layout";
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
  const presetToday = useMemo(() => new Date(), []);
  const defaultDateRange = useMemo(() => openingDateRange(presetToday), [presetToday]);
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
  const [planOwnsForwardAction, setPlanOwnsForwardAction] = useState(true);
  const [draftVisible, setDraftVisible] = useState(false);
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

  const { inProgressSessions, historySessions } = useMemo(() => {
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
      historySessions: partitioned.history.map((item) => item.row),
    };
  }, [sessions, todayYyyyMmDd]);

  const planOpenSessionIdSet = useMemo(() => new Set(planOpenSessionIds), [planOpenSessionIds]);
  const standaloneInProgressSessions = useMemo(
    () => inProgressSessions.filter((session) => !planOpenSessionIdSet.has(session.id)),
    [inProgressSessions, planOpenSessionIdSet],
  );

  const handlePlanOwnsForwardAction = useCallback((owns: boolean) => {
    setPlanOwnsForwardAction((prev) => (prev === owns ? prev : owns));
  }, []);

  const handleDraftVisible = useCallback((visible: boolean) => {
    setDraftVisible((prev) => (prev === visible ? prev : visible));
  }, []);

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

  const draftIsFocal = homeDraftIsFocal(draftVisible, standaloneInProgressSessions.length > 0);
  const planIsFocal = homePlanIsFocal({
    hasStandaloneInProgress: standaloneInProgressSessions.length > 0,
    draftIsFocal,
    planOwnsForwardAction,
  });
  const createSessionIsFocal =
    homeHeaderAddVariant({
      hasStandaloneInProgress: standaloneInProgressSessions.length > 0,
      draftIsFocal,
      planOwnsForwardAction,
    }) === "primary";
  const quietCreateSession = createSessionIsFocal
    ? null
    : { id: PRODUCT_TOUR_TARGET_IDS.createSession, href: appPath("/sessions/new") };
  const focalSession = standaloneInProgressSessions[0] ?? null;
  const laterInProgressSessions = standaloneInProgressSessions.slice(1);

  const pastRangeControls = (
    <DateRangeFields
      from={dateFrom}
      to={dateTo}
      max={todayYyyyMmDd}
      marked={markedDateRangePreset(dateFrom, dateTo, presetToday, pastWorkoutsAllDateRange)}
      onFromChange={setDateFrom}
      onToChange={setDateTo}
      onSelectRange={(range) => {
        const next = applyDateRangePreset(range, presetToday, pastWorkoutsAllDateRange);
        setDateFrom(next.from);
        setDateTo(next.to);
      }}
      trailing={
        <ActionButton
          type="button"
          onClick={() => {
            setDateFrom(defaultDateRange.from);
            setDateTo(defaultDateRange.to);
          }}
          disabled={dateFrom === defaultDateRange.from && dateTo === defaultDateRange.to}
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
  );

  return (
    <PageShell>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-medium text-zinc-800">Workout sessions</h1>
        {quietCreateSession ? (
          <Link
            id={quietCreateSession.id}
            href={quietCreateSession.href}
            className="shrink-0 text-sm font-medium text-zinc-800 underline-offset-2 hover:text-sky-800 hover:underline"
          >
            Create session
          </Link>
        ) : null}
      </div>
      {createSessionIsFocal ? (
        <section className="flex items-center justify-between gap-3 rounded-xl border border-sky-300 bg-sky-50 p-5">
          <p className="text-sm text-zinc-700">No workout in progress.</p>
          <ActionLink
            id={PRODUCT_TOUR_TARGET_IDS.createSession}
            href={appPath("/sessions/new")}
            variant="primary"
            size="md"
            className="shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create session
          </ActionLink>
        </section>
      ) : null}
      {userId ? (
        <NewSessionDraftCallout
          userId={userId}
          focal={draftIsFocal}
          onVisibleChange={handleDraftVisible}
        />
      ) : null}
      {focalSession ? (
        <section className="rounded-xl border border-sky-300 bg-sky-50 p-5" aria-label="In progress">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-zinc-600">In progress</p>
              <p className="mt-1 text-2xl font-medium tracking-tight text-zinc-900">
                {formatDateOnlyForLocale(focalSession.performed_on)}
              </p>
              {focalSession.notes?.trim() ? (
                <p className="mt-1 truncate text-sm text-zinc-700">{focalSession.notes.trim()}</p>
              ) : null}
            </div>
            <ActionButton
              type="button"
              variant={homeInProgressCtaVariant(true)}
              size="md"
              className={homeForwardActionClassName}
              disabled={openingSessionId === focalSession.id}
              onClick={() => openSession(focalSession.id)}
            >
              <Play className="h-4 w-4" aria-hidden />
              {openingSessionId === focalSession.id ? "Opening..." : "Continue"}
            </ActionButton>
          </div>
          {(exerciseBadgesBySessionId.get(focalSession.id) ?? []).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {(exerciseBadgesBySessionId.get(focalSession.id) ?? []).map((badge) => (
                <ExerciseBadgeChip
                  key={`${focalSession.id}-${badge.slug}`}
                  slug={badge.slug}
                  variant={homeExerciseBadgeTone(badge)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No exercises yet.</p>
          )}
          {laterInProgressSessions.length > 0 ? (
            <ul className="mt-4 space-y-2 border-t border-sky-200 pt-3">
              {laterInProgressSessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-zinc-800">
                    {formatDateOnlyForLocale(session.performed_on)}
                  </p>
                  <ActionButton
                    type="button"
                    variant={homeInProgressCtaVariant(false)}
                    iconColor="sky"
                    size="sm"
                    disabled={openingSessionId === session.id}
                    onClick={() => openSession(session.id)}
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden />
                    {openingSessionId === session.id ? "Opening..." : "Continue"}
                  </ActionButton>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      <ActivePlanPanel
        forwardActionTaken={!planIsFocal && planOwnsForwardAction}
        openingSessionId={openingSessionId}
        onOpenSession={openSession}
        onPlanOpenSessionIdsChange={handlePlanOpenSessionIdsChange}
        onForwardActionChange={handlePlanOwnsForwardAction}
      />
      <section className="space-y-3" aria-busy={isChecking}>
        {sessionsError ? (
          <div className="space-y-3">
            <SectionHeading>Past workouts</SectionHeading>
            <StatusNotice message={sessionsError} tone="error" />
          </div>
        ) : (
          <div className="space-y-3">
            <SectionHeading>Past workouts</SectionHeading>
            {isChecking && workoutActivityData.length === 0 ? (
              <p className="text-sm text-zinc-500">Loading workouts...</p>
            ) : (
              <WorkoutActivityChart
                data={workoutActivityData}
                highlightedDates={highlightedActivityDates}
                onHighlightDatesChange={setHighlightedActivityDates}
                goalReachedByDate={goalReachedByDate}
                onDayClick={openActivityDay}
              />
            )}
            {pastRangeControls}
            <CollapsibleSection
              title="Sessions"
              inset={false}
              titleTone="chrome"
              defaultOpen={homeSessionTableStartsOpen()}
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
