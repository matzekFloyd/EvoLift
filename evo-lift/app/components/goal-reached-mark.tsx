import { Trophy } from "lucide-react";

type GoalReachedMarkProps = {
  label: string;
  className?: string;
};

/** Trophy beside a date when that day reached a goal. */
export function GoalReachedMark({ label, className = "h-3.5 w-3.5" }: GoalReachedMarkProps) {
  return (
    <Trophy
      className={`shrink-0 fill-yellow-400 text-amber-500 ${className}`}
      strokeWidth={1.75}
      role="img"
      aria-label={`Goal reached: ${label}`}
    />
  );
}
