import { estimateEpley1Rm } from "@/lib/exercise-progress-insights";
import { formatDateToYyyyMmDd } from "@/lib/session-date";

/** Inclusive last-4-weeks window. */
export const REPORT_PERIOD_DAYS = 28;

export const REPORT_MIN_SESSIONS = 2;

export const REPORT_FACTS_MAX_CHARS = 8000;

export const REPORT_MEDICAL_LINE =
  "Suggestions come from logged training and are not medical advice.";

export const REPORT_TOO_FEW_SESSIONS_MESSAGE =
  "Log at least two sessions in the last 4 weeks before creating a report.";

export type ReportKind = "recent" | "all";

export function reportKindFromBody(value: unknown): ReportKind | null {
  if (value == null) {
    return "recent";
  }
  if (value === "recent" || value === "all") {
    return value;
  }
  return null;
}

export function reportTooFewSessionsMessage(kind: ReportKind): string {
  return kind === "all"
    ? "Log at least two sessions before creating a report of all sessions."
    : REPORT_TOO_FEW_SESSIONS_MESSAGE;
}

export const REPORT_PAUSED_MESSAGE = "Reports can't be created right now. Try again later.";

export const REPORT_BUSY_MESSAGE = "The report service is busy. Try again in a few minutes.";

export const REPORT_FAILED_MESSAGE = "The report could not be created. Try again.";

export const REPORT_UNAVAILABLE_MESSAGE = "Reports are not available right now.";

export const REPORT_PAGE_ONLY_MESSAGE = "Create a report from the Reports page.";

const NOTE_MAX_CHARS = 200;

export type ReportSet = {
  reps: number;
  weightKg: number | null;
  warmup: boolean;
};

export type ReportExercise = {
  name: string;
  notes: string | null;
  notDone: boolean;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  /** Bar or other base weight stored on the exercise. Null when the log has none. */
  baseWeightKg: number | null;
  sets: ReportSet[];
};

export type ReportSession = {
  performedOn: string;
  notes: string | null;
  completed: boolean;
  exercises: ReportExercise[];
};

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function reportPeriodEnding(today: string): { from: string; to: string } {
  const end = parseLocalDate(today);
  const start = new Date(end);
  start.setDate(end.getDate() - (REPORT_PERIOD_DAYS - 1));
  return { from: formatDateToYyyyMmDd(start), to: formatDateToYyyyMmDd(end) };
}

/** The client calendar day may be one day off the server clock. */
export function reportTodayAccepted(clientToday: string, serverToday: string): boolean {
  const dayMs = 24 * 60 * 60 * 1000;
  const client = parseLocalDate(clientToday).getTime();
  const server = parseLocalDate(serverToday).getTime();
  return Math.abs(client - server) <= dayMs;
}

export function sessionCountsForReport(session: ReportSession): boolean {
  const hasWorkingSet = session.exercises.some((exercise) =>
    exercise.sets.some((set) => !set.warmup),
  );
  return hasWorkingSet || session.completed;
}

function clipNote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= NOTE_MAX_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, NOTE_MAX_CHARS - 1)}…`;
}

function formatLoad(weightKg: number | null, reps: number): string {
  if (weightKg == null) {
    return `${reps} reps`;
  }
  return `${weightKg} kg × ${reps}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(value: string): string {
  const [, month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

function shiftDate(value: string, days: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return formatDateToYyyyMmDd(date);
}

/** Seed notes carry an idempotency key the lifter should not read. */
function readableNote(value: string): string {
  const stripped = value.replace(/^Report sample:.*?(?: — |$)/, "").trim();
  if (!stripped) {
    return "";
  }
  return clipNote(stripped);
}

function workingSets(exercise: ReportExercise): ReportSet[] {
  return exercise.sets.filter((set) => !set.warmup);
}

function missedTarget(exercise: ReportExercise): boolean {
  const working = workingSets(exercise);
  if (exercise.notDone) {
    return false;
  }
  if (exercise.targetSets != null && working.length < exercise.targetSets) {
    return true;
  }
  return working.some((set) => {
    if (exercise.targetReps != null && set.reps < exercise.targetReps) {
      return true;
    }
    return (
      exercise.targetWeightKg != null &&
      set.weightKg != null &&
      set.weightKg < exercise.targetWeightKg
    );
  });
}

function heaviest(sets: ReportSet[]): ReportSet | null {
  return sets.reduce<ReportSet | null>((best, set) => {
    if (!best) {
      return set;
    }
    const bestWeight = best.weightKg ?? -1;
    const setWeight = set.weightKg ?? -1;
    if (setWeight > bestWeight || (setWeight === bestWeight && set.reps > best.reps)) {
      return set;
    }
    return best;
  }, null);
}

function setE1rm(set: ReportSet, baseWeightKg: number | null): number | null {
  const total = (set.weightKg ?? 0) + (baseWeightKg ?? 0);
  return estimateEpley1Rm(total, set.reps);
}

function formatKg(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} kg`;
}

type TopPoint = {
  on: string;
  reps: number;
  weightKg: number | null;
  e1rmKg: number | null;
};

type ExerciseStory = {
  name: string;
  points: TopPoint[];
  skipped: number;
  skipNote: string | null;
  latestMiss: string | null;
  latestOn: string | null;
};

function sameLoad(left: TopPoint, right: TopPoint): boolean {
  return left.weightKg === right.weightKg && left.reps === right.reps;
}

function direction(first: TopPoint, last: TopPoint): "up" | "down" | "same" {
  const firstWeight = first.weightKg ?? -1;
  const lastWeight = last.weightKg ?? -1;
  if (lastWeight > firstWeight) {
    return "up";
  }
  if (lastWeight < firstWeight) {
    return "down";
  }
  if (last.reps > first.reps) {
    return "up";
  }
  if (last.reps < first.reps) {
    return "down";
  }
  return "same";
}

function loadOn(point: TopPoint): string {
  return `${formatLoad(point.weightKg, point.reps)} on ${shortDate(point.on)}`;
}

function missDetail(exercise: ReportExercise): string | null {
  if (!missedTarget(exercise)) {
    return null;
  }
  const working = workingSets(exercise);
  if (exercise.targetSets != null && working.length < exercise.targetSets) {
    return `${working.length} working ${working.length === 1 ? "set" : "sets"}, target ${exercise.targetSets}`;
  }
  const shortReps = [...working]
    .reverse()
    .find((set) => exercise.targetReps != null && set.reps < exercise.targetReps);
  if (shortReps) {
    return `${formatLoad(shortReps.weightKg, shortReps.reps)} on a working set, target ${exercise.targetReps} reps`;
  }
  const light = working.find(
    (set) =>
      exercise.targetWeightKg != null &&
      set.weightKg != null &&
      set.weightKg < exercise.targetWeightKg,
  );
  if (light && exercise.targetWeightKg != null) {
    return `${formatLoad(light.weightKg, light.reps)}, target ${exercise.targetWeightKg} kg`;
  }
  return "missed the target";
}

function collectStories(sessions: ReportSession[]): ExerciseStory[] {
  const byName = new Map<string, ExerciseStory>();
  const ordered = [...sessions].sort((left, right) => left.performedOn.localeCompare(right.performedOn));
  for (const session of ordered) {
    for (const exercise of session.exercises) {
      const current = byName.get(exercise.name) ?? {
        name: exercise.name,
        points: [],
        skipped: 0,
        skipNote: null,
        latestMiss: null,
        latestOn: null,
      };
      const heavy = heaviest(workingSets(exercise));
      if (heavy) {
        current.points.push({
          on: session.performedOn,
          reps: heavy.reps,
          weightKg: heavy.weightKg,
          e1rmKg: setE1rm(heavy, exercise.baseWeightKg),
        });
        current.latestOn = session.performedOn;
        current.latestMiss = missDetail(exercise);
      }
      if (exercise.notDone) {
        current.skipped += 1;
        const note = exercise.notes?.trim() ? readableNote(exercise.notes) : "";
        if (note) {
          current.skipNote = note;
        }
      }
      byName.set(exercise.name, current);
    }
  }
  return [...byName.values()];
}

function movementLine(story: ExerciseStory): string {
  const first = story.points[0];
  const last = story.points[story.points.length - 1];
  let line = `${story.name}: ${loadOn(first)} to ${loadOn(last)}.`;
  const tail = story.points.slice(-3);
  if (story.points.length >= 3 && tail.every((point) => sameLoad(point, tail[0]))) {
    line += " The last 3 sessions were the same load.";
  }
  const earlierBest = story.points
    .slice(0, -1)
    .reduce((best, point) => Math.max(best, point.e1rmKg ?? 0), 0);
  if (last.e1rmKg != null && earlierBest > 0 && last.e1rmKg > earlierBest) {
    line += ` Best estimated 1RM in this window, ${formatKg(last.e1rmKg)}, above ${formatKg(earlierBest)} earlier.`;
  }
  return line;
}

function sessionVolume(session: ReportSession): number {
  return session.exercises.reduce((total, exercise) => {
    for (const set of workingSets(exercise)) {
      if (set.weightKg != null) {
        total += set.weightKg * set.reps;
      }
    }
    return total;
  }, 0);
}

type VolumeComparison = {
  firstHalfKg: number;
  secondHalfKg: number;
  changePercent: number;
};

function midpoint(from: string, to: string): string {
  const start = parseLocalDate(from).getTime();
  const end = parseLocalDate(to).getTime();
  return formatDateToYyyyMmDd(new Date(start + Math.floor((end - start) / 2)));
}

function volumeComparison(
  from: string,
  to: string,
  sessions: ReportSession[],
  kind: ReportKind,
): VolumeComparison | null {
  const mid = kind === "all" ? midpoint(from, to) : shiftDate(from, 14);
  const firstHalf = sessions
    .filter((session) => session.performedOn < mid)
    .reduce((total, session) => total + sessionVolume(session), 0);
  const secondHalf = sessions
    .filter((session) => session.performedOn >= mid)
    .reduce((total, session) => total + sessionVolume(session), 0);
  if (firstHalf <= 0 || secondHalf <= 0) {
    return null;
  }
  return {
    firstHalfKg: Math.round(firstHalf),
    secondHalfKg: Math.round(secondHalf),
    changePercent: Math.round(((secondHalf - firstHalf) / firstHalf) * 100),
  };
}

function volumeLine(volume: VolumeComparison | null): string | null {
  if (!volume || Math.abs(volume.changePercent) < 8) {
    return null;
  }
  const relation = volume.changePercent > 0 ? "above" : "below";
  return `Second-half working volume ${volume.secondHalfKg} kg, ${Math.abs(volume.changePercent)}% ${relation} the first half.`;
}

export type ReportLiftDirection = "up" | "down" | "held";

export type ReportLiftRow = {
  name: string;
  earlier: string;
  latest: string;
  change: string;
  direction: ReportLiftDirection;
  /** Sessions with a working set. Set for an all-training report. */
  logged: number | null;
  /** Heaviest working set in the span. Set for an all-training report. */
  heaviest: string | null;
};

/** Snapshot of the numbers the report page draws. The model does not write these. */
export type ReportSummary = {
  kind: ReportKind;
  sessions: number;
  pace: string | null;
  volumeFirstLabel: string;
  volumeSecondLabel: string;
  firstHalfKg: number | null;
  secondHalfKg: number | null;
  volumeChangePercent: number | null;
  lifts: ReportLiftRow[];
  skipped: string[];
  watch: string[];
  notes: string[];
};

function formatAmount(value: number): string {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function liftChange(first: TopPoint, last: TopPoint): { change: string; direction: ReportLiftDirection } {
  const trend = direction(first, last);
  if (trend === "same") {
    return { change: "Held", direction: "held" };
  }
  const weightDelta = (last.weightKg ?? 0) - (first.weightKg ?? 0);
  if (weightDelta !== 0) {
    const sign = weightDelta > 0 ? "+" : "-";
    return { change: `${sign}${formatAmount(weightDelta)} kg`, direction: trend };
  }
  const repDelta = last.reps - first.reps;
  const sign = repDelta > 0 ? "+" : "-";
  return { change: `${sign}${Math.abs(repDelta)} reps`, direction: trend };
}

function liftRow(story: ExerciseStory): ReportLiftRow {
  const first = story.points[0];
  const last = story.points[story.points.length - 1];
  const change = liftChange(first, last);
  return {
    name: story.name,
    earlier: formatLoad(first.weightKg, first.reps),
    latest: formatLoad(last.weightKg, last.reps),
    change: change.change,
    direction: change.direction,
    logged: null,
    heaviest: null,
  };
}

const REPORT_SUMMARY_MARK = "---report-summary---";

export function attachReportSummary(prose: string, summary: ReportSummary): string {
  const tail = `\n\n${REPORT_SUMMARY_MARK}\n${JSON.stringify(summary)}`;
  const room = 12000 - tail.length;
  const body = prose.trim().slice(0, Math.max(room, 0)).trim();
  return `${body}${tail}`;
}

function isLiftRow(value: unknown): value is ReportLiftRow {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as ReportLiftRow;
  return (
    typeof row.name === "string" &&
    typeof row.earlier === "string" &&
    typeof row.latest === "string" &&
    typeof row.change === "string" &&
    (row.direction === "up" || row.direction === "down" || row.direction === "held")
  );
}

export function readReportSummary(text: string): { prose: string; summary: ReportSummary | null } {
  const index = text.lastIndexOf(REPORT_SUMMARY_MARK);
  if (index === -1) {
    return { prose: text, summary: null };
  }
  const prose = text.slice(0, index).trim();
  try {
    const parsed = JSON.parse(text.slice(index + REPORT_SUMMARY_MARK.length).trim()) as Partial<ReportSummary>;
    if (typeof parsed.sessions !== "number" || !Array.isArray(parsed.lifts) || !parsed.lifts.every(isLiftRow)) {
      return { prose, summary: null };
    }
    return {
      prose,
      summary: {
        sessions: parsed.sessions,
        firstHalfKg: typeof parsed.firstHalfKg === "number" ? parsed.firstHalfKg : null,
        secondHalfKg: typeof parsed.secondHalfKg === "number" ? parsed.secondHalfKg : null,
        volumeChangePercent: typeof parsed.volumeChangePercent === "number" ? parsed.volumeChangePercent : null,
        lifts: parsed.lifts.map((row) => ({
          ...row,
          logged: typeof row.logged === "number" ? row.logged : null,
          heaviest: typeof row.heaviest === "string" ? row.heaviest : null,
        })),
        skipped: Array.isArray(parsed.skipped) ? parsed.skipped.filter((line) => typeof line === "string") : [],
        watch: Array.isArray(parsed.watch) ? parsed.watch.filter((line) => typeof line === "string") : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes.filter((line) => typeof line === "string") : [],
        kind: parsed.kind === "all" ? "all" : "recent",
        pace: typeof parsed.pace === "string" ? parsed.pace : null,
        volumeFirstLabel: typeof parsed.volumeFirstLabel === "string" ? parsed.volumeFirstLabel : "First 2 weeks",
        volumeSecondLabel: typeof parsed.volumeSecondLabel === "string" ? parsed.volumeSecondLabel : "Last 2 weeks",
      },
    };
  } catch {
    return { prose, summary: null };
  }
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86_400_000);
}

function paceLabel(sessions: ReportSession[]): string | null {
  if (sessions.length < 2) {
    return null;
  }
  const days = daysBetween(sessions[0].performedOn, sessions[sessions.length - 1].performedOn);
  if (days < 14) {
    return null;
  }
  return `${(sessions.length / (days / 7)).toFixed(1)} sessions a week`;
}

function longestBreak(sessions: ReportSession[]): string | null {
  let best: { days: number; from: string; to: string } | null = null;
  for (let index = 1; index < sessions.length; index += 1) {
    const days = daysBetween(sessions[index - 1].performedOn, sessions[index].performedOn);
    if (days >= 14 && (!best || days > best.days)) {
      best = { days, from: sessions[index - 1].performedOn, to: sessions[index].performedOn };
    }
  }
  return best ? `Longest break was ${best.days} days, ${shortDate(best.from)} to ${shortDate(best.to)}.` : null;
}

function e1rmEndpoints(story: ExerciseStory): { first: number; last: number; percent: number } | null {
  const estimates = story.points
    .map((point) => point.e1rmKg)
    .filter((value): value is number => value != null && value > 0);
  if (estimates.length < 2 || estimates[0] <= 0) {
    return null;
  }
  const first = estimates[0];
  const last = estimates[estimates.length - 1];
  return { first, last, percent: Math.round(((last - first) / first) * 100) };
}

function heaviestPoint(story: ExerciseStory): TopPoint {
  return story.points.reduce((best, point) => {
    const bestWeight = best.weightKg ?? -1;
    const weight = point.weightKg ?? -1;
    if (weight > bestWeight || (weight === bestWeight && point.reps > best.reps)) {
      return point;
    }
    return best;
  });
}

function allHistoryRow(story: ExerciseStory): ReportLiftRow | null {
  if (story.points.length < 4) {
    return null;
  }
  const span = e1rmEndpoints(story);
  const heavy = heaviestPoint(story);
  if (!span) {
    const first = story.points[0];
    const last = story.points[story.points.length - 1];
    const change = liftChange(first, last);
    return {
      name: story.name,
      earlier: formatLoad(first.weightKg, first.reps),
      latest: formatLoad(last.weightKg, last.reps),
      change: change.change,
      direction: change.direction,
      logged: story.points.length,
      heaviest: formatLoad(heavy.weightKg, heavy.reps),
    };
  }
  const direction: ReportLiftDirection = Math.abs(span.percent) < 3 ? "held" : span.percent > 0 ? "up" : "down";
  return {
    name: story.name,
    earlier: formatKg(span.first),
    latest: formatKg(span.last),
    change: direction === "held" ? "Held" : `${span.percent > 0 ? "+" : "-"}${Math.abs(span.percent)}%`,
    direction,
    logged: story.points.length,
    heaviest: formatLoad(heavy.weightKg, heavy.reps),
  };
}

function belowBestLine(story: ExerciseStory): string | null {
  const estimates = story.points
    .map((point) => point.e1rmKg)
    .filter((value): value is number => value != null && value > 0);
  if (estimates.length < 2) {
    return null;
  }
  const best = Math.max(...estimates);
  const latest = estimates[estimates.length - 1];
  if (latest >= best * 0.92) {
    return null;
  }
  const percent = Math.round(((best - latest) / best) * 100);
  return `${story.name} estimated 1RM is ${percent}% below its best in this log.`;
}

function compileAllReport(input: {
  from: string;
  to: string;
  sessions: ReportSession[];
}): { facts: string; summary: ReportSummary } {
  const counted = input.sessions
    .filter(sessionCountsForReport)
    .sort((left, right) => left.performedOn.localeCompare(right.performedOn));
  const stories = collectStories(counted);
  const ranked = stories
    .map((story) => ({ story, span: e1rmEndpoints(story), row: allHistoryRow(story) }))
    .filter((item): item is { story: ExerciseStory; span: NonNullable<ReturnType<typeof e1rmEndpoints>>; row: ReportLiftRow } =>
      item.row != null && item.span != null,
    );
  const grew = [...ranked].filter((item) => item.span.percent >= 3).sort((left, right) => right.span.percent - left.span.percent);
  const faded = [...ranked].filter((item) => item.span.percent <= -3).sort((left, right) => left.span.percent - right.span.percent);
  const fadedNames = new Set(faded.slice(0, 3).map((item) => item.story.name));
  const lifts = [...grew.slice(0, 8), ...faded.slice(0, 3)].map((item) => item.row);
  const breakLine = longestBreak(counted);
  const offPeak = stories
    .filter((story) => !fadedNames.has(story.name))
    .map((story) => belowBestLine(story))
    .filter((line): line is string => line != null)
    .slice(0, 2);
  const watch = [breakLine, ...offPeak].filter((line): line is string => line != null);
  const notes: string[] = [];
  for (let index = counted.length - 1; index >= 0; index -= 1) {
    const session = counted[index];
    const note = session.notes?.trim() ? readableNote(session.notes) : "";
    if (note) {
      notes.push(`${shortDate(session.performedOn)}: ${note}`);
      break;
    }
  }
  const volume = volumeComparison(input.from, input.to, counted, "all");
  const pace = paceLabel(counted);
  const summary: ReportSummary = {
    kind: "all",
    sessions: counted.length,
    pace,
    volumeFirstLabel: "First half",
    volumeSecondLabel: "Second half",
    firstHalfKg: volume?.firstHalfKg ?? null,
    secondHalfKg: volume?.secondHalfKg ?? null,
    volumeChangePercent: volume && Math.abs(volume.changePercent) >= 8 ? volume.changePercent : null,
    lifts,
    skipped: [],
    watch,
    notes,
  };
  const grewLines = grew.slice(0, 4).map((item) => {
    const heavy = heaviestPoint(item.story);
    return `${item.story.name}: estimated 1RM ${formatKg(item.span.first)} to ${formatKg(item.span.last)} (${item.row.change}). Heaviest ${formatLoad(heavy.weightKg, heavy.reps)}. ${item.story.points.length} sessions.`;
  });
  const fadedLines = faded.slice(0, 3).map(
    (item) => `${item.story.name}: estimated 1RM ${formatKg(item.span.first)} to ${formatKg(item.span.last)} (${item.row.change}).`,
  );
  const blocks = [
    `All logged training, ${shortDate(input.from)} to ${shortDate(input.to)}.`,
    `Sessions: ${counted.length}.`,
    pace ? `About ${pace}.` : "",
    volumeLine(volume) ?? "",
    grewLines.length > 0 ? `Grew:\n${grewLines.join("\n")}` : "No lift has an estimated 1RM change across four or more sessions.",
    fadedLines.length > 0 ? `Faded:\n${fadedLines.join("\n")}` : "",
    watch.length > 0 ? `Watch:\n${watch.join("\n")}` : "",
    notes.length > 0 ? `Notes:\n${notes.join("\n")}` : "",
  ].filter(Boolean);
  let text = blocks.join("\n\n");
  if (text.length > REPORT_FACTS_MAX_CHARS) {
    text = `${text.slice(0, REPORT_FACTS_MAX_CHARS - 1)}…`;
  }
  return { facts: text, summary };
}

function compileReport(input: {
  from: string;
  to: string;
  sessions: ReportSession[];
  kind?: ReportKind;
}): { facts: string; summary: ReportSummary } {
  if ((input.kind ?? "recent") === "all") {
    return compileAllReport(input);
  }
  const counted = input.sessions
    .filter(sessionCountsForReport)
    .sort((left, right) => left.performedOn.localeCompare(right.performedOn));
  const stories = collectStories(counted);
  const moved = stories
    .filter((story) => story.points.length >= 2 && direction(story.points[0], story.points[story.points.length - 1]) === "up")
    .sort((left, right) => {
      const leftDelta = (left.points[left.points.length - 1].weightKg ?? 0) - (left.points[0].weightKg ?? 0);
      const rightDelta = (right.points[right.points.length - 1].weightKg ?? 0) - (right.points[0].weightKg ?? 0);
      return rightDelta - leftDelta;
    })
    .slice(0, 4);
  const movedNames = new Set(moved.map((story) => story.name));
  const dropped = stories
    .filter((story) => story.points.length >= 2 && direction(story.points[0], story.points[story.points.length - 1]) === "down")
    .sort((left, right) => {
      const leftDelta = (left.points[0].weightKg ?? 0) - (left.points[left.points.length - 1].weightKg ?? 0);
      const rightDelta = (right.points[0].weightKg ?? 0) - (right.points[right.points.length - 1].weightKg ?? 0);
      return rightDelta - leftDelta;
    })
    .slice(0, 3);
  const droppedNames = new Set(dropped.map((story) => story.name));
  const held = stories
    .filter((story) => {
      if (movedNames.has(story.name) || story.points.length < 3) {
        return false;
      }
      return direction(story.points[0], story.points[story.points.length - 1]) === "same";
    })
    .sort((left, right) => right.points.length - left.points.length)
    .slice(0, 2);
  const skipped = stories
    .filter((story) => story.skipped > 0)
    .sort((left, right) => right.skipped - left.skipped)
    .slice(0, 3);
  const watch = stories
    .filter((story) => story.latestMiss && story.latestOn && !droppedNames.has(story.name))
    .sort((left, right) => (right.latestOn ?? "").localeCompare(left.latestOn ?? ""))
    .slice(0, 3);
  const notes = counted
    .flatMap((session) => {
      const lines: string[] = [];
      const sessionNote = session.notes?.trim() ? readableNote(session.notes) : "";
      if (sessionNote) {
        lines.push(`${shortDate(session.performedOn)}: ${sessionNote}`);
      }
      for (const exercise of session.exercises) {
        if (exercise.notDone || !exercise.notes?.trim()) {
          continue;
        }
        const note = readableNote(exercise.notes);
        if (note) {
          lines.push(`${shortDate(session.performedOn)}: ${exercise.name}: ${note}`);
        }
      }
      return lines;
    })
    .slice(-3);
  const volume = volumeComparison(input.from, input.to, counted, "recent");
  const summary: ReportSummary = {
    kind: "recent",
    sessions: counted.length,
    pace: null,
    volumeFirstLabel: "First 2 weeks",
    volumeSecondLabel: "Last 2 weeks",
    firstHalfKg: volume?.firstHalfKg ?? null,
    secondHalfKg: volume?.secondHalfKg ?? null,
    volumeChangePercent: volume && Math.abs(volume.changePercent) >= 8 ? volume.changePercent : null,
    lifts: [...moved, ...dropped, ...held].map(liftRow),
    skipped: skipped.map((story) => {
      const times = story.skipped === 1 ? "once" : `${story.skipped} times`;
      const note = story.skipNote?.replace(/^skipped\.?\s*/i, "") ?? "";
      return note ? `${story.name} skipped ${times}. ${note}` : `${story.name} skipped ${times}.`;
    }),
    watch: watch.map((story) => `${story.name} on ${shortDate(story.latestOn ?? "")}: ${story.latestMiss}.`),
    notes,
  };
  const volumeText = volumeLine(volume);
  const blocks = [
    `Last 4 weeks, ${shortDate(input.from)} to ${shortDate(input.to)}.`,
    `Sessions: ${counted.length}.`,
    volumeText ?? "",
    moved.length > 0 ? `Moved:\n${moved.map(movementLine).join("\n")}` : "No lift changed load across two or more sessions.",
    dropped.length > 0 ? `Dropped:\n${dropped.map(movementLine).join("\n")}` : "",
    held.length > 0
      ? `Held:\n${held
          .map((story) => {
            const last = story.points[story.points.length - 1];
            return `${story.name} stayed at ${formatLoad(last.weightKg, last.reps)} across ${story.points.length} sessions.`;
          })
          .join("\n")}`
      : "",
    summary.skipped.length > 0 ? `Skipped:\n${summary.skipped.join("\n")}` : "",
    summary.watch.length > 0 ? `Watch:\n${summary.watch.join("\n")}` : "",
    notes.length > 0 ? `Notes:\n${notes.join("\n")}` : "",
  ].filter(Boolean);
  let text = blocks.join("\n\n");
  if (text.length > REPORT_FACTS_MAX_CHARS) {
    text = `${text.slice(0, REPORT_FACTS_MAX_CHARS - 1)}…`;
  }
  return { facts: text, summary };
}

export function buildReportFacts(input: {
  from: string;
  to: string;
  sessions: ReportSession[];
  kind?: ReportKind;
}): string {
  return compileReport(input).facts;
}

export function buildReportSummary(input: {
  from: string;
  to: string;
  sessions: ReportSession[];
  kind?: ReportKind;
}): ReportSummary {
  return compileReport(input).summary;
}

export function trainingReportInstructions(kind: ReportKind = "recent"): string {
  const shared = [
    "Bold each lift name once, as **Name**.",
    "Do not mention a lift that is not in the brief. Do not invent weights, personal bests, or exercises.",
    "Do not list every set, do not count how many times a target was missed, and do not add a bar to a weight.",
    "No headings and no bullet lists. Separate the two sentences with a blank line.",
    `End with this sentence: ${REPORT_MEDICAL_LINE}`,
  ];
  const opening =
    kind === "all"
      ? [
          "Write two short sentences in English from the brief. The page already shows the full-history table and the volume comparison, so do not repeat those numbers.",
          "The first sentence names the session count and the lifts under Grew, without their loads.",
          "The second sentence says what to watch, using only Faded and Watch. Do not set the next weight and do not write a new program.",
        ]
      : [
          "Write two short sentences in English from the brief. The page already shows a table of the loads and a volume comparison, so do not repeat those numbers.",
          "The first sentence names the session count and the lifts under Moved or Dropped, without their loads.",
          "The second sentence says what to watch next time, using only Watch, Skipped, and Notes. Name the lift or the note. Do not set the next weight and do not write a new program.",
        ];
  return [...opening, ...shared].join(" ");
}

/** Saved text may still contain markdown from an earlier prompt. Show it as paragraphs. */
export function reportParagraphs(text: string): string[] {
  const cleaned = text
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*[*•-][ \t]+/gm, "")
    .replace(/\*\*([^*]+)\*\*[ \t]+([,.;:!?])/g, "**$1**$2");
  return cleaned
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export function withMedicalLine(text: string): string {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().includes("not medical advice")) {
    return trimmed;
  }
  return `${trimmed}\n\n${REPORT_MEDICAL_LINE}`;
}

/** A personal API token must not start a model call. */
export function reportCreateFromSession(usesPersonalToken: boolean): boolean {
  return !usesPersonalToken;
}

/** Rolling wait after a report of the same kind is created. */
export const REPORT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** One report costs well under a cent. Leave at least this much before starting another. */
export const REPORT_MIN_BALANCE_USD = 0.01;

export function reportKindOfText(text: string): ReportKind {
  return readReportSummary(text).summary?.kind ?? "recent";
}

/** When the same kind of report can be created again, or null when it can be created now. */
export function reportNextCreateAt(
  reports: Array<{ report_text: string; created_at: string }>,
  kind: ReportKind,
  now: Date,
): Date | null {
  let newest = Number.NEGATIVE_INFINITY;
  for (const report of reports) {
    if (reportKindOfText(report.report_text) !== kind) {
      continue;
    }
    const created = new Date(report.created_at).getTime();
    if (Number.isFinite(created) && created > newest) {
      newest = created;
    }
  }
  if (!Number.isFinite(newest)) {
    return null;
  }
  const availableAt = newest + REPORT_COOLDOWN_MS;
  return availableAt > now.getTime() ? new Date(availableAt) : null;
}

export function reportCooldownMessage(kind: ReportKind, availableAt: Date): string {
  const name = kind === "all" ? "all-sessions" : "4-week";
  const when = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(availableAt);
  return `Next ${name} report available on ${when}.`;
}

function parseUsd(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

/** Remaining USD from a GET /v1/credits body, or null when the balance cannot be read. */
export function reportSpendableUsd(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const body = payload as { balance?: unknown; token_pass?: unknown };
  const balance = parseUsd(body.balance);
  if (balance == null) {
    return null;
  }
  const pass = body.token_pass;
  if (!pass || typeof pass !== "object") {
    return balance;
  }
  const remaining = (pass as { remaining?: unknown }).remaining;
  if (remaining == null) {
    return balance;
  }
  const passUsd = parseUsd(remaining);
  return passUsd == null ? balance : balance + passUsd;
}

/** True only when the balance was read and it cannot cover another report. */
export function reportAllowancePaused(spendableUsd: number | null): boolean {
  return spendableUsd != null && spendableUsd < REPORT_MIN_BALANCE_USD;
}

export function reportGatewayFailure(status: number): { status: number; message: string } {
  if (status === 402) {
    return { status: 503, message: REPORT_PAUSED_MESSAGE };
  }
  if (status === 429) {
    return { status: 503, message: REPORT_BUSY_MESSAGE };
  }
  if (status === 401 || status === 403) {
    return { status: 503, message: REPORT_UNAVAILABLE_MESSAGE };
  }
  return { status: 503, message: REPORT_FAILED_MESSAGE };
}
