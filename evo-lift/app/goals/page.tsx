"use client";

import { ChevronRight, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import { PageAddAction } from "@/app/components/page-add-action";
import { PageShell } from "@/app/components/page-shell";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { formatGoalBodyweightTarget } from "@/app/goals/goal-bodyweight-label";
import { GoalCard } from "@/app/goals/goal-card";
import { GoalSummaryChart } from "@/app/goals/goal-summary-chart";
import { buildGoalSummaryBars } from "@/app/goals/goal-summary";
import { draftFromRow } from "@/app/goals/goal-draft";
import { definitionFromRow, storedFromRow } from "@/app/goals/goal-row";
import { emptyGoalDraft, GoalEditorDialog, type GoalDraft } from "@/app/goals/goal-editor-dialog";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { exerciseOptionsForPicker, type ExercisePickerOption } from "@/lib/exercise-picker-options";
import {
  formatBestSet,
  formatGoalGap,
  formatKgAmount,
  milestoneDefinitionChanged,
  parseGoalForm,
  resolveMilestone,
  type GoalProgress,
  type StoredAchievement,
} from "@/lib/milestone-progress";
import { loadMilestoneWorkingSets } from "@/lib/milestone-sets";
import { type BodyweightLogEntry } from "@/lib/bodyweight-log";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

type MilestoneRow = Database["public"]["Tables"]["strength_milestones"]["Row"];

type GoalListItem = {
  row: MilestoneRow;
  progress: GoalProgress;
  label: string;
  slug: string;
};

function formatAchievedOn(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export default function GoalsPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<MilestoneRow[]>([]);
  const [progressById, setProgressById] = useState<Map<string, GoalProgress>>(new Map());
  const [exerciseOptions, setExerciseOptions] = useState<ExercisePickerOption[]>([]);
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(new Set());
  const [bodyweightEntries, setBodyweightEntries] = useState<BodyweightLogEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GoalListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadGoals(currentUserId: string) {
    const today = getTodayYyyyMmDd();
    const [milestoneResult, logResult, exerciseResult, translationResult, hiddenResult] =
      await Promise.all([
        supabaseBrowserClient
          .from("strength_milestones")
          .select("*")
          .order("created_at", { ascending: true }),
        supabaseBrowserClient
          .from("user_bodyweight_log")
          .select("logged_on, bodyweight_kg")
          .eq("user_id", currentUserId)
          .order("logged_on", { ascending: true }),
        supabaseBrowserClient.from("exercises").select("id, slug").order("slug", { ascending: true }),
        supabaseBrowserClient
          .from("exercise_translations")
          .select("exercise_id, name")
          .eq("lang_code", "en"),
        supabaseBrowserClient.from("user_hidden_exercises").select("exercise_id").eq("user_id", currentUserId),
      ]);

    if (milestoneResult.error || logResult.error || exerciseResult.error) {
      setLoadError("Could not load goals.");
      return;
    }

    const translationMap = new Map<string, string>();
    for (const translation of translationResult.data ?? []) {
      translationMap.set(translation.exercise_id, translation.name);
    }
    const options = (exerciseResult.data ?? []).map((exercise) => ({
      id: exercise.id,
      slug: exercise.slug,
      label: translationMap.get(exercise.id) ?? exercise.slug,
    }));
    const milestones = milestoneResult.data ?? [];
    const entries: BodyweightLogEntry[] = (logResult.data ?? []).flatMap((row) => {
      const bodyweightKg = Number(row.bodyweight_kg);
      if (!Number.isFinite(bodyweightKg) || bodyweightKg <= 0) {
        return [];
      }
      return [{ loggedOn: row.logged_on.slice(0, 10), bodyweightKg }];
    });
    const sets = await loadMilestoneWorkingSets(
      supabaseBrowserClient,
      milestones.map((row) => row.exercise_id),
    );

    const progress = new Map<string, GoalProgress>();
    const writes: Array<{ id: string; stored: StoredAchievement }> = [];
    for (const row of milestones) {
      const resolved = resolveMilestone({
        definition: definitionFromRow(row),
        stored: storedFromRow(row),
        sets,
        bodyweightEntries: entries,
        dueOn: row.due_on,
        today,
        recalculate: false,
      });
      progress.set(row.id, resolved.progress);
      if (resolved.shouldWrite) {
        writes.push({ id: row.id, stored: resolved.stored });
      }
    }

    if (writes.length > 0) {
      const results = await Promise.all(
        writes.map((write) =>
          supabaseBrowserClient
            .from("strength_milestones")
            .update({
              achieved_at: write.stored.achievedAt,
              achieved_bodyweight_kg: write.stored.achievedBodyweightKg,
              achieved_threshold_kg: write.stored.achievedThresholdKg,
            })
            .eq("id", write.id),
        ),
      );
      if (results.some((result) => result.error)) {
        setMessage("Could not update goal progress.");
      }
    }

    setRows(milestones);
    setProgressById(progress);
    setExerciseOptions(options);
    setHiddenExerciseIds(new Set((hiddenResult.data ?? []).map((row) => row.exercise_id)));
    setBodyweightEntries(entries);
    setLoadError(null);
  }

  useEffect(() => {
    let isMounted = true;
    async function init() {
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
      try {
        await loadGoals(session.user.id);
      } catch {
        if (isMounted) {
          setLoadError("Could not load goals.");
        }
      }
      if (isMounted) {
        setIsChecking(false);
      }
    }
    void init();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const exerciseById = useMemo(
    () => new Map(exerciseOptions.map((option) => [option.id, option])),
    [exerciseOptions],
  );

  const items = useMemo<GoalListItem[]>(() => {
    return rows.flatMap((row) => {
      const progress = progressById.get(row.id);
      const exercise = exerciseById.get(row.exercise_id);
      if (!progress || !exercise) {
        return [];
      }
      return [{ row, progress, label: exercise.label, slug: exercise.slug }];
    });
  }, [rows, progressById, exerciseById]);

  const activeItems = items
    .filter((item) => item.progress.kind !== "achieved")
    .sort((left, right) => {
      const leftPast = left.progress.pastDue ? 0 : 1;
      const rightPast = right.progress.pastDue ? 0 : 1;
      if (leftPast !== rightPast) {
        return leftPast - rightPast;
      }
      return left.label.localeCompare(right.label);
    });
  const achievedItems = items
    .filter((item) => item.progress.kind === "achieved")
    .sort((left, right) => {
      const leftAt = left.progress.kind === "achieved" ? (left.progress.achievedAt ?? "") : "";
      const rightAt = right.progress.kind === "achieved" ? (right.progress.achievedAt ?? "") : "";
      return rightAt.localeCompare(leftAt);
    });

  function bodyweightTarget(item: GoalListItem): string {
    return formatGoalBodyweightTarget({
      definition: definitionFromRow(item.row),
      progress: item.progress,
      achievedBodyweightKg: storedFromRow(item.row).achievedBodyweightKg,
      bodyweightEntries,
      today: getTodayYyyyMmDd(),
    });
  }

  const summaryBars = buildGoalSummaryBars(
    items.map((item) => ({
      id: item.row.id,
      label: item.label,
      targetLabel: bodyweightTarget(item),
      progress: item.progress,
    })),
  );

  const editorOptions = exerciseOptionsForPicker(
    exerciseOptions,
    hiddenExerciseIds,
    draft?.exerciseId || undefined,
  );

  async function saveGoal() {
    if (!draft || !userId) {
      return;
    }
    const parsed = parseGoalForm(draft);
    if (!parsed.ok) {
      setFormError(parsed.message);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const existing = draft.id ? rows.find((row) => row.id === draft.id) : undefined;
      const definitionChanged =
        !existing || milestoneDefinitionChanged(definitionFromRow(existing), parsed.definition);
      const payload: Database["public"]["Tables"]["strength_milestones"]["Insert"] = {
        user_id: userId,
        exercise_id: parsed.definition.exerciseId,
        milestone_type: parsed.definition.milestoneType,
        target_weight_kg: parsed.definition.targetWeightKg,
        bodyweight_multiple: parsed.definition.bodyweightMultiple,
        min_reps: parsed.definition.minReps,
        due_on: parsed.dueOn,
        note: parsed.note,
      };

      if (definitionChanged) {
        const sets = await loadMilestoneWorkingSets(supabaseBrowserClient, [parsed.definition.exerciseId]);
        const resolved = resolveMilestone({
          definition: parsed.definition,
          stored: existing ? storedFromRow(existing) : { achievedAt: null, achievedBodyweightKg: null, achievedThresholdKg: null },
          sets,
          bodyweightEntries,
          dueOn: parsed.dueOn,
          today: getTodayYyyyMmDd(),
          recalculate: true,
        });
        payload.achieved_at = resolved.stored.achievedAt;
        payload.achieved_bodyweight_kg = resolved.stored.achievedBodyweightKg;
        payload.achieved_threshold_kg = resolved.stored.achievedThresholdKg;
      }

      const { error } = existing
        ? await supabaseBrowserClient.from("strength_milestones").update(payload).eq("id", existing.id)
        : await supabaseBrowserClient.from("strength_milestones").insert(payload);
      if (error) {
        setFormError("Could not save this goal.");
        return;
      }
      setDraft(null);
      await loadGoals(userId);
    } catch {
      setFormError("Could not save this goal.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !userId) {
      return;
    }
    setIsDeleting(true);
    setMessage(null);
    const { error } = await supabaseBrowserClient
      .from("strength_milestones")
      .delete()
      .eq("id", deleteTarget.row.id);
    if (error) {
      setMessage("Could not delete this goal.");
      setIsDeleting(false);
      return;
    }
    setDeleteTarget(null);
    setIsDeleting(false);
    await loadGoals(userId);
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
          <Target className="h-6 w-6 text-sky-700" aria-hidden />
          Goals
        </h1>
        <PageAddAction
          label="Create goal"
          onClick={() => {
            setFormError(null);
            setDraft(emptyGoalDraft());
          }}
        />
      </div>

      <section className="panel p-5">
        <p className="text-sm text-zinc-600">
          Set a strength goal for one exercise. Progress uses working sets you have already logged.
        </p>
        {message ? (
          <StatusNotice message={message} tone="error" onDismiss={() => setMessage(null)} className="mt-4" />
        ) : null}
        {loadError ? <p className="mt-4 text-sm text-red-600">{loadError}</p> : null}

        <GoalSummaryChart bars={summaryBars} />

        <details className="group mt-5">
          <summary className="w-fit cursor-pointer list-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 [&::-webkit-details-marker]:hidden">
            <SectionHeading className="inline-flex items-center gap-1.5">
              <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-90" aria-hidden />
              Active
              <span className="font-normal tabular-nums text-zinc-500">{activeItems.length}</span>
            </SectionHeading>
          </summary>
          {activeItems.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">Add a goal to track a lift.</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {activeItems.map((item) => (
                <GoalCard key={item.row.id} {...cardProps(item)} onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
              ))}
            </div>
          )}
        </details>

        <details className="group mt-6">
          <summary className="w-fit cursor-pointer list-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 [&::-webkit-details-marker]:hidden">
            <SectionHeading className="inline-flex items-center gap-1.5">
              <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-90" aria-hidden />
              Achieved
              <span className="font-normal tabular-nums text-zinc-500">{achievedItems.length}</span>
            </SectionHeading>
          </summary>
          {achievedItems.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No achieved goals yet.</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {achievedItems.map((item) => (
                <GoalCard key={item.row.id} {...cardProps(item)} onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
              ))}
            </div>
          )}
        </details>
      </section>

      {draft ? (
        <GoalEditorDialog
          draft={draft}
          exerciseOptions={editorOptions}
          error={formError}
          isSaving={isSaving}
          onChange={(next) => {
            setFormError(null);
            setDraft(next);
          }}
          onClose={() => {
            if (!isSaving) {
              setDraft(null);
            }
          }}
          onSave={() => void saveGoal()}
        />
      ) : null}

      {deleteTarget ? (
        <AppDialog titleId="delete-goal-title" panelClassName="max-w-sm">
          <SectionHeading id="delete-goal-title">Delete this goal?</SectionHeading>
          <p className="mt-1 text-sm text-zinc-600">
            This removes the goal for {deleteTarget.label}. Logged sets stay unchanged.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <ActionButton type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </ActionButton>
            <ActionButton type="button" variant="danger" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </ActionButton>
          </div>
        </AppDialog>
      ) : null}
    </PageShell>
  );

  function openEdit(item: GoalListItem) {
    setFormError(null);
    setDraft(draftFromRow(item.row));
  }

  function cardProps(item: GoalListItem) {
    const progress = item.progress;
    const definition = definitionFromRow(item.row);
    const missingBodyweight = progress.kind === "missing_bodyweight";
    const measured = progress.kind === "missing_bodyweight" ? null : progress;
    return {
      exerciseLabel: item.label,
      exerciseSlug: item.slug,
      targetLabel: bodyweightTarget(item),
      thresholdLabel:
        definition.milestoneType === "bodyweight_multiple" && measured
          ? `Threshold: ${formatKgAmount(measured.thresholdKg)}`
          : null,
      bestLabel:
        measured?.bestTotalKg != null && measured.bestReps != null
          ? formatBestSet(measured.bestTotalKg, measured.bestReps)
          : null,
      gapLabel: measured ? formatGoalGap(measured.gapKg) : null,
      percent: measured?.percent ?? null,
      achievedLabel:
        measured?.kind === "achieved" && measured.achievedAt
          ? `Achieved ${formatAchievedOn(measured.achievedAt)}`
          : null,
      dueLabel: item.row.due_on ? `Due ${formatDateOnlyForLocale(item.row.due_on.slice(0, 10))}` : null,
      pastDue: progress.pastDue,
      missingBodyweight,
      note: item.row.note,
    };
  }
}
