import {
  AccountTransferError,
  parseAccountTransfer,
  type AccountTransfer,
  type TransferExercise,
} from "@/lib/account-transfer";

export const ACCOUNT_CSV_FILES = [
  "profile.csv",
  "bodyweight.csv",
  "hidden-exercises.csv",
  "exercise-defaults.csv",
  "templates.csv",
  "template-exercises.csv",
  "plans.csv",
  "plan-days.csv",
  "plan-exercises.csv",
  "sessions.csv",
  "session-exercises.csv",
  "sets.csv",
  "goals.csv",
] as const;

export type AccountCsvName = (typeof ACCOUNT_CSV_FILES)[number];

const PROFILE_COLUMNS = ["bodyweight_kg", "height_cm", "sex", "date_of_birth"] as const;
const BODYWEIGHT_COLUMNS = ["logged_on", "bodyweight_kg"] as const;
const HIDDEN_COLUMNS = ["exercise"] as const;
const DEFAULT_COLUMNS = [
  "exercise",
  "base_weight_kg",
  "target_sets",
  "target_reps",
  "target_weight_kg",
  "suggest_warmups",
  "suggest_target",
  "max_suggested_warmup_sets",
] as const;
const TEMPLATE_COLUMNS = ["ref", "name", "notes"] as const;
const TEMPLATE_EXERCISE_COLUMNS = [
  "template_ref",
  "position",
  "exercise",
  "target_sets",
  "target_reps",
  "target_weight_kg",
  "base_weight_kg",
  "notes",
] as const;
const PLAN_COLUMNS = ["ref", "name", "notes", "active"] as const;
const PLAN_DAY_COLUMNS = ["ref", "plan_ref", "position", "name"] as const;
const PLAN_EXERCISE_COLUMNS = [
  "plan_day_ref",
  "position",
  "exercise",
  "target_sets",
  "target_reps",
  "target_weight_kg",
  "base_weight_kg",
  "notes",
] as const;
const SESSION_COLUMNS = [
  "ref",
  "performed_on",
  "notes",
  "template_ref",
  "plan_ref",
  "plan_day_ref",
  "started_at",
  "completed_at",
] as const;
const SESSION_EXERCISE_COLUMNS = [
  "session_ref",
  "position",
  "exercise",
  "target_sets",
  "target_reps",
  "target_weight_kg",
  "base_weight_kg",
  "notes",
  "not_done",
] as const;
const SET_COLUMNS = [
  "session_ref",
  "exercise_position",
  "set_number",
  "reps",
  "loaded_kg",
  "warmup",
  "performed_at",
  "notes",
] as const;
const GOAL_COLUMNS = [
  "exercise",
  "type",
  "target_weight_kg",
  "bodyweight_multiple",
  "min_reps",
  "due_on",
  "note",
  "achieved_at",
  "achieved_bodyweight_kg",
  "achieved_threshold_kg",
] as const;

export function accountTransferToCsvFiles(document: AccountTransfer): Array<{ name: AccountCsvName; text: string }> {
  return [
    {
      name: "profile.csv",
      text: toCsv(PROFILE_COLUMNS, [
        [
          cell(document.profile.bodyweightKg),
          cell(document.profile.heightCm),
          cell(document.profile.sex),
          cell(document.profile.dateOfBirth),
        ],
      ]),
    },
    {
      name: "bodyweight.csv",
      text: toCsv(
        BODYWEIGHT_COLUMNS,
        document.bodyweightLog.map((entry) => [entry.loggedOn, cell(entry.bodyweightKg)]),
      ),
    },
    {
      name: "hidden-exercises.csv",
      text: toCsv(
        HIDDEN_COLUMNS,
        document.hiddenExercises.map((exercise) => [exercise]),
      ),
    },
    {
      name: "exercise-defaults.csv",
      text: toCsv(
        DEFAULT_COLUMNS,
        document.exerciseDefaults.map((row) => [
          row.exercise,
          cell(row.baseWeightKg),
          cell(row.targetSets),
          cell(row.targetReps),
          cell(row.targetWeightKg),
          cell(row.suggestWarmups),
          cell(row.suggestTarget),
          cell(row.maxSuggestedWarmupSets),
        ]),
      ),
    },
    {
      name: "templates.csv",
      text: toCsv(
        TEMPLATE_COLUMNS,
        document.templates.map((template) => [template.ref, template.name, cell(template.notes)]),
      ),
    },
    {
      name: "template-exercises.csv",
      text: toCsv(
        TEMPLATE_EXERCISE_COLUMNS,
        document.templates.flatMap((template) =>
          template.exercises.map((exercise, index) => [
            template.ref,
            String(index + 1),
            ...exerciseCells(exercise),
          ]),
        ),
      ),
    },
    {
      name: "plans.csv",
      text: toCsv(
        PLAN_COLUMNS,
        document.plans.map((plan) => [plan.ref, plan.name, cell(plan.notes), cell(plan.active)]),
      ),
    },
    {
      name: "plan-days.csv",
      text: toCsv(
        PLAN_DAY_COLUMNS,
        document.plans.flatMap((plan) =>
          plan.days.map((day, index) => [day.ref, plan.ref, String(index + 1), day.name]),
        ),
      ),
    },
    {
      name: "plan-exercises.csv",
      text: toCsv(
        PLAN_EXERCISE_COLUMNS,
        document.plans.flatMap((plan) =>
          plan.days.flatMap((day) =>
            day.exercises.map((exercise, index) => [day.ref, String(index + 1), ...exerciseCells(exercise)]),
          ),
        ),
      ),
    },
    {
      name: "sessions.csv",
      text: toCsv(
        SESSION_COLUMNS,
        document.sessions.map((session) => [
          session.ref,
          session.performedOn,
          cell(session.notes),
          cell(session.templateRef),
          cell(session.planRef),
          cell(session.planDayRef),
          cell(session.startedAt),
          cell(session.completedAt),
        ]),
      ),
    },
    {
      name: "session-exercises.csv",
      text: toCsv(
        SESSION_EXERCISE_COLUMNS,
        document.sessions.flatMap((session) =>
          session.exercises.map((exercise, index) => [
            session.ref,
            String(index + 1),
            ...exerciseCells(exercise),
            cell(exercise.notDone),
          ]),
        ),
      ),
    },
    {
      name: "sets.csv",
      text: toCsv(
        SET_COLUMNS,
        document.sessions.flatMap((session) =>
          session.exercises.flatMap((exercise, index) =>
            exercise.sets.map((set) => [
              session.ref,
              String(index + 1),
              String(set.setNumber),
              String(set.reps),
              cell(set.loadedKg),
              cell(set.warmup),
              set.performedAt,
              cell(set.notes),
            ]),
          ),
        ),
      ),
    },
    {
      name: "goals.csv",
      text: toCsv(
        GOAL_COLUMNS,
        document.goals.map((goal) => [
          goal.exercise,
          goal.type,
          cell(goal.targetWeightKg),
          cell(goal.bodyweightMultiple),
          String(goal.minReps),
          cell(goal.dueOn),
          cell(goal.note),
          cell(goal.achievedAt),
          cell(goal.achievedBodyweightKg),
          cell(goal.achievedThresholdKg),
        ]),
      ),
    },
  ];
}

export function accountTransferFromCsvFiles(
  files: ReadonlyMap<string, string>,
  today: string,
): AccountTransfer {
  for (const name of ACCOUNT_CSV_FILES) {
    if (!files.has(name)) {
      throw new AccountTransferError(`The CSV set is missing ${name}.`);
    }
  }

  const profileRows = readTable("profile.csv", files.get("profile.csv") ?? "", PROFILE_COLUMNS);
  if (profileRows.length > 1) {
    throw new AccountTransferError("profile.csv has more than one row.");
  }
  const profile = profileRows[0];
  const templates = readTable("templates.csv", files.get("templates.csv") ?? "", TEMPLATE_COLUMNS);
  const templateExercises = groupBy(
    readTable("template-exercises.csv", files.get("template-exercises.csv") ?? "", TEMPLATE_EXERCISE_COLUMNS),
    "template_ref",
    "template-exercises.csv",
  );
  const plans = readTable("plans.csv", files.get("plans.csv") ?? "", PLAN_COLUMNS);
  const planDays = readTable("plan-days.csv", files.get("plan-days.csv") ?? "", PLAN_DAY_COLUMNS);
  const planExercises = groupBy(
    readTable("plan-exercises.csv", files.get("plan-exercises.csv") ?? "", PLAN_EXERCISE_COLUMNS),
    "plan_day_ref",
    "plan-exercises.csv",
  );
  const sessions = readTable("sessions.csv", files.get("sessions.csv") ?? "", SESSION_COLUMNS);
  const sessionExercises = groupBy(
    readTable("session-exercises.csv", files.get("session-exercises.csv") ?? "", SESSION_EXERCISE_COLUMNS),
    "session_ref",
    "session-exercises.csv",
  );
  const sets = groupBy(readTable("sets.csv", files.get("sets.csv") ?? "", SET_COLUMNS), "session_ref", "sets.csv");

  const planRefs = new Set(plans.map((plan) => plan.ref));
  const templateRefs = new Set(templates.map((template) => template.ref));
  const daysByPlan = new Map<string, Array<Record<string, string>>>();
  for (const day of sortByPosition(planDays, "plan-days.csv")) {
    if (!planRefs.has(day.plan_ref)) {
      throw new AccountTransferError("plan-days.csv refers to a plan that is not in the file.");
    }
    const list = daysByPlan.get(day.plan_ref) ?? [];
    list.push(day);
    daysByPlan.set(day.plan_ref, list);
  }
  for (const templateRef of templateExercises.keys()) {
    if (!templateRefs.has(templateRef)) {
      throw new AccountTransferError("template-exercises.csv refers to a template that is not in the file.");
    }
  }
  const sessionRefs = new Set(sessions.map((session) => session.ref));
  for (const sessionRef of sessionExercises.keys()) {
    if (!sessionRefs.has(sessionRef)) {
      throw new AccountTransferError("session-exercises.csv refers to a session that is not in the file.");
    }
  }
  for (const [sessionRef, setRows] of sets) {
    if (!sessionRefs.has(sessionRef)) {
      throw new AccountTransferError("sets.csv refers to a session that is not in the file.");
    }
    const positions = new Set((sessionExercises.get(sessionRef) ?? []).map((row) => row.position));
    for (const set of setRows) {
      if (!positions.has(set.exercise_position)) {
        throw new AccountTransferError(
          `sets.csv refers to exercise ${set.exercise_position || "position"} on a session that does not have it.`,
        );
      }
    }
  }

  return parseAccountTransfer(
    {
      format: "evolift-account",
      version: 1,
      profile: {
        bodyweightKg: numberOrNull(profile?.bodyweight_kg),
        heightCm: numberOrNull(profile?.height_cm),
        sex: emptyToNull(profile?.sex),
        dateOfBirth: emptyToNull(profile?.date_of_birth),
      },
      bodyweightLog: readTable("bodyweight.csv", files.get("bodyweight.csv") ?? "", BODYWEIGHT_COLUMNS).map(
        (row) => ({
          loggedOn: row.logged_on,
          bodyweightKg: numberOrNull(row.bodyweight_kg),
        }),
      ),
      hiddenExercises: readTable(
        "hidden-exercises.csv",
        files.get("hidden-exercises.csv") ?? "",
        HIDDEN_COLUMNS,
      ).map((row) => row.exercise),
      exerciseDefaults: readTable(
        "exercise-defaults.csv",
        files.get("exercise-defaults.csv") ?? "",
        DEFAULT_COLUMNS,
      ).map((row) => ({
        exercise: row.exercise,
        baseWeightKg: numberOrNull(row.base_weight_kg),
        targetSets: numberOrNull(row.target_sets),
        targetReps: numberOrNull(row.target_reps),
        targetWeightKg: numberOrNull(row.target_weight_kg),
        suggestWarmups: booleanCell(row.suggest_warmups, "exercise-defaults.csv", "suggest_warmups"),
        suggestTarget: booleanCell(row.suggest_target, "exercise-defaults.csv", "suggest_target"),
        maxSuggestedWarmupSets: numberOrNull(row.max_suggested_warmup_sets),
      })),
      templates: templates.map((template) => ({
        ref: template.ref,
        name: template.name,
        notes: emptyToNull(template.notes),
        exercises: sortByPosition(templateExercises.get(template.ref) ?? [], "template-exercises.csv").map(
          exerciseFromRow,
        ),
      })),
      plans: plans.map((plan) => ({
        ref: plan.ref,
        name: plan.name,
        notes: emptyToNull(plan.notes),
        active: booleanCell(plan.active, "plans.csv", "active"),
        days: (daysByPlan.get(plan.ref) ?? []).map((day) => ({
          ref: day.ref,
          name: day.name,
          exercises: sortByPosition(planExercises.get(day.ref) ?? [], "plan-exercises.csv").map(exerciseFromRow),
        })),
      })),
      sessions: sessions.map((session) => ({
        ref: session.ref,
        performedOn: session.performed_on,
        notes: emptyToNull(session.notes),
        templateRef: emptyToNull(session.template_ref),
        planRef: emptyToNull(session.plan_ref),
        planDayRef: emptyToNull(session.plan_day_ref),
        startedAt: emptyToNull(session.started_at),
        completedAt: emptyToNull(session.completed_at),
        exercises: sortByPosition(sessionExercises.get(session.ref) ?? [], "session-exercises.csv").map(
          (exercise) => {
            const position = Number(exercise.position);
            const exerciseSets = (sets.get(session.ref) ?? []).filter((set) => {
              if (!/^[1-9]\d*$/.test(set.exercise_position ?? "")) {
                throw new AccountTransferError("sets.csv has an invalid exercise_position.");
              }
              return Number(set.exercise_position) === position;
            });
            return {
              ...exerciseFromRow(exercise),
              notDone: booleanCell(exercise.not_done, "session-exercises.csv", "not_done"),
              sets: exerciseSets.map((set) => ({
                setNumber: numberOrNull(set.set_number),
                reps: numberOrNull(set.reps),
                loadedKg: numberOrNull(set.loaded_kg),
                warmup: booleanCell(set.warmup, "sets.csv", "warmup"),
                performedAt: emptyToNull(set.performed_at),
                notes: emptyToNull(set.notes),
              })),
            };
          },
        ),
      })),
      goals: readTable("goals.csv", files.get("goals.csv") ?? "", GOAL_COLUMNS).map((row) => ({
        exercise: row.exercise,
        type: row.type,
        targetWeightKg: numberOrNull(row.target_weight_kg),
        bodyweightMultiple: numberOrNull(row.bodyweight_multiple),
        minReps: numberOrNull(row.min_reps),
        dueOn: emptyToNull(row.due_on),
        note: emptyToNull(row.note),
        achievedAt: emptyToNull(row.achieved_at),
        achievedBodyweightKg: numberOrNull(row.achieved_bodyweight_kg),
        achievedThresholdKg: numberOrNull(row.achieved_threshold_kg),
      })),
    },
    today,
  );
}

export function parseCsv(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\r") {
      continue;
    }
    field += char ?? "";
  }
  if (inQuotes) {
    throw new AccountTransferError("A CSV file has an unterminated quote.");
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

function exerciseCells(exercise: TransferExercise): string[] {
  return [
    exercise.exercise,
    cell(exercise.targetSets),
    cell(exercise.targetReps),
    cell(exercise.targetWeightKg),
    cell(exercise.baseWeightKg),
    cell(exercise.notes),
  ];
}

function exerciseFromRow(row: Record<string, string>) {
  return {
    exercise: row.exercise ?? "",
    targetSets: numberOrNull(row.target_sets),
    targetReps: numberOrNull(row.target_reps),
    targetWeightKg: numberOrNull(row.target_weight_kg),
    baseWeightKg: numberOrNull(row.base_weight_kg),
    notes: emptyToNull(row.notes),
  };
}

function readTable<const Columns extends readonly string[]>(
  name: string,
  text: string,
  columns: Columns,
): Array<Record<Columns[number], string>> {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new AccountTransferError(`${name} is missing its header.`);
  }
  const header = rows[0]?.map((cell) => cell.trim()) ?? [];
  if (header.length !== columns.length || header.some((column, index) => column !== columns[index])) {
    const missing = columns.find((column) => !header.includes(column));
    throw new AccountTransferError(
      missing ? `${name} is missing the ${missing} column.` : `${name} has an unexpected column.`,
    );
  }
  return rows.slice(1).map((cells, index) => {
    if (cells.length !== columns.length) {
      throw new AccountTransferError(`${name} row ${index + 2} does not match the header.`);
    }
    const record = {} as Record<Columns[number], string>;
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const column = columns[columnIndex] as Columns[number];
      record[column] = cells[columnIndex]?.trim() ?? "";
    }
    return record;
  });
}

function groupBy(
  rows: Array<Record<string, string>>,
  key: string,
  fileName: string,
): Map<string, Array<Record<string, string>>> {
  const grouped = new Map<string, Array<Record<string, string>>>();
  for (const row of rows) {
    const id = row[key] ?? "";
    if (!id) {
      throw new AccountTransferError(`${fileName} is missing ${key}.`);
    }
    const list = grouped.get(id) ?? [];
    list.push(row);
    grouped.set(id, list);
  }
  return grouped;
}

function sortByPosition(rows: Array<Record<string, string>>, fileName: string): Array<Record<string, string>> {
  const seen = new Set<string>();
  const sorted = [...rows].sort((a, b) => Number(a.position) - Number(b.position));
  for (const row of sorted) {
    const position = row.position ?? "";
    if (!/^[1-9]\d*$/.test(position)) {
      throw new AccountTransferError(`${fileName} has an invalid position.`);
    }
    const owner = row.template_ref ?? row.plan_ref ?? row.session_ref ?? row.plan_day_ref ?? "";
    const key = `${owner}:${position}`;
    if (seen.has(key)) {
      throw new AccountTransferError(`${fileName} lists position ${position} more than once.`);
    }
    seen.add(key);
  }
  return sorted;
}

function toCsv(header: readonly string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function cell(value: string | number | boolean | null): string {
  if (value == null) {
    return "";
  }
  return String(value);
}

function emptyToNull(value: string | undefined): string | null {
  if (value == null || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

function numberOrNull(value: string | undefined): number | null {
  if (value == null || value.trim().length === 0) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function booleanCell(value: string | undefined, fileName: string, column: string): boolean {
  const text = value?.trim().toLowerCase();
  if (text === "true") {
    return true;
  }
  if (text === "false") {
    return false;
  }
  throw new AccountTransferError(`${fileName} has an invalid ${column} value.`);
}
