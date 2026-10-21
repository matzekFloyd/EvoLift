import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/app/components/action-button";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { PanelInset } from "@/app/components/panel-inset";
import { StatusBadge } from "@/app/components/status-badge";
import { appPath } from "@/lib/app-paths";

type GoalCardProps = {
  exerciseLabel: string;
  exerciseSlug: string;
  targetLabel: string;
  thresholdLabel: string | null;
  bestLabel: string | null;
  gapLabel: string | null;
  percent: number | null;
  achievedLabel: string | null;
  dueLabel: string | null;
  pastDue: boolean;
  missingBodyweight: boolean;
  note: string | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function GoalCard({
  exerciseLabel,
  exerciseSlug,
  targetLabel,
  thresholdLabel,
  bestLabel,
  gapLabel,
  percent,
  achievedLabel,
  dueLabel,
  pastDue,
  missingBodyweight,
  note,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const roundedPercent = percent == null ? null : Math.round(percent);
  return (
    <PanelInset as="article" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ExerciseBadgeChip slug={exerciseSlug} />
            <Link
              href={appPath(`/exercises/${exerciseSlug}`)}
              className="truncate font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              {exerciseLabel}
            </Link>
          </div>
          <p className="mt-2 text-sm text-zinc-800">{targetLabel}</p>
          {thresholdLabel ? <p className="mt-1 text-sm text-zinc-600">{thresholdLabel}</p> : null}
        </div>
        {pastDue ? (
          <StatusBadge tone="warning" description="The due date has passed. This goal stays active.">
            Past due
          </StatusBadge>
        ) : achievedLabel ? (
          <StatusBadge tone="success">Achieved</StatusBadge>
        ) : (
          <StatusBadge tone="info">In progress</StatusBadge>
        )}
      </div>

      {missingBodyweight ? (
        <p className="mt-3 text-sm text-zinc-700">
          Add bodyweight on{" "}
          <Link href={appPath("/account")} className="font-medium text-sky-800 underline-offset-2 hover:underline">
            Account
          </Link>{" "}
          to track this goal.
        </p>
      ) : (
        <div className="mt-3 space-y-1 text-sm text-zinc-700">
          <p>{bestLabel ?? "No qualifying set yet."}</p>
          {gapLabel ? <p>{gapLabel}</p> : null}
          {achievedLabel ? <p>{achievedLabel}</p> : null}
          {roundedPercent != null ? (
            <div
              className="relative mt-2 h-6 overflow-hidden rounded-full bg-zinc-200"
              role="meter"
              aria-label={`Progress toward this goal, ${roundedPercent}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={roundedPercent}
            >
              <div
                className={`h-full ${achievedLabel ? "bg-emerald-600" : "bg-sky-600"}`}
                style={{ width: `${roundedPercent}%` }}
              />
              <span
                aria-hidden
                className={`absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums ${
                  roundedPercent >= 50 ? "text-white" : "text-zinc-800"
                }`}
              >
                {roundedPercent}%
              </span>
            </div>
          ) : null}
        </div>
      )}

      {dueLabel ? <p className="mt-3 text-sm text-zinc-600">{dueLabel}</p> : null}
      {note ? <p className="mt-2 text-sm text-zinc-600">{note}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton type="button" variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit
        </ActionButton>
        <ActionButton type="button" variant="danger" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete
        </ActionButton>
      </div>
    </PanelInset>
  );
}
