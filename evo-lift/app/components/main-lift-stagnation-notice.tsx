"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusNotice } from "@/app/components/status-notice";
import { TextField } from "@/app/components/text-field";
import {
  DEFAULT_MAIN_LIFT_STAGNATION_WEEKS,
  MAIN_LIFT_STAGNATION_WEEKS_KEY,
  MAX_MAIN_LIFT_STAGNATION_WEEKS,
  MIN_MAIN_LIFT_STAGNATION_WEEKS,
  mainLiftStagnationMessage,
  mainLiftStagnationWeeksOrDefault,
  parseMainLiftStagnationWeeks,
  stagnantMainLifts,
  type MainLiftStagnationSeries,
} from "@/lib/main-lift-stagnation";

type MainLiftStagnationNoticeProps = {
  series: readonly MainLiftStagnationSeries[];
};

export function MainLiftStagnationNotice({ series }: MainLiftStagnationNoticeProps) {
  const [weeks, setWeeks] = useState(DEFAULT_MAIN_LIFT_STAGNATION_WEEKS);
  const [draft, setDraft] = useState(String(DEFAULT_MAIN_LIFT_STAGNATION_WEEKS));

  useEffect(() => {
    const stored = mainLiftStagnationWeeksOrDefault(
      window.localStorage.getItem(MAIN_LIFT_STAGNATION_WEEKS_KEY),
    );
    setWeeks(stored);
    setDraft(String(stored));
  }, []);

  const message = useMemo(
    () => mainLiftStagnationMessage(stagnantMainLifts(series, weeks), weeks),
    [series, weeks],
  );

  function applyDraft(raw: string) {
    const next = parseMainLiftStagnationWeeks(raw);
    if (next == null) {
      return;
    }
    setWeeks(next);
    setDraft(String(next));
    window.localStorage.setItem(MAIN_LIFT_STAGNATION_WEEKS_KEY, String(next));
  }

  return (
    <div className="space-y-2">
      <label htmlFor="main-lift-stagnation-weeks" className="block max-w-xs text-sm font-medium text-zinc-800">
        Weeks without a higher estimated 1RM
        <TextField
          id="main-lift-stagnation-weeks"
          type="number"
          inputMode="numeric"
          min={MIN_MAIN_LIFT_STAGNATION_WEEKS}
          max={MAX_MAIN_LIFT_STAGNATION_WEEKS}
          step={1}
          value={draft}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            const next = parseMainLiftStagnationWeeks(raw);
            if (next == null) {
              return;
            }
            setWeeks(next);
            window.localStorage.setItem(MAIN_LIFT_STAGNATION_WEEKS_KEY, String(next));
          }}
          onBlur={() => {
            if (parseMainLiftStagnationWeeks(draft) == null) {
              setDraft(String(weeks));
              return;
            }
            applyDraft(draft);
          }}
          className="mt-1 w-24"
        />
      </label>
      <p className="text-xs text-zinc-500">
        Squat, Bench, Deadlift, and Press in this date range. The note clears when a later session is higher.
      </p>
      {message ? <StatusNotice message={message} tone="warning" /> : null}
    </div>
  );
}
