"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { SectionHeading } from "@/app/components/section-heading";
import {
  cycleSessionSheetFocus,
  listSessionSheetFocusable,
} from "./session-bottom-sheet-focus";

type SessionBottomSheetProps = {
  title: string;
  onClose: () => void;
  /** Extra classes on the fixed wrapper, such as `md:hidden`. */
  className?: string;
  children: ReactNode;
};

/** Shared bottom-sheet shell: dimmed backdrop, heading with Close, and a scrollable body. */
export function SessionBottomSheet({
  title,
  onClose,
  className,
  children,
}: SessionBottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusable = listSessionSheetFocusable(panel);
    (focusable[0] ?? panel).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (!panel) {
        return;
      }
      cycleSessionSheetFocus(panel, event, document.activeElement);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className={className ? `fixed inset-0 z-50 ${className}` : "fixed inset-0 z-50"}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div onClick={onClose} className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl bg-white p-4 shadow-2xl outline-none"
      >
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeading id={titleId}>{title}</SectionHeading>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              Close
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
