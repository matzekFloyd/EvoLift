import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";

type StatusNoticeTone = "error" | "warning" | "success";

type StatusNoticeProps = {
  message: string;
  tone: StatusNoticeTone;
  onDismiss?: () => void;
  className?: string;
};

export function StatusNotice({ message, tone, onDismiss, className }: StatusNoticeProps) {
  const toneClassName =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <section
      role="status"
      aria-live="polite"
      className={`rounded-md border px-3 py-2 text-sm shadow-sm ${toneClassName}${className ? ` ${className}` : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2">
          {tone === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          ) : tone === "warning" ? (
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{message}</span>
        </p>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss message"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-sm leading-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            ×
          </button>
        ) : null}
      </div>
    </section>
  );
}
