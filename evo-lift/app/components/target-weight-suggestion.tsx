"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/app/components/action-button";
import { StatusNotice } from "@/app/components/status-notice";
import { loadTargetWeightHistory } from "@/lib/target-weight-history";
import { formatKgAmount } from "@/lib/milestone-progress";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  formatSuggestedTargetInput,
  suggestionMatchesField,
  suggestTargetWeight,
  targetSuggestionsEnabled,
  type TargetWeightHistorySet,
} from "@/lib/target-weight-suggestion";
import { parsePlannedReps } from "@/app/components/planned-reps";
import { getTodayYyyyMmDd } from "@/lib/session-date";

type TargetWeightSuggestionProps = {
  exerciseId: string;
  plannedReps: string;
  currentWeightKg: string;
  excludeSessionId?: string | null;
  /** Account preference. Missing stays on. */
  enabled?: boolean;
  onApply: (weightKg: string) => void;
};

export function TargetWeightSuggestion({
  exerciseId,
  plannedReps,
  currentWeightKg,
  excludeSessionId = null,
  enabled = true,
  onApply,
}: TargetWeightSuggestionProps) {
  const [history, setHistory] = useState<{
    exerciseId: string;
    sets: TargetWeightHistorySet[];
  } | null>(null);
  const [error, setError] = useState<{ exerciseId: string; message: string } | null>(null);

  const showSuggestion = targetSuggestionsEnabled(enabled);

  useEffect(() => {
    if (!showSuggestion) {
      return;
    }
    let cancelled = false;
    void loadTargetWeightHistory(supabaseBrowserClient, exerciseId)
      .then((sets) => {
        if (!cancelled) {
          setHistory({ exerciseId, sets });
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistory(null);
          setError({ exerciseId, message: "Could not load recent working sets." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, showSuggestion]);

  const suggestion = useMemo(() => {
    if (!history || history.exerciseId !== exerciseId) {
      return null;
    }
    return suggestTargetWeight({
      sets: history.sets,
      plannedReps: parsePlannedReps(plannedReps),
      excludeSessionId,
      today: getTodayYyyyMmDd(),
    });
  }, [excludeSessionId, exerciseId, history, plannedReps]);

  if (!showSuggestion) {
    return null;
  }

  if (error?.exerciseId === exerciseId) {
    return <StatusNotice message={error.message} tone="error" className="mt-2" />;
  }

  if (!suggestion) {
    return <p className="mt-2 text-xs text-zinc-500">Checking recent working sets...</p>;
  }

  if (suggestion.status === "message") {
    return <p className="mt-2 text-xs text-zinc-600">{suggestion.message}</p>;
  }

  if (suggestionMatchesField(currentWeightKg, suggestion.weightKg)) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-zinc-700">
          Suggested target:{" "}
          <span className="font-medium text-zinc-900">{formatKgAmount(suggestion.weightKg)}</span>
        </p>
        <ActionButton
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 px-2 font-normal"
          onClick={() => onApply(formatSuggestedTargetInput(suggestion.weightKg))}
        >
          Apply
        </ActionButton>
      </div>
      <p className="text-xs text-zinc-600">{suggestion.rationale}</p>
    </div>
  );
}
