/**
 * The middle dot belongs between the set number and the load only when both fit on one line.
 * A wrapped row already separates them, so the dot after "Set 1" is dropped.
 */
export function shouldShowSetSummarySeparator(input: {
  containerWidth: number;
  setWidth: number;
  loadWidth: number;
  separatorWidth: number;
  gap: number;
}): boolean {
  const needed =
    input.setWidth + input.gap + input.separatorWidth + input.gap + input.loadWidth;
  return needed <= input.containerWidth + 0.5;
}
