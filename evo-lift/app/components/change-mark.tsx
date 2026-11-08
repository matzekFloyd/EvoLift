import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export type ChangeDirection = "up" | "down" | "unchanged";

const TONE: Record<ChangeDirection, string> = {
  up: "text-emerald-800",
  down: "text-amber-900",
  unchanged: "text-zinc-500",
};

const ICON = {
  up: ArrowUp,
  down: ArrowDown,
  unchanged: Minus,
} as const;

/**
 * An up, down, or unchanged arrow on the same line as the surrounding text.
 * The amount inherits the parent's size so it does not sit above that line.
 */
export function ChangeMark({
  direction,
  amount = null,
  label,
  hideAmountFromName = false,
}: {
  direction: ChangeDirection;
  amount?: string | null;
  /** Screen reader name for the arrow. */
  label: string;
  /** The label already includes the amount, so the visible digits are not read again. */
  hideAmountFromName?: boolean;
}) {
  const Icon = ICON[direction];
  return (
    <span className={`whitespace-nowrap font-medium tabular-nums ${TONE[direction]}`}>
      <Icon className="mr-0.5 inline-block h-3.5 w-3.5 align-middle" aria-hidden />
      <span className="sr-only">{label}</span>
      {amount ? <span aria-hidden={hideAmountFromName || undefined}>{amount}</span> : null}
    </span>
  );
}
