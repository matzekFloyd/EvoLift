"use client";

import { ActionButton } from "@/app/components/action-button";
import { panelInsetClass } from "@/app/components/panel-inset";
import {
  WARMUP_SUGGESTION_NOTE,
  formatWarmupStep,
  suggestWarmups,
} from "@/lib/warmup-suggestion";

type WarmupSuggestionProps = {
  targetWeightKg: number | null;
  baseWeightKg?: number | null;
  hasSets: boolean;
  addDisabled?: boolean;
  addDisabledTitle?: string;
  onAdd: () => void;
};

export function WarmupSuggestion({
  targetWeightKg,
  baseWeightKg = null,
  hasSets,
  addDisabled = false,
  addDisabledTitle,
  onAdd,
}: WarmupSuggestionProps) {
  if (hasSets) {
    return null;
  }

  const suggestion = suggestWarmups({ targetWeightKg, baseWeightKg });

  if (suggestion.status === "message") {
    return <p className="mt-3 text-xs text-zinc-600">{suggestion.message}</p>;
  }

  if (suggestion.steps.length === 0) {
    return null;
  }

  return (
    <div className={panelInsetClass("mt-3 p-3")}>
      <ul className="list-none space-y-0.5 pl-0 text-sm text-zinc-800">
        {suggestion.steps.map((step) => (
          <li key={step.loadedKg}>{formatWarmupStep(step)}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-zinc-600">{WARMUP_SUGGESTION_NOTE}</p>
      <div className="mt-2 flex justify-end">
        <ActionButton
          variant="secondary"
          size="sm"
          disabled={addDisabled}
          title={addDisabledTitle}
          onClick={onAdd}
        >
          Add warmups
        </ActionButton>
      </div>
    </div>
  );
}
