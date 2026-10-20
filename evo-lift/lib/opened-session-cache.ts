import type { Database } from "@/lib/supabase/database.types";
import { createOpenedPageCache } from "@/lib/user-memory-cache";

export type OpenedSessionSnapshot = {
  session: Database["public"]["Tables"]["workout_sessions"]["Row"];
  sessionExercises: Database["public"]["Tables"]["workout_session_exercises"]["Row"][];
  workoutSets: Database["public"]["Tables"]["workout_sets"]["Row"][];
  sessionNumber: number | null;
  createdFromLabel: string | null;
  exerciseLabels: Array<[string, string]>;
  exerciseOptions: Array<{ id: string; label: string; slug: string }>;
  hiddenExerciseIds: string[];
};

const cache = createOpenedPageCache<OpenedSessionSnapshot>();

export function peekOpenedSession(userId: string, sessionId: string): OpenedSessionSnapshot | null {
  return cache.peek(userId, sessionId);
}

export function rememberOpenedSession(userId: string, sessionId: string, snapshot: OpenedSessionSnapshot) {
  cache.remember(userId, sessionId, snapshot);
}

export function invalidateOpenedSessions() {
  cache.invalidate();
}

export function openedSessionEpoch(): number {
  return cache.epoch();
}
