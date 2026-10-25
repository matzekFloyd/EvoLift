"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ActionButton, ActionLink } from "@/app/components/action-button";
import { Checkbox } from "@/app/components/checkbox";
import { TextField } from "@/app/components/text-field";
import {
  EditorHeading,
  OptionalNotesField,
  RequiredMark,
} from "@/app/components/editor-chrome";
import { editorTitle } from "@/app/components/editor-fields";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  EDITOR_PLACEHOLDER_CLASS,
  EDITOR_PLACEHOLDER_ROWS,
} from "@/app/components/content-placeholder-layout";
import { AppDialog } from "@/app/components/app-dialog";
import { PageShell } from "@/app/components/page-shell";
import { StatusNotice } from "@/app/components/status-notice";
import { MuscleAreaCoverageChart } from "@/app/components/muscle-area-coverage-chart";
import { SampleWeek } from "@/app/components/sample-week-row";
import { WorkoutExerciseDraftList } from "@/app/components/workout-exercise-draft-list";
import {
  createDayDraft,
  daysFromPlan,
  planDayExerciseLabels,
  planDaySummary,
  planDraftChanged,
  type DayDraft,
} from "@/app/plans/plan-day-draft";
import { appPath } from "@/lib/app-paths";
import { PLAN_DAY_LIMIT_MESSAGE, normalizePlanDraft, planDayLimitReached } from "@/lib/plan-draft";
import type { Database } from "@/lib/supabase/database.types";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { createUserPlan, updateUserPlan } from "@/server/actions/plans";
import type { WorkoutPlanWithDays } from "@/server/db/plans";

type ExerciseDefaultsRow = Database["public"]["Tables"]["user_exercise_defaults"]["Row"];

type Props =
  | { mode: "create" }
  | { mode: "edit"; planId: string; initial: WorkoutPlanWithDays };

function DayOrderActions({
  dayName,
  index,
  dayCount,
  besideSummary,
  onUp,
  onDown,
  onRemove,
}: {
  dayName: string;
  index: number;
  dayCount: number;
  besideSummary: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const label = dayName.trim() || "day";
  return (
    <div
      className={
        besideSummary
          ? "flex w-full flex-row gap-2 max-md:[&>*]:min-w-0 max-md:[&>*]:flex-1 max-md:[&>*]:!w-auto md:w-auto md:shrink-0"
          : "flex w-full gap-2 sm:w-auto max-sm:[&>*]:min-w-0 max-sm:[&>*]:flex-1"
      }
    >
      <ActionButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={onUp}
        disabled={index === 0}
        aria-label={`Move ${label} up`}
      >
        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        Up
      </ActionButton>
      <ActionButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={onDown}
        disabled={index === dayCount - 1}
        aria-label={`Move ${label} down`}
      >
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        Down
      </ActionButton>
      <ActionButton type="button" variant="danger" size="sm" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Remove
      </ActionButton>
    </div>
  );
}

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
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const pendingDayFocusKey = useRef<string | null>(null);
  const savedPlan = useRef(
    props.mode === "edit"
      ? {
          name: props.initial.name,
          notes: props.initial.notes ?? "",
          isActive: props.initial.is_active,
          days: daysFromPlan(props.initial),
        }
      : { name: "", notes: "", isActive: false, days: [] },
  );
  const canSave = planDraftChanged(savedPlan.current, { name, notes, isActive, days });

  const maxNotesLength = 500;
  const fallbackTitle = props.mode === "create" ? "New plan" : "Edit plan";
  const title = editorTitle(name, fallbackTitle);

  useEffect(() => {
    const key = pendingDayFocusKey.current;
    if (!key || expandedDayKey) {
      return;
    }
    pendingDayFocusKey.current = null;
    document.getElementById(`plan-day-${key}`)?.focus();
  }, [expandedDayKey]);

  function collapseDay(key: string) {
    pendingDayFocusKey.current = key;
    setExpandedDayKey(null);
  }

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
      router.push(appPath("/plans"));
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not save plan.");
      setIsSaving(false);
    }
  }

  const back = (
    <ActionLink href={appPath("/plans")} variant="secondary" size="md">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </ActionLink>
  );

  if (isChecking) {
    return (
      <PageShell>
        <EditorHeading title={title} back={back} />
        {props.mode === "create" ? (
          <p className="mt-2 text-sm text-zinc-600">Add the days in the order you train them.</p>
        ) : null}
        <ContentPlaceholder
          label="Checking session..."
          rows={EDITOR_PLACEHOLDER_ROWS}
          rowClassName={EDITOR_PLACEHOLDER_CLASS}
          className="mt-6"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <EditorHeading title={title} back={back} />
      {props.mode === "create" ? (
        <p className="mt-2 text-sm text-zinc-600">Add the days in the order you train them.</p>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4 text-sm">
        <label className="block font-medium">
          Plan name
          <RequiredMark />
          <TextField
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full"
            placeholder="e.g. Push pull"
            maxLength={120}
          />
        </label>

        <Checkbox checked={isActive} onChange={setIsActive} align="start" className="w-full">
          <span>
            Active plan
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              Home uses the active plan to choose the next day. Activating this plan clears the
              previous one.
            </span>
          </span>
        </Checkbox>

        <SampleWeek dayCount={days.length} />

        <OptionalNotesField
          addLabel="Add plan notes"
          value={notes}
          onChange={setNotes}
          maxLength={maxNotesLength}
          placeholder="Optional notes for this plan"
        />

        {message ? (
          <StatusNotice message={message} tone={messageTone} onDismiss={clearMessage} />
        ) : null}

        <div className="space-y-3">
          {days.map((day, index) => {
            const summary = planDaySummary({
              position: index + 1,
              name: day.name,
              exerciseLabels: planDayExerciseLabels(day.exerciseRows, exerciseOptions),
            });
            const expanded = expandedDayKey === day.key;
            const orderActions = (
              <DayOrderActions
                dayName={day.name}
                index={index}
                dayCount={days.length}
                besideSummary={!expanded}
                onUp={() => moveDay(index, -1)}
                onDown={() => moveDay(index, 1)}
                onRemove={() => setDayKeyPendingRemoval(day.key)}
              />
            );
            return (
              <section key={day.key} className="rounded-md border border-zinc-200 bg-white p-3">
                <div
                  className={
                    expanded
                      ? "flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2"
                      : "flex flex-col gap-2 md:flex-row md:items-center"
                  }
                >
                  <div
                    className={`flex min-w-0 flex-1 items-center gap-1 ${
                      expanded ? "max-sm:min-h-[7.5rem]" : ""
                    }`}
                  >
                    {expanded ? (
                      <button
                        type="button"
                        onClick={() => collapseDay(day.key)}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                        aria-label={`Collapse ${summary.name}`}
                        aria-expanded
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                    {expanded ? (
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`plan-day-name-${day.key}`} className="block font-medium">
                          Day name
                          <RequiredMark />
                        </label>
                        <TextField
                          id={`plan-day-name-${day.key}`}
                          required
                          autoFocus
                          value={day.name}
                          onChange={(event) =>
                            setDays((prev) =>
                              prev.map((item) =>
                                item.key === day.key ? { ...item, name: event.target.value } : item,
                              ),
                            )
                          }
                          className="mt-1 w-full"
                          placeholder="e.g. Day A, Push"
                          maxLength={80}
                        />
                      </div>
                    ) : (
                      <button
                        id={`plan-day-${day.key}`}
                        type="button"
                        onClick={() => setExpandedDayKey(day.key)}
                        className="flex min-w-0 flex-1 items-center gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                        aria-expanded={false}
                      >
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
                          <ChevronDown className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs text-zinc-600">{summary.positionLabel}</span>
                          <span className="mt-0.5 block font-medium text-zinc-900">{summary.name}</span>
                          <span className="mt-0.5 block text-sm text-zinc-600">{summary.exercises}</span>
                        </span>
                      </button>
                    )}
                  </div>
                  <div className={expanded ? "pl-7 sm:pl-0 sm:self-end" : undefined}>{orderActions}</div>
                </div>
                {expanded ? (
                  <div className="mt-6 pl-7">
                      <WorkoutExerciseDraftList
                        heading="field"
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
                ) : null}
              </section>
            );
          })}
        </div>

        <MuscleAreaCoverageChart
          scope="plan"
          rows={days.flatMap((day) => day.exerciseRows)}
          exerciseOptions={exerciseOptions}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {planDayLimitReached(days.length) ? (
            <p id="plan-day-limit" className="mr-auto text-sm text-zinc-600">
              {PLAN_DAY_LIMIT_MESSAGE}
            </p>
          ) : null}
          <ActionButton
            type="button"
            variant="secondary"
            size="md"
            disabled={planDayLimitReached(days.length)}
            aria-describedby={planDayLimitReached(days.length) ? "plan-day-limit" : undefined}
            onClick={() => {
              if (planDayLimitReached(days.length)) {
                return;
              }
              const day = createDayDraft();
              setDays((prev) => [...prev, day]);
              setExpandedDayKey(day.key);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add day
          </ActionButton>
          <ActionButton type="submit" variant="primary" size="md" disabled={isSaving || !canSave}>
            <Save className="h-4 w-4" aria-hidden />
            {isSaving ? "Saving…" : "Save plan"}
          </ActionButton>
        </div>
      </form>

      {dayKeyPendingRemoval ? (
        <AppDialog
          titleId="remove-plan-day-title"
          panelClassName="max-w-sm"
          onClose={() => setDayKeyPendingRemoval(null)}
        >
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
                setExpandedDayKey((current) => (current === dayKeyPendingRemoval ? null : current));
                setDayKeyPendingRemoval(null);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </ActionButton>
          </div>
        </AppDialog>
      ) : null}
    </PageShell>
  );
}
