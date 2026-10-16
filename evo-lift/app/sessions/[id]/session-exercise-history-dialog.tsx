"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/app/components/action-button";
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
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-exercise-history-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionHeading id="session-exercise-history-title">Recent sets</SectionHeading>
            <p className="mt-0.5 truncate text-sm text-zinc-600">{exerciseLabel}</p>
          </div>
          <ActionButton type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </ActionButton>
        </div>

        {status === "loading" ? (
          <p className="mt-3 text-sm text-zinc-600">{SHORT_EXERCISE_HISTORY_LOADING}</p>
        ) : null}
        {status === "error" ? (
          <StatusNotice message={SHORT_EXERCISE_HISTORY_LOAD_ERROR} tone="error" className="mt-3" />
        ) : null}
        {status === "ready" && sessions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">{SHORT_EXERCISE_HISTORY_EMPTY}</p>
        ) : null}
        {status === "ready" && sessions.length > 0 ? (
          <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {sessions.map((session) => (
              <li key={session.sessionId} className="rounded-md border border-zinc-200 px-3 py-2">
                <p className="text-sm font-medium tabular-nums text-zinc-900">
                  {formatDateOnlyForLocale(session.performedOn)}
                </p>
                {session.workingSets.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {session.workingSets.map((set) => (
                      <li key={set.setNumber} className="text-sm text-zinc-700">
                        Set {set.setNumber} · {set.line}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {session.warmupCount > 0 ? (
                  <p className="mt-1 text-xs text-zinc-500">{warmupSetsLabel(session.warmupCount)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {status === "ready" && hasMore ? (
          <p className="mt-2 text-xs text-zinc-500">{SHORT_EXERCISE_HISTORY_MORE}</p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Link
            href={`/exercises/${exerciseSlug}`}
            className="text-sm text-sky-800 underline-offset-2 hover:underline"
          >
            Full history
          </Link>
        </div>
      </div>
    </div>
  );
}
