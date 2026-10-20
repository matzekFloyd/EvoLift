"use client";

import { ArrowLeft, ChevronDown, ChevronUp, ListOrdered, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import { PageShell } from "@/app/components/page-shell";
import { StatusNotice } from "@/app/components/status-notice";
import { WorkoutExerciseDraftList } from "@/app/components/workout-exercise-draft-list";
import { createDayDraft, daysFromPlan, type DayDraft } from "@/app/plans/plan-day-draft";
import { normalizePlanDraft } from "@/lib/plan-draft";
import type { Database } from "@/lib/supabase/database.types";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { createUserPlan, updateUserPlan } from "@/server/actions/plans";
import type { WorkoutPlanWithDays } from "@/server/db/plans";

type ExerciseDefaultsRow = Database["public"]["Tables"]["user_exercise_defaults"]["Row"];

type Props =
  | { mode: "create" }
  | { mode: "edit"; planId: string; initial: WorkoutPlanWithDays };

export function PlanEditorClient(props: Props) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [name, setName] = useState(() => (props.mode === "edit" ? props.initial.name : ""));
  const [notes, setNotes] = useState(() =>
    props.mode === "edit" ? (props.initial.notes ?? "") : "",
  );
  const [isActive, setIsActive] = useState(() =>
    props.mode === "edit" ? props.initial.is_active : false,
  );
  const [days, setDays] = useState<DayDraft[]>(() =>
    props.mode === "edit" ? daysFromPlan(props.initial) : [],
  );
  const [exerciseOptions, setExerciseOptions] = useState<
    Array<{ id: string; label: string; slug: string }>
  >([]);
  const [exerciseDefaultsById, setExerciseDefaultsById] = useState<
    Map<string, ExerciseDefaultsRow>
  >(new Map());
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [isSaving, setIsSaving] = useState(false);
  const [dayKeyPendingRemoval, setDayKeyPendingRemoval] = useState<string | null>(null);

  const maxNotesLength = 500;
  const title = props.mode === "create" ? "New plan" : "Edit plan";

  function showError(text: string) {
    setMessageTone("error");
    setMessage(text);
  }

  function clearMessage() {
    setMessage(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const session = await getBrowserAuthSession();
      if (!isMounted) {
        return;
      }
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: exercises, error: exercisesError } = await supabaseBrowserClient
        .from("exercises")
        .select("id, slug")
        .order("slug", { ascending: true });
      if (!isMounted) {
        return;
      }
      if (exercisesError) {
        showError("Could not load exercises.");
        setIsChecking(false);
        return;
      }

      const { data: translations } = await supabaseBrowserClient
        .from("exercise_translations")
        .select("exercise_id, lang_code, name")
        .eq("lang_code", "en");

      const translationMap = new Map<string, string>();
      for (const row of translations ?? []) {
        translationMap.set(row.exercise_id, row.name);
      }

      const { data: defaultsData, error: defaultsError } = await supabaseBrowserClient
        .from("user_exercise_defaults")
        .select("*")
        .eq("user_id", session.user.id);
      if (defaultsError) {
        showError("Could not load exercise defaults.");
        setIsChecking(false);
        return;
      }
      const defaultsMap = new Map<string, ExerciseDefaultsRow>();
      for (const item of defaultsData ?? []) {
        defaultsMap.set(item.exercise_id, item);
      }

      const { data: hiddenRows, error: hiddenError } = await supabaseBrowserClient
        .from("user_hidden_exercises")
        .select("exercise_id")
        .eq("user_id", session.user.id);
      if (!isMounted) {
        return;
      }
      if (hiddenError) {
        showError("Could not load exercise visibility.");
        setIsChecking(false);
        return;
      }

      setExerciseOptions(
        (exercises ?? []).map((exercise) => ({
          id: exercise.id,
          label: translationMap.get(exercise.id) ?? exercise.slug,
          slug: exercise.slug,
        })),
      );
      setExerciseDefaultsById(defaultsMap);
      setHiddenExerciseIds(new Set((hiddenRows ?? []).map((row) => row.exercise_id)));
      setIsChecking(false);
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [router]);

  function moveDay(index: number, direction: -1 | 1) {
    setDays((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (!item) {
        return prev;
      }
      next.splice(target, 0, item);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearMessage();

    const normalized = normalizePlanDraft({
      name,
      notes,
      isActive,
      days: days.map((day) => ({
        id: day.id,
        name: day.name,
        exerciseRows: day.exerciseRows,
      })),
    });
    if (!normalized.ok) {
      showError(normalized.message);
      return;
    }

    const session = await getBrowserAuthSession();
    if (!session?.access_token) {
      showError("You must be logged in to save a plan.");
      return;
    }

    setIsSaving(true);
    try {
      if (props.mode === "create") {
        await createUserPlan({
          accessToken: session.access_token,
          plan: normalized.value,
        });
      } else {
        await updateUserPlan({
          accessToken: session.access_token,
          planId: props.planId,
          plan: normalized.value,
        });
      }
      router.push("/plans");
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not save plan.");
      setIsSaving(false);
    }
  }

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
          <ListOrdered className="h-6 w-6 text-sky-700" />
          {title}
        </h1>
        <Link
          href="/plans"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 max-md:hidden"
        >
          <ArrowLeft className="h-4 w-4 text-sky-700" />
          Back
        </Link>
      </div>

      <p className="mt-2 text-sm text-zinc-600">
        A plan is an ordered cycle of days. Each day keeps its own exercises and targets. Starting a
        day copies them into a new workout session. Editing a template does not change this plan.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4 text-sm">
        <label className="block font-medium">
          Plan name
          <span className="text-sky-700" aria-hidden>
            {" "}
            *
          </span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g. Push pull"
            maxLength={120}
          />
        </label>

        <label className="block font-medium">
          Plan notes (optional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 h-24 w-full rounded-md border px-3 py-2 text-sm"
            maxLength={maxNotesLength}
            placeholder="Optional notes for this plan"
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            {notes.length}/{maxNotesLength}
          </span>
        </label>

        <label className="flex items-start gap-2 font-medium">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="mt-1"
          />
          <span>
            Active plan
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              Home uses the active plan to choose the next day. Activating this plan clears the
              previous one.
            </span>
          </span>
        </label>

        {message ? (
          <StatusNotice message={message} tone={messageTone} onDismiss={clearMessage} />
        ) : null}

        <div className="space-y-3">
          {days.map((day, index) => (
            <section key={day.key} className="rounded-md border border-zinc-200 bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <label className="block min-w-0 flex-1 font-medium">
                  Day name
                  <span className="text-sky-700" aria-hidden>
                    {" "}
                    *
                  </span>
                  <input
                    required
                    value={day.name}
                    onChange={(event) =>
                      setDays((prev) =>
                        prev.map((item) =>
                          item.key === day.key ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="e.g. Day A, Push"
                    maxLength={80}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => moveDay(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${day.name || "day"} up`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                    Up
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => moveDay(index, 1)}
                    disabled={index === days.length - 1}
                    aria-label={`Move ${day.name || "day"} down`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Down
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setDayKeyPendingRemoval(day.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </ActionButton>
                </div>
              </div>
              <div className="mt-3">
                <WorkoutExerciseDraftList
                  exerciseRows={day.exerciseRows}
                  setExerciseRows={(updater) => {
                    setDays((prev) =>
                      prev.map((item) => {
                        if (item.key !== day.key) {
                          return item;
                        }
                        const exerciseRows =
                          typeof updater === "function" ? updater(item.exerciseRows) : updater;
                        return { ...item, exerciseRows };
                      }),
                    );
                  }}
                  exerciseOptions={exerciseOptions}
                  hiddenExerciseIds={hiddenExerciseIds}
                  exerciseDefaultsById={exerciseDefaultsById}
                  maxNotesLength={maxNotesLength}
                />
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ActionButton
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setDays((prev) => [...prev, createDayDraft()])}
          >
            <Plus className="h-4 w-4" />
            Add day
          </ActionButton>
          <ActionButton type="submit" variant="primary" size="md" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save plan"}
          </ActionButton>
        </div>
      </form>

      {dayKeyPendingRemoval ? (
        <AppDialog titleId="remove-plan-day-title" panelClassName="max-w-sm">
          <h2 id="remove-plan-day-title" className="text-base font-semibold text-zinc-900">
            Remove this day?
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            The day leaves this plan when you save. Workout sessions you already started stay as
            logged.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <ActionButton
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setDayKeyPendingRemoval(null)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              variant="danger"
              size="md"
              onClick={() => {
                setDays((prev) => prev.filter((day) => day.key !== dayKeyPendingRemoval));
                setDayKeyPendingRemoval(null);
              }}
            >
              Remove
            </ActionButton>
          </div>
        </AppDialog>
      ) : null}
    </PageShell>
  );
}
