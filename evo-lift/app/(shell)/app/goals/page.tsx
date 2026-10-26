"use client";

import { Target } from "lucide-react";
import { CollapsibleSection } from "@/app/components/collapsible-section";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  GOAL_CARD_PLACEHOLDER_CLASS,
  GOAL_CARD_PLACEHOLDER_ROWS,
} from "@/app/components/content-placeholder-layout";
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
import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { PRODUCT_TOUR_TARGET_IDS } from "@/lib/product-tour";
import { exerciseOptionsForPicker, type ExercisePickerOption } from "@/lib/exercise-picker-options";
import {
  formatBestSet,
  formatMilestoneTarget,
  goalGapLabel,
  formatKgAmount,
  milestoneDefinitionChanged,
  parseGoalForm,
  resolveMilestone,
  type GoalProgress,
} from "@/lib/milestone-progress";
import { loadMilestoneWorkingSets } from "@/lib/milestone-sets";
import { type BodyweightLogEntry } from "@/lib/bodyweight-log";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { goalsListEpoch, invalidateGoalsList, loadGoalsList, peekGoalsList, type GoalsListSnapshot } from "@/lib/goals-list-cache";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { rememberedUserId } from "@/lib/signed-in-memory";
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
  const [cachedGoals] = useState(() => {
    const remembered = rememberedUserId();
    return remembered ? peekGoalsList(remembered) : null;
  });
  const [isChecking, setIsChecking] = useState(cachedGoals == null);
  const [userId, setUserId] = useState<string | null>(rememberedUserId);
  const [rows, setRows] = useState<MilestoneRow[]>(cachedGoals?.rows ?? []);
  const [progressById, setProgressById] = useState<Map<string, GoalProgress>>(
    () => new Map(cachedGoals?.progressEntries ?? []),
  );
  const [exerciseOptions, setExerciseOptions] = useState<ExercisePickerOption[]>(
    cachedGoals?.exerciseOptions ?? [],
  );
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(
    () => new Set(cachedGoals?.hiddenExerciseIds ?? []),
  );
  const [bodyweightEntries, setBodyweightEntries] = useState<BodyweightLogEntry[]>(
    cachedGoals?.bodyweightEntries ?? [],
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GoalListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function applyGoals(snapshot: GoalsListSnapshot) {
    setRows(snapshot.rows);
    setProgressById(new Map(snapshot.progressEntries));
    setExerciseOptions(snapshot.exerciseOptions);
    setHiddenExerciseIds(new Set(snapshot.hiddenExerciseIds));
    setBodyweightEntries(snapshot.bodyweightEntries);
    setLoadError(null);
    if (snapshot.progressWriteFailed) {
      setMessage("Could not update goal progress.");
    }
  }

  async function loadGoals(currentUserId: string, fresh: boolean, reportError: boolean) {
    const started = goalsListEpoch();
    try {
      const result = await loadGoalsList(supabaseBrowserClient, currentUserId, { fresh });
      if (started !== goalsListEpoch()) {
        return;
      }
      if (result.error || !result.snapshot) {
        if (reportError) {
          setLoadError(result.error ?? "Could not load goals.");
        }
        return;
      }
      applyGoals(result.snapshot);
    } catch {
      if (started === goalsListEpoch() && reportError) {
        setLoadError("Could not load goals.");
      }
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function init() {
      const started = goalsListEpoch();
      const visit = await confirmSignedInUser();
      if (!isMounted || started !== goalsListEpoch()) {
        return;
      }
      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }
      setUserId(visit.userId);
      if (!visit.showCached) {
        setRows([]);
        setProgressById(new Map());
        setIsChecking(true);
      }
      await loadGoals(visit.userId, visit.showCached, !visit.showCached);
      if (isMounted && started === goalsListEpoch()) {
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
    const definition = definitionFromRow(item.row);
    if (isAssistanceExercise(item.slug) && definition.milestoneType === "absolute") {
      return formatMilestoneTarget(definition, { assistance: true });
    }
    return formatGoalBodyweightTarget({
      definition,
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
        const sets = await loadMilestoneWorkingSets(
          supabaseBrowserClient,
          [parsed.definition.exerciseId],
          userId,
        );
        const exerciseSlug = exerciseOptions.find((option) => option.id === parsed.definition.exerciseId)?.slug;
        const resolved = resolveMilestone({
          definition: parsed.definition,
          stored: existing ? storedFromRow(existing) : { achievedAt: null, achievedBodyweightKg: null, achievedThresholdKg: null },
          sets,
          bodyweightEntries,
          dueOn: parsed.dueOn,
          today: getTodayYyyyMmDd(),
          recalculate: true,
          assistance: isAssistanceExercise(exerciseSlug),
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
      invalidateGoalsList();
      await loadGoals(userId, true, true);
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
    invalidateGoalsList();
    await loadGoals(userId, true, true);
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
        <p id={PRODUCT_TOUR_TARGET_IDS.goals} className="text-sm text-zinc-600">
          Set a strength goal for one exercise. Progress uses working sets you have already logged. New
          accounts start with bodyweight goals on the main barbell lifts. Edit or delete them anytime.
          Bodyweight goals need a bodyweight entry on Account.
        </p>
        {isChecking ? (
          <ContentPlaceholder
            label="Checking session..."
            rows={GOAL_CARD_PLACEHOLDER_ROWS}
            rowClassName={GOAL_CARD_PLACEHOLDER_CLASS}
            className="mt-4"
          />
        ) : (
          <>
        {message ? (
          <StatusNotice message={message} tone="error" onDismiss={() => setMessage(null)} className="mt-4" />
        ) : null}
        {loadError ? <p className="mt-4 text-sm text-red-600">{loadError}</p> : null}

        <GoalSummaryChart bars={summaryBars} />

        <CollapsibleSection
          title="Active"
          count={activeItems.length}
          inset={false}
          className="mt-5"
        >
          {activeItems.length === 0 ? (
            <p className="text-sm text-zinc-600">Add a goal to track a lift.</p>
          ) : (
            <div className="grid gap-3">
              {activeItems.map((item) => (
                <GoalCard
                  key={item.row.id}
                  {...cardProps(item)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Achieved"
          count={achievedItems.length}
          inset={false}
          className="mt-6"
        >
          {achievedItems.length === 0 ? (
            <p className="text-sm text-zinc-600">No achieved goals yet.</p>
          ) : (
            <div className="grid gap-3">
              {achievedItems.map((item) => (
                <GoalCard
                  key={item.row.id}
                  {...cardProps(item)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>
          </>
        )}
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
        <AppDialog
          titleId="delete-goal-title"
          panelClassName="max-w-sm"
          onClose={() => {
            if (!isDeleting) {
              setDeleteTarget(null);
            }
          }}
        >
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
      gapLabel: goalGapLabel(progress),
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
