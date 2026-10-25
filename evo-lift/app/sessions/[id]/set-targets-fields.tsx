"use client";

import { useId } from "react";
import { TextField } from "@/app/components/text-field";
import {
  setTargetsFieldGridClassName,
  setTargetsFieldLabelClassName,
} from "@/app/sessions/[id]/set-targets-fields-layout";

type SetTargetsFieldsProps = {
  sets: string;
  weightKg: string;
  reps: string;
  weightLabel: string;
  onSetsChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
};

export function SetTargetsFields({
  sets,
  weightKg,
  reps,
  weightLabel,
  onSetsChange,
  onWeightChange,
  onRepsChange,
}: SetTargetsFieldsProps) {
  const baseId = useId();
  const setsId = `${baseId}-sets`;
  const weightId = `${baseId}-weight`;
  const repsId = `${baseId}-reps`;

  return (
    <div className={setTargetsFieldGridClassName}>
      <label htmlFor={setsId} className={setTargetsFieldLabelClassName}>
        Target working sets
      </label>
      <label htmlFor={weightId} className={setTargetsFieldLabelClassName}>
        {weightLabel}
      </label>
      <label htmlFor={repsId} className={setTargetsFieldLabelClassName}>
        Target reps (working sets)
      </label>
      <TextField
        id={setsId}
        type="number"
        min={1}
        value={sets}
        onChange={(event) => onSetsChange(event.target.value)}
        className="w-full"
        placeholder="e.g. 3"
      />
      <TextField
        id={weightId}
        type="number"
        min={0}
        step="0.25"
        value={weightKg}
        onChange={(event) => onWeightChange(event.target.value)}
        className="w-full"
        placeholder="e.g. 60"
      />
      <TextField
        id={repsId}
        type="number"
        min={1}
        value={reps}
        onChange={(event) => onRepsChange(event.target.value)}
        className="w-full"
        placeholder="e.g. 8"
      />
    </div>
  );
}
