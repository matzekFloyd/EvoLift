"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import {
  listDialogFocusable,
  nestedControlHandlesEscape,
  resolveDialogKeyAction,
} from "./app-dialog-focus";

type AppDialogProps = {
  /** Id of the visible dialog title (for `aria-labelledby`). */
  titleId: string;
  children: ReactNode;
  /**
   * Extra classes on the white panel. Include width (`max-w-sm` / `max-w-md`) and any
   * height/layout needs. Defaults to `max-w-md`.
   */
  panelClassName?: string;
  /** Escape and backdrop clicks call this. Clicks on the panel do not. */
  onClose: () => void;
};

const panelBaseClassName =
  "my-auto w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-lg outline-none";

/**
 * Centered modal overlay. Use for confirmations and forms so every dialog
 * opens in the middle of the viewport (including compact widths).
 * Escape closes, Tab stays inside, and focus returns to the control that opened it.
 */
export function AppDialog({
  titleId,
  children,
  panelClassName = "max-w-md",
  onClose,
}: AppDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel) {
      const focusable = listDialogFocusable(panel);
      (focusable[0] ?? panel).focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      const root = panelRef.current;
      const focusable = root ? listDialogFocusable(root) : [];
      const activeElement = document.activeElement;
      const activeIndex =
        activeElement instanceof HTMLElement ? focusable.indexOf(activeElement) : -1;
      const action = resolveDialogKeyAction({
        key: event.key,
        shiftKey: event.shiftKey,
        focusableCount: focusable.length,
        activeIndex,
        escapeCloses: !nestedControlHandlesEscape(event.target),
      });

      if (action.type === "close") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (action.type === "trap") {
        event.preventDefault();
        if (action.cycle.action === "focus") {
          focusable[action.cycle.index]?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  function handlePanelClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={[panelBaseClassName, panelClassName].filter(Boolean).join(" ")}
        onClick={handlePanelClick}
      >
        {children}
      </div>
    </div>
  );
}
