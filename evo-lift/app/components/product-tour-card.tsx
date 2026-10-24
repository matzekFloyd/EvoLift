"use client";

import { useEffect, useId, useRef } from "react";
import type { CardComponentProps } from "nextstepjs";
import { ActionButton } from "@/app/components/action-button";

/** Tour card. NextStep places the spotlight; this is the app's own type and buttons. */
export function ProductTourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
}: CardComponentProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const isLast = currentStep >= totalSteps - 1;

  useEffect(() => {
    cardRef.current?.focus();
  }, [currentStep]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      skipTour?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [skipTour]);

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="w-full rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-lg outline-none"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="text-base font-semibold tracking-tight text-zinc-900">
          {step.title}
        </h2>
        <p className="shrink-0 text-xs text-zinc-500">
          {currentStep + 1} of {totalSteps}
        </p>
      </div>
      <p className="mt-2 text-sm leading-snug text-zinc-700">{step.content}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ActionButton type="button" variant="secondary" size="sm" onClick={() => skipTour?.()}>
          Skip
        </ActionButton>
        <div className="flex flex-wrap justify-end gap-2">
          {currentStep > 0 ? (
            <ActionButton type="button" variant="secondary" size="sm" onClick={prevStep}>
              Back
            </ActionButton>
          ) : null}
          <ActionButton type="button" variant="primary" size="sm" onClick={nextStep}>
            {isLast ? "Done" : "Next"}
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
