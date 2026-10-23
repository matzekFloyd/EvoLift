import type { ReactNode } from "react";
import type { KpiBadgeTone } from "@/app/components/kpi-badge-tone";

type KpiBadgeProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  description?: string;
  tone?: KpiBadgeTone;
  className?: string;
};

export function KpiBadge({
  label,
  value,
  icon,
  description,
  tone = "sky",
  className,
}: KpiBadgeProps) {
  const emerald = tone === "success";
  const shellClasses =
    tone === "neutral"
      ? "border-zinc-300 bg-white"
      : emerald
        ? "border-emerald-300 bg-emerald-50"
        : "border-sky-300 bg-sky-50";
  const labelClasses =
    tone === "neutral"
      ? "text-zinc-700"
      : emerald
        ? "text-emerald-800"
        : "text-sky-800";
  const valueClasses =
    tone === "neutral"
      ? "text-zinc-900"
      : emerald
        ? "text-emerald-900"
        : "text-sky-900";

  return (
    <div
      className={`rounded-md border px-2 py-1.5 text-center ${shellClasses} ${
        description ? "cursor-help" : ""
      }${
        className ? ` ${className}` : ""
      }`}
      title={description}
      aria-label={description ?? `${label}: ${value}`}
    >
      <p
        className={`inline-flex items-center justify-center gap-0.5 text-[10px] font-medium [&_svg]:h-3.5 [&_svg]:w-3.5 ${labelClasses}`}
      >
        {icon}
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold leading-none sm:text-base ${valueClasses}`}>{value}</p>
    </div>
  );
}
