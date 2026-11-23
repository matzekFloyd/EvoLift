import { visibleInsightExerciseSets } from "@/lib/hidden-exercise-lists";
import { profileOverallLevel, type ProfileOverallLevel } from "@/lib/profile-overall-level";
import {
  buildExerciseProgressReport,
  type ExerciseProgressReport,
  type LiftBalanceNote,
} from "@/lib/exercise-progress-insights";
import {
  loadCachedInsightsHistory,
  loadUserStrengthProfile,
  type ExerciseWorkingSetSample,
  type UserStrengthProfile,
} from "@/lib/insights-data";
import { OVERALL_LEVEL_RECENT_DAYS } from "@/lib/overall-level-detail";
import { isPublicStandardLift } from "@/lib/strength-standards";
import type { Database } from "@/lib/supabase/database.types";
import { createUserMemoryCache } from "@/lib/user-memory-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_KEY = "evolift.overall-level.v1";

/** Current overall level and the per-exercise levels behind it, for one lifter and day. */
export type OverallLevelCacheSnapshot = {
  asOf: string;
  level: ProfileOverallLevel;
  publicNotes: LiftBalanceNote[];
  /** Per-exercise levels for the last 8 weeks through `asOf`. */
  recentPublicNotes: LiftBalanceNote[];
  standardsCaption: string | null;
};

type StoredOverallLevel = OverallLevelCacheSnapshot & {
  userId: string;
};

const memory = createUserMemoryCache<OverallLevelCacheSnapshot>();

function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isSnapshot(value: unknown): value is OverallLevelCacheSnapshot {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const snapshot = value as OverallLevelCacheSnapshot;
  return (
    typeof snapshot.asOf === "string" &&
    snapshot.level != null &&
    typeof snapshot.level === "object" &&
    Array.isArray(snapshot.publicNotes) &&
    Array.isArray(snapshot.recentPublicNotes)
  );
}

function readStored(): StoredOverallLevel | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredOverallLevel;
    if (typeof parsed.userId !== "string" || !isSnapshot(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(userId: string, snapshot: OverallLevelCacheSnapshot) {
  if (!canUseStorage()) {
    return;
  }
  try {
    const payload: StoredOverallLevel = { userId, ...snapshot };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode. The in-memory copy still serves this tab.
  }
}

function clearStored() {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Overall level for every session through `today`, the same figure Home, Profile, and Insights share. */
export function overallLevelSnapshotFromInputs(input: {
  samples: readonly ExerciseWorkingSetSample[];
  hiddenExerciseIds: ReadonlySet<string>;
  profile: UserStrengthProfile | null;
  today: string;
}): OverallLevelCacheSnapshot {
  const level = profileOverallLevel(input);
  const visible = visibleInsightExerciseSets(input.samples, input.hiddenExerciseIds);
  const lifter = {
    sex: level.sex,
    bodyweightKg: level.bodyweightKg,
    bodyweightEntries: input.profile?.bodyweightEntries ?? [],
    ageYears: level.ageYears,
    ageIsApproximate: level.ageIsApproximate,
  };
  const report = buildExerciseProgressReport(visible, { from: "", to: input.today }, lifter);
  const recentReport = buildExerciseProgressReport(
    visible,
    { from: shiftIsoDate(input.today, -OVERALL_LEVEL_RECENT_DAYS), to: input.today },
    lifter,
  );
  return {
    asOf: input.today,
    level,
    publicNotes: report.publicNotes,
    recentPublicNotes: recentReport.publicNotes,
    standardsCaption: report.standardsCaption,
  };
}

export function peekOverallLevelCache(userId: string): OverallLevelCacheSnapshot | null {
  const cached = memory.peek(userId);
  if (cached) {
    return cached;
  }
  const stored = readStored();
  if (!stored || stored.userId !== userId) {
    return null;
  }
  const { userId: _userId, ...snapshot } = stored;
  memory.remember(userId, snapshot);
  return snapshot;
}

export function rememberOverallLevelCache(userId: string, snapshot: OverallLevelCacheSnapshot) {
  memory.remember(userId, snapshot);
  writeStored(userId, snapshot);
}

export function invalidateOverallLevelCache() {
  memory.invalidate();
  clearStored();
}

/** Drop the cached level when a logged change can move it. Other exercises stay cached. */
export function invalidateOverallLevelCacheForSlugs(slugs: readonly string[]) {
  if (slugs.some((slug) => isPublicStandardLift(slug))) {
    invalidateOverallLevelCache();
  }
}

/**
 * True when a date range still ends on the cached day and includes the 8-week window,
 * so its overall level is the cached one.
 */
export function cachedOverallLevelCoversRange(
  asOf: string,
  range: { from: string; to: string },
): boolean {
  if (range.to !== asOf) {
    return false;
  }
  if (range.from === "") {
    return true;
  }
  return range.from <= shiftIsoDate(asOf, -OVERALL_LEVEL_RECENT_DAYS);
}

/** Use the shared level when this range still covers it. Keep the range's own history line. */
export function exerciseProgressWithCachedLevel(
  report: ExerciseProgressReport,
  snapshot: OverallLevelCacheSnapshot | null,
  range: { from: string; to: string },
): ExerciseProgressReport {
  const overall = snapshot?.level.overall;
  if (!snapshot || !overall || !cachedOverallLevelCoversRange(snapshot.asOf, range)) {
    return report;
  }
  const sameWindow = range.from === "";
  const recentWindow = range.from === shiftIsoDate(snapshot.asOf, -OVERALL_LEVEL_RECENT_DAYS);
  const exerciseLevels = sameWindow
    ? snapshot.publicNotes
    : recentWindow
      ? snapshot.recentPublicNotes
      : null;
  return {
    ...report,
    overallLevel: {
      ...overall,
      history: report.overallLevel?.history ?? overall.history,
    },
    ...(exerciseLevels
      ? {
          publicNotes: exerciseLevels,
          standardsCaption: snapshot.standardsCaption,
          comparisonHint: snapshot.level.hint,
        }
      : {}),
  };
}

export async function loadOverallLevelCache(
  client: SupabaseClient<Database>,
  userId: string,
  today: string,
  options?: { fresh?: boolean },
): Promise<OverallLevelCacheSnapshot> {
  if (!options?.fresh) {
    const cached = peekOverallLevelCache(userId);
    if (cached?.asOf === today) {
      return cached;
    }
  }
  const started = memory.epoch();
  const snapshot = await memory.load(
    userId,
    async () => {
      const [history, profile, hidden] = await Promise.all([
        loadCachedInsightsHistory(client, userId, { from: "", to: "" }, { fresh: true }),
        loadUserStrengthProfile(client, userId),
        client.from("user_hidden_exercises").select("exercise_id").eq("user_id", userId),
      ]);
      if (hidden.error) {
        throw new Error("Could not load exercise visibility.");
      }
      return overallLevelSnapshotFromInputs({
        samples: history.exerciseSets,
        hiddenExerciseIds: new Set((hidden.data ?? []).map((row) => row.exercise_id)),
        profile,
        today,
      });
    },
    { fresh: true },
  );
  if (memory.epoch() !== started) {
    const latest = peekOverallLevelCache(userId);
    if (latest) {
      return latest;
    }
    throw new Error("Overall level cache was cleared.");
  }
  writeStored(userId, snapshot);
  return snapshot;
}
