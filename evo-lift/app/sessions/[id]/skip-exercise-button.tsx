"use client";

import { CircleOff } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import {
  forcedButtonUtilityClass,
  SKIPPED_EXERCISE_BUTTON_TITLE,
  skippedExerciseButtonClass,
  skippedExerciseLabel,
} from "./session-exercise-status";

type SkipExerciseButtonProps = {
  skipped: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  raised?: boolean;
};

/** Skip / Skipped. Amber when the exercise is skipped; zinc otherwise. */
export function SkipExerciseButton({
  skipped,
  disabled = false,
  onClick,
  className = "",
  raised,
}: SkipExerciseButtonProps) {
  return (
    <ActionButton
      type="button"
      variant="secondary"
      iconColor="amber"
      raised={raised}
      aria-pressed={skipped}
      disabled={disabled}
      title={SKIPPED_EXERCISE_BUTTON_TITLE}
      onClick={onClick}
      className={[forcedButtonUtilityClass(skippedExerciseButtonClass(skipped)), className]
        .filter(Boolean)
        .join(" ")}
    >
      <CircleOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{skippedExerciseLabel(skipped)}</span>
    </ActionButton>
  );
}
