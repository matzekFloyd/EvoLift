import { overallLevelProgressNote, type OverallLevelLift, type OverallLevelProgress } from "@/lib/overall-level-detail";

type OverallLevelProgressBarProps = {
  progress: OverallLevelProgress;
  className?: string;
};

/** A bar toward the next level. Hidden at the top level, where the bar would only restate the name. */
export function OverallLevelProgressBar({ progress, className }: OverallLevelProgressBarProps) {
  if (progress.fraction == null || progress.nextLabel == null) {
    return null;
  }
  const percent = Math.round(progress.fraction * 100);
  const label = `${percent}% toward ${progress.nextLabel}`;
  return (
    <div className={["w-full max-w-sm", className].filter(Boolean).join(" ")}>
      <p className="text-xs text-zinc-600">{label}</p>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-sky-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

type OverallLevelProgressExplanationProps = {
  badge: string;
  progress: OverallLevelProgress;
  lifts: readonly OverallLevelLift[];
  className?: string;
};

/** Says how the percent is calculated and which lifts are still short of the next level. */
export function OverallLevelProgressExplanation({
  badge,
  progress,
  lifts,
  className,
}: OverallLevelProgressExplanationProps) {
  const note = overallLevelProgressNote({ badge, progress, lifts });
  if (!note) {
    return null;
  }
  return (
    <p className={["mt-3 max-w-prose text-sm leading-relaxed text-zinc-700", className].filter(Boolean).join(" ")}>
      {note}
    </p>
  );
}
