export type CompactLogScrollInput = {
  viewportHeight: number;
  stickyHeight: number;
  topInset: number;
  actionTop: number;
  actionBottom: number;
  lastRowTop: number | null;
  gap?: number;
};

/** How far to scroll so the next action is above the sticky bar and the last row stays on screen. */
export function compactLogScrollDelta(input: CompactLogScrollInput): number {
  const gap = input.gap ?? 24;
  const visibleTop = input.topInset + gap;
  const visibleBottom = input.viewportHeight - input.stickyHeight - gap;
  if (visibleBottom <= visibleTop) {
    return 0;
  }

  const actionBelow = input.actionBottom - visibleBottom;
  const actionAbove = visibleTop - input.actionTop;
  let delta = 0;
  if (actionBelow > 0) {
    delta = actionBelow;
  } else if (actionAbove > 0) {
    delta = -actionAbove;
  }

  if (input.lastRowTop == null) {
    return delta;
  }

  const lastTopAfter = input.lastRowTop - delta;
  if (lastTopAfter < visibleTop) {
    delta = input.lastRowTop - visibleTop;
  }

  return delta;
}

/** Two-row bar, then 2rem of page. The full string stays in source so Tailwind emits it. */
const COMPACT_LOG_PADDING =
  "max-md:!pb-[calc(7.5rem+1px+1.25rem+max(0.75rem,env(safe-area-inset-bottom,0px)))]";

/** Adds the filled Finish row: h-11 plus the wrap gap above Skip and Set targets. */
const COMPACT_LOG_PADDING_WITH_FINISH =
  "max-md:!pb-[calc(7.5rem+1px+1.25rem+2.75rem+0.375rem+max(0.75rem,env(safe-area-inset-bottom,0px)))]";

/** Page padding that clears the sticky bar, including the filled Finish row. */
export function compactLogShellPaddingClass(finishFilled: boolean): string {
  return finishFilled ? COMPACT_LOG_PADDING_WITH_FINISH : COMPACT_LOG_PADDING;
}
