"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { PanelInset } from "@/app/components/panel-inset";
import { StatusNotice } from "@/app/components/status-notice";
import { loadDoubleProgressionPreference } from "@/lib/double-progression-preference";
import { loadTargetWeightHistory } from "@/lib/target-weight-history";
import { formatKgAmount, formatRepCount } from "@/lib/milestone-progress";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  formatSuggestedTargetInput,
  formatSuggestionKgDelta,
  formatSuggestionRepDelta,
  suggestionDirection,
  suggestionMatchesTarget,
  suggestedRepsDirection,
  exerciseDoubleProgressionEnabled,
  suggestTargetWeight,
  targetSuggestionsEnabled,
  type SuggestionDirection,
  type TargetWeightHistorySet,
  type TargetWeightSuggestion as TargetWeightSuggestionResult,
} from "@/lib/target-weight-suggestion";
import { parsePlannedReps } from "@/app/components/planned-reps";
import { getTodayYyyyMmDd } from "@/lib/session-date";

const DIRECTION_LABEL: Record<SuggestionDirection, string> = {
  increase: "increase",
  decrease: "decrease",
  unchanged: "unchanged",
};

const DIRECTION_CLASS: Record<SuggestionDirection, string> = {
  increase: "text-emerald-700",
  decrease: "text-amber-800",
  unchanged: "text-zinc-500",
};

function DirectionMark({ direction, delta }: { direction: SuggestionDirection; delta: string | null }) {
  const Icon = direction === "increase" ? ArrowUp : direction === "decrease" ? ArrowDown : Minus;
  const label = DIRECTION_LABEL[direction];
  return (
    <span className={`inline-flex items-center gap-0.5 ${DIRECTION_CLASS[direction]}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{label}</span>
      {delta ? <span className="text-xs font-medium tabular-nums">{delta}</span> : null}
    </span>
  );
}

function SuggestionValues({
  suggestion,
}: {
  suggestion: Extract<TargetWeightSuggestionResult, { status: "suggestion" }>;
}) {
  const weightDirection = suggestionDirection(suggestion.weightKg, suggestion.previousWeightKg);
  const repsDirection = suggestedRepsDirection(suggestion);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-zinc-900">
        <DirectionMark
          direction={weightDirection}
          delta={formatSuggestionKgDelta(suggestion.weightKg, suggestion.previousWeightKg)}
        />
        {formatKgAmount(suggestion.weightKg)}
      </span>
      <span
        className={[
          "inline-flex items-center gap-1 whitespace-nowrap text-sm",
          suggestion.reps == null ? "text-zinc-600" : "font-medium text-zinc-900",
        ].join(" ")}
      >
        <DirectionMark
          direction={repsDirection}
          delta={formatSuggestionRepDelta(suggestion.reps, suggestion.previousReps)}
        />
        {suggestion.reps == null ? "reps" : formatRepCount(suggestion.reps)}
      </span>
    </div>
  );
}

type TargetWeightSuggestionProps = {
  exerciseId: string;
  plannedReps: string;
  currentWeightKg: string;
  currentReps?: string;
  excludeSessionId?: string | null;
  /** Per-exercise suggest-target preference. Missing stays on. */
  enabled?: boolean;
  /** Null and missing follow the account double-progression switch. */
  exerciseDoubleProgression?: boolean | null;
  onApply: (next: { weightKg: string; reps: string | null }) => void;
};

export function TargetWeightSuggestion({
  exerciseId,
  plannedReps,
  currentWeightKg,
  currentReps = "",
  excludeSessionId = null,
  enabled = true,
  exerciseDoubleProgression = null,
  onApply,
}: TargetWeightSuggestionProps) {
  const [history, setHistory] = useState<{
    exerciseId: string;
    sets: TargetWeightHistorySet[];
    accountDoubleProgression: boolean;
  } | null>(null);
  const [error, setError] = useState<{ exerciseId: string; message: string } | null>(null);

  const showSuggestion = targetSuggestionsEnabled(enabled);

  useEffect(() => {
    if (!showSuggestion) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      loadTargetWeightHistory(supabaseBrowserClient, exerciseId),
      loadDoubleProgressionPreference(supabaseBrowserClient),
    ])
      .then(([sets, accountDoubleProgression]) => {
        if (!cancelled) {
          setHistory({ exerciseId, sets, accountDoubleProgression });
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
      doubleProgression: exerciseDoubleProgressionEnabled({
        accountEnabled: history.accountDoubleProgression,
        exerciseOverride: exerciseDoubleProgression,
      }),
    });
  }, [excludeSessionId, exerciseDoubleProgression, exerciseId, history, plannedReps]);

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

  if (
    suggestionMatchesTarget({
      currentWeightKg,
      suggestedKg: suggestion.weightKg,
      currentReps,
      suggestedReps: suggestion.reps,
    })
  ) {
    return null;
  }

  return (
    <PanelInset className="mt-2 flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-zinc-600">Suggested target</p>
        <SuggestionValues suggestion={suggestion} />
        <p className="text-xs text-zinc-600">{suggestion.rationale}</p>
      </div>
      <ActionButton
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        onClick={() =>
          onApply({
            weightKg: formatSuggestedTargetInput(suggestion.weightKg),
            reps: suggestion.reps == null ? null : String(suggestion.reps),
          })
        }
      >
        Apply
      </ActionButton>
    </PanelInset>
  );
}
