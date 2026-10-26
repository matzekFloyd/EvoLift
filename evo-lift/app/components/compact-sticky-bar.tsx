"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { ActionButton } from "@/app/components/action-button";

type CompactStickyBarProps = {
  actions: ReactNode;
  /** Quiet control between Previous and Next, such as Finish while it is not the forward action. */
  center?: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  /** Defaults to "Next". Use e.g. "Next exercise" when guiding forward after a milestone. */
  nextLabel?: string;
  /** Filled only when moving on is the one forward action. Otherwise zinc. */
  nextPrimary?: boolean;
};

export function CompactStickyBar({
  actions,
  center,
  onPrevious,
  onNext,
  isPreviousDisabled,
  isNextDisabled,
  nextLabel = "Next",
  nextPrimary = false,
}: CompactStickyBarProps) {
  return (
    <div
      id="compact-sticky-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-6px_16px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
        <div className="flex flex-wrap items-stretch gap-1.5 sm:gap-2">{actions}</div>
        <div className="flex items-center justify-between gap-2">
          <ActionButton
            type="button"
            variant="secondary"
            onClick={onPrevious}
            disabled={isPreviousDisabled}
            className="!h-11 !w-auto min-w-0 flex-1"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Previous</span>
          </ActionButton>
          {center ? <div className="flex shrink-0 items-center">{center}</div> : null}
          <ActionButton
            type="button"
            variant={nextPrimary ? "primary" : "secondary"}
            onClick={onNext}
            disabled={isNextDisabled}
            className="!h-11 !w-auto min-w-0 flex-1"
          >
            <span className="truncate">{nextLabel}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
