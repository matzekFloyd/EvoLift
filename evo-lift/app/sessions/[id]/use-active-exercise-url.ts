"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { useRouter } from "next/navigation";
import {
  activeExerciseIndexForParam,
  activeExerciseQueryString,
  resolveActiveExerciseFromUrl,
} from "./session-active-exercise-url";
import { SESSION_DETAIL_EXERCISE_QUERY, sessionDetailHref } from "./session-detail-query";

/** Query param `ex` (`workout_session_exercises.id`): deep-link and reload restore for the active exercise. */
export function useActiveExerciseUrl(input: {
  router: ReturnType<typeof useRouter>;
  pathname: string;
  searchParams: { toString: () => string; get: (name: string) => string | null };
  sessionId: string | undefined;
  /** Id of the loaded session; the URL only syncs once it matches `sessionId`. */
  loadedSessionId: string | undefined;
  isChecking: boolean;
  sessionExercises: Array<{ id: string }>;
  activeExerciseIndex: number;
  setActiveExerciseIndex: Dispatch<SetStateAction<number>>;
}) {
  const {
    router,
    pathname,
    searchParams,
    sessionId,
    loadedSessionId,
    isChecking,
    sessionExercises,
    activeExerciseIndex,
    setActiveExerciseIndex,
  } = input;
  const activeExerciseIndexChangeSourceRef = useRef<"user" | "url">("user");
  const lastSessionExerciseIdsKeyRef = useRef<string>("");
  const exerciseIds = sessionExercises.map((exercise) => exercise.id);
  const exerciseParam = searchParams.get(SESSION_DETAIL_EXERCISE_QUERY);
  const activeExerciseUrlKey = `${sessionId ?? ""}:${exerciseIds.join(",")}:${exerciseParam ?? ""}`;
  const [appliedActiveExerciseUrlKey, setAppliedActiveExerciseUrlKey] = useState<string | null>(null);

  // Apply `ex` before paint so Continue session does not flash the first exercise.
  if (
    !isChecking &&
    sessionId &&
    loadedSessionId === sessionId &&
    appliedActiveExerciseUrlKey !== activeExerciseUrlKey
  ) {
    setAppliedActiveExerciseUrlKey(activeExerciseUrlKey);
    const nextIndex = activeExerciseIndexForParam({
      exerciseIds,
      exerciseParam,
      activeExerciseIndex,
    });
    if (nextIndex != null) {
      activeExerciseIndexChangeSourceRef.current = "url";
      setActiveExerciseIndex(nextIndex);
    }
  }

  useEffect(() => {
    lastSessionExerciseIdsKeyRef.current = "";
  }, [sessionId]);

  useEffect(() => {
    if (isChecking || !sessionId || loadedSessionId !== sessionId) {
      return;
    }

    const exerciseIds = sessionExercises.map((e) => e.id);
    const idsKey = exerciseIds.join(",");
    const listChanged = lastSessionExerciseIdsKeyRef.current !== idsKey;
    lastSessionExerciseIdsKeyRef.current = idsKey;

    const next = resolveActiveExerciseFromUrl({
      exerciseIds,
      exerciseParam: searchParams.get(SESSION_DETAIL_EXERCISE_QUERY),
      listChanged,
    });
    if (next.action === "none") {
      return;
    }
    activeExerciseIndexChangeSourceRef.current = "url";
    setActiveExerciseIndex(next.index);
    if (next.clearParam) {
      router.replace(
        sessionDetailHref(pathname, searchParams.toString(), (params) => {
          params.delete(SESSION_DETAIL_EXERCISE_QUERY);
        }),
        { scroll: false },
      );
    }
  }, [isChecking, pathname, router, searchParams, loadedSessionId, sessionExercises, sessionId, setActiveExerciseIndex]);

  useEffect(() => {
    if (isChecking || !sessionId || loadedSessionId !== sessionId || sessionExercises.length === 0) {
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

    const qs = activeExerciseQueryString({
      searchString: searchParams.toString(),
      activeExerciseIndex,
      activeExerciseId: id,
    });
    if (qs === null) {
      return;
    }
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [
    activeExerciseIndex,
    isChecking,
    pathname,
    router,
    searchParams,
    loadedSessionId,
    sessionExercises,
    sessionId,
  ]);
}
