"use client";

import { ChevronRight, ListOrdered, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { AppDialog } from "@/app/components/app-dialog";
import { DateInput } from "@/app/components/date-input";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import { latestSessionByPlanDay, nextPlanDayId } from "@/lib/plan-cycle";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { HOME_PLAN_LOADING_CLASSNAME } from "@/app/home-loading-layout";
import { instantiateUserPlanDay } from "@/server/actions/plans";

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
};

type ActivePlanView = {
  id: string;
  name: string;
  days: PlanDayView[];
};

export function ActivePlanPanel() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ActivePlanView | null>(null);
  const [sessions, setSessions] = useState<PlanSessionView[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [startDayId, setStartDayId] = useState<string | null>(null);
  const [performedOn, setPerformedOn] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [isStarting, setIsStarting] = useState(false);

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
        .select("id, plan_day_id, performed_on, created_at")
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

  const nextDayId = plan ? nextPlanDayId(plan.days, sessions) : null;
  const latestByDay = latestSessionByPlanDay(sessions);
  const nextDay = plan?.days.find((day) => day.id === nextDayId) ?? null;
  const startDay = plan?.days.find((day) => day.id === startDayId) ?? null;

  function openStart(dayId: string) {
    setStartDayId(dayId);
    setPerformedOn(getTodayYyyyMmDd());
    setSessionNotes("");
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
      const sessionId = await instantiateUserPlanDay({
        accessToken: session.access_token,
        planId: plan.id,
        planDayId: startDay.id,
        performedOn,
        notes: sessionNotes.trim() ? sessionNotes.trim() : null,
      });
      invalidateLoggedHistoryCaches();
      setStartDayId(null);
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not start session.");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <section className="panel p-5">
      <div className="mb-2">
        <SectionHeading className="inline-flex items-center gap-1">
          <ListOrdered className="h-3.5 w-3.5 text-zinc-500" />
          Plan
        </SectionHeading>
      </div>

      {isLoading ? (
        <ContentPlaceholder label="Loading plan..." rowClassName={HOME_PLAN_LOADING_CLASSNAME} />
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : !plan ? (
        <p className="text-sm text-zinc-600">
          No active plan.{" "}
          <Link href="/plans" className="font-medium text-sky-800 underline-offset-2 hover:underline">
            Choose a plan
          </Link>{" "}
          or start a workout session without one.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/plans/${plan.id}/edit`}
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
              variant="primary"
              size="md"
              className="shrink-0"
              disabled={!nextDay || nextDay.exerciseCount === 0}
              title={
                !nextDay
                  ? "Add a day before starting a session."
                  : nextDay.exerciseCount === 0
                    ? `Add at least one exercise to ${nextDay.name} before starting a session.`
                    : undefined
              }
              onClick={() => {
                if (nextDay) {
                  openStart(nextDay.id);
                }
              }}
            >
              <ChevronRight className="h-4 w-4 text-white" aria-hidden />
              Start session
            </ActionButton>
          </div>
          {nextDay && nextDay.exerciseCount === 0 ? (
            <p className="text-sm text-zinc-600">
              Add at least one exercise to {nextDay.name} before starting a session.
            </p>
          ) : null}
          {plan.days.length > 0 ? (
            <ul className="space-y-2">
              {plan.days.map((day) => {
                const latest = latestByDay.get(day.id);
                const isNext = day.id === nextDayId;
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
                          <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">
                            Next
                          </span>
                        ) : null}
                      </p>
                      {latest ? (
                        <Link
                          href={`/sessions/${latest.id}`}
                          className="text-xs font-medium text-sky-800 underline-offset-2 hover:underline"
                        >
                          {formatDateOnlyForLocale(latest.performedOn)}
                        </Link>
                      ) : (
                        <p className="text-xs text-zinc-500">Not logged yet.</p>
                      )}
                    </div>
                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      disabled={day.exerciseCount === 0}
                      title={
                        day.exerciseCount === 0
                          ? "Add at least one exercise to this day."
                          : undefined
                      }
                      onClick={() => openStart(day.id)}
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden />
                      Start
                    </ActionButton>
                  </PanelInset>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}

      {startDay && plan ? (
        <AppDialog titleId="start-plan-day-title">
          <SectionHeading id="start-plan-day-title">
            Start session from {startDay.name}
          </SectionHeading>
          <p className="mt-1 text-xs text-zinc-600">
            Creates a workout session with this day&apos;s exercises and targets. You can still
            change loads and reps before logging sets.
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
