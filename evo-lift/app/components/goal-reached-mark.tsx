import { Trophy } from "lucide-react";

type GoalReachedMarkProps = {
  label: string;
  className?: string;
  /**
   * Hide the trophy from assistive tech when the parent already says the goal was reached,
   * such as a calendar day whose name includes that sentence.
   */
  decorative?: boolean;
};

/** Trophy beside a date when that day reached a goal. */
export function GoalReachedMark({
  label,
  className = "h-3.5 w-3.5",
  decorative = false,
}: GoalReachedMarkProps) {
  return (
    <Trophy
      className={`shrink-0 fill-emerald-100 text-emerald-800 ${className}`}
      strokeWidth={1.75}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `Goal reached: ${label}`}
    />
  );
}
