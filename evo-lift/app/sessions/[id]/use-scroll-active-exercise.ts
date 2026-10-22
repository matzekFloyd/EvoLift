"use client";

import { useEffect } from "react";
import { shouldScrollActiveExerciseIntoView } from "./scroll-active-exercise";

const COMPACT_LOG_MEDIA_QUERY = "(max-width: 768px)";

/** On a wider layout, bring the exercise named by `ex` into view. Phones already show only that exercise. */
export function useScrollActiveExerciseIntoView(input: {
  isChecking: boolean;
  isReadOnly: boolean;
  activeExerciseIndex: number;
  exerciseId: string | null;
}) {
  const { isChecking, isReadOnly, activeExerciseIndex, exerciseId } = input;

  useEffect(() => {
    const media = window.matchMedia(COMPACT_LOG_MEDIA_QUERY);
    let frame = 0;

    const scroll = () => {
      window.cancelAnimationFrame(frame);
      if (
        !exerciseId ||
        !shouldScrollActiveExerciseIntoView({
          isChecking,
          isPhone: media.matches,
          isReadOnly,
          activeExerciseIndex,
        })
      ) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          document.getElementById(`exercise-${exerciseId}`)?.scrollIntoView({ block: "start" });
        });
      });
    };

    scroll();
    media.addEventListener("change", scroll);
    return () => {
      media.removeEventListener("change", scroll);
      window.cancelAnimationFrame(frame);
    };
  }, [activeExerciseIndex, exerciseId, isChecking, isReadOnly]);
}
