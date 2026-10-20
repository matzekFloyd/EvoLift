"use client";

import { CalendarClock, ClipboardList, FilterX, History, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { PageAddAction } from "@/app/components/page-add-action";
import { DateInput } from "@/app/components/date-input";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { PageShell } from "@/app/components/page-shell";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { ActivePlanPanel } from "@/app/components/active-plan-panel";
import { NewSessionDraftCallout } from "@/app/components/new-session-draft-callout";
import { SessionsTable, type SessionsTableRow } from "@/app/components/sessions-table";
import { ActivityDaySessionDialog } from "@/app/components/activity-day-session-dialog";
import { WorkoutActivityChart } from "@/app/components/workout-activity-chart";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { activityDayOpen, activityDaySessionIds } from "@/app/home-activity-day";
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
  HOME_PAST_WORKOUT_PLACEHOLDER_ROWS,
  HOME_UPCOMING_PLACEHOLDER_ROWS,
} from "@/app/home-loading-layout";
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

  const { inProgressSession, plannedSessions, historySessions } = useMemo(() => {
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
      inProgressSession: partitioned.inProgress?.row ?? null,
      plannedSessions: partitioned.planned.map((item) => item.row),
      historySessions: partitioned.history.map((item) => item.row),
    };
  }, [sessions, todayYyyyMmDd]);

  /** History plus in-progress for activity chart / day picker (not planned). */
  const activitySessions = useMemo(() => {
    const rows = [...historySessions];
    if (inProgressSession) {
      rows.push(inProgressSession);
    }
    return rows;
  }, [historySessions, inProgressSession]);

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

  const inProgressBadges = inProgressSession
    ? (exerciseBadgesBySessionId.get(inProgressSession.id) ?? [])
    : [];

  function openSession(sessionId: string) {
    if (openingSessionId) {
      return;
    }
    setDayChoiceIds(null);
    setOpeningSessionId(sessionId);
    router.push(`/sessions/${sessionId}`);
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

  const plannedTableRows: SessionsTableRow[] = useMemo(
    () =>
      plannedSessions.map((session) => ({
        id: session.id,
        performedOn: session.performed_on,
        notes: session.notes ?? "",
        isPlanned: true,
        badges: exerciseBadgesBySessionId.get(session.id) ?? [],
      })),
    [exerciseBadgesBySessionId, plannedSessions],
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="h-6 w-6 text-sky-700" />
          Workout sessions
        </h1>
        <PageAddAction href="/sessions/new" label="Create session" />
      </div>
      {userId ? <NewSessionDraftCallout userId={userId} /> : null}
      <ActivePlanPanel />
      {inProgressSession ? (
        <section className="panel p-5">
          <SectionHeading className="mb-2 inline-flex items-center gap-1">
            <Play className="h-3.5 w-3.5 text-sky-700" />
            In progress
          </SectionHeading>
          <PanelInset className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-zinc-900">
                {formatDateOnlyForLocale(inProgressSession.performed_on)}
              </p>
              {inProgressSession.notes?.trim() ? (
                <p className="truncate text-xs text-zinc-600">{inProgressSession.notes.trim()}</p>
              ) : null}
              {inProgressBadges.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {inProgressBadges.map((badge) => (
                    <ExerciseBadgeChip
                      key={`${inProgressSession.id}-${badge.slug}`}
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
              disabled={openingSessionId === inProgressSession.id}
              onClick={() => openSession(inProgressSession.id)}
            >
              <Play className="h-3.5 w-3.5 text-white" />
              {openingSessionId === inProgressSession.id ? "Opening..." : "Continue"}
            </ActionButton>
          </PanelInset>
        </section>
      ) : null}
      <section className="panel p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionHeading className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5 text-zinc-500" />
            Upcoming workouts
          </SectionHeading>
        </div>
        {isChecking ? (
          <ContentPlaceholder label="Loading workouts..." rows={HOME_UPCOMING_PLACEHOLDER_ROWS} />
        ) : plannedSessions.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming workouts.</p>
        ) : (
          <SessionsTable
            rows={plannedTableRows}
            dateHeaderLabel="Upcoming on"
            emptyMessage="No upcoming workouts."
            showNotesColumn={!isSmallPhone}
            compactMode={isSmallPhone}
            openingRowId={openingSessionId}
            highlightedPerformedOnDates={highlightedActivityDates}
            onOpenRow={openSession}
          />
        )}
      </section>
      <section className="panel p-5" aria-busy={isChecking}>
        {sessionsError ? (
          <p className="text-sm text-red-600">{sessionsError}</p>
        ) : (
          <div className="space-y-3">
            <SectionHeading className="inline-flex items-center gap-1">
              <History className="h-3.5 w-3.5 text-zinc-500" />
              Past workouts
            </SectionHeading>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid gap-2 sm:grid-cols-2">
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
              </div>
              <ActionButton
                type="button"
                onClick={() => {
                  setDateFrom(defaultDateRange.from);
                  setDateTo(defaultDateRange.to);
                }}
                disabled={dateFrom === defaultDateRange.from && dateTo === defaultDateRange.to}
                variant="secondary"
                size="sm"
                className="self-end text-sm font-normal text-amber-800 hover:text-amber-900"
                iconColor="amber"
              >
                <FilterX className="h-3.5 w-3.5" />
                Clear filters
              </ActionButton>
            </div>
            <WorkoutActivityChart
              data={workoutActivityData}
              isCompactView={isSmallPhone}
              highlightedDates={highlightedActivityDates}
              onHighlightDatesChange={setHighlightedActivityDates}
              goalReachedByDate={goalReachedByDate}
              onDayClick={openActivityDay}
            />
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
