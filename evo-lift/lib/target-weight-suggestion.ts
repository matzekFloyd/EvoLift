import { formatKgAmount, formatRepCount, roundKg } from "@/lib/milestone-progress";

/** One increment for every exercise until body region exists. */
const STEP_KG = 2.5;
const PLATE_KG = 1.25;
const LOAD_TOLERANCE_KG = 0.25;
/** Sessions older than this are outside the history window. */
const HISTORY_DAYS = 56;
const MAX_SESSIONS = 3;
const MIN_SESSIONS = 2;
/** A miss, or a rep-target mismatch, starts at more than this many reps. */
const REP_GAP = 2;

export const LOG_WORKING_SET_MESSAGE = "Log a working set to get suggestions.";
export const THIN_HISTORY_MESSAGE = "Not enough recent working sets to suggest a target.";
export const NEED_TARGET_REPS_MESSAGE = "Enter target reps to get a suggestion.";
export const REP_TARGET_MISMATCH_RATIONALE = "History is for a different rep target.";

/** Missing account rows stay on, same as an explicit true. */
export function targetSuggestionsEnabled(suggestTarget: boolean | null | undefined): boolean {
  return suggestTarget !== false;
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
};

export type TargetWeightSuggestion =
  | { status: "message"; message: string }
  | { status: "suggestion"; weightKg: number; rationale: string };

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

function suggestion(weightKg: number, rationale: string): TargetWeightSuggestion {
  return { status: "suggestion", weightKg: roundKg(weightKg), rationale };
}

/** Snap to the nearest 1.25 kg. */
function roundToPlateKg(value: number): number {
  const plates = Math.round(value / PLATE_KG);
  return Math.round(plates * 125) / 100;
}

/** Move one 2.5 kg step and snap to 1.25 kg, without traveling more than one step. */
function stepBy(load: number, direction: 1 | -1): number {
  const raw = roundToPlateKg(load + direction * STEP_KG);
  const moved = direction === 1 ? raw - load : load - raw;
  const adjusted = moved > STEP_KG + 0.001 ? roundToPlateKg(raw - direction * PLATE_KG) : raw;
  return Math.max(0, adjusted);
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

/**
 * Suggest a Target weight (kg) from working-set history.
 * Returns a message when there is nothing to apply.
 */
export function suggestTargetWeight(input: {
  sets: TargetWeightHistorySet[];
  plannedReps: number | null;
  excludeSessionId?: string | null;
  today: string;
}): TargetWeightSuggestion {
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
