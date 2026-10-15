"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { CompactStickyBar } from "@/app/components/compact-sticky-bar";
import { DateInput } from "@/app/components/date-input";
import { ExerciseSearchSelect } from "@/app/components/exercise-search-select";
import { NotesTextareaField } from "@/app/components/notes-textarea-field";
import { DocumentTitle } from "@/app/components/document-title";
import { PageShell } from "@/app/components/page-shell";
import { panelInsetClass } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { TargetWeightSuggestion } from "@/app/components/target-weight-suggestion";
import { targetSuggestionsEnabled } from "@/lib/target-weight-suggestion";
import { isCompoundExercise } from "@/lib/compound-exercise";
import { warmupSuggestionsEnabled } from "@/lib/warmup-suggestion";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { formatPlanSessionSource } from "@/lib/plan-cycle";
import { workoutSessionPageTitle } from "@/lib/page-title";
import { toExerciseBadge } from "@/lib/exercise-badge";
import { exerciseOptionsForPicker } from "@/lib/exercise-picker-options";
import {
  getExerciseMetadataCacheStatus,
  loadExerciseMetadata,
} from "@/lib/exercise-metadata-cache";
import { createPageLoadPerfTracker } from "@/lib/page-load-perf";
import { isFutureSessionDate } from "@/lib/session-date";
import {
  createSessionDetailActions,
  type SessionExerciseRow,
  type SessionRow,
  type WorkoutSetRow,
} from "./session-detail-actions";
import {
  emptyAddExerciseDraft,
  emptySetDraft,
  lastLoggedSet,
  maxExerciseNotesLength,
  maxSessionNotesLength,
  setsForSessionExercise,
  type AddExerciseDraft,
  type MessageTone,
} from "./session-detail-model";
import { SessionExerciseBlock } from "./session-exercise-block";
import { SESSION_DETAIL_EXERCISE_QUERY, sessionDetailHref } from "./session-detail-query";
import { OneValueSetLogger } from "./one-value-set-logger";
import {
  ONE_VALUE_LOGGING_STORAGE_KEY,
  advanceAfterSavedSet,
  backToLoad,
  freshLoadStep,
  goToReps,
  nextWorkingSetNumber,
  oneValueLoggingEnabledFromStorage,
  oneValuePrimaryAction,
  oneValuePrimaryLabel,
  parseOneValueLoad,
  parseOneValueReps,
  presenceForNextExercise,
  stepLoadedWeight,
  stepReps,
  visibleOneValuePresence,
  type OneValuePresence,
  type OneValueStep,
} from "./one-value-logging";
import { resolveSuggestedAddDraft, type SessionSetDraft as SetDraft } from "./session-set-draft";

type SessionNumberCountRow = {
  id: string;
};

/** Query param: `workout_session_exercises.id` for deep-link + reload restore. */

function replaceSessionDetailQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: { toString: () => string },
  mutator: (params: URLSearchParams) => void,
) {
  router.replace(sessionDetailHref(pathname, searchParams.toString(), mutator), { scroll: false });
}

export default function SessionDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;

  const [isChecking, setIsChecking] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("error");
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseRow[]>([]);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetRow[]>([]);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [createdFromLabel, setCreatedFromLabel] = useState<string | null>(null);
  const [exerciseLabels, setExerciseLabels] = useState<Map<string, string>>(new Map());
  const [addDrafts, setAddDrafts] = useState<Record<string, Partial<SetDraft>>>({});
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SetDraft>(emptySetDraft);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isDeleteSessionConfirmOpen, setIsDeleteSessionConfirmOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [hasHydratedReadOnly, setHasHydratedReadOnly] = useState(false);
  const [exerciseOptions, setExerciseOptions] = useState<Array<{ id: string; label: string; slug: string }>>([]);
  const [addExerciseDraft, setAddExerciseDraft] =
    useState<AddExerciseDraft>(emptyAddExerciseDraft);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isAddExerciseExpanded, setIsAddExerciseExpanded] = useState(false);
  const [isAddExerciseSheetOpen, setIsAddExerciseSheetOpen] = useState(false);
  const [isTargetsSheetOpen, setIsTargetsSheetOpen] = useState(false);
  const [targetsSets, setTargetsSets] = useState("");
  const [targetsReps, setTargetsReps] = useState("");
  const [targetsWeightKg, setTargetsWeightKg] = useState("");
  const [targetsSessionExerciseId, setTargetsSessionExerciseId] = useState<string | null>(null);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [isSmallPhone, setIsSmallPhone] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const activeExerciseIndexChangeSourceRef = useRef<"user" | "url">("user");
  /** Tracks `workout_session_exercises.id` for the active row to clear global notices on exercise change (#72). */
  const lastActiveSessionExerciseIdRef = useRef<string | null>(null);
  /** Compact add-exercise jumps to the new row in the same tick as success; keep that toast once. */
  const skipNextClearMessageOnExerciseIdChangeRef = useRef(false);
  const lastSessionExerciseIdsKeyRef = useRef<string>("");
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(new Set());
  const [suggestWarmupsByExerciseId, setSuggestWarmupsByExerciseId] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const [targetSuggestionsDisabledExerciseIds, setTargetSuggestionsDisabledExerciseIds] = useState<
    Set<string>
  >(() => new Set());
  const [maxSuggestedWarmupSets, setMaxSuggestedWarmupSets] = useState<number | null>(null);
  /** Compact single-exercise flow: show full new-set composer after target working sets are met. */
  const [compactShowExtraSetComposer, setCompactShowExtraSetComposer] = useState(false);
  const [oneValueLogging, setOneValueLogging] = useState(false);
  const [oneValueLoggingHydrated, setOneValueLoggingHydrated] = useState(false);
  const [oneValueByExercise, setOneValueByExercise] = useState<Record<string, OneValuePresence>>({});
  const [oneValueError, setOneValueError] = useState<string | null>(null);
  const [pendingCompactSetFocusSessionExerciseId, setPendingCompactSetFocusSessionExerciseId] =
    useState<string | null>(null);
  /** Full (md+) table: session_exercise ids where the add-set row stays open past target. */
  const [fullViewExpandAddSetRowIds, setFullViewExpandAddSetRowIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [performedOnDraft, setPerformedOnDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [sessionDetailsDateError, setSessionDetailsDateError] = useState<string | null>(null);
  const [sessionDetailsNotesError, setSessionDetailsNotesError] = useState<string | null>(null);
  const [isSavingSessionDetails, setIsSavingSessionDetails] = useState(false);
  const [isEditingSessionDetails, setIsEditingSessionDetails] = useState(false);

  const warmupSuggestionsDisabledExerciseIds = useMemo(() => {
    const disabled = new Set<string>();
    for (const option of exerciseOptions) {
      const stored = suggestWarmupsByExerciseId.has(option.id)
        ? suggestWarmupsByExerciseId.get(option.id)
        : undefined;
      if (!warmupSuggestionsEnabled(stored, isCompoundExercise(option.slug))) {
        disabled.add(option.id);
      }
    }
    return disabled;
  }, [exerciseOptions, suggestWarmupsByExerciseId]);

  const addExercisePickerOptions = useMemo(
    () =>
      exerciseOptionsForPicker(
        exerciseOptions,
        hiddenExerciseIds,
        addExerciseDraft.exerciseId,
      ),
    [exerciseOptions, hiddenExerciseIds, addExerciseDraft.exerciseId],
  );

  const sessionDetailsDirty = useMemo(() => {
    if (!session) {
      return false;
    }
    if (performedOnDraft !== session.performed_on) {
      return true;
    }
    const draftTrim = notesDraft.trim();
    const sessionTrim = (session.notes ?? "").trim();
    return draftTrim !== sessionTrim;
  }, [session, performedOnDraft, notesDraft]);

  function showError(messageText: string) {
    setMessageTone("error");
    setMessage(messageText);
  }

  function showWarning(messageText: string) {
    setMessageTone("warning");
    setMessage(messageText);
  }

  function showSuccess(messageText: string) {
    setMessageTone("success");
    setMessage(messageText);
  }

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  useEffect(() => {
    const userId = session?.user_id;
    if (!userId) {
      return;
    }
    let cancelled = false;
    async function loadSuggestionSettings() {
      const [{ data: metrics }, { data: defaults }] = await Promise.all([
        supabaseBrowserClient
          .from("user_profile_metrics")
          .select("max_suggested_warmup_sets")
          .eq("user_id", userId)
          .maybeSingle(),
        supabaseBrowserClient
          .from("user_exercise_defaults")
          .select("exercise_id, suggest_warmups, suggest_target")
          .eq("user_id", userId),
      ]);
      if (cancelled) {
        return;
      }
      setMaxSuggestedWarmupSets(metrics?.max_suggested_warmup_sets ?? null);
      const warmupByExercise = new Map<string, boolean>();
      const targetDisabled = new Set<string>();
      for (const row of defaults ?? []) {
        warmupByExercise.set(row.exercise_id, row.suggest_warmups);
        if (row.suggest_target === false) {
          targetDisabled.add(row.exercise_id);
        }
      }
      setSuggestWarmupsByExerciseId(warmupByExercise);
      setTargetSuggestionsDisabledExerciseIds(targetDisabled);
    }
    void loadSuggestionSettings();
    return () => {
      cancelled = true;
    };
  }, [session?.user_id]);

  function getReadOnlyStorageKey(currentSessionId: string) {
    return `evolift:session-readonly:${currentSessionId}`;
  }

  useEffect(() => {
    let isMounted = true;
    const perf = createPageLoadPerfTracker("/sessions/[id]");

    async function loadData() {
      const {
        data: { session: authSession },
      } = await perf.trackQuery("auth.getSession", () => supabaseBrowserClient.auth.getSession());

      if (!isMounted) {
        return;
      }
      if (!authSession || !sessionId) {
        router.replace("/login");
        return;
      }

      const { data: sessionData, error: sessionError } = await perf.trackQuery(
        "workout_sessions.selectById",
        () =>
          supabaseBrowserClient
            .from("workout_sessions")
            .select(
              "id, user_id, performed_on, notes, created_at, updated_at, source_template_id, plan_id, plan_day_id, workout_templates(name), workout_plans(name), workout_plan_days(name)",
            )
            .eq("id", sessionId)
            .single(),
      );

      if (!isMounted) {
        return;
      }
      if (sessionError || !sessionData) {
        showError("Could not load workout session.");
        setIsChecking(false);
        perf.flush();
        return;
      }

      if (sessionData.user_id !== authSession.user.id) {
        showError("You do not have access to this workout session.");
        setIsChecking(false);
        perf.flush();
        return;
      }

      // These reads only need the session row. Sets wait until session-exercise ids exist.
      perf.noteCache("exerciseMetadata", getExerciseMetadataCacheStatus(5 * 60 * 1000));
      const priorSessionsPromise = perf.trackQuery("workout_sessions.countPriorByCreatedAt", () =>
        supabaseBrowserClient
          .from("workout_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authSession.user.id)
          .lt("created_at", sessionData.created_at),
      );
      const sameCreatedAtPromise = perf.trackQuery("workout_sessions.selectSameCreatedAtIds", () =>
        supabaseBrowserClient
          .from("workout_sessions")
          .select("id")
          .eq("user_id", authSession.user.id)
          .eq("created_at", sessionData.created_at)
          .order("id", { ascending: true }),
      );
      const sessionExercisesPromise = perf.trackQuery(
        "workout_session_exercises.selectBySessionId",
        () =>
          supabaseBrowserClient
            .from("workout_session_exercises")
            .select(
              "id, session_id, exercise_id, position, base_weight_kg, target_sets, target_reps, target_weight_kg, notes, created_at",
            )
            .eq("session_id", sessionId)
            .order("position", { ascending: true }),
      );
      const metadataPromise = perf
        .trackQuery("exerciseMetadata.load", () =>
          loadExerciseMetadata(supabaseBrowserClient, { ttlMs: 5 * 60 * 1000 }),
        )
        .then(
          (rows) => ({ rows, error: null as unknown }),
          (error: unknown) => ({
            rows: [] as Array<{ id: string; slug: string; label: string }>,
            error,
          }),
        );
      const hiddenPromise = perf.trackQuery("user_hidden_exercises.selectByUserId", () =>
        supabaseBrowserClient
          .from("user_hidden_exercises")
          .select("exercise_id")
          .eq("user_id", authSession.user.id),
      );

      const sessionExerciseResult = await sessionExercisesPromise;
      const sessionExerciseData = (sessionExerciseResult.data ?? []) as SessionExerciseRow[];
      const sessionExerciseIds = sessionExerciseData.map((row) => row.id);
      const setsPromise =
        sessionExerciseResult.error || sessionExerciseIds.length === 0
          ? Promise.resolve({ data: [] as WorkoutSetRow[], error: null })
          : perf.trackQuery("workout_sets.selectBySessionExerciseIds", () =>
              supabaseBrowserClient
                .from("workout_sets")
                .select(
                  "id, session_exercise_id, set_number, reps, weight_kg, is_warmup, performed_at, notes, created_at",
                )
                .in("session_exercise_id", sessionExerciseIds)
                .order("set_number", { ascending: true }),
            );

      const [priorResult, sameCreatedAtResult, metadataResult, hiddenResult, setsResult] =
        await Promise.all([
          priorSessionsPromise,
          sameCreatedAtPromise,
          metadataPromise,
          hiddenPromise,
          setsPromise,
        ]);

      if (!isMounted) {
        return;
      }
      if (priorResult.error || sameCreatedAtResult.error) {
        showError("Could not compute session number.");
        setIsChecking(false);
        perf.flush();
        return;
      }
      if (sessionExerciseResult.error) {
        showError("Could not load session exercises.");
        setIsChecking(false);
        perf.flush();
        return;
      }
      if (setsResult.error) {
        showError("Could not load workout sets.");
        setIsChecking(false);
        perf.flush();
        return;
      }
      if (metadataResult.error) {
        const metadataError = metadataResult.error;
        showError(
          metadataError instanceof Error ? metadataError.message : "Could not load exercise options.",
        );
        setIsChecking(false);
        perf.flush();
        return;
      }
      if (hiddenResult.error) {
        showError("Could not load exercise visibility.");
        setIsChecking(false);
        perf.flush();
        return;
      }

      const typedSameCreatedAtRows = (sameCreatedAtResult.data ?? []) as SessionNumberCountRow[];
      const sameCreatedAtIndex = typedSameCreatedAtRows.findIndex((row) => row.id === sessionData.id);
      const computedSessionNumber =
        (priorResult.count ?? 0) + (sameCreatedAtIndex >= 0 ? sameCreatedAtIndex + 1 : 1);
      const sets = (setsResult.data ?? []) as WorkoutSetRow[];
      const allExercises = metadataResult.rows;
      const labels = new Map<string, string>();
      for (const item of allExercises) {
        labels.set(item.id, item.label);
      }
      const hiddenSet = new Set<string>();
      for (const row of hiddenResult.data ?? []) {
        hiddenSet.add(row.exercise_id);
      }

      const sessionRow = sessionData as SessionRow;
      const joined = sessionData as unknown as {
        workout_templates?: { name: string } | { name: string }[] | null;
        workout_plans?: { name: string } | { name: string }[] | null;
        workout_plan_days?: { name: string } | { name: string }[] | null;
      };
      function joinedName(
        value: { name: string } | { name: string }[] | null | undefined,
      ): string | null {
        const row = Array.isArray(value) ? value[0] : value;
        const name = row?.name?.trim();
        return name ? name : null;
      }
      const resolvedTemplateName = joinedName(joined.workout_templates);
      setCreatedFromLabel(
        formatPlanSessionSource(joinedName(joined.workout_plans), joinedName(joined.workout_plan_days)) ??
          resolvedTemplateName,
      );
      setSession({
        id: sessionRow.id,
        user_id: sessionRow.user_id,
        performed_on: sessionRow.performed_on,
        notes: sessionRow.notes,
        source_template_id: sessionRow.source_template_id,
        plan_id: sessionRow.plan_id,
        plan_day_id: sessionRow.plan_day_id,
        created_at: sessionRow.created_at,
        updated_at: sessionRow.updated_at,
      });
      setPerformedOnDraft(sessionRow.performed_on);
      setNotesDraft(sessionRow.notes ?? "");
      setSessionDetailsDateError(null);
      setSessionDetailsNotesError(null);
      setSessionNumber(computedSessionNumber > 0 ? computedSessionNumber : null);
      setSessionExercises(sessionExerciseData);
      setWorkoutSets(sets);
      setExerciseLabels(labels);
      setExerciseOptions(
        allExercises.map((item) => ({
          id: item.id,
          label: item.label,
          slug: item.slug,
        })),
      );
      setHiddenExerciseIds(hiddenSet);
      setIsChecking(false);
      perf.flush();
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [router, sessionId]);

  useEffect(() => {
    if (isReadOnly) {
      setEditingSetId(null);
      setEditDraft(emptySetDraft);
      setIsEditingSessionDetails(false);
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const stored = window.localStorage.getItem(getReadOnlyStorageKey(sessionId));
    setIsReadOnly(stored === "1");
    setHasHydratedReadOnly(true);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !hasHydratedReadOnly) {
      return;
    }
    window.localStorage.setItem(getReadOnlyStorageKey(sessionId), isReadOnly ? "1" : "0");
  }, [hasHydratedReadOnly, isReadOnly, sessionId]);

  useEffect(() => {
    setOneValueLogging(
      oneValueLoggingEnabledFromStorage(window.localStorage.getItem(ONE_VALUE_LOGGING_STORAGE_KEY)),
    );
    setOneValueLoggingHydrated(true);
  }, []);

  useEffect(() => {
    if (!oneValueLoggingHydrated) {
      return;
    }
    window.localStorage.setItem(ONE_VALUE_LOGGING_STORAGE_KEY, oneValueLogging ? "1" : "0");
  }, [oneValueLogging, oneValueLoggingHydrated]);

  useEffect(() => {
    setOneValueError(null);
  }, [activeExerciseIndex]);

  useEffect(() => {
    lastSessionExerciseIdsKeyRef.current = "";
  }, [sessionId]);

  useEffect(() => {
    setFullViewExpandAddSetRowIds(new Set());
  }, [sessionId]);

  useEffect(() => {
    setFullViewExpandAddSetRowIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Set<string>();
      for (const id of prev) {
        const ex = sessionExercises.find((e) => e.id === id);
        if (!ex) {
          continue;
        }
        const goal = ex.target_sets;
        const workingCount = workoutSets.filter(
          (s) => s.session_exercise_id === id && !s.is_warmup,
        ).length;
        const met = goal != null && goal > 0 && workingCount >= goal;
        if (met) {
          next.add(id);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [sessionExercises, workoutSets]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsSmallPhone(mediaQuery.matches);
    apply();
    const onChange = () => apply();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setCompactShowExtraSetComposer(false);
  }, [activeExerciseIndex]);

  useEffect(() => {
    if (!isSmallPhone || isReadOnly) {
      return;
    }
    const ex = sessionExercises[activeExerciseIndex];
    if (!ex) {
      return;
    }
    const goal = ex.target_sets;
    const workingCount = workoutSets.filter(
      (s) => s.session_exercise_id === ex.id && !s.is_warmup,
    ).length;
    const met = goal != null && goal > 0 && workingCount >= goal;
    if (!met) {
      setCompactShowExtraSetComposer(false);
    }
  }, [isSmallPhone, isReadOnly, sessionExercises, activeExerciseIndex, workoutSets]);

  useEffect(() => {
    if (activeExerciseIndex >= sessionExercises.length) {
      setActiveExerciseIndex(Math.max(0, sessionExercises.length - 1));
    }
  }, [activeExerciseIndex, sessionExercises.length]);

  useEffect(() => {
    lastActiveSessionExerciseIdRef.current = null;
    skipNextClearMessageOnExerciseIdChangeRef.current = false;
  }, [sessionId]);

  /** Global StatusNotice (message): clear when the active session exercise changes (#72). Session header field errors stay on their controls. */
  useEffect(() => {
    if (isChecking) {
      return;
    }
    if (activeExerciseIndex < 0 || activeExerciseIndex >= sessionExercises.length) {
      return;
    }
    const id = sessionExercises[activeExerciseIndex]?.id;
    if (!id) {
      return;
    }
    const prev = lastActiveSessionExerciseIdRef.current;
    if (skipNextClearMessageOnExerciseIdChangeRef.current) {
      skipNextClearMessageOnExerciseIdChangeRef.current = false;
      lastActiveSessionExerciseIdRef.current = id;
      return;
    }
    if (prev !== null && id !== prev) {
      clearMessage();
    }
    lastActiveSessionExerciseIdRef.current = id;
  }, [activeExerciseIndex, sessionExercises, isChecking, clearMessage]);

  useEffect(() => {
    if (isChecking || !sessionId || session?.id !== sessionId) {
      return;
    }

    const idsKey = sessionExercises.map((e) => e.id).join(",");
    const ex = searchParams.get(SESSION_DETAIL_EXERCISE_QUERY);

    if (sessionExercises.length === 0) {
      if (ex) {
        replaceSessionDetailQuery(router, pathname, searchParams, (params) => {
          params.delete(SESSION_DETAIL_EXERCISE_QUERY);
        });
      }
      activeExerciseIndexChangeSourceRef.current = "url";
      setActiveExerciseIndex(0);
      lastSessionExerciseIdsKeyRef.current = idsKey;
      return;
    }

    const listChanged = lastSessionExerciseIdsKeyRef.current !== idsKey;
    lastSessionExerciseIdsKeyRef.current = idsKey;

    if (listChanged) {
      if (ex) {
        const idx = sessionExercises.findIndex((e) => e.id === ex);
        if (idx < 0) {
          activeExerciseIndexChangeSourceRef.current = "url";
          setActiveExerciseIndex(0);
          replaceSessionDetailQuery(router, pathname, searchParams, (params) => {
            params.delete(SESSION_DETAIL_EXERCISE_QUERY);
          });
        } else {
          activeExerciseIndexChangeSourceRef.current = "url";
          setActiveExerciseIndex(idx);
        }
      }
      return;
    }

    if (ex) {
      const idx = sessionExercises.findIndex((e) => e.id === ex);
      if (idx >= 0) {
        activeExerciseIndexChangeSourceRef.current = "url";
        setActiveExerciseIndex(idx);
      } else {
        activeExerciseIndexChangeSourceRef.current = "url";
        setActiveExerciseIndex(0);
        replaceSessionDetailQuery(router, pathname, searchParams, (params) => {
          params.delete(SESSION_DETAIL_EXERCISE_QUERY);
        });
      }
    } else {
      activeExerciseIndexChangeSourceRef.current = "url";
      setActiveExerciseIndex(0);
    }
  }, [isChecking, pathname, router, searchParams, session?.id, sessionExercises, sessionId]);

  useEffect(() => {
    if (isChecking || !sessionId || session?.id !== sessionId || sessionExercises.length === 0) {
      return;
    }
    if (activeExerciseIndexChangeSourceRef.current === "url") {
      activeExerciseIndexChangeSourceRef.current = "user";
      return;
    }

    const id = sessionExercises[activeExerciseIndex]?.id;
    if (!id) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const cur = params.get(SESSION_DETAIL_EXERCISE_QUERY);

    if (activeExerciseIndex === 0) {
      if (!cur) {
        return;
      }
      params.delete(SESSION_DETAIL_EXERCISE_QUERY);
    } else {
      if (cur === id) {
        return;
      }
      params.set(SESSION_DETAIL_EXERCISE_QUERY, id);
    }

    const qs = params.toString();
    if (qs === searchParams.toString()) {
      return;
    }
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [
    activeExerciseIndex,
    isChecking,
    pathname,
    router,
    searchParams,
    session?.id,
    sessionExercises,
    sessionId,
  ]);

  function updateAddDraft(
    sessionExerciseId: string,
    key: keyof SetDraft,
    value: string | boolean,
  ) {
    setAddDrafts((prev) => ({
      ...prev,
      [sessionExerciseId]: {
        ...prev[sessionExerciseId],
        [key]: value,
      },
    }));
  }

  const {
    handleAddSet,
    handleAddWarmups,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteSet,
    deleteSession,
    addExerciseToSession,
    startTargetsEdit,
    cancelTargetsEdit,
    saveTargetsForExercise,
    beginEditingSessionDetails,
    cancelEditingSessionDetails,
    saveSessionDetails,
    // Writes the ref only after a compact add succeeds. The helper does not read it while building actions.
    // eslint-disable-next-line react-hooks/refs
  } = createSessionDetailActions({
    session,
    sessionId,
    sessionExercises,
    workoutSets,
    addDrafts,
    editDraft,
    addExerciseDraft,
    targetsSets,
    targetsReps,
    targetsWeightKg,
    targetsSessionExerciseId,
    performedOnDraft,
    notesDraft,
    isCompactView: isSmallPhone,
    exerciseLabels,
    showError,
    showWarning,
    showSuccess,
    clearMessage,
    router,
    setIsSavingSet,
    setWorkoutSets,
    setAddDrafts,
    setCompactShowExtraSetComposer,
    setPendingCompactSetFocusSessionExerciseId,
    setEditingSetId,
    setEditDraft,
    setIsDeleteSessionConfirmOpen,
    setIsDeletingSession,
    setSessionExercises,
    setActiveExerciseIndex,
    setIsAddExerciseSheetOpen,
    setAddExerciseDraft,
    setIsAddingExercise,
    markSkipNextExerciseMessageClear: () => {
      skipNextClearMessageOnExerciseIdChangeRef.current = true;
    },
    setTargetsSessionExerciseId,
    setTargetsSets,
    setTargetsReps,
    setTargetsWeightKg,
    setIsTargetsSheetOpen,
    setIsSavingTargets,
    setPerformedOnDraft,
    setNotesDraft,
    setSessionDetailsDateError,
    setSessionDetailsNotesError,
    setIsEditingSessionDetails,
    setIsSavingSessionDetails,
    setSession,
    warmupSuggestionsDisabledExerciseIds,
    maxSuggestedWarmupSets,
  });

  function goBack() {
    clearMessage();
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  useEffect(() => {
    if (!isSmallPhone || !pendingCompactSetFocusSessionExerciseId) {
      return;
    }
    let attempts = 0;
    let timer: number | null = null;
    const targetId = pendingCompactSetFocusSessionExerciseId;

    const tryFocus = () => {
      attempts += 1;
      const panel = document.getElementById(`compact-new-set-panel-${targetId}`);
      if (panel instanceof HTMLElement) {
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
        const firstInput = panel.querySelector<HTMLInputElement>('input[type="number"]');
        firstInput?.focus();
        setPendingCompactSetFocusSessionExerciseId(null);
        return;
      }
      if (attempts < 8) {
        timer = window.setTimeout(tryFocus, 80);
        return;
      }
      setPendingCompactSetFocusSessionExerciseId(null);
    };

    timer = window.setTimeout(tryFocus, 60);
    return () => {
      if (timer != null) {
        window.clearTimeout(timer);
      }
    };
  }, [
    isSmallPhone,
    pendingCompactSetFocusSessionExerciseId,
    compactShowExtraSetComposer,
    activeExerciseIndex,
    workoutSets.length,
  ]);

  if (isChecking) {
    return (
      <PageShell className="items-center justify-center">
        <p className="text-sm text-zinc-600">Loading workout session...</p>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <section className="panel p-5">
          <p className="text-sm text-red-600">{message ?? "Session not found."}</p>
        </section>
      </PageShell>
    );
  }

  const formattedPerformedOn = formatDateOnlyForLocale(session.performed_on);
  const isPlannedSession = isFutureSessionDate(session.performed_on);
  const canManageSets = !isReadOnly && !isPlannedSession;

  const isCompactView = isSmallPhone;
  const shouldUseSingleExerciseFlow = isCompactView && !isReadOnly;
  const exerciseBadgeById = new Map<string, string>();
  const exerciseSlugById = new Map<string, string>();
  for (const option of exerciseOptions) {
    exerciseBadgeById.set(option.id, toExerciseBadge(option.slug));
    exerciseSlugById.set(option.id, option.slug);
  }
  const oneValueActive = oneValueLogging && !isReadOnly;
  const focusSingleExercise = shouldUseSingleExerciseFlow || oneValueActive;
  const visibleExercises = focusSingleExercise
    ? sessionExercises
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => index === activeExerciseIndex)
    : sessionExercises.map((item, index) => ({ item, index }));
  const activeSessionExercise =
    sessionExercises.length > 0 ? (sessionExercises[activeExerciseIndex] ?? sessionExercises[0]) : null;
  const activeExerciseLabel =
    activeSessionExercise
      ? (exerciseLabels.get(activeSessionExercise.exercise_id) ?? activeSessionExercise.exercise_id)
      : "";
  const targetsExerciseLabel = (() => {
    if (!targetsSessionExerciseId) {
      return activeExerciseLabel;
    }
    const selected = sessionExercises.find((item) => item.id === targetsSessionExerciseId);
    if (!selected) {
      return activeExerciseLabel;
    }
    return exerciseLabels.get(selected.exercise_id) ?? selected.exercise_id;
  })();
  const targetsExerciseId =
    sessionExercises.find((item) => item.id === targetsSessionExerciseId)?.exercise_id ?? "";

  const activeWorkingSetCount =
    activeSessionExercise == null
      ? 0
      : workoutSets.filter(
          (s) => s.session_exercise_id === activeSessionExercise.id && !s.is_warmup,
        ).length;
  const activeTargetSetsGoal = activeSessionExercise?.target_sets ?? null;
  const activeTargetSetsMet =
    activeTargetSetsGoal != null &&
    activeTargetSetsGoal > 0 &&
    activeWorkingSetCount >= activeTargetSetsGoal;
  const stickyHideAddSetButton =
    shouldUseSingleExerciseFlow &&
    canManageSets &&
    activeTargetSetsMet &&
    !compactShowExtraSetComposer;
  const stickyNextLabel = oneValueActive
    ? "Next exercise"
    : stickyHideAddSetButton && activeExerciseIndex < sessionExercises.length - 1
      ? "Next exercise"
      : "Next";

  const activeOneValueSets = activeSessionExercise
    ? setsForSessionExercise(workoutSets, activeSessionExercise.id)
    : [];
  const activeOneValuePrefill = activeSessionExercise
    ? resolveSuggestedAddDraft(activeSessionExercise, activeOneValueSets, undefined)
    : emptySetDraft;
  const activeOneValuePresence =
    oneValueActive && activeSessionExercise
      ? visibleOneValuePresence(oneValueByExercise[activeSessionExercise.id], activeOneValuePrefill)
      : null;
  const activeLastSet = activeSessionExercise
    ? lastLoggedSet(workoutSets, activeSessionExercise.id)
    : null;

  function writeActivePresence(next: OneValuePresence) {
    if (!activeSessionExercise) {
      return;
    }
    const sessionExerciseId = activeSessionExercise.id;
    setOneValueByExercise((prev) => ({ ...prev, [sessionExerciseId]: next }));
  }

  function updateActiveEntry(mutate: (step: OneValueStep) => OneValueStep) {
    if (!activeOneValuePresence || activeOneValuePresence.status !== "entry") {
      return;
    }
    setOneValueError(null);
    writeActivePresence({ status: "entry", step: mutate(activeOneValuePresence.step) });
  }

  function startOneValueSet() {
    if (!activeSessionExercise) {
      return;
    }
    const prefill = resolveSuggestedAddDraft(
      activeSessionExercise,
      setsForSessionExercise(workoutSets, activeSessionExercise.id),
      undefined,
    );
    setOneValueError(null);
    writeActivePresence({ status: "entry", step: freshLoadStep(prefill) });
  }

  async function saveOneValueSet(step: OneValueStep) {
    if (!activeSessionExercise) {
      return;
    }
    const load = parseOneValueLoad(step.weightKg);
    if (!load.ok) {
      setOneValueError(load.message);
      return;
    }
    const reps = parseOneValueReps(step.reps);
    if (!reps.ok) {
      setOneValueError(reps.message);
      return;
    }
    const sessionExercise = activeSessionExercise;
    const saved = await handleAddSet(sessionExercise.id, {
      reps: String(reps.reps),
      weightKg: load.weightKg == null ? "" : String(load.weightKg),
      isWarmup: step.isWarmup,
    });
    if (!saved) {
      return;
    }
    const merged = [
      ...setsForSessionExercise(workoutSets, sessionExercise.id),
      { is_warmup: step.isWarmup, reps: reps.reps, weight_kg: load.weightKg },
    ];
    const advance = advanceAfterSavedSet({
      workingSetCount: merged.filter((set) => !set.is_warmup).length,
      targetWorkingSets: sessionExercise.target_sets,
    });
    setOneValueError(null);
    if (advance === "next-load") {
      const prefill = resolveSuggestedAddDraft(sessionExercise, merged, undefined);
      setOneValueByExercise((prev) => ({
        ...prev,
        [sessionExercise.id]: { status: "entry", step: freshLoadStep(prefill) },
      }));
      return;
    }
    setOneValueByExercise((prev) => ({
      ...prev,
      [sessionExercise.id]: { status: "paused", reason: advance },
    }));
  }

  function onOneValuePrimary() {
    if (!activeOneValuePresence) {
      return;
    }
    const action = oneValuePrimaryAction(activeOneValuePresence);
    if (action === "add-set" || action === "add-another") {
      startOneValueSet();
      return;
    }
    if (activeOneValuePresence.status !== "entry") {
      return;
    }
    if (action === "next") {
      const result = goToReps(activeOneValuePresence.step);
      if (!result.ok) {
        setOneValueError(result.message);
        return;
      }
      setOneValueError(null);
      writeActivePresence({ status: "entry", step: result.step });
      return;
    }
    void saveOneValueSet(activeOneValuePresence.step);
  }

  function onOneValueBack() {
    if (!activeOneValuePresence || activeOneValuePresence.status !== "entry") {
      return;
    }
    setOneValueError(null);
    if (activeOneValuePresence.step.screen === "reps") {
      writeActivePresence({
        status: "entry",
        step: backToLoad(activeOneValuePresence.step),
      });
      return;
    }
    writeActivePresence({ status: "left" });
  }

  function openNextExerciseOneValue() {
    const nextIndex = Math.min(sessionExercises.length - 1, activeExerciseIndex + 1);
    const nextExercise = sessionExercises[nextIndex];
    if (!nextExercise || nextIndex === activeExerciseIndex) {
      return;
    }
    const prefill = resolveSuggestedAddDraft(
      nextExercise,
      setsForSessionExercise(workoutSets, nextExercise.id),
      undefined,
    );
    setOneValueByExercise((prev) => ({
      ...prev,
      [nextExercise.id]: presenceForNextExercise(prev[nextExercise.id], prefill),
    }));
    setActiveExerciseIndex(nextIndex);
  }

  return (
    <PageShell
      className={
        isCompactView
          ? "max-md:!pb-[calc(11rem+env(safe-area-inset-bottom,0px))]"
          : undefined
      }
    >
      <DocumentTitle
        page={sessionNumber != null ? workoutSessionPageTitle(sessionNumber) : null}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {isCompactView ? (
          <div className="flex w-full items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                Workout session #{sessionNumber ?? "-"}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span>{formattedPerformedOn}</span>
                {isPlannedSession ? (
                  <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-700">
                    Planned
                  </span>
                ) : null}
                {createdFromLabel ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                    Created from: {createdFromLabel}
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={goBack}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-4 w-4 text-sky-700" />
              Back
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workout session #{sessionNumber ?? "-"}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>{formattedPerformedOn}</span>
              {isPlannedSession ? (
                <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-700">
                  Planned
                </span>
              ) : null}
              {createdFromLabel ? (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                  Created from: {createdFromLabel}
                </span>
              ) : null}
            </p>
          </div>
        )}
        <div
          className={`flex flex-wrap items-center gap-2 lg:justify-end ${
            isCompactView ? "w-full" : ""
          }`}
        >
          {!isReadOnly ? (
            <>
              <button
                type="button"
                onClick={() => setIsDeleteSessionConfirmOpen(true)}
                disabled={isDeletingSession || isSavingSet}
                className={`inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 ${
                  isCompactView ? "h-10 flex-1 justify-center" : "w-fit"
                }`}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
                {isDeletingSession ? "Deleting..." : "Delete session"}
              </button>
              {isDeleteSessionConfirmOpen ? (
                <div
                  className={`flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 ${
                    isCompactView ? "w-full flex-wrap justify-center" : ""
                  }`}
                >
                  <span className="text-xs text-red-800">
                    Delete session #{sessionNumber ?? "?"}?
                  </span>
                  <button
                    type="button"
                    onClick={deleteSession}
                    disabled={isDeletingSession}
                    className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-800 hover:border-red-500 hover:bg-red-100 disabled:opacity-60"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteSessionConfirmOpen(false)}
                    disabled={isDeletingSession}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
              onClick={() => {
                clearMessage();
                setIsReadOnly((prev) => !prev);
              }}
            className={
              isCompactView
                ? "inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900"
                : "inline-flex w-fit items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900"
            }
          >
            {isReadOnly ? (
              <LockOpen className="h-4 w-4 text-sky-700" />
            ) : (
              <Lock className="h-4 w-4 text-sky-700" />
            )}
            {isReadOnly ? "Unlock" : "Lock"}
          </button>
          {!isCompactView ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex w-fit items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4 text-sky-700" />
              Back
            </button>
          ) : null}
        </div>
      </div>
      {!isReadOnly ? (
        <label className="inline-flex items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={oneValueLogging}
            onChange={(event) => setOneValueLogging(event.target.checked)}
          />
          One value at a time
        </label>
      ) : null}
      <section className="text-sm">
        {isReadOnly && session.notes?.trim() ? (
          <p className={panelInsetClass("p-3")}>
            <span className="font-medium">Notes:</span> {session.notes}
          </p>
        ) : null}
        {!isReadOnly ? (
          <div className={panelInsetClass("mt-3 space-y-3 p-4")}>
            {!isEditingSessionDetails ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-700">Performed on</p>
                    <p className="mt-0.5 tabular-nums text-zinc-900">{formattedPerformedOn}</p>
                  </div>
                  <div className="flex shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={beginEditingSessionDetails}
                      disabled={isSavingSessionDetails || isDeletingSession}
                      className="inline-flex h-8 w-[72px] items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 disabled:opacity-60 sm:w-20"
                    >
                      <Pencil className="h-3 w-3 text-sky-700" aria-hidden />
                      Edit
                    </button>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-zinc-700">Notes</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-zinc-900">
                    {session.notes?.trim() ? (
                      session.notes
                    ) : (
                      <span className="text-zinc-500">None</span>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="session-performed-on-edit"
                      className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-zinc-800"
                    >
                      <CalendarDays className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                      Performed on
                    </label>
                    <DateInput
                      id="session-performed-on-edit"
                      value={performedOnDraft}
                      onChange={(event) => {
                        setPerformedOnDraft(event.target.value);
                        setSessionDetailsDateError(null);
                      }}
                      className="block w-full max-w-[11rem] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm md:max-w-xs"
                    />
                    {sessionDetailsDateError ? (
                      <p className="mt-1 text-sm text-red-600" role="alert">
                        {sessionDetailsDateError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 self-end md:flex-row md:justify-end md:self-start">
                    <button
                      type="button"
                      onClick={() => void saveSessionDetails()}
                      disabled={
                        !sessionDetailsDirty || isSavingSessionDetails || isDeletingSession
                      }
                      className="inline-flex w-24 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                      {isSavingSessionDetails ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingSessionDetails}
                      disabled={isSavingSessionDetails}
                      className="inline-flex w-24 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      <X className="h-3 w-3 text-zinc-500" aria-hidden />
                      Cancel
                    </button>
                  </div>
                </div>
                <div>
                  <NotesTextareaField
                    label="Session notes (optional)"
                    value={notesDraft}
                    onChange={(next) => {
                      setNotesDraft(next);
                      setSessionDetailsNotesError(null);
                    }}
                    placeholder="Optional notes for this workout"
                    maxLength={maxSessionNotesLength}
                    heightClassName="h-28"
                  />
                  {sessionDetailsNotesError ? (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {sessionDetailsNotesError}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : null}
        {message ? (
          <StatusNotice message={message} tone={messageTone} onDismiss={clearMessage} className="mt-3" />
        ) : null}

        {sessionExercises.length === 0 ? (
          <section className={panelInsetClass("mt-4 p-4 text-sm text-zinc-600")}>
            No exercises were added to this session.
          </section>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleExercises.map(({ item: sessionExercise, index }) => (
              <SessionExerciseBlock
                key={sessionExercise.id}
                sessionExercise={sessionExercise}
                index={index}
                exerciseCount={sessionExercises.length}
                workoutSets={workoutSets}
                addDrafts={addDrafts}
                exerciseLabel={
                  exerciseLabels.get(sessionExercise.exercise_id) ?? sessionExercise.exercise_id
                }
                exerciseBadge={exerciseBadgeById.get(sessionExercise.exercise_id)}
                exerciseSlug={exerciseSlugById.get(sessionExercise.exercise_id)}
                sessionId={sessionId ?? null}
                isReadOnly={isReadOnly}
                shouldUseSingleExerciseFlow={shouldUseSingleExerciseFlow}
                isCompactView={isCompactView}
                canManageSets={canManageSets}
                isPlannedSession={isPlannedSession}
                isSavingSet={isSavingSet}
                compactShowExtraSetComposer={compactShowExtraSetComposer}
                fullAddSetRowExpanded={fullViewExpandAddSetRowIds.has(sessionExercise.id)}
                targetsOpenInline={
                  targetsSessionExerciseId === sessionExercise.id && !isTargetsSheetOpen
                }
                targetsSets={targetsSets}
                targetsReps={targetsReps}
                targetsWeightKg={targetsWeightKg}
                isSavingTargets={isSavingTargets}
                editingSetId={editingSetId}
                editDraft={editDraft}
                onEditDraftChange={setEditDraft}
                onUpdateAddDraft={updateAddDraft}
                onToggleTargets={() => {
                  const isOpenForThisExercise =
                    targetsSessionExerciseId === sessionExercise.id && !isTargetsSheetOpen;
                  if (isOpenForThisExercise) {
                    cancelTargetsEdit();
                    return;
                  }
                  startTargetsEdit(sessionExercise, "inline");
                }}
                onCancelTargets={cancelTargetsEdit}
                onSaveTargets={() => {
                  void saveTargetsForExercise();
                }}
                onTargetsSetsChange={setTargetsSets}
                onTargetsRepsChange={setTargetsReps}
                onTargetsWeightChange={setTargetsWeightKg}
                onAddWarmups={(sessionExerciseId) => {
                  void handleAddWarmups(sessionExerciseId);
                }}
                suggestTarget={
                  !targetSuggestionsDisabledExerciseIds.has(sessionExercise.exercise_id)
                }
                suggestWarmups={!warmupSuggestionsDisabledExerciseIds.has(sessionExercise.exercise_id)}
                maxWarmupSets={maxSuggestedWarmupSets}
                onAddSet={(sessionExerciseId) => {
                  void handleAddSet(sessionExerciseId);
                }}
                onStartEdit={startEdit}
                onSaveEdit={(setId) => {
                  void saveEdit(setId);
                }}
                onCancelEdit={cancelEdit}
                onDeleteSet={(setId) => {
                  void deleteSet(setId);
                }}
                onNextExercise={() =>
                  setActiveExerciseIndex((prev) => Math.min(sessionExercises.length - 1, prev + 1))
                }
                onAddExercise={() => setIsAddExerciseSheetOpen(true)}
                onShowExtraSets={() => setCompactShowExtraSetComposer(true)}
                onExpandFullAddSetRow={() =>
                  setFullViewExpandAddSetRowIds((prev) => {
                    const next = new Set(prev);
                    next.add(sessionExercise.id);
                    return next;
                  })
                }
                oneValueLogging={oneValueActive}
                oneValueLogger={
                  oneValueActive &&
                  activeOneValuePresence &&
                  activeSessionExercise &&
                  sessionExercise.id === activeSessionExercise.id ? (
                    <OneValueSetLogger
                      exerciseId={sessionExercise.id}
                      exerciseName={
                        exerciseLabels.get(sessionExercise.exercise_id) ?? sessionExercise.exercise_id
                      }
                      presence={activeOneValuePresence}
                      workingSetNumber={nextWorkingSetNumber(activeWorkingSetCount)}
                      targetWorkingSets={
                        activeTargetSetsGoal != null && activeTargetSetsGoal > 0
                          ? activeTargetSetsGoal
                          : null
                      }
                      lastSet={activeLastSet}
                      fieldError={oneValueError}
                      isSaving={isSavingSet}
                      showPrimaryInPanel={!isCompactView}
                      hasNextExercise={activeExerciseIndex < sessionExercises.length - 1}
                      showExerciseNav={!isCompactView}
                      isPreviousDisabled={activeExerciseIndex === 0}
                      onWeightChange={(value) =>
                        updateActiveEntry((step) => ({ ...step, weightKg: value }))
                      }
                      onRepsChange={(value) => updateActiveEntry((step) => ({ ...step, reps: value }))}
                      onWarmupChange={(value) =>
                        updateActiveEntry((step) => ({ ...step, isWarmup: value }))
                      }
                      onStepWeight={(delta) =>
                        updateActiveEntry((step) => ({
                          ...step,
                          weightKg: stepLoadedWeight(step.weightKg, delta),
                        }))
                      }
                      onStepReps={(delta) =>
                        updateActiveEntry((step) => ({ ...step, reps: stepReps(step.reps, delta) }))
                      }
                      onPrimary={onOneValuePrimary}
                      onBack={onOneValueBack}
                      onNextExercise={openNextExerciseOneValue}
                      onPreviousExercise={() =>
                        setActiveExerciseIndex((prev) => Math.max(0, prev - 1))
                      }
                    />
                  ) : null
                }
              />
            ))}
          </div>
        )}

        {!isReadOnly ? (
          isCompactView ? (
            null
          ) : (
            <section className="panel mt-4 p-5 text-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddExerciseExpanded((prev) => !prev)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 hover:text-zinc-900"
                  aria-label={isAddExerciseExpanded ? "Collapse add exercise section" : "Expand add exercise section"}
                >
                  {isAddExerciseExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddExerciseExpanded((prev) => !prev)}
                  className="text-base font-medium hover:text-zinc-900"
                >
                  Add exercise to this session
                </button>
              </div>
              {isAddExerciseExpanded ? (
                <>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium sm:col-span-2">
                      Exercise
                      <ExerciseSearchSelect
                        className="mt-1 w-full"
                        options={addExercisePickerOptions}
                        value={addExerciseDraft.exerciseId}
                        onChange={(exerciseId) =>
                          setAddExerciseDraft((prev) => ({ ...prev, exerciseId }))
                        }
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Base weight (kg)
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={addExerciseDraft.baseWeightKg}
                        onChange={(event) =>
                          setAddExerciseDraft((prev) => ({ ...prev, baseWeightKg: event.target.value }))
                        }
                        className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                        placeholder="e.g. 20"
                      />
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[20, 15, 10, 0].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setAddExerciseDraft((prev) => ({
                                ...prev,
                                baseWeightKg: value === 0 ? "" : String(value),
                              }))
                            }
                            className="rounded border bg-white px-2 py-0.5 text-xs"
                          >
                            +{value}
                          </button>
                        ))}
                      </div>
                    </label>
                    <p className="text-xs text-zinc-600 sm:col-span-2">
                      Target fields apply to working sets only; warmups do not count.
                    </p>
                    <label className="block text-sm font-medium">
                      Target working sets
                      <input
                        type="number"
                        min={1}
                        value={addExerciseDraft.targetSets}
                        onChange={(event) =>
                          setAddExerciseDraft((prev) => ({ ...prev, targetSets: event.target.value }))
                        }
                        className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                        placeholder="e.g. 3"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Target weight (kg)
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={addExerciseDraft.targetWeightKg}
                        onChange={(event) =>
                          setAddExerciseDraft((prev) => ({
                            ...prev,
                            targetWeightKg: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                        placeholder="e.g. 60"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Target reps (working sets)
                      <input
                        type="number"
                        min={1}
                        value={addExerciseDraft.targetReps}
                        onChange={(event) =>
                          setAddExerciseDraft((prev) => ({ ...prev, targetReps: event.target.value }))
                        }
                        className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                        placeholder="e.g. 8"
                      />
                    </label>
                    {addExerciseDraft.exerciseId ? (
                      <div className="sm:col-span-2">
                        <TargetWeightSuggestion
                          exerciseId={addExerciseDraft.exerciseId}
                          plannedReps={addExerciseDraft.targetReps}
                          currentWeightKg={addExerciseDraft.targetWeightKg}
                          excludeSessionId={sessionId ?? null}
                          enabled={targetSuggestionsEnabled(
                            !targetSuggestionsDisabledExerciseIds.has(addExerciseDraft.exerciseId),
                          )}
                          onApply={(weightKg) =>
                            setAddExerciseDraft((prev) => ({ ...prev, targetWeightKg: weightKg }))
                          }
                        />
                      </div>
                    ) : null}
                    <div className="sm:col-span-2">
                      <NotesTextareaField
                        label="Notes (optional)"
                        value={addExerciseDraft.notes}
                        onChange={(nextValue) =>
                          setAddExerciseDraft((prev) => ({ ...prev, notes: nextValue }))
                        }
                        placeholder="Optional exercise notes"
                        maxLength={maxExerciseNotesLength}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={addExerciseToSession}
                      disabled={isAddingExercise}
                      className="inline-flex h-10 items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
                    >
                    <Plus className="h-3.5 w-3.5 text-sky-700" />
                      {isAddingExercise ? "Adding..." : "Add exercise"}
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          )
        ) : null}
      </section>

      {isCompactView && !isReadOnly && activeSessionExercise ? (
        <CompactStickyBar
          actions={
            <>
              <button
                type="button"
                onClick={() => setIsAddExerciseSheetOpen(true)}
                className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 text-xs font-medium text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-sky-300 hover:bg-zinc-100 sm:px-2.5 sm:text-sm"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
                <span className="truncate">Add exercise</span>
              </button>
              <button
                type="button"
                onClick={() => startTargetsEdit(activeSessionExercise, "sheet")}
                title="Edit planned working-set targets (warmups do not count)."
                className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 text-xs font-medium text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-sky-300 hover:bg-zinc-100 sm:px-2.5 sm:text-sm"
              >
                <ListChecks className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
                <span className="truncate">Set targets</span>
              </button>
              {oneValueActive && activeOneValuePresence ? (
                <button
                  type="button"
                  onClick={onOneValuePrimary}
                  disabled={isSavingSet}
                  className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-2 text-xs font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.14)] hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:px-2.5 sm:text-sm"
                >
                  <span className="text-center leading-tight">
                    {isSavingSet && oneValuePrimaryAction(activeOneValuePresence) === "save"
                      ? "Saving..."
                      : oneValuePrimaryLabel(oneValuePrimaryAction(activeOneValuePresence))}
                  </span>
                </button>
              ) : canManageSets && !stickyHideAddSetButton ? (
                <button
                  type="button"
                  onClick={() => handleAddSet(activeSessionExercise.id)}
                  disabled={isSavingSet || isPlannedSession}
                  className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-2 text-xs font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.14)] hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:px-2.5 sm:text-sm"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{isSavingSet ? "Adding..." : "Add set"}</span>
                </button>
              ) : null}
            </>
          }
          progressLabel={`${activeExerciseIndex + 1}/${sessionExercises.length}`}
          onPrevious={() => setActiveExerciseIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => {
            if (oneValueActive) {
              openNextExerciseOneValue();
              return;
            }
            setActiveExerciseIndex((prev) => Math.min(sessionExercises.length - 1, prev + 1));
          }}
          isPreviousDisabled={activeExerciseIndex === 0}
          isNextDisabled={activeExerciseIndex === sessionExercises.length - 1}
          nextLabel={stickyNextLabel}
        />
      ) : null}
      {!isReadOnly && isTargetsSheetOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            role="button"
            tabIndex={0}
            aria-label="Close targets form"
            onClick={() => {
              cancelTargetsEdit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                cancelTargetsEdit();
              }
            }}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl bg-white p-4 shadow-2xl">
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-3 flex items-center justify-between">
                <SectionHeading>Set targets</SectionHeading>
                <button
                  type="button"
                  onClick={cancelTargetsEdit}
                  className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                >
                  Close
                </button>
              </div>
              <p className="mb-2 text-xs text-zinc-600">{targetsExerciseLabel}</p>
              <p className="mb-3 text-xs text-zinc-600">
                Values apply to working sets only; warmups do not count.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm font-medium">
                  Target working sets
                  <input
                    type="number"
                    min={1}
                    value={targetsSets}
                    onChange={(event) => setTargetsSets(event.target.value)}
                    className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                    placeholder="e.g. 3"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Target weight (kg)
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={targetsWeightKg}
                    onChange={(event) => setTargetsWeightKg(event.target.value)}
                    className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                    placeholder="e.g. 60"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Target reps (working sets)
                  <input
                    type="number"
                    min={1}
                    value={targetsReps}
                    onChange={(event) => setTargetsReps(event.target.value)}
                    className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                    placeholder="e.g. 8"
                  />
                </label>
              </div>
              {targetsExerciseId ? (
                <TargetWeightSuggestion
                  exerciseId={targetsExerciseId}
                  plannedReps={targetsReps}
                  currentWeightKg={targetsWeightKg}
                  excludeSessionId={sessionId ?? null}
                  enabled={targetSuggestionsEnabled(
                    !targetSuggestionsDisabledExerciseIds.has(targetsExerciseId),
                  )}
                  onApply={setTargetsWeightKg}
                />
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={cancelTargetsEdit}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                >
                  <X className="h-3.5 w-3.5 text-zinc-500" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveTargetsForExercise()}
                  disabled={isSavingTargets}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5 text-white" />
                  {isSavingTargets ? "Saving..." : "Save targets"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isCompactView && !isReadOnly && isAddExerciseSheetOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            role="button"
            tabIndex={0}
            aria-label="Close add exercise form"
            onClick={() => setIsAddExerciseSheetOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsAddExerciseSheetOpen(false);
              }
            }}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl bg-white p-4 shadow-2xl">
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-3 flex items-center justify-between">
                <SectionHeading>Add exercise</SectionHeading>
                <button
                  type="button"
                  onClick={() => setIsAddExerciseSheetOpen(false)}
                  className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                >
                  Close
                </button>
              </div>
              <div className="grid gap-3">
                <label className="block text-sm font-medium">
                  Exercise
                  <ExerciseSearchSelect
                    className="mt-1 w-full"
                    options={addExercisePickerOptions}
                    value={addExerciseDraft.exerciseId}
                    onChange={(exerciseId) =>
                      setAddExerciseDraft((prev) => ({ ...prev, exerciseId }))
                    }
                  />
                </label>
                <p className="text-xs text-zinc-600">
                  Target fields apply to working sets only; warmups do not count.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium">
                    Base (kg)
                    <input
                      type="number"
                      min={0}
                      step="0.25"
                      value={addExerciseDraft.baseWeightKg}
                      onChange={(event) =>
                        setAddExerciseDraft((prev) => ({ ...prev, baseWeightKg: event.target.value }))
                      }
                      className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Target working sets
                    <input
                      type="number"
                      min={1}
                      value={addExerciseDraft.targetSets}
                      onChange={(event) =>
                        setAddExerciseDraft((prev) => ({ ...prev, targetSets: event.target.value }))
                      }
                      className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                      placeholder="e.g. 3"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Target weight (kg)
                    <input
                      type="number"
                      min={0}
                      step="0.25"
                      value={addExerciseDraft.targetWeightKg}
                      onChange={(event) =>
                        setAddExerciseDraft((prev) => ({ ...prev, targetWeightKg: event.target.value }))
                      }
                      className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                      placeholder="e.g. 60"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Target reps (working sets)
                    <input
                      type="number"
                      min={1}
                      value={addExerciseDraft.targetReps}
                      onChange={(event) =>
                        setAddExerciseDraft((prev) => ({ ...prev, targetReps: event.target.value }))
                      }
                      className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                      placeholder="e.g. 8"
                    />
                  </label>
                </div>
                {addExerciseDraft.exerciseId ? (
                  <TargetWeightSuggestion
                    exerciseId={addExerciseDraft.exerciseId}
                    plannedReps={addExerciseDraft.targetReps}
                    currentWeightKg={addExerciseDraft.targetWeightKg}
                    excludeSessionId={sessionId ?? null}
                    enabled={targetSuggestionsEnabled(
                      !targetSuggestionsDisabledExerciseIds.has(addExerciseDraft.exerciseId),
                    )}
                    onApply={(weightKg) =>
                      setAddExerciseDraft((prev) => ({ ...prev, targetWeightKg: weightKg }))
                    }
                  />
                ) : null}
                <NotesTextareaField
                  label="Notes (optional)"
                  value={addExerciseDraft.notes}
                  onChange={(nextValue) =>
                    setAddExerciseDraft((prev) => ({ ...prev, notes: nextValue }))
                  }
                  placeholder="Optional exercise notes"
                  maxLength={maxExerciseNotesLength}
                />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddExerciseSheetOpen(false)}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addExerciseToSession}
                    disabled={isAddingExercise}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5 text-white" />
                    {isAddingExercise ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
