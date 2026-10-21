"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { loadTargetWeightHistory } from "@/lib/target-weight-history";
import {
  SHORT_EXERCISE_HISTORY_EMPTY,
  SHORT_EXERCISE_HISTORY_LOAD_ERROR,
  SHORT_EXERCISE_HISTORY_LOADING,
  SHORT_EXERCISE_HISTORY_MORE,
  buildShortExerciseHistory,
  shortExerciseHistoryWorkingSetsInline,
  warmupSetsLabel,
  type ShortExerciseHistorySession,
} from "./session-exercise-history";

type SessionExerciseHistoryDialogProps = {
  exerciseId: string;
  exerciseLabel: string;
  exerciseSlug: string;
  currentSessionId: string | null;
  onClose: () => void;
};

export function SessionExerciseHistoryDialog({
  exerciseId,
  exerciseLabel,
  exerciseSlug,
  currentSessionId,
  onClose,
}: SessionExerciseHistoryDialogProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sessions, setSessions] = useState<ShortExerciseHistorySession[]>([]);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadTargetWeightHistory(supabaseBrowserClient, exerciseId)
      .then((sets) => {
        if (cancelled) {
          return;
        }
        const history = buildShortExerciseHistory(sets, { excludeSessionId: currentSessionId });
        setSessions(history.sessions);
        setHasMore(history.hasMore);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [currentSessionId, exerciseId]);

  return (
    <AppDialog
      titleId="session-exercise-history-title"
      panelClassName="flex max-h-[85vh] max-w-md flex-col"
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <SectionHeading id="session-exercise-history-title">Recent sets</SectionHeading>
          <p className="mt-0.5 truncate text-xs text-zinc-600 sm:text-sm">{exerciseLabel}</p>
        </div>
        <ActionButton type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </ActionButton>
      </div>

      {status === "loading" ? (
        <p className="mt-2 text-sm text-zinc-600 sm:mt-3">{SHORT_EXERCISE_HISTORY_LOADING}</p>
      ) : null}
      {status === "error" ? (
        <StatusNotice
          message={SHORT_EXERCISE_HISTORY_LOAD_ERROR}
          tone="error"
          className="mt-2 sm:mt-3"
        />
      ) : null}
      {status === "ready" && sessions.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600 sm:mt-3">{SHORT_EXERCISE_HISTORY_EMPTY}</p>
      ) : null}
      {status === "ready" && sessions.length > 0 ? (
        <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto sm:mt-3 sm:space-y-2">
          {sessions.map((session) => {
            const workingInline = shortExerciseHistoryWorkingSetsInline(session.workingSets);
            return (
              <li
                key={session.sessionId}
                className="rounded-md border border-zinc-200 px-2 py-1.5 sm:px-3 sm:py-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className="text-xs font-medium tabular-nums text-zinc-900 sm:text-sm">
                    {formatDateOnlyForLocale(session.performedOn)}
                  </p>
                  {session.warmupCount > 0 ? (
                    <p className="text-[11px] text-zinc-500 sm:hidden">
                      {warmupSetsLabel(session.warmupCount)}
                    </p>
                  ) : null}
                </div>
                {session.workingSets.length > 0 ? (
                  <>
                    <p className="mt-0.5 text-xs leading-snug text-zinc-700 sm:hidden">
                      {workingInline}
                    </p>
                    <ul className="mt-1 hidden space-y-0.5 sm:block">
                      {session.workingSets.map((set) => (
                        <li key={set.setNumber} className="text-sm text-zinc-700">
                          Set {set.setNumber} · {set.line}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {session.warmupCount > 0 ? (
                  <p className="mt-1 hidden text-xs text-zinc-500 sm:block">
                    {warmupSetsLabel(session.warmupCount)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {status === "ready" && hasMore ? (
        <p className="mt-1.5 text-[11px] text-zinc-500 sm:mt-2 sm:text-xs">
          {SHORT_EXERCISE_HISTORY_MORE}
        </p>
      ) : null}

      <div className="mt-3 flex justify-end sm:mt-4">
        <Link
          href={`/exercises/${exerciseSlug}`}
          className="text-sm text-sky-800 underline-offset-2 hover:underline"
        >
          Full history
        </Link>
      </div>
    </AppDialog>
  );
}
