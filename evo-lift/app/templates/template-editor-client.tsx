"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, ActionLink } from "@/app/components/action-button";
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
import { PageShell } from "@/app/components/page-shell";
import { StatusNotice } from "@/app/components/status-notice";
import { MuscleAreaCoverageChart } from "@/app/components/muscle-area-coverage-chart";
import { WorkoutExerciseDraftList } from "@/app/components/workout-exercise-draft-list";
import type { Database } from "@/lib/supabase/database.types";
import { appPath } from "@/lib/app-paths";
import {
  createEmptyExerciseRow,
  exerciseDraftRowsFromTemplateLines,
  type ExerciseDraftRow,
} from "@/lib/workout-exercise-draft";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createUserTemplate,
  updateUserTemplate,
} from "@/server/actions/templates";
import {
  getTemplateDraftStorageKey,
  templateDraftChanged,
  templateSaveError,
} from "@/app/templates/template-draft";
import type { WorkoutTemplateWithExercises } from "@/server/db/templates";

type ExerciseDefaultsRow = Database["public"]["Tables"]["user_exercise_defaults"]["Row"];

type TemplateDraftPayload = {
  name: string;
  notes: string;
  exerciseRows: ExerciseDraftRow[];
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; templateId: string; initial: WorkoutTemplateWithExercises };

export function TemplateEditorClient(props: Props) {
  const router = useRouter();
  const draftScope = props.mode === "create" ? "new" : props.templateId;
  const [isChecking, setIsChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState(() =>
    props.mode === "edit" ? props.initial.name : "",
  );
  const [notes, setNotes] = useState(() =>
    props.mode === "edit" ? (props.initial.notes ?? "") : "",
  );
  const [exerciseRows, setExerciseRows] = useState<ExerciseDraftRow[]>(() =>
    props.mode === "edit"
      ? exerciseDraftRowsFromTemplateLines(props.initial.exercises)
      : [createEmptyExerciseRow()],
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
  const savedTemplate = useRef(
    props.mode === "edit"
      ? {
          name: props.initial.name,
          notes: props.initial.notes ?? "",
          exerciseRows: exerciseDraftRowsFromTemplateLines(props.initial.exercises),
        }
      : null,
  );
  const canSave =
    props.mode === "create" ||
    (savedTemplate.current != null &&
      templateDraftChanged(savedTemplate.current, { name, notes, exerciseRows }));

  const maxNotesLength = 500;
  const fallbackTitle = props.mode === "create" ? "New template" : "Edit template";
  const title = editorTitle(name, fallbackTitle);

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

      setUserId(session.user.id);

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

      const options = (exercises ?? []).map((exercise) => ({
        id: exercise.id,
        label: translationMap.get(exercise.id) ?? exercise.slug,
        slug: exercise.slug,
      }));

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
      const hiddenSet = new Set<string>();
      for (const row of hiddenRows ?? []) {
        hiddenSet.add(row.exercise_id);
      }

      setExerciseOptions(options);
      setExerciseDefaultsById(defaultsMap);
      setHiddenExerciseIds(hiddenSet);
      setIsChecking(false);
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!userId || isChecking) {
      return;
    }
    const draft: TemplateDraftPayload = {
      name,
      notes,
      exerciseRows,
    };
    window.localStorage.setItem(
      getTemplateDraftStorageKey(userId, draftScope),
      JSON.stringify(draft),
    );
  }, [draftScope, exerciseRows, isChecking, name, notes, userId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearMessage();

    const session = await getBrowserAuthSession();
    const saveError = templateSaveError({
      isLoggedIn: Boolean(session?.access_token),
      name,
      exerciseRows,
    });
    if (saveError || !session?.access_token) {
      showError(saveError ?? "You must be logged in to save a template.");
      return;
    }

    const trimmedName = name.trim();

    const exercises = exerciseRows.map((row) => {
      const parsedSets = row.targetSets ? Number(row.targetSets) : null;
      const parsedReps = row.targetReps ? Number(row.targetReps) : null;
      const parsedWeight = row.targetWeightKg ? Number(row.targetWeightKg) : null;
      const parsedBase = row.baseWeightKg ? Number(row.baseWeightKg) : null;
      return {
        exerciseId: row.exerciseId,
        targetSets: Number.isFinite(parsedSets) ? parsedSets : null,
        targetReps: Number.isFinite(parsedReps) ? parsedReps : null,
        targetWeightKg: Number.isFinite(parsedWeight) ? parsedWeight : null,
        baseWeightKg: Number.isFinite(parsedBase) ? parsedBase : null,
        notes: row.notes.trim() ? row.notes.trim() : null,
      };
    });

    setIsSaving(true);
    try {
      if (props.mode === "create") {
        await createUserTemplate({
          accessToken: session.access_token,
          name: trimmedName,
          notes: notes.trim() ? notes.trim() : null,
          exercises,
        });
      } else {
        await updateUserTemplate({
          accessToken: session.access_token,
          templateId: props.templateId,
          name: trimmedName,
          notes: notes.trim() ? notes.trim() : null,
          exercises,
        });
      }
      if (userId) {
        window.localStorage.removeItem(getTemplateDraftStorageKey(userId, draftScope));
      }
      router.push(appPath("/templates"));
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setIsSaving(false);
    }
  }

  const back = (
    <ActionLink href={appPath("/templates")} variant="secondary" size="md">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </ActionLink>
  );

  if (isChecking) {
    return (
      <PageShell>
        <EditorHeading title={title} back={back} />
        {props.mode === "create" ? (
          <p className="mt-2 text-sm text-zinc-600">Add the exercises in the order you train them.</p>
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
        <p className="mt-2 text-sm text-zinc-600">Add the exercises in the order you train them.</p>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4 text-sm">
        <label className="block font-medium">
          Template name
          <RequiredMark />
          <TextField
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full"
            placeholder="e.g. Upper body"
            maxLength={120}
          />
        </label>

        <OptionalNotesField
          addLabel="Add template notes"
          value={notes}
          onChange={setNotes}
          maxLength={maxNotesLength}
          placeholder="Optional notes for this template"
        />

        {message ? (
          <StatusNotice message={message} tone={messageTone} onDismiss={clearMessage} />
        ) : null}

        <WorkoutExerciseDraftList
          exerciseRows={exerciseRows}
          setExerciseRows={setExerciseRows}
          exerciseOptions={exerciseOptions}
          hiddenExerciseIds={hiddenExerciseIds}
          exerciseDefaultsById={exerciseDefaultsById}
          maxNotesLength={maxNotesLength}
        />

        <MuscleAreaCoverageChart
          scope="template"
          rows={exerciseRows}
          exerciseOptions={exerciseOptions}
        />

        <div className="flex justify-end">
          <ActionButton type="submit" variant="primary" size="md" disabled={isSaving || !canSave}>
            <Save className="h-4 w-4" aria-hidden />
            {isSaving ? "Saving…" : "Save template"}
          </ActionButton>
        </div>
      </form>
    </PageShell>
  );
}
