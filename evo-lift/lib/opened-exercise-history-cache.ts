import { createOpenedPageCache } from "@/lib/user-memory-cache";

export type OpenedExerciseHistoryRow = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  performedAt: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  totalKg: number;
  isWarmup: boolean;
  goalLabel: string | null;
};

export type OpenedExerciseHistory = {
  label: string;
  rows: OpenedExerciseHistoryRow[];
};

const cache = createOpenedPageCache<OpenedExerciseHistory>();

export function peekOpenedExerciseHistory(userId: string, slug: string): OpenedExerciseHistory | null {
  return cache.peek(userId, slug);
}

export function rememberOpenedExerciseHistory(userId: string, slug: string, history: OpenedExerciseHistory) {
  cache.remember(userId, slug, history);
}

export function invalidateOpenedExerciseHistories() {
  cache.invalidate();
}

export function openedExerciseHistoryEpoch(): number {
  return cache.epoch();
}
