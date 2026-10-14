"use client";

import Link from "next/link";
import { ClipboardList, Dumbbell, FilterX, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { DateInput } from "@/app/components/date-input";
import { PageShell } from "@/app/components/page-shell";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { NewSessionDraftCallout } from "@/app/components/new-session-draft-callout";
import { SessionsTable, type SessionsTableRow } from "@/app/components/sessions-table";
import { WorkoutActivityChart } from "@/app/components/workout-activity-chart";
import { loadGoalReachedSessionDates } from "@/lib/goal-reached-dates";
import {
  loadHomeSessionSummaries,
  peekHomeSessionSummaries,
  type HomeSessionSummaryRow,
} from "@/lib/home-session-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type WorkoutSessionRow = {
  id: string;
  performed_on: string;
  notes: string | null;
  created_at: string;
};

type SessionExerciseBadge = {
  slug: string;
  hasLoggedSet: boolean;
};

function formatDateToYyyyMmDd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  return {
    from: formatDateToYyyyMmDd(oneYearAgo),
    to: formatDateToYyyyMmDd(today),
  };
}

function normalizeDateOnly(value: string): string {
  // Supabase may return date-only or datetime strings; normalize to YYYY-MM-DD.
  return value.slice(0, 10);
}

function dateToYyyyMmDd(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayYyyyMmDd(): string {
  return dateToYyyyMmDd(new Date());
}

export default function Home() {
  const router = useRouter();
  const todayYyyyMmDd = getTodayYyyyMmDd();
  const defaultDateRange = useMemo(() => getDefaultDateRange(), []);
  const [isSmallPhone, setIsSmallPhone] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [sessions, setSessions] = useState<WorkoutSessionRow[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from);
  const [dateTo, setDateTo] = useState(defaultDateRange.to);
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null);
  const [highlightedActivityDates, setHighlightedActivityDates] = useState<string[] | null>(null);
  const [exerciseBadgesBySessionId, setExerciseBadgesBySessionId] = useState<
    Map<string, SessionExerciseBadge[]>
  >(new Map());
  const [setCountBySessionId, setSetCountBySessionId] = useState<Map<string, number>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [goalReachedByDate, setGoalReachedByDate] = useState<Record<string, string>>({});
  const reloadHomeSessionsRef = useRef<() => void>(() => {});

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);

      function applyHomeSummaries(loadedSessions: HomeSessionSummaryRow[]) {
        setSessions(
          loadedSessions.map((row) => ({
            id: row.id,
            performed_on: row.performed_on,
            notes: row.notes,
            created_at: row.created_at,
          })),
        );

        const nextSetCountBySessionId = new Map<string, number>();
        const nextBadges = new Map<string, SessionExerciseBadge[]>();
        for (const row of loadedSessions) {
          const setCount = Number(row.set_count);
          nextSetCountBySessionId.set(row.id, Number.isFinite(setCount) ? setCount : 0);
          const badges = Array.isArray(row.exercise_badges) ? row.exercise_badges : [];
          nextBadges.set(
            row.id,
            badges
              .filter((badge) => typeof badge.slug === "string" && badge.slug.length > 0)
              .map((badge) => ({
                slug: badge.slug,
                hasLoggedSet: badge.has_logged_set === true,
              })),
          );
        }
        setSetCountBySessionId(nextSetCountBySessionId);
        setExerciseBadgesBySessionId(nextBadges);
        setSessionsError(null);
      }

      const goalDatesPromise = loadGoalReachedSessionDates(supabaseBrowserClient).catch(() => ({}));
      const cached = peekHomeSessionSummaries(session.user.id);
      if (cached) {
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
        loadHomeSessionSummaries(supabaseBrowserClient, session.user.id, {
          fresh: cached != null,
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

  const completedSessions = useMemo(
    () => sessions.filter((session) => normalizeDateOnly(session.performed_on) <= todayYyyyMmDd),
    [sessions, todayYyyyMmDd],
  );

  const plannedSessions = useMemo(
    () =>
      sessions
        .filter((session) => normalizeDateOnly(session.performed_on) > todayYyyyMmDd)
        .sort((a, b) => a.performed_on.localeCompare(b.performed_on)),
    [sessions, todayYyyyMmDd],
  );


  const filteredSessions = useMemo(() => {
    return completedSessions.filter((session) => {
      const performedOn = normalizeDateOnly(session.performed_on);
      if (dateFrom && performedOn < dateFrom) {
        return false;
      }
      if (dateTo && performedOn > dateTo) {
        return false;
      }
      return true;
    });
  }, [completedSessions, dateFrom, dateTo]);

  const workoutActivityData = useMemo(() => {
    const completedSessions = filteredSessions.filter(
      (session) => normalizeDateOnly(session.performed_on) <= todayYyyyMmDd,
    );
    const sortedCompletedDates = completedSessions
      .map((session) => normalizeDateOnly(session.performed_on))
      .sort();
    const fallbackTo = todayYyyyMmDd;
    const fallbackFromDate = new Date(`${fallbackTo}T00:00:00`);
    fallbackFromDate.setDate(fallbackFromDate.getDate() - 26 * 7 + 1);
    const fallbackFrom = dateToYyyyMmDd(fallbackFromDate);
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
    for (const session of completedSessions) {
      const day = normalizeDateOnly(session.performed_on);
      workoutsByDate.set(day, (workoutsByDate.get(day) ?? 0) + 1);
      setsByDate.set(day, (setsByDate.get(day) ?? 0) + (setCountBySessionId.get(session.id) ?? 0));
    }
    while (current <= end) {
      const day = dateToYyyyMmDd(current);
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

  const completedTableRows: SessionsTableRow[] = useMemo(
    () =>
      filteredSessions.map((session) => ({
        id: session.id,
        performedOn: session.performed_on,
        notes: session.notes ?? "",
        isPlanned: false,
        badges: exerciseBadgesBySessionId.get(session.id) ?? [],
      })),
    [exerciseBadgesBySessionId, filteredSessions],
  );

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

  if (isChecking) {
    return (
      <PageShell className="items-center justify-center">
        <p className="text-sm text-zinc-600">Checking session...</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="h-6 w-6 text-sky-700" />
          Workout sessions
        </h1>
        <Link
          href="/sessions/new"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600"
          aria-label="Add workout session"
          title="Add workout session"
        >
          <Plus className="h-3.5 w-3.5 text-white" />
          <span className="hidden sm:inline">Add workout session</span>
        </Link>
      </div>
      {userId ? <NewSessionDraftCallout userId={userId} /> : null}
      <section className="panel p-5">
        {sessionsError ? (
          <p className="text-sm text-red-600">{sessionsError}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <SectionHeading>Past workouts</SectionHeading>
              <Link
                href="/exercises"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 underline-offset-2 hover:text-sky-800 hover:underline"
              >
                <Dumbbell className="h-3.5 w-3.5 text-sky-700" />
                Exercises
              </Link>
            </div>
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
            />
            <PanelInset className="p-3">
              <SessionsTable
                rows={completedTableRows}
                dateHeaderLabel="Performed on"
                emptyMessage="No completed workout sessions in the selected timeframe."
                showNotesColumn={!isSmallPhone}
                compactMode={isSmallPhone}
                openingRowId={openingSessionId}
                highlightedPerformedOnDates={highlightedActivityDates}
                goalReachedByDate={goalReachedByDate}
                onOpenRow={(rowId) => {
                  if (openingSessionId) {
                    return;
                  }
                  setOpeningSessionId(rowId);
                  router.push(`/sessions/${rowId}`);
                }}
              />
            </PanelInset>
          </div>
        )}
      </section>
      <section className="panel p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionHeading>Planned workouts</SectionHeading>
        </div>
        {plannedSessions.length === 0 ? (
          <p className="text-sm text-zinc-500">No planned workouts.</p>
        ) : (
          <PanelInset className="p-3">
            <SessionsTable
              rows={plannedTableRows}
              dateHeaderLabel="Planned on"
              emptyMessage="No planned workouts."
              showNotesColumn={!isSmallPhone}
              compactMode={isSmallPhone}
              openingRowId={openingSessionId}
              highlightedPerformedOnDates={highlightedActivityDates}
              onOpenRow={(rowId) => {
                if (openingSessionId) {
                  return;
                }
                setOpeningSessionId(rowId);
                router.push(`/sessions/${rowId}`);
              }}
            />
          </PanelInset>
        )}
      </section>
    </PageShell>
  );
}
