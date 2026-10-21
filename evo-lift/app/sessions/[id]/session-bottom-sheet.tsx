"use client";

import type { ReactNode } from "react";
import { SectionHeading } from "@/app/components/section-heading";

type SessionBottomSheetProps = {
  title: string;
  /** Accessible name for the dimmed backdrop that closes the sheet. */
  backdropLabel: string;
  onClose: () => void;
  /** Extra classes on the fixed wrapper, such as `md:hidden`. */
  className?: string;
  children: ReactNode;
};

/** Shared bottom-sheet shell: dimmed backdrop, heading with Close, and a scrollable body. */
export function SessionBottomSheet({
  title,
  backdropLabel,
  onClose,
  className,
  children,
}: SessionBottomSheetProps) {
  return (
    <div className={className ? `fixed inset-0 z-50 ${className}` : "fixed inset-0 z-50"}>
      <div
        role="button"
        tabIndex={0}
        aria-label={backdropLabel}
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClose();
          }
        }}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl bg-white p-4 shadow-2xl">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeading>{title}</SectionHeading>
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
