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
  const gap = input.gap ?? 12;
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
