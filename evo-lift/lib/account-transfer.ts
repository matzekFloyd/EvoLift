import { exerciseDefaultsSaveError } from "@/app/account/account-form";
import { validateBodyMetricsInput, type ProfileSex } from "@/lib/body-metrics";
import {
  BODYWEIGHT_DATE_TAKEN,
  bodyweightLogEntryError,
  parseBodyweightKg,
} from "@/lib/bodyweight-log";
import { parseGoalForm, roundKg } from "@/lib/milestone-progress";
import { MAX_PLAN_DAYS } from "@/lib/plan-draft";
import { MAX_OPEN_SESSIONS, OPEN_SESSION_LIMIT_MESSAGE } from "@/lib/session-lifecycle";

export const ACCOUNT_TRANSFER_FORMAT = "evolift-account";
export const ACCOUNT_TRANSFER_VERSION = 1;
export const ACCOUNT_JSON_FILENAME = "evolift-account.json";
export const ACCOUNT_CSV_ZIP_FILENAME = "evolift-account.csv.zip";
export const MAX_ACCOUNT_TRANSFER_BYTES = 8 * 1024 * 1024;

const NOTE_LIMIT = 500;
const NAME_LIMIT = 120;
const DAY_NAME_LIMIT = 80;
const KG_LIMIT = 9999.99;
const REF_RE = /^[A-Za-z0-9_-]{1,80}$/;

export class AccountTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountTransferError";
  }
}

export type TransferExercise = {
  exercise: string;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  baseWeightKg: number | null;
  notes: string | null;
};

export type TransferSet = {
  setNumber: number;
  reps: number;
  loadedKg: number | null;
  warmup: boolean;
  performedAt: string;
  notes: string | null;
};

export type TransferSessionExercise = TransferExercise & {
  notDone: boolean;
  sets: TransferSet[];
};

export type AccountProfileTransfer = {
  bodyweightKg: number | null;
  heightCm: number | null;
  sex: ProfileSex | null;
  dateOfBirth: string | null;
};

export type AccountTransfer = {
  format: typeof ACCOUNT_TRANSFER_FORMAT;
  version: typeof ACCOUNT_TRANSFER_VERSION;
  profile: AccountProfileTransfer;
  bodyweightLog: Array<{ loggedOn: string; bodyweightKg: number }>;
  hiddenExercises: string[];
  exerciseDefaults: Array<{
    exercise: string;
    baseWeightKg: number | null;
    targetSets: number | null;
    targetReps: number | null;
    targetWeightKg: number | null;
    suggestWarmups: boolean;
    suggestTarget: boolean;
    maxSuggestedWarmupSets: number | null;
  }>;
  templates: Array<{
    ref: string;
    name: string;
    notes: string | null;
    exercises: TransferExercise[];
  }>;
  plans: Array<{
    ref: string;
    name: string;
    notes: string | null;
    active: boolean;
    days: Array<{
      ref: string;
      name: string;
      exercises: TransferExercise[];
    }>;
  }>;
  sessions: Array<{
    ref: string;
    performedOn: string;
    notes: string | null;
    templateRef: string | null;
    planRef: string | null;
    planDayRef: string | null;
    startedAt: string | null;
    completedAt: string | null;
    exercises: TransferSessionExercise[];
  }>;
  goals: Array<{
    exercise: string;
    type: "absolute" | "bodyweight_multiple";
    targetWeightKg: number | null;
    bodyweightMultiple: number | null;
    minReps: number;
    dueOn: string | null;
    note: string | null;
    achievedAt: string | null;
    achievedBodyweightKg: number | null;
    achievedThresholdKg: number | null;
  }>;
};

export type ExistingAccountData = {
  /** Null when the account has no profile row. */
  profile: AccountProfileTransfer | null;
  bodyweightDates: readonly string[];
  hiddenExerciseIds: readonly string[];
  defaultExerciseIds: readonly string[];
  templateNames: readonly string[];
  planNames: readonly string[];
  hasActivePlan: boolean;
  openSessionCount: number;
};

export type AccountImportMode = "add" | "replace";

export type AccountImportPayload = {
  mode: AccountImportMode;
  profile: {
    write: boolean;
    bodyweight_kg: number | null;
    height_cm: number | null;
    sex: ProfileSex | null;
    date_of_birth: string | null;
  };
  bodyweight: Array<{ logged_on: string; bodyweight_kg: number }>;
  hidden_exercise_ids: string[];
  defaults: Array<{
    exercise_id: string;
    default_base_weight_kg: number | null;
    default_target_sets: number | null;
    default_target_reps: number | null;
    default_target_weight_kg: number | null;
    suggest_warmups: boolean;
    suggest_target: boolean;
    max_suggested_warmup_sets: number | null;
  }>;
  templates: Array<{
    ref: string;
    name: string;
    notes: string | null;
    exercises: Array<{
      exercise_id: string;
      target_sets: number | null;
      target_reps: number | null;
      target_weight_kg: number | null;
      base_weight_kg: number | null;
      notes: string | null;
    }>;
  }>;
  plans: Array<{
    ref: string;
    name: string;
    notes: string | null;
    active: boolean;
    days: Array<{
      ref: string;
      name: string;
      exercises: Array<{
        exercise_id: string;
        target_sets: number | null;
        target_reps: number | null;
        target_weight_kg: number | null;
        base_weight_kg: number | null;
        notes: string | null;
      }>;
    }>;
  }>;
  sessions: Array<{
    performed_on: string;
    notes: string | null;
    template_ref: string | null;
    plan_ref: string | null;
    plan_day_ref: string | null;
    started_at: string | null;
    completed_at: string | null;
    exercises: Array<{
      exercise_id: string;
      target_sets: number | null;
      target_reps: number | null;
      target_weight_kg: number | null;
      base_weight_kg: number | null;
      notes: string | null;
      not_done: boolean;
      sets: Array<{
        set_number: number;
        reps: number;
        weight_kg: number | null;
        is_warmup: boolean;
        performed_at: string;
        notes: string | null;
      }>;
    }>;
  }>;
  goals: Array<{
    exercise_id: string;
    milestone_type: "absolute" | "bodyweight_multiple";
    target_weight_kg: number | null;
    bodyweight_multiple: number | null;
    min_reps: number;
    due_on: string | null;
    note: string | null;
    achieved_at: string | null;
    achieved_bodyweight_kg: number | null;
    achieved_threshold_kg: number | null;
  }>;
};

export function skippedExercisesMessage(slugs: readonly string[]): string | null {
  if (slugs.length === 0) {
    return null;
  }
  return `Skipped exercises that are not in the catalog: ${slugs.join(", ")}.`;
}

export function serializeAccountTransfer(document: AccountTransfer): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function parseAccountTransferJson(text: string, today: string): AccountTransfer {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new AccountTransferError("This file is not valid JSON.");
  }
  return parseAccountTransfer(value, today);
}

export function parseAccountTransfer(value: unknown, today: string): AccountTransfer {
  const body = asRecord(value, "This file is not an EvoLift account export.");
  if (body.format !== ACCOUNT_TRANSFER_FORMAT) {
    throw new AccountTransferError("This file is not an EvoLift account export.");
  }
  if (body.version !== ACCOUNT_TRANSFER_VERSION) {
    const version = typeof body.version === "number" ? String(body.version) : "unknown";
    throw new AccountTransferError(
      `This file uses account export version ${version}. This app reads version ${ACCOUNT_TRANSFER_VERSION}.`,
    );
  }

  const profile = parseProfile(requireRecord(body, "profile", "The file is missing profile."), today);
  const bodyweightLog = parseBodyweightLog(
    requireArray(body, "bodyweightLog", "The file is missing bodyweightLog."),
    today,
  );
  const hiddenExercises = uniqueSlugs(
    requireArray(body, "hiddenExercises", "The file is missing hiddenExercises.").map((entry) =>
      exerciseSlug(entry),
    ),
  );
  const exerciseDefaults = parseDefaults(
    requireArray(body, "exerciseDefaults", "The file is missing exerciseDefaults."),
  );
  const templates = parseTemplates(requireArray(body, "templates", "The file is missing templates."));
  const plans = parsePlans(requireArray(body, "plans", "The file is missing plans."));
  const sessions = parseSessions(requireArray(body, "sessions", "The file is missing sessions."));
  const goals = parseGoals(requireArray(body, "goals", "The file is missing goals."));
  assertRelationships(templates, plans, sessions);
  return {
    format: ACCOUNT_TRANSFER_FORMAT,
    version: ACCOUNT_TRANSFER_VERSION,
    profile,
    bodyweightLog,
    hiddenExercises,
    exerciseDefaults,
    templates,
    plans,
    sessions,
    goals,
  };
}

export function prepareAccountImport(input: {
  document: AccountTransfer;
  mode: AccountImportMode;
  catalog: ReadonlyMap<string, string>;
  existing: ExistingAccountData;
  today: string;
}): { payload: AccountImportPayload; skippedExercises: string[] } {
  if (input.mode !== "add" && input.mode !== "replace") {
    throw new AccountTransferError("Choose add or replace.");
  }
  const skipped = new Set<string>();
  const templates = input.document.templates.flatMap((template) => {
    const exercises = keepKnown(template.exercises, input.catalog, skipped);
    return exercises.length === 0 ? [] : [{ ...template, exercises }];
  });
  const droppedTemplates = new Set(
    input.document.templates.map((template) => template.ref).filter((ref) => !templates.some((template) => template.ref === ref)),
  );
  const plans = input.document.plans.flatMap((plan) => {
    const days = plan.days.flatMap((day) => {
      const exercises = keepKnown(day.exercises, input.catalog, skipped);
      return exercises.length === 0 ? [] : [{ ...day, exercises }];
    });
    return days.length === 0 ? [] : [{ ...plan, days }];
  });
  const droppedPlans = new Set(
    input.document.plans.map((plan) => plan.ref).filter((ref) => !plans.some((plan) => plan.ref === ref)),
  );
  const keptDays = new Set(plans.flatMap((plan) => plan.days.map((day) => day.ref)));
  const droppedDays = new Set(
    input.document.plans.flatMap((plan) => plan.days.map((day) => day.ref)).filter((ref) => !keptDays.has(ref)),
  );
  const sessions = input.document.sessions.flatMap((session) => {
    const exercises = session.exercises.flatMap((exercise) => {
      if (!input.catalog.has(exercise.exercise)) {
        skipped.add(exercise.exercise);
        return [];
      }
      return [exercise];
    });
    if (exercises.length === 0) {
      return [];
    }
    return [
      {
        ...session,
        exercises,
        templateRef:
          session.templateRef && droppedTemplates.has(session.templateRef) ? null : session.templateRef,
        planRef: session.planRef && droppedPlans.has(session.planRef) ? null : session.planRef,
        planDayRef: session.planDayRef && droppedDays.has(session.planDayRef) ? null : session.planDayRef,
      },
    ];
  });

  const openInFile = sessions.filter(isOpenSession).length;
  if (input.mode === "replace" && openInFile > MAX_OPEN_SESSIONS) {
    throw new AccountTransferError("The file has more than 3 sessions in progress.");
  }
  if (input.mode === "add" && input.existing.openSessionCount + openInFile > MAX_OPEN_SESSIONS) {
    throw new AccountTransferError(OPEN_SESSION_LIMIT_MESSAGE);
  }

  if (input.mode === "add") {
    const templateNames = new Set(input.existing.templateNames.map((name) => name.toLowerCase()));
    for (const template of templates) {
      if (templateNames.has(template.name.toLowerCase())) {
        throw new AccountTransferError(`A template named "${template.name}" is already in this account.`);
      }
    }
    const planNames = new Set(input.existing.planNames.map((name) => name.toLowerCase()));
    for (const plan of plans) {
      if (planNames.has(plan.name.toLowerCase())) {
        throw new AccountTransferError(`A plan named "${plan.name}" is already in this account.`);
      }
    }
  }

  const takenDates = new Set(input.existing.bodyweightDates.map((date) => date.slice(0, 10)));
  const hiddenIds = new Set(input.existing.hiddenExerciseIds);
  const defaultIds = new Set(input.existing.defaultExerciseIds);
  const quietActive = input.mode === "add" && input.existing.hasActivePlan;
  const idFor = (slug: string) => {
    const id = input.catalog.get(slug);
    if (!id) {
      throw new Error(`Missing catalog id for ${slug}.`);
    }
    return id;
  };

  const hidden = uniqueSlugs(
    input.document.hiddenExercises.filter((slug) => {
      if (!input.catalog.has(slug)) {
        skipped.add(slug);
        return false;
      }
      return true;
    }),
  )
    .map(idFor)
    .filter((id) => input.mode === "replace" || !hiddenIds.has(id));

  const defaults = input.document.exerciseDefaults.flatMap((row) => {
    if (!input.catalog.has(row.exercise)) {
      skipped.add(row.exercise);
      return [];
    }
    const exerciseId = idFor(row.exercise);
    if (input.mode === "add" && defaultIds.has(exerciseId)) {
      return [];
    }
    return [
      {
        exercise_id: exerciseId,
        default_base_weight_kg: row.baseWeightKg,
        default_target_sets: row.targetSets,
        default_target_reps: row.targetReps,
        default_target_weight_kg: row.targetWeightKg,
        suggest_warmups: row.suggestWarmups,
        suggest_target: row.suggestTarget,
        max_suggested_warmup_sets: row.maxSuggestedWarmupSets,
      },
    ];
  });

  const goals = input.document.goals.flatMap((goal) => {
    if (!input.catalog.has(goal.exercise)) {
      skipped.add(goal.exercise);
      return [];
    }
    return [
      {
        exercise_id: idFor(goal.exercise),
        milestone_type: goal.type,
        target_weight_kg: goal.targetWeightKg,
        bodyweight_multiple: goal.bodyweightMultiple,
        min_reps: goal.minReps,
        due_on: goal.dueOn,
        note: goal.note,
        achieved_at: goal.achievedAt,
        achieved_bodyweight_kg: goal.achievedBodyweightKg,
        achieved_threshold_kg: goal.achievedThresholdKg,
      },
    ];
  });

  return {
    skippedExercises: [...skipped].sort((a, b) => a.localeCompare(b)),
    payload: {
      mode: input.mode,
      profile: mergedProfile(input.mode, input.existing.profile, input.document.profile),
      bodyweight: input.document.bodyweightLog
        .filter((entry) => input.mode === "replace" || !takenDates.has(entry.loggedOn))
        .map((entry) => ({ logged_on: entry.loggedOn, bodyweight_kg: entry.bodyweightKg })),
      hidden_exercise_ids: hidden,
      defaults,
      templates: templates.map((template) => ({
        ref: template.ref,
        name: template.name,
        notes: template.notes,
        exercises: template.exercises.map((exercise) => prescription(exercise, idFor(exercise.exercise))),
      })),
      plans: plans.map((plan) => ({
        ref: plan.ref,
        name: plan.name,
        notes: plan.notes,
        active: quietActive ? false : plan.active,
        days: plan.days.map((day) => ({
          ref: day.ref,
          name: day.name,
          exercises: day.exercises.map((exercise) => prescription(exercise, idFor(exercise.exercise))),
        })),
      })),
      sessions: sessions.map((session) => ({
        performed_on: session.performedOn,
        notes: session.notes,
        template_ref: session.templateRef,
        plan_ref: session.planRef,
        plan_day_ref: session.planDayRef,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        exercises: session.exercises.map((exercise) => ({
          ...prescription(exercise, idFor(exercise.exercise)),
          not_done: exercise.notDone,
          sets: exercise.sets.map((set) => ({
            set_number: set.setNumber,
            reps: set.reps,
            weight_kg: set.loadedKg,
            is_warmup: set.warmup,
            performed_at: set.performedAt,
            notes: set.notes,
          })),
        })),
      })),
      goals,
    },
  };
}

function prescription(exercise: TransferExercise, exerciseId: string) {
  return {
    exercise_id: exerciseId,
    target_sets: exercise.targetSets,
    target_reps: exercise.targetReps,
    target_weight_kg: exercise.targetWeightKg,
    base_weight_kg: exercise.baseWeightKg,
    notes: exercise.notes,
  };
}

function mergedProfile(
  mode: AccountImportMode,
  existing: AccountProfileTransfer | null,
  incoming: AccountProfileTransfer,
): AccountImportPayload["profile"] {
  if (mode === "replace" || existing == null) {
    const hasValue =
      incoming.bodyweightKg != null ||
      incoming.heightCm != null ||
      incoming.sex != null ||
      incoming.dateOfBirth != null;
    return {
      write: mode === "replace" || hasValue,
      bodyweight_kg: incoming.bodyweightKg,
      height_cm: incoming.heightCm,
      sex: incoming.sex,
      date_of_birth: incoming.dateOfBirth,
    };
  }
  const merged = {
    bodyweight_kg: existing.bodyweightKg ?? incoming.bodyweightKg,
    height_cm: existing.heightCm ?? incoming.heightCm,
    sex: existing.sex ?? incoming.sex,
    date_of_birth: existing.dateOfBirth ?? incoming.dateOfBirth,
  };
  const changed =
    merged.bodyweight_kg !== existing.bodyweightKg ||
    merged.height_cm !== existing.heightCm ||
    merged.sex !== existing.sex ||
    merged.date_of_birth !== existing.dateOfBirth;
  return { write: changed, ...merged };
}

function keepKnown<T extends { exercise: string }>(
  rows: readonly T[],
  catalog: ReadonlyMap<string, string>,
  skipped: Set<string>,
): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    if (catalog.has(row.exercise)) {
      kept.push(row);
    } else {
      skipped.add(row.exercise);
    }
  }
  return kept;
}

function isOpenSession(session: { startedAt: string | null; completedAt: string | null }): boolean {
  return session.startedAt != null && session.completedAt == null;
}

function parseProfile(body: Record<string, unknown>, today: string): AccountProfileTransfer {
  requireKey(body, "bodyweightKg", "The file is missing profile.bodyweightKg.");
  requireKey(body, "heightCm", "The file is missing profile.heightCm.");
  requireKey(body, "sex", "The file is missing profile.sex.");
  requireKey(body, "dateOfBirth", "The file is missing profile.dateOfBirth.");
  const parsed = validateBodyMetricsInput(
    {
      bodyweightKg: metricText(body.bodyweightKg),
      heightCm: metricText(body.heightCm),
      sex: body.sex == null ? "" : typeof body.sex === "string" ? body.sex : "invalid",
      dateOfBirth: body.dateOfBirth == null ? "" : typeof body.dateOfBirth === "string" ? body.dateOfBirth : "invalid",
    },
    today,
  );
  if (!parsed.ok) {
    throw new AccountTransferError(parsed.message);
  }
  return {
    bodyweightKg: parsed.value.bodyweight_kg,
    heightCm: parsed.value.height_cm,
    sex: parsed.value.sex,
    dateOfBirth: parsed.value.date_of_birth,
  };
}

function parseBodyweightLog(rows: unknown[], today: string): AccountTransfer["bodyweightLog"] {
  const taken: string[] = [];
  return rows.map((row) => {
    const body = asRecord(row, "The file has an invalid bodyweight entry.");
    requireKey(body, "loggedOn", "The file is missing bodyweight loggedOn.");
    requireKey(body, "bodyweightKg", "The file is missing bodyweightKg.");
    const loggedOn = typeof body.loggedOn === "string" ? body.loggedOn : "";
    const weightText = metricText(body.bodyweightKg);
    const message = bodyweightLogEntryError({
      bodyweightKg: weightText,
      loggedOn,
      today,
      takenDates: taken,
    });
    if (message === BODYWEIGHT_DATE_TAKEN) {
      throw new AccountTransferError(`The file lists bodyweight on ${loggedOn.slice(0, 10)} more than once.`);
    }
    if (message) {
      throw new AccountTransferError(message);
    }
    const bodyweightKg = parseBodyweightKg(weightText);
    if (bodyweightKg == null) {
      throw new AccountTransferError("Please enter a valid bodyweight.");
    }
    const date = loggedOn.slice(0, 10);
    taken.push(date);
    return { loggedOn: date, bodyweightKg: roundKg(bodyweightKg) };
  });
}

function parseDefaults(rows: unknown[]): AccountTransfer["exerciseDefaults"] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const body = asRecord(row, "The file has invalid exercise defaults.");
    const exercise = exerciseSlug(body.exercise);
    if (seen.has(exercise)) {
      throw new AccountTransferError(`The file lists defaults for ${exercise} more than once.`);
    }
    seen.add(exercise);
    requireKey(body, "baseWeightKg", `Defaults for ${exercise} are missing baseWeightKg.`);
    requireKey(body, "targetSets", `Defaults for ${exercise} are missing targetSets.`);
    requireKey(body, "targetReps", `Defaults for ${exercise} are missing targetReps.`);
    requireKey(body, "targetWeightKg", `Defaults for ${exercise} are missing targetWeightKg.`);
    requireKey(body, "suggestWarmups", `Defaults for ${exercise} are missing suggestWarmups.`);
    requireKey(body, "suggestTarget", `Defaults for ${exercise} are missing suggestTarget.`);
    requireKey(body, "maxSuggestedWarmupSets", `Defaults for ${exercise} are missing maxSuggestedWarmupSets.`);
    const suggestWarmups = requiredBoolean(body.suggestWarmups, `suggestWarmups for ${exercise}`);
    const suggestTarget = requiredBoolean(body.suggestTarget, `suggestTarget for ${exercise}`);
    const maxSuggestedWarmupSets = optionalPositiveInt(
      body.maxSuggestedWarmupSets,
      `max warmup sets for ${exercise}`,
    );
    const message = exerciseDefaultsSaveError({
      userId: "signed-in",
      exerciseId: exercise,
      baseWeightKg: metricText(body.baseWeightKg),
      targetSets: metricText(body.targetSets),
      targetReps: metricText(body.targetReps),
      targetWeightKg: metricText(body.targetWeightKg),
      maxWarmupSets: body.maxSuggestedWarmupSets == null ? "" : metricText(body.maxSuggestedWarmupSets),
    });
    if (message) {
      throw new AccountTransferError(`Defaults for ${exercise}: ${message}`);
    }
    return {
      exercise,
      baseWeightKg: optionalKg(body.baseWeightKg, `base weight for ${exercise}`),
      targetSets: optionalPositiveInt(body.targetSets, `target sets for ${exercise}`),
      targetReps: optionalPositiveInt(body.targetReps, `target reps for ${exercise}`),
      targetWeightKg: optionalKg(body.targetWeightKg, `target weight for ${exercise}`),
      suggestWarmups,
      suggestTarget,
      maxSuggestedWarmupSets,
    };
  });
}

function parseTemplates(rows: unknown[]): AccountTransfer["templates"] {
  const refs = new Set<string>();
  const names = new Set<string>();
  return rows.map((row) => {
    const body = asRecord(row, "The file has an invalid template.");
    const ref = requiredRef(body.ref, "template ref");
    if (refs.has(ref)) {
      throw new AccountTransferError(`The file uses the template ref ${ref} more than once.`);
    }
    refs.add(ref);
    const name = requiredName(body.name, "Please enter a template name.", "Template name cannot be longer than 120 characters.");
    const key = name.toLowerCase();
    if (names.has(key)) {
      throw new AccountTransferError(`The file lists the template name ${name} more than once.`);
    }
    names.add(key);
    const exercises = parseExerciseList(
      requireArray(body, "exercises", `Template "${name}" is missing exercises.`),
      `Template "${name}"`,
    );
    if (exercises.length === 0) {
      throw new AccountTransferError(`Template "${name}" has no exercises.`);
    }
    return {
      ref,
      name,
      notes: optionalText(requiredValue(body, "notes", `Template "${name}" is missing notes.`), "Template notes"),
      exercises,
    };
  });
}

function parsePlans(rows: unknown[]): AccountTransfer["plans"] {
  const refs = new Set<string>();
  const names = new Set<string>();
  let activeCount = 0;
  const plans = rows.map((row) => {
    const body = asRecord(row, "The file has an invalid plan.");
    const ref = requiredRef(body.ref, "plan ref");
    if (refs.has(ref)) {
      throw new AccountTransferError(`The file uses the plan ref ${ref} more than once.`);
    }
    refs.add(ref);
    const name = requiredName(body.name, "Please enter a plan name.", "Plan name cannot be longer than 120 characters.");
    const key = name.toLowerCase();
    if (names.has(key)) {
      throw new AccountTransferError(`The file lists the plan name ${name} more than once.`);
    }
    names.add(key);
    const active = requiredBoolean(requiredValue(body, "active", `Plan "${name}" is missing active.`), `active for plan "${name}"`);
    if (active) {
      activeCount += 1;
    }
    const dayRows = requireArray(body, "days", `Plan "${name}" is missing days.`);
    if (dayRows.length === 0) {
      throw new AccountTransferError(`Plan "${name}" has no days.`);
    }
    if (dayRows.length > MAX_PLAN_DAYS) {
      throw new AccountTransferError(`Plan "${name}" can have at most ${MAX_PLAN_DAYS} days.`);
    }
    const dayRefs = new Set<string>();
    const days = dayRows.map((day) => {
      const dayBody = asRecord(day, `Plan "${name}" has an invalid day.`);
      const dayRef = requiredRef(dayBody.ref, "plan day ref");
      if (dayRefs.has(dayRef)) {
        throw new AccountTransferError(`The file uses the plan day ref ${dayRef} more than once.`);
      }
      dayRefs.add(dayRef);
      const dayName = requiredName(
        dayBody.name,
        "Please enter a name for each day.",
        "Day name cannot be longer than 80 characters.",
        DAY_NAME_LIMIT,
      );
      const exercises = parseExerciseList(
        requireArray(dayBody, "exercises", `Day "${dayName}" is missing exercises.`),
        `Day "${dayName}"`,
      );
      if (exercises.length === 0) {
        throw new AccountTransferError(`Day "${dayName}" has no exercises.`);
      }
      return { ref: dayRef, name: dayName, exercises };
    });
    return {
      ref,
      name,
      notes: optionalText(requiredValue(body, "notes", `Plan "${name}" is missing notes.`), "Plan notes"),
      active,
      days,
    };
  });
  if (activeCount > 1) {
    throw new AccountTransferError("The file has more than one active plan.");
  }
  return plans;
}

function parseSessions(rows: unknown[]): AccountTransfer["sessions"] {
  const refs = new Set<string>();
  let openCount = 0;
  const sessions = rows.map((row) => {
    const body = asRecord(row, "The file has an invalid session.");
    const ref = requiredRef(body.ref, "session ref");
    if (refs.has(ref)) {
      throw new AccountTransferError(`The file uses the session ref ${ref} more than once.`);
    }
    refs.add(ref);
    const performedOn = requiredDay(body.performedOn, "A session is missing performedOn.");
    const where = `Session on ${performedOn}`;
    const exercises = parseSessionExercises(
      requireArray(body, "exercises", `${where} is missing exercises.`),
      where,
    );
    if (exercises.length === 0) {
      throw new AccountTransferError(`${where} has no exercises.`);
    }
    const startedAt = optionalTimestamp(
      requiredValue(body, "startedAt", `${where} is missing startedAt.`),
      `${where} has an invalid startedAt.`,
    );
    const completedAt = optionalTimestamp(
      requiredValue(body, "completedAt", `${where} is missing completedAt.`),
      `${where} has an invalid completedAt.`,
    );
    if (startedAt == null && completedAt != null) {
      throw new AccountTransferError(`${where} is completed without a start time.`);
    }
    if (isOpenSession({ startedAt, completedAt })) {
      openCount += 1;
    }
    return {
      ref,
      performedOn,
      notes: optionalText(requiredValue(body, "notes", `${where} is missing notes.`), "Session notes"),
      templateRef: optionalRef(requiredValue(body, "templateRef", `${where} is missing templateRef.`), "template ref"),
      planRef: optionalRef(requiredValue(body, "planRef", `${where} is missing planRef.`), "plan ref"),
      planDayRef: optionalRef(requiredValue(body, "planDayRef", `${where} is missing planDayRef.`), "plan day ref"),
      startedAt,
      completedAt,
      exercises,
    };
  });
  if (openCount > MAX_OPEN_SESSIONS) {
    throw new AccountTransferError("The file has more than 3 sessions in progress.");
  }
  return sessions;
}

function parseGoals(rows: unknown[]): AccountTransfer["goals"] {
  return rows.map((row) => {
    const body = asRecord(row, "The file has an invalid goal.");
    const exercise = exerciseSlug(body.exercise);
    requireKey(body, "type", `Goal for ${exercise} is missing type.`);
    requireKey(body, "targetWeightKg", `Goal for ${exercise} is missing targetWeightKg.`);
    requireKey(body, "bodyweightMultiple", `Goal for ${exercise} is missing bodyweightMultiple.`);
    requireKey(body, "minReps", `Goal for ${exercise} is missing minReps.`);
    requireKey(body, "dueOn", `Goal for ${exercise} is missing dueOn.`);
    requireKey(body, "note", `Goal for ${exercise} is missing note.`);
    const type = body.type;
    if (type !== "absolute" && type !== "bodyweight_multiple") {
      throw new AccountTransferError(`Goal for ${exercise}: Please choose absolute or bodyweight multiple.`);
    }
    const parsed = parseGoalForm({
      exerciseId: exercise,
      milestoneType: type,
      targetWeightKg: metricText(body.targetWeightKg),
      bodyweightMultiple: metricText(body.bodyweightMultiple),
      minReps: metricText(body.minReps),
      dueOn: body.dueOn == null ? "" : typeof body.dueOn === "string" ? body.dueOn : "invalid",
      note: body.note == null ? "" : typeof body.note === "string" ? body.note : "invalid",
    });
    if (!parsed.ok) {
      throw new AccountTransferError(`Goal for ${exercise}: ${parsed.message}`);
    }
    requireKey(body, "achievedAt", `Goal for ${exercise} is missing achievedAt.`);
    requireKey(body, "achievedBodyweightKg", `Goal for ${exercise} is missing achievedBodyweightKg.`);
    requireKey(body, "achievedThresholdKg", `Goal for ${exercise} is missing achievedThresholdKg.`);
    return {
      exercise,
      type,
      targetWeightKg: parsed.definition.targetWeightKg,
      bodyweightMultiple: parsed.definition.bodyweightMultiple,
      minReps: parsed.definition.minReps,
      dueOn: parsed.dueOn,
      note: parsed.note,
      achievedAt: optionalTimestamp(body.achievedAt, `Goal for ${exercise} has an invalid achievedAt.`),
      achievedBodyweightKg: optionalKg(body.achievedBodyweightKg, `achieved bodyweight for ${exercise}`),
      achievedThresholdKg: optionalKg(body.achievedThresholdKg, `achieved threshold for ${exercise}`),
    };
  });
}

function parseExerciseList(rows: unknown[], where: string): TransferExercise[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const exercise = parseExercise(row, where);
    if (seen.has(exercise.exercise)) {
      throw new AccountTransferError(`${where} lists ${exercise.exercise} more than once.`);
    }
    seen.add(exercise.exercise);
    return exercise;
  });
}

function parseSessionExercises(rows: unknown[], where: string): TransferSessionExercise[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const body = asRecord(row, `${where} has an invalid exercise.`);
    const exercise = parseExercise(body, where);
    if (seen.has(exercise.exercise)) {
      throw new AccountTransferError(`${where} lists ${exercise.exercise} more than once.`);
    }
    seen.add(exercise.exercise);
    const sets = parseSets(requireArray(body, "sets", `${where} is missing sets for ${exercise.exercise}.`), where, exercise.exercise);
    return {
      ...exercise,
      notDone: requiredBoolean(
        requiredValue(body, "notDone", `${where} is missing notDone for ${exercise.exercise}.`),
        `notDone for ${exercise.exercise}`,
      ),
      sets,
    };
  });
}

function parseExercise(row: unknown, where: string): TransferExercise {
  const body = asRecord(row, `${where} has an invalid exercise.`);
  const exercise = exerciseSlug(body.exercise);
  requireKey(body, "targetSets", `${where} is missing targetSets for ${exercise}.`);
  requireKey(body, "targetReps", `${where} is missing targetReps for ${exercise}.`);
  requireKey(body, "targetWeightKg", `${where} is missing targetWeightKg for ${exercise}.`);
  requireKey(body, "baseWeightKg", `${where} is missing baseWeightKg for ${exercise}.`);
  requireKey(body, "notes", `${where} is missing notes for ${exercise}.`);
  return {
    exercise,
    targetSets: optionalPositiveInt(body.targetSets, `target sets for ${exercise}`),
    targetReps: optionalPositiveInt(body.targetReps, `target reps for ${exercise}`),
    targetWeightKg: optionalKg(body.targetWeightKg, `target weight for ${exercise}`),
    baseWeightKg: optionalKg(body.baseWeightKg, `base weight for ${exercise}`),
    notes: optionalText(body.notes, `Notes for ${exercise}`),
  };
}

function parseSets(rows: unknown[], where: string, exercise: string): TransferSet[] {
  const seen = new Set<number>();
  return rows.map((row) => {
    const body = asRecord(row, `${where} has an invalid set for ${exercise}.`);
    const setNumber = requiredPositiveInt(body.setNumber, `set number for ${exercise}`);
    if (seen.has(setNumber)) {
      throw new AccountTransferError(`${where} lists set ${setNumber} more than once for ${exercise}.`);
    }
    seen.add(setNumber);
    requireKey(body, "reps", `${where} is missing reps for ${exercise}.`);
    requireKey(body, "loadedKg", `${where} is missing loadedKg for ${exercise}.`);
    requireKey(body, "warmup", `${where} is missing warmup for ${exercise}.`);
    requireKey(body, "performedAt", `${where} is missing performedAt for ${exercise}.`);
    requireKey(body, "notes", `${where} is missing notes for ${exercise}.`);
    const performedAt = optionalTimestamp(body.performedAt, `${where} has an invalid performedAt for ${exercise}.`);
    if (!performedAt) {
      throw new AccountTransferError(`${where} is missing performedAt for ${exercise}.`);
    }
    return {
      setNumber,
      reps: requiredPositiveInt(body.reps, `reps for ${exercise}`),
      loadedKg: optionalKg(body.loadedKg, `Loaded (kg) for ${exercise}`),
      warmup: requiredBoolean(body.warmup, `warmup for ${exercise}`),
      performedAt,
      notes: optionalText(body.notes, `Notes for ${exercise}`),
    };
  });
}

function assertRelationships(
  templates: AccountTransfer["templates"],
  plans: AccountTransfer["plans"],
  sessions: AccountTransfer["sessions"],
): void {
  const templateRefs = new Set(templates.map((template) => template.ref));
  const planRefs = new Set(plans.map((plan) => plan.ref));
  const dayPlans = new Map<string, string>();
  for (const plan of plans) {
    for (const day of plan.days) {
      if (dayPlans.has(day.ref)) {
        throw new AccountTransferError(`The file uses the plan day ref ${day.ref} more than once.`);
      }
      dayPlans.set(day.ref, plan.ref);
    }
  }
  for (const session of sessions) {
    const where = `The session on ${session.performedOn}`;
    if (session.templateRef && !templateRefs.has(session.templateRef)) {
      throw new AccountTransferError(`${where} refers to a template that is not in the file.`);
    }
    if (session.planRef && !planRefs.has(session.planRef)) {
      throw new AccountTransferError(`${where} refers to a plan that is not in the file.`);
    }
    if (session.planDayRef) {
      const planRef = dayPlans.get(session.planDayRef);
      if (!planRef) {
        throw new AccountTransferError(`${where} refers to a plan day that is not in the file.`);
      }
      if (session.planRef && session.planRef !== planRef) {
        throw new AccountTransferError(`${where} refers to a day from a different plan.`);
      }
    }
  }
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AccountTransferError(message);
  }
  return value as Record<string, unknown>;
}

function requireRecord(body: Record<string, unknown>, key: string, message: string): Record<string, unknown> {
  requireKey(body, key, message);
  return asRecord(body[key], message);
}

function requireArray(body: Record<string, unknown>, key: string, message: string): unknown[] {
  requireKey(body, key, message);
  if (!Array.isArray(body[key])) {
    throw new AccountTransferError(message);
  }
  return body[key] as unknown[];
}

function requireKey(body: Record<string, unknown>, key: string, message: string): void {
  if (!Object.prototype.hasOwnProperty.call(body, key)) {
    throw new AccountTransferError(message);
  }
}

function requiredValue(body: Record<string, unknown>, key: string, message: string): unknown {
  requireKey(body, key, message);
  return body[key];
}

function metricText(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "invalid";
}

function exerciseSlug(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AccountTransferError("The file is missing an exercise.");
  }
  const slug = value.trim();
  if (slug.length > NAME_LIMIT || /[\r\n,]/.test(slug)) {
    throw new AccountTransferError("The file has an invalid exercise.");
  }
  return slug;
}

function uniqueSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)];
}

function requiredName(value: unknown, emptyMessage: string, longMessage: string, limit = NAME_LIMIT): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AccountTransferError(emptyMessage);
  }
  const name = value.trim();
  if (name.length > limit) {
    throw new AccountTransferError(longMessage);
  }
  return name;
}

function optionalText(value: unknown, label: string): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new AccountTransferError(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > NOTE_LIMIT) {
    throw new AccountTransferError(`${label} cannot be longer than ${NOTE_LIMIT} characters.`);
  }
  return trimmed.length > 0 ? trimmed : null;
}

function optionalKg(value: unknown, label: string): number | null {
  if (value == null || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) {
    throw new AccountTransferError(`Please enter a valid ${label}.`);
  }
  const rounded = roundKg(number);
  if (rounded < 0) {
    throw new AccountTransferError(`Please enter a valid ${label}.`);
  }
  if (rounded > KG_LIMIT) {
    throw new AccountTransferError(`Please enter a ${label} of 9999.99 kg or less.`);
  }
  return rounded;
}

function optionalPositiveInt(value: unknown, label: string): number | null {
  if (value == null || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(number) || number <= 0) {
    throw new AccountTransferError(`Please enter a valid ${label}.`);
  }
  return number;
}

function requiredPositiveInt(value: unknown, label: string): number {
  const parsed = optionalPositiveInt(value, label);
  if (parsed == null) {
    throw new AccountTransferError(`Please enter a valid ${label}.`);
  }
  return parsed;
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (text === "true") {
      return true;
    }
    if (text === "false") {
      return false;
    }
  }
  throw new AccountTransferError(`${label} must be true or false.`);
}

function requiredRef(value: unknown, label: string): string {
  if (typeof value !== "string" || !REF_RE.test(value)) {
    throw new AccountTransferError(`The file has an invalid ${label}.`);
  }
  return value;
}

function optionalRef(value: unknown, label: string): string | null {
  if (value == null || value === "") {
    return null;
  }
  return requiredRef(value, label);
}

function requiredDay(value: unknown, message: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AccountTransferError(message);
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AccountTransferError(message);
  }
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  if (`${parsed.getFullYear()}-${month}-${day}` !== value) {
    throw new AccountTransferError(message);
  }
  return value;
}

function optionalTimestamp(value: unknown, message: string): string | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new AccountTransferError(message);
  }
  return new Date(value).toISOString();
}
