"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { nestedControlHandlesEscape } from "@/app/components/app-dialog-focus";
import { useRevealTextField } from "@/app/components/keyboard-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { keyboardAwareMaxHeight, keyboardOverlapBottom } from "@/lib/keyboard-overlap";
import {
  cycleSessionSheetFocus,
  listSessionSheetFocusable,
} from "./session-bottom-sheet-focus";

type SessionBottomSheetProps = {
  title: string;
  onClose: () => void;
  /** Extra classes on the fixed wrapper, such as `md:hidden`. */
  className?: string;
  /** Stays on screen under the scrolling fields, such as Cancel and Save. */
  footer?: ReactNode;
  children: ReactNode;
};

/** Shared bottom-sheet shell: dimmed backdrop, heading with Close, and a scrollable body. */
export function SessionBottomSheet({
  title,
  onClose,
  className,
  footer,
  children,
}: SessionBottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useRevealTextField(bodyRef);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel) {
      const focusable = listSessionSheetFocusable(panel);
      (focusable[0] ?? panel).focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (nestedControlHandlesEscape(event.target)) {
          return;
        }
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      const root = panelRef.current;
      if (!root) {
        return;
      }
      cycleSessionSheetFocus(root, event, document.activeElement);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
    // Bind once. A new onClose identity must not steal focus while the sheet stays open.
  }, []);

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
        style={{ bottom: keyboardOverlapBottom, maxHeight: keyboardAwareMaxHeight }}
        className="absolute inset-x-0 flex flex-col overflow-hidden rounded-t-xl bg-white p-4 shadow-2xl outline-none"
      >
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <SectionHeading id={titleId}>{title}</SectionHeading>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              Close
            </button>
          </div>
          <div ref={bodyRef} data-sheet-body className="min-h-0 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {footer ? <div className="mt-4 shrink-0">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
