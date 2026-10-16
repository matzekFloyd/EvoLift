/** How many earlier sessions the overlay lists before pointing at the full history. */
export const SHORT_EXERCISE_HISTORY_SESSION_LIMIT = 4;

export const SHORT_EXERCISE_HISTORY_EMPTY = "No earlier sets for this exercise.";
export const SHORT_EXERCISE_HISTORY_LOAD_ERROR = "Could not load recent sets.";
export const SHORT_EXERCISE_HISTORY_LOADING = "Loading recent sets...";
export const SHORT_EXERCISE_HISTORY_MORE = "Older sessions are on the full history.";

export type ShortExerciseHistoryInputSet = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  setNumber: number;
  reps: number;
  loadedKg: number | null;
  isWarmup: boolean;
};

export type ShortExerciseHistorySession = {
  sessionId: string;
  performedOn: string;
  workingSets: Array<{ setNumber: number; line: string }>;
  warmupCount: number;
};

export function shortExerciseHistorySetLine(loadedKg: number | null, reps: number): string {
  const loaded = loadedKg == null || !Number.isFinite(loadedKg) ? "-" : String(loadedKg);
  return `${loaded} kg, ${reps} reps`;
}

export function warmupSetsLabel(count: number): string {
  return count === 1 ? "1 warmup set" : `${count} warmup sets`;
}

/**
 * Recent sessions for the overlay. The session on screen is left out.
 * Working sets stay as lines; warmups collapse to a count so the list stays short.
 */
export function buildShortExerciseHistory(
  sets: ShortExerciseHistoryInputSet[],
  options: { excludeSessionId?: string | null; limit?: number } = {},
): { sessions: ShortExerciseHistorySession[]; hasMore: boolean } {
  const limit = options.limit ?? SHORT_EXERCISE_HISTORY_SESSION_LIMIT;
  const excludeSessionId = options.excludeSessionId ?? null;
  const bySession = new Map<
    string,
    {
      sessionId: string;
      performedOn: string;
      sessionCreatedAt: string;
      sets: ShortExerciseHistoryInputSet[];
    }
  >();

  for (const set of sets) {
    if (excludeSessionId && set.sessionId === excludeSessionId) {
      continue;
    }
    const existing = bySession.get(set.sessionId);
    if (existing) {
      existing.sets.push(set);
      continue;
    }
    bySession.set(set.sessionId, {
      sessionId: set.sessionId,
      performedOn: set.performedOn.slice(0, 10),
      sessionCreatedAt: set.sessionCreatedAt,
      sets: [set],
    });
  }

  const ordered = [...bySession.values()].sort((left, right) => {
    const dateCompare = right.performedOn.localeCompare(left.performedOn);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return right.sessionCreatedAt.localeCompare(left.sessionCreatedAt);
  });
  const visible = ordered.slice(0, Math.max(0, limit));

  return {
    hasMore: ordered.length > visible.length,
    sessions: visible.map((session) => {
      const workingSets = session.sets
        .filter((set) => !set.isWarmup)
        .sort((left, right) => left.setNumber - right.setNumber)
        .map((set) => ({
          setNumber: set.setNumber,
          line: shortExerciseHistorySetLine(set.loadedKg, set.reps),
        }));
      const warmupCount = session.sets.filter((set) => set.isWarmup).length;
      return {
        sessionId: session.sessionId,
        performedOn: session.performedOn,
        workingSets,
        warmupCount,
      };
    }),
  };
}
