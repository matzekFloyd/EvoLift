import { formatKgAmount, formatRepCount, roundKg } from "@/lib/milestone-progress";

/** Smallest and largest weight step. The step also rounds to this 0.5 kg size. */
const MIN_STEP_KG = 0.5;
const MAX_STEP_KG = 5;
const LOAD_TOLERANCE_KG = 0.25;
/** Sessions older than this are outside the history window. */
const HISTORY_DAYS = 56;
const MAX_SESSIONS = 3;
const MIN_SESSIONS = 2;
/** A miss, or a rep-target mismatch, starts at more than this many reps. */
const REP_GAP = 2;
/**
 * Double progression adds this many reps before a weight increase.
 * The top of the range is the bottom plus one step.
 * The suggestion is the next session's target, not the next set in the current session.
 */
const DOUBLE_PROGRESSION_REP_STEP = 2;

export const LOG_WORKING_SET_MESSAGE = "Log a working set to get suggestions.";
export const THIN_HISTORY_MESSAGE = "Not enough recent working sets to suggest a target.";
export const NEED_TARGET_REPS_MESSAGE = "Enter target reps to get a suggestion.";
export const REP_TARGET_MISMATCH_RATIONALE = "History is for a different rep target.";
export const MIXED_LOAD_MESSAGE = "Last session used more than one Loaded (kg).";
export const MIXED_REPS_MESSAGE = "Last session's working sets did not share a rep target.";

/** Missing account rows stay on, same as an explicit true. */
export function targetSuggestionsEnabled(suggestTarget: boolean | null | undefined): boolean {
  return suggestTarget !== false;
}

/** Missing or false stays off. Double progression runs only after the account turns it on. */
export function doubleProgressionEnabled(value: boolean | null | undefined): boolean {
  return value === true;
}

/**
 * One logged set used to suggest Target weight (kg).
 * Loaded (kg) only — base weight is not part of the suggestion.
 */
export type TargetWeightHistorySet = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  setNumber: number;
  reps: number;
  loadedKg: number | null;
  isWarmup: boolean;
  targetWeightKg: number | null;
  /** Rep target stored on that session exercise. Null when the session had none. */
  targetReps: number | null;
};

export type TargetWeightSuggestion =
  | { status: "message"; message: string }
  | { status: "suggestion"; weightKg: number; rationale: string; reps?: number };

type QualifyingSession = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  loadedKg: number;
  reps: number;
  targetWeightKg: number | null;
};

function message(text: string): TargetWeightSuggestion {
  return { status: "message", message: text };
}

function suggestion(weightKg: number, rationale: string, reps?: number): TargetWeightSuggestion {
  if (reps == null) {
    return { status: "suggestion", weightKg: roundKg(weightKg), rationale };
  }
  return { status: "suggestion", weightKg: roundKg(weightKg), rationale, reps };
}

/**
 * One step from a Loaded (kg).
 * 5% of the load, rounded half-up to the nearest 0.5 kg, then kept between 0.5 and 5.
 */
function weightStepKg(loadKg: number): number {
  const thousandths = Math.round(Math.max(0, loadKg) * 1000);
  // 5% of the load, in 0.5 kg steps, is thousandths / 10_000.
  // Adding half a step (5_000) makes a tie round up before the remainder is dropped.
  const numerator = thousandths + 5_000;
  const increments = (numerator - (numerator % 10_000)) / 10_000;
  const step = increments * MIN_STEP_KG;
  return Math.min(MAX_STEP_KG, Math.max(MIN_STEP_KG, step));
}

/** Move one load-sized step. A decrease stops at 0 kg. */
function stepBy(load: number, direction: 1 | -1): number {
  return Math.max(0, roundKg(load + direction * weightStepKg(load)));
}

function loggedLoadKg(value: number | null): number | null {
  if (value == null) {
    return null;
  }
  const load = Number(value);
  if (!Number.isFinite(load) || load < 0) {
    return null;
  }
  return roundKg(load);
}

function calendarAgeDays(performedOn: string, today: string): number | null {
  const performed = performedOn.slice(0, 10);
  const end = today.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(performed) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return null;
  }
  const performedMs = Date.parse(`${performed}T00:00:00Z`);
  const todayMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(performedMs) || !Number.isFinite(todayMs)) {
    return null;
  }
  return Math.round((todayMs - performedMs) / 86_400_000);
}

function loadsWithin(left: number, right: number): boolean {
  return Math.abs(left - right) <= LOAD_TOLERANCE_KG + 1e-9;
}

function pickTopSet(rows: TargetWeightHistorySet[]): TargetWeightHistorySet {
  let best = rows[0];
  let bestLoad = loggedLoadKg(best.loadedKg) ?? 0;
  for (const row of rows) {
    const load = loggedLoadKg(row.loadedKg);
    if (load == null) {
      continue;
    }
    if (load > bestLoad || (load === bestLoad && row.setNumber > best.setNumber)) {
      best = row;
      bestLoad = load;
    }
  }
  return best;
}

function isHit(session: QualifyingSession, plannedReps: number): boolean {
  if (session.reps + 1e-9 < plannedReps) {
    return false;
  }
  if (session.targetWeightKg == null || !Number.isFinite(session.targetWeightKg)) {
    return true;
  }
  return loadsWithin(session.loadedKg, session.targetWeightKg);
}

function missedByAtLeast(session: QualifyingSession, plannedReps: number): boolean {
  return session.reps <= plannedReps - REP_GAP + 1e-9;
}

type ProgressionSession = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  /** Planned reps when every set stored the same target, else the shared logged reps. */
  targetReps: number | null;
  sets: Array<{ reps: number; loadedKg: number }>;
};

function agreedPositive(values: Array<number | null>): number | null {
  if (values.length === 0) {
    return null;
  }
  const first = values[0];
  if (first == null || !Number.isFinite(first) || first <= 0) {
    return null;
  }
  if (values.some((value) => value !== first)) {
    return null;
  }
  return first;
}

function progressionTargetReps(rows: TargetWeightHistorySet[]): number | null {
  const stored = agreedPositive(rows.map((row) => row.targetReps));
  if (stored != null) {
    return stored;
  }
  if (rows.some((row) => row.targetReps != null)) {
    return null;
  }
  return agreedPositive(rows.map((row) => row.reps));
}

function sharedLoad(sets: Array<{ loadedKg: number }>): number | null {
  const first = sets[0]?.loadedKg;
  if (first == null || !sets.every((set) => loadsWithin(set.loadedKg, first))) {
    return null;
  }
  return roundKg(first);
}

/**
 * Lowest rep target hit at this Loaded (kg) in the recent streak.
 * Never more than 2 reps under the latest target. A target that is already
 * the bottom does not grow a new floor under it.
 */
function doubleProgressionBottom(sessions: ProgressionSession[], load: number, plannedReps: number): number {
  let bottom = plannedReps;
  for (const older of sessions.slice(1)) {
    const olderLoad = sharedLoad(older.sets);
    if (olderLoad == null || !loadsWithin(olderLoad, load) || older.targetReps == null) {
      break;
    }
    if (older.targetReps > plannedReps + 1e-9) {
      break;
    }
    if (older.targetReps < plannedReps - DOUBLE_PROGRESSION_REP_STEP - 1e-9) {
      break;
    }
    const olderAchieved = older.sets.reduce((min, set) => Math.min(min, set.reps), older.sets[0].reps);
    if (olderAchieved + 1e-9 < older.targetReps) {
      break;
    }
    bottom = Math.min(bottom, older.targetReps);
  }
  return bottom;
}

/**
 * Next session's target when double progression is on. Not the next set.
 *
 * The range is one step of 2 reps. The bottom is the lowest rep target hit at
 * the same Loaded (kg) in the recent streak, and never more than 2 reps under
 * the latest target. The top is that bottom plus 2.
 *
 * When every working set hits the latest rep target:
 * - short of the top, suggest the top at the same weight
 * - at the top, suggest one weight step heavier and reset reps to the bottom
 *
 * A miss of 1 rep holds the weight and the rep target. A miss of 2 or more
 * that still reaches the bottom suggests that bottom at the same weight.
 * A working set under the bottom drops one weight step and sets reps to the
 * bottom. One completed session is enough. Weight-only mode still needs two.
 */
function suggestDoubleProgression(input: {
  sets: TargetWeightHistorySet[];
  excludeSessionId?: string | null;
  today: string;
}): TargetWeightSuggestion {
  const excludeSessionId = input.excludeSessionId ?? null;
  let sawWorkingSet = false;
  const bySession = new Map<string, TargetWeightHistorySet[]>();
  for (const row of input.sets) {
    if (excludeSessionId && row.sessionId === excludeSessionId) {
      continue;
    }
    if (row.isWarmup) {
      continue;
    }
    const loadedKg = loggedLoadKg(row.loadedKg);
    if (loadedKg == null) {
      continue;
    }
    sawWorkingSet = true;
    const ageDays = calendarAgeDays(row.performedOn, input.today);
    if (ageDays == null || ageDays < 0 || ageDays > HISTORY_DAYS) {
      continue;
    }
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  if (!sawWorkingSet) {
    return message(LOG_WORKING_SET_MESSAGE);
  }

  const sessions: ProgressionSession[] = [];
  for (const [sessionId, rows] of bySession) {
    const first = rows[0];
    sessions.push({
      sessionId,
      performedOn: first.performedOn.slice(0, 10),
      sessionCreatedAt: first.sessionCreatedAt,
      targetReps: progressionTargetReps(rows),
      sets: rows.map((row) => ({
        reps: row.reps,
        loadedKg: loggedLoadKg(row.loadedKg) ?? 0,
      })),
    });
  }

  sessions.sort((left, right) => {
    const byDate = right.performedOn.localeCompare(left.performedOn);
    if (byDate !== 0) {
      return byDate;
    }
    const byCreated = right.sessionCreatedAt.localeCompare(left.sessionCreatedAt);
    if (byCreated !== 0) {
      return byCreated;
    }
    return right.sessionId.localeCompare(left.sessionId);
  });

  if (sessions.length === 0) {
    return message(THIN_HISTORY_MESSAGE);
  }

  const latest = sessions[0];
  const load = sharedLoad(latest.sets);
  if (load == null) {
    return message(MIXED_LOAD_MESSAGE);
  }
  const plannedReps = latest.targetReps;
  if (plannedReps == null) {
    return message(MIXED_REPS_MESSAGE);
  }

  const achieved = latest.sets.reduce((min, set) => Math.min(min, set.reps), latest.sets[0].reps);
  const bottom = doubleProgressionBottom(sessions, load, plannedReps);
  if (achieved + 1e-9 < plannedReps) {
    if (achieved > plannedReps - REP_GAP + 1e-9) {
      return suggestion(
        load,
        `Hold ${formatRepCount(plannedReps)} at ${formatKgAmount(load)} until every working set hits it.`,
        plannedReps,
      );
    }
    if (achieved + 1e-9 >= bottom) {
      return suggestion(
        load,
        `Last session reached ${formatRepCount(bottom)} at ${formatKgAmount(load)}.`,
        bottom,
      );
    }
    return suggestion(
      stepBy(load, -1),
      `Last session was under ${formatRepCount(bottom)} at ${formatKgAmount(load)}.`,
      bottom,
    );
  }

  const top = bottom + DOUBLE_PROGRESSION_REP_STEP;
  const hitText = `Last session hit ${formatRepCount(achieved)} at ${formatKgAmount(load)}.`;
  if (achieved + 1e-9 >= top) {
    let heaviest = load;
    for (const session of sessions) {
      for (const set of session.sets) {
        heaviest = Math.max(heaviest, set.loadedKg);
      }
    }
    const nextWeight = Math.min(stepBy(load, 1), stepBy(heaviest, 1));
    return suggestion(nextWeight, hitText, bottom);
  }

  return suggestion(load, hitText, top);
}

/**
 * Suggest a Target weight (kg) from working-set history.
 * With double progression on, also suggest the next session's target reps.
 * Returns a message when there is nothing to apply.
 */
export function suggestTargetWeight(input: {
  sets: TargetWeightHistorySet[];
  plannedReps: number | null;
  excludeSessionId?: string | null;
  today: string;
  /** Account switch. Off keeps the weight-only rule. */
  doubleProgression?: boolean;
}): TargetWeightSuggestion {
  if (input.doubleProgression) {
    return suggestDoubleProgression(input);
  }
  const excludeSessionId = input.excludeSessionId ?? null;
  const historyRows = input.sets.filter((row) => {
    if (excludeSessionId && row.sessionId === excludeSessionId) {
      return false;
    }
    if (row.isWarmup) {
      return false;
    }
    return loggedLoadKg(row.loadedKg) != null;
  });

  if (historyRows.length === 0) {
    return message(LOG_WORKING_SET_MESSAGE);
  }

  const bySession = new Map<string, TargetWeightHistorySet[]>();
  for (const row of historyRows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  const qualifying: QualifyingSession[] = [];
  for (const [sessionId, rows] of bySession) {
    const top = pickTopSet(rows);
    const loadedKg = loggedLoadKg(top.loadedKg);
    const ageDays = calendarAgeDays(top.performedOn, input.today);
    if (loadedKg == null || ageDays == null || ageDays < 0 || ageDays > HISTORY_DAYS) {
      continue;
    }
    qualifying.push({
      sessionId,
      performedOn: top.performedOn.slice(0, 10),
      sessionCreatedAt: top.sessionCreatedAt,
      loadedKg,
      reps: top.reps,
      targetWeightKg:
        top.targetWeightKg == null || !Number.isFinite(Number(top.targetWeightKg))
          ? null
          : roundKg(Number(top.targetWeightKg)),
    });
  }

  qualifying.sort((left, right) => {
    const byDate = right.performedOn.localeCompare(left.performedOn);
    if (byDate !== 0) {
      return byDate;
    }
    const byCreated = right.sessionCreatedAt.localeCompare(left.sessionCreatedAt);
    if (byCreated !== 0) {
      return byCreated;
    }
    return right.sessionId.localeCompare(left.sessionId);
  });

  const recent = qualifying.slice(0, MAX_SESSIONS);
  if (recent.length < MIN_SESSIONS) {
    return message(THIN_HISTORY_MESSAGE);
  }

  const plannedReps = input.plannedReps;
  if (plannedReps == null || !Number.isFinite(plannedReps) || plannedReps <= 0) {
    return message(NEED_TARGET_REPS_MESSAGE);
  }

  const reference = recent[0];
  const previous = recent[1];
  const heaviestLoad = recent.reduce((max, session) => Math.max(max, session.loadedKg), 0);
  const ceiling = stepBy(heaviestLoad, 1);

  // A gap of more than 2 reps is a different rep target, so hold instead of converting or dropping.
  if (Math.abs(plannedReps - reference.reps) > REP_GAP + 1e-9) {
    return suggestion(Math.min(reference.loadedKg, ceiling), REP_TARGET_MISMATCH_RATIONALE);
  }

  const lastTwoHit =
    isHit(reference, plannedReps) &&
    isHit(previous, plannedReps) &&
    loadsWithin(reference.loadedKg, previous.loadedKg);
  if (lastTwoHit) {
    return suggestion(
      Math.min(stepBy(reference.loadedKg, 1), ceiling),
      `Last 2 sessions hit ${formatRepCount(plannedReps)} at ${formatKgAmount(reference.loadedKg)}.`,
    );
  }

  const recentWorkingWeight = previous.loadedKg;
  const isDeload = reference.loadedKg < recentWorkingWeight - LOAD_TOLERANCE_KG - 1e-9;
  if (missedByAtLeast(reference, plannedReps) && !isDeload) {
    return suggestion(
      Math.min(stepBy(reference.loadedKg, -1), ceiling),
      `Last session missed ${formatRepCount(plannedReps)} at ${formatKgAmount(reference.loadedKg)}.`,
    );
  }

  if (isDeload) {
    return suggestion(
      Math.min(recentWorkingWeight, ceiling),
      `Last session was lighter than ${formatKgAmount(recentWorkingWeight)}.`,
    );
  }

  return suggestion(
    Math.min(reference.loadedKg, ceiling),
    `Recent sessions were mixed at ${formatKgAmount(reference.loadedKg)}.`,
  );
}

/** Value to write into a Target weight (kg) number field. */
export function formatSuggestedTargetInput(weightKg: number): string {
  return String(roundKg(weightKg));
}

export function suggestionMatchesField(currentWeightKg: string, suggestedKg: number): boolean {
  const trimmed = currentWeightKg.trim();
  if (!trimmed) {
    return false;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return false;
  }
  return roundKg(parsed) === roundKg(suggestedKg);
}

/** True when the fields already show this suggestion. Reps are checked only when suggested. */
export function suggestionMatchesTarget(input: {
  currentWeightKg: string;
  suggestedKg: number;
  currentReps?: string;
  suggestedReps?: number;
}): boolean {
  if (!suggestionMatchesField(input.currentWeightKg, input.suggestedKg)) {
    return false;
  }
  if (input.suggestedReps == null) {
    return true;
  }
  const trimmed = (input.currentReps ?? "").trim();
  if (!trimmed) {
    return false;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed === input.suggestedReps;
}
