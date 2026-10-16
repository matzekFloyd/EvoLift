"use client";

import { useEffect } from "react";
import { ActionButton } from "@/app/components/action-button";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { homeExerciseBadgeTone } from "@/app/home-sessions";
import { SectionHeading } from "@/app/components/section-heading";

type ActivityDaySessionChoice = {
  id: string;
  notes: string;
  badges: Array<{ slug: string; hasLoggedSet: boolean; skipped?: boolean }>;
};

type ActivityDaySessionDialogProps = {
  dateLabel: string;
  sessions: ActivityDaySessionChoice[];
  onOpen: (sessionId: string) => void;
  onClose: () => void;
};

export function ActivityDaySessionDialog({
  dateLabel,
  sessions,
  onOpen,
  onClose,
}: ActivityDaySessionDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const countLabel = sessions.length === 1 ? "1 workout session" : `${sessions.length} workout sessions`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-day-sessions-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <SectionHeading id="activity-day-sessions-title">Choose a workout session</SectionHeading>
        <p className="mt-1 text-sm text-zinc-600">
          {countLabel} on {dateLabel}.
        </p>
        <ul className="mt-3 space-y-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => onOpen(session.id)}
                className="flex w-full flex-col gap-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50"
              >
                <span className="flex flex-wrap gap-1">
                  {session.badges.length === 0 ? (
                    <span className="text-xs text-zinc-500">No exercises logged yet</span>
                  ) : (
                    session.badges.map((badge) => (
                      <ExerciseBadgeChip
                        key={badge.slug}
                        slug={badge.slug}
                        variant={homeExerciseBadgeTone({
                          hasLoggedSet: badge.hasLoggedSet,
                          skipped: badge.skipped === true,
                        })}
                      />
                    ))
                  )}
                </span>
                <span className="truncate text-xs text-zinc-600">
                  {session.notes.trim() || "No notes"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <ActionButton type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
