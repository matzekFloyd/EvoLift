import { useId, type ReactNode } from "react";

export type StatusBadgeTone = "success" | "info" | "warning" | "danger" | "neutral";

const toneClassName: Record<StatusBadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-800",
  info: "bg-sky-50 text-sky-900",
  warning: "bg-amber-50 text-amber-900",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-zinc-100 text-zinc-600",
};

type StatusBadgeProps = {
  tone: StatusBadgeTone;
  children: ReactNode;
  /** Shown on hover and keyboard focus. */
  description?: string;
  className?: string;
};

/** Small status label, such as Ahead, Intermediate, or Elite. */
export function StatusBadge({ tone, children, description, className }: StatusBadgeProps) {
  const tooltipId = useId();
  return (
    <span
      className={[
        "group/badge relative inline-flex h-6 shrink-0 items-center rounded px-2 text-[10px] font-medium uppercase leading-none tracking-wide",
        description ? "cursor-help outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50" : "",
        toneClassName[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={description ? 0 : undefined}
      aria-describedby={description ? tooltipId : undefined}
    >
      {children}
      {description ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 z-30 mb-1.5 hidden w-64 rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-700 shadow-md group-hover/badge:block group-focus/badge:block"
        >
          {description}
        </span>
      ) : null}
    </span>
  );
}
