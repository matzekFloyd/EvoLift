"use client";

import { ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { CollapsibleSection } from "@/app/components/collapsible-section";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { AppDialog } from "@/app/components/app-dialog";
import { DateInput } from "@/app/components/date-input";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import {
  homeCompetingCtaVariant,
  homePlanDayShowsRowAction,
  homePlanDaysStartsOpen,
} from "@/app/home-next-action-layout";
import { homeExerciseBadgeTone } from "@/app/home-sessions";
import { appPath } from "@/lib/app-paths";
import { PRODUCT_TOUR_TARGET_IDS } from "@/lib/product-tour";
import { continueSessionExerciseId } from "@/lib/continue-session-exercise";
import {
  scheduledSessionsBesidePlan,
  type ScheduledHomeSession,
} from "@/app/home-scheduled-sessions";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import {
  PLAN_ALREADY_OPEN_MESSAGE,
  continuablePlanSession,
  latestSessionByPlanDay,
  nextPlanDayId,
  openSessionByPlanDay,
  upcomingSessionOnPlanDay,
} from "@/lib/plan-cycle";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { HOME_PLAN_LOADING_CLASSNAME } from "@/app/home-loading-layout";
import { sessionDetailExercisePath } from "@/app/sessions/[id]/session-detail-query";
import { instantiateUserPlanDay } from "@/server/actions/plans";

/** First unfinished exercise for Continue session, or null to open the first exercise. */
async function lookupContinueSessionExerciseId(sessionId: string): Promise<string | null> {
  const { data: exercises, error } = await supabaseBrowserClient
    .from("workout_session_exercises")
    .select("id, position, target_sets, not_done")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });
  if (error || !exercises) {
    return null;
  }
  if (exercises.length === 0) {
    return null;
  }

  const { data: sets, error: setsError } = await supabaseBrowserClient
    .from("workout_sets")
    .select("session_exercise_id, is_warmup")
    .in(
      "session_exercise_id",
      exercises.map((exercise) => exercise.id),
    );
  if (setsError || !sets) {
    return null;
  }

  return continueSessionExerciseId(
    exercises.map((exercise) => ({
      id: exercise.id,
      position: exercise.position,
      targetSets: exercise.target_sets,
      notDone: exercise.not_done,
    })),
    sets.map((set) => ({
      sessionExerciseId: set.session_exercise_id,
      isWarmup: set.is_warmup,
    })),
  );
}

type PlanDayView = {
  id: string;
  name: string;
  position: number;
  exerciseCount: number;
};

type PlanSessionView = {
  id: string;
  planDayId: string | null;
  performedOn: string;
  createdAt: string;
  completedAt: string | null;
  notes: string | null;
};

type ActivePlanView = {
  id: string;
  name: string;
  days: PlanDayView[];
};

type ActivePlanPanelProps = {
  scheduledSessions?: ScheduledHomeSession[];
  /** True when Home shows a non-plan in-progress strip above this panel. */
  hasStandaloneInProgress?: boolean;
  openingSessionId?: string | null;
  onOpenSession?: (sessionId: string, exerciseId?: string | null) => void;
  /** Open plan session ids so Home can keep them out of the standalone strip. */
  onPlanOpenSessionIdsChange?: (sessionIds: string[]) => void;
};

export function ActivePlanPanel({
  scheduledSessions = [],
  hasStandaloneInProgress = false,
  openingSessionId = null,
  onOpenSession,
  onPlanOpenSessionIdsChange,
}: ActivePlanPanelProps) {
  const router = useRouter();
  const continueRequestRef = useRef(0);
  const openingSessionIdRef = useRef(openingSessionId);
  openingSessionIdRef.current = openingSessionId;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ActivePlanView | null>(null);
  const [sessions, setSessions] = useState<PlanSessionView[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [startDayId, setStartDayId] = useState<string | null>(null);
  const [performedOn, setPerformedOn] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [resolvingContinueId, setResolvingContinueId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      continueRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabaseBrowserClient
        .from("workout_plans")
        .select("id, name, workout_plan_days(id, name, position, workout_plan_day_exercises(id))")
        .eq("is_active", true)
        .maybeSingle();

      if (!isMounted) {
        return;
      }
      if (error) {
        setLoadError("Could not load the active plan.");
        setIsLoading(false);
        return;
      }
      if (!data) {
        setPlan(null);
        setSessions([]);
        setLoadError(null);
        setIsLoading(false);
        return;
      }

      const days = (data.workout_plan_days ?? [])
        .map((day) => ({
          id: day.id,
          name: day.name,
          position: day.position,
          exerciseCount: day.workout_plan_day_exercises?.length ?? 0,
        }))
        .sort((a, b) => a.position - b.position);

      const { data: sessionRows, error: sessionsError } = await supabaseBrowserClient
        .from("workout_sessions")
        .select("id, plan_day_id, performed_on, created_at, completed_at, notes")
        .eq("plan_id", data.id);

      if (!isMounted) {
        return;
      }
      if (sessionsError) {
        setLoadError("Could not load the active plan.");
        setIsLoading(false);
        return;
      }

      setPlan({ id: data.id, name: data.name, days });
      setSessions(
        (sessionRows ?? []).map((row) => ({
          id: row.id,
          planDayId: row.plan_day_id,
          performedOn: row.performed_on,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          notes: row.notes,
        })),
      );
      setLoadError(null);
      setIsLoading(false);
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const today = getTodayYyyyMmDd();
  const continuable = continuablePlanSession(sessions, today);
  const nextDayId =
    continuable?.planDayId ?? (plan ? nextPlanDayId(plan.days, sessions, today) : null);
  const latestByDay = latestSessionByPlanDay(sessions);
  const openByDay = openSessionByPlanDay(sessions);
  const nextDay = plan?.days.find((day) => day.id === nextDayId) ?? null;
  const nextOpenSession = continuable ?? undefined;
  const isOpeningContinue =
    nextOpenSession != null &&
    (openingSessionId === nextOpenSession.id || resolvingContinueId === nextOpenSession.id);
  const continuableDayName =
    plan?.days.find((day) => day.id === continuable?.planDayId)?.name ?? null;
  const besidePlan = isLoading
    ? []
    : scheduledSessionsBesidePlan(
        scheduledSessions,
        [...latestByDay.values()].map((session) => session.id),
      );
  const scheduledLabel = plan ? "Also scheduled" : "Scheduled";
  const startDay = plan?.days.find((day) => day.id === startDayId) ?? null;
  const startReusesUpcoming = startDay
    ? upcomingSessionOnPlanDay(sessions, startDay.id, today) != null
    : false;
  const planHeaderCtaVariant = homeCompetingCtaVariant(hasStandaloneInProgress);

  useEffect(() => {
    if (!onPlanOpenSessionIdsChange) {
      return;
    }
    if (isLoading) {
      return;
    }
    const ids = new Set<string>();
    for (const session of openSessionByPlanDay(sessions).values()) {
      ids.add(session.id);
    }
    const openPlanSession = continuablePlanSession(sessions, getTodayYyyyMmDd());
    if (openPlanSession) {
      ids.add(openPlanSession.id);
    }
    onPlanOpenSessionIdsChange([...ids]);
  }, [isLoading, onPlanOpenSessionIdsChange, sessions]);

  async function openContinuableSession(sessionId: string) {
    if (openingSessionId || resolvingContinueId) {
      return;
    }
    const request = ++continueRequestRef.current;
    setResolvingContinueId(sessionId);
    let exerciseId: string | null = null;
    try {
      exerciseId = await lookupContinueSessionExerciseId(sessionId);
    } catch {
      exerciseId = null;
    }
    if (request !== continueRequestRef.current) {
      return;
    }
    setResolvingContinueId(null);
    if (openingSessionIdRef.current) {
      return;
    }
    if (onOpenSession) {
      onOpenSession(sessionId, exerciseId);
      return;
    }
    router.push(appPath(sessionDetailExercisePath(sessionId, exerciseId)));
  }

  function openStart(dayId: string) {
    if (continuable && continuable.planDayId !== dayId) {
      setMessage(
        continuableDayName
          ? `Finish ${continuableDayName} before starting another day.`
          : PLAN_ALREADY_OPEN_MESSAGE,
      );
      return;
    }
    setStartDayId(dayId);
    setPerformedOn(getTodayYyyyMmDd());
    const upcoming = upcomingSessionOnPlanDay(sessions, dayId, getTodayYyyyMmDd());
    setSessionNotes(upcoming?.notes ?? "");
    setMessage(null);
  }

  async function confirmStart() {
    if (!plan || !startDay) {
      return;
    }
    if (!performedOn) {
      setMessage("Please choose a performed date.");
      return;
    }
    const session = await getBrowserAuthSession();
    if (!session?.access_token) {
      setMessage("You must be logged in.");
      return;
    }
    setIsStarting(true);
    setMessage(null);
    try {
      const upcoming = upcomingSessionOnPlanDay(sessions, startDay.id, getTodayYyyyMmDd());
      if (upcoming) {
        const notes = sessionNotes.trim() ? sessionNotes.trim() : null;
        const { error } = await supabaseBrowserClient
          .from("workout_sessions")
          .update({ performed_on: performedOn, notes })
          .eq("id", upcoming.id);
        if (error) {
          if (/open plan session limit/i.test(error.message)) {
            setMessage(PLAN_ALREADY_OPEN_MESSAGE);
          } else {
            setMessage("Could not start session.");
          }
          return;
        }
        invalidateLoggedHistoryCaches();
        setStartDayId(null);
        router.push(appPath(`/sessions/${upcoming.id}`));
        return;
      }
      const sessionId = await instantiateUserPlanDay({
        accessToken: session.access_token,
        planId: plan.id,
        planDayId: startDay.id,
        performedOn,
        notes: sessionNotes.trim() ? sessionNotes.trim() : null,
      });
      invalidateLoggedHistoryCaches();
      setStartDayId(null);
      router.push(appPath(`/sessions/${sessionId}`));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not start session.");
    } finally {
      setIsStarting(false);
    }
  }

  const dayList =
    plan && plan.days.length > 0 ? (
      <ul className="space-y-2">
        {plan.days.map((day) => {
          const latest = latestByDay.get(day.id);
          const openSession = openByDay.get(day.id);
          const isContinuable = continuable?.planDayId === day.id;
          const linked = isContinuable ? continuable : (openSession ?? latest);
          const isNext = day.id === nextDayId;
          const showRowAction = homePlanDayShowsRowAction({
            isContinuable,
            isNext,
            hasContinuable: continuable != null,
          });
          return (
            <PanelInset
              as="li"
              key={day.id}
              tone={isNext ? "accent" : "muted"}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900">
                  {day.name}
                  {isNext ? (
                    <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-medium text-sky-800">
                      Next
                    </span>
                  ) : null}
                </p>
                {linked ? (
                  <Link
                    href={appPath(`/sessions/${linked.id}`)}
                    className="text-xs font-medium text-sky-800 underline-offset-2 hover:underline"
                  >
                    {formatDateOnlyForLocale(linked.performedOn)}
                  </Link>
                ) : (
                  <p className="text-xs text-zinc-500">Not logged yet.</p>
                )}
              </div>
              {showRowAction ? (
                <ActionButton
                  type="button"
                  variant="secondary"
                  iconColor="sky"
                  size="sm"
                  className="shrink-0"
                  disabled={continuable != null || day.exerciseCount === 0}
                  title={
                    continuable != null
                      ? continuableDayName
                        ? `Finish ${continuableDayName} before starting another day.`
                        : PLAN_ALREADY_OPEN_MESSAGE
                      : day.exerciseCount === 0
                        ? "Add at least one exercise to this day."
                        : undefined
                  }
                  onClick={() => openStart(day.id)}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Start
                </ActionButton>
              ) : null}
            </PanelInset>
          );
        })}
      </ul>
    ) : null;

  return (
    <section className="panel p-5">
      <div id={PRODUCT_TOUR_TARGET_IDS.plan}>
        <div className="mb-2">
          <SectionHeading>Plan</SectionHeading>
        </div>

        {isLoading ? (
          <ContentPlaceholder label="Loading plan..." rowClassName={HOME_PLAN_LOADING_CLASSNAME} />
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : !plan ? (
          <p className="text-sm text-zinc-600">
            No active plan.{" "}
            <Link href={appPath("/plans")} className="font-medium text-sky-800 underline-offset-2 hover:underline">
              Choose a plan
            </Link>{" "}
            or start a workout session without one.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={appPath(`/plans/${plan.id}/edit`)}
                className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
              >
                {plan.name}
              </Link>
              {nextDay ? (
                <p className="mt-0.5 text-xs text-zinc-600">
                  Next: <span className="font-medium text-zinc-800">{nextDay.name}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-zinc-600">Add a day before starting a session.</p>
              )}
            </div>
            <ActionButton
              type="button"
              variant={planHeaderCtaVariant}
              iconColor={planHeaderCtaVariant === "secondary" ? "sky" : "auto"}
              size="md"
              className="shrink-0"
              disabled={
                nextOpenSession
                  ? isOpeningContinue
                  : !nextDay || nextDay.exerciseCount === 0
              }
              title={
                nextOpenSession
                  ? undefined
                  : !nextDay
                    ? "Add a day before starting a session."
                    : nextDay.exerciseCount === 0
                      ? `Add at least one exercise to ${nextDay.name} before starting a session.`
                      : undefined
              }
              onClick={() => {
                if (nextOpenSession) {
                  void openContinuableSession(nextOpenSession.id);
                  return;
                }
                if (nextDay) {
                  openStart(nextDay.id);
                }
              }}
            >
              {nextOpenSession ? (
                <Play
                  className={
                    planHeaderCtaVariant === "primary" ? "h-4 w-4 text-white" : "h-4 w-4"
                  }
                  aria-hidden
                />
              ) : (
                <ChevronRight
                  className={
                    planHeaderCtaVariant === "primary" ? "h-4 w-4 text-white" : "h-4 w-4"
                  }
                  aria-hidden
                />
              )}
              {nextOpenSession
                ? isOpeningContinue
                  ? "Opening..."
                  : "Continue session"
                : "Start session"}
            </ActionButton>
          </div>
        )}
      </div>
      {plan && !isLoading && !loadError ? (
        <div className="mt-3 space-y-3">
          {message && !startDay ? (
            <StatusNotice message={message} tone="warning" onDismiss={() => setMessage(null)} />
          ) : null}
          {nextDay && !nextOpenSession && nextDay.exerciseCount === 0 ? (
            <p className="text-sm text-zinc-600">
              Add at least one exercise to {nextDay.name} before starting a session.
            </p>
          ) : null}
          {dayList ? (
            <CollapsibleSection
              title="Days"
              inset={false}
              titleTone="chrome"
              defaultOpen={homePlanDaysStartsOpen()}
            >
              {dayList}
            </CollapsibleSection>
          ) : null}
        </div>
      ) : null}

      {besidePlan.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-zinc-600">{scheduledLabel}</p>
          <ul className="space-y-2">
            {besidePlan.map((session) => (
              <PanelInset
                as="li"
                key={session.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {formatDateOnlyForLocale(session.performedOn)}
                  </p>
                  {session.notes.trim() ? (
                    <p className="truncate text-xs text-zinc-600">{session.notes.trim()}</p>
                  ) : null}
                  {session.badges.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {session.badges.map((badge) => (
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
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  disabled={!onOpenSession || openingSessionId === session.id}
                  onClick={() => onOpenSession?.(session.id)}
                >
                  {openingSessionId === session.id ? "Opening..." : "Open"}
                </ActionButton>
              </PanelInset>
            ))}
          </ul>
        </div>
      ) : null}

      {startDay && plan ? (
        <AppDialog titleId="start-plan-day-title" onClose={() => setStartDayId(null)}>
          <SectionHeading id="start-plan-day-title">
            Start session from {startDay.name}
          </SectionHeading>
          <p className="mt-1 text-xs text-zinc-600">
            {startReusesUpcoming
              ? "This day already has an upcoming session. The date below replaces that session date. You can log sets once the date is today or earlier."
              : "Creates a workout session with this day's exercises and targets. You can still change loads and reps before logging sets."}
          </p>
          {message ? (
            <StatusNotice
              message={message}
              tone="error"
              onDismiss={() => setMessage(null)}
              className="mt-3"
            />
          ) : null}
          <label className="mt-4 block text-sm font-medium text-zinc-800">
            Performed on
            <DateInput
              required
              value={performedOn}
              onChange={(event) => setPerformedOn(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-zinc-800">
            Session notes (optional)
            <textarea
              value={sessionNotes}
              onChange={(event) => setSessionNotes(event.target.value)}
              className="mt-1 h-20 w-full rounded-md border px-3 py-2 text-sm"
              maxLength={500}
              placeholder="Optional notes for this session"
            />
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setStartDayId(null)}
              className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isStarting}
              onClick={() => void confirmStart()}
              className="rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
            >
              {isStarting ? "Starting…" : "Start session"}
            </button>
          </div>
        </AppDialog>
      ) : null}
    </section>
  );
}
