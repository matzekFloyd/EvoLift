export type SegmentedTabLayout = "default" | "equal-row";

/** Tab row. Narrow equal-row wraps to two columns so a longer label stays inside the control. */
export function segmentedTabRowClassName(layout: SegmentedTabLayout, wrapNarrow: boolean): string {
  if (layout === "equal-row" && wrapNarrow) {
    return "flex w-full min-w-0 flex-wrap gap-1";
  }
  if (layout === "equal-row") {
    return "flex w-full min-w-0 gap-1";
  }
  return "grid w-full gap-1 sm:inline-flex sm:w-auto";
}

/** Tab control width. Wrapped equal-row is half the row below `sm`, then one shared row. */
export function segmentedTabButtonWidthClassName(layout: SegmentedTabLayout, wrapNarrow: boolean): string {
  if (layout === "equal-row" && wrapNarrow) {
    return "w-[calc(50%-0.25rem)] flex-none px-2 sm:h-9 sm:w-auto sm:min-w-0 sm:flex-1 sm:basis-0 sm:px-3 sm:py-0";
  }
  if (layout === "equal-row") {
    return "flex-1 basis-0 min-w-0 px-2 sm:px-3";
  }
  return "w-full px-3 sm:w-auto";
}

export function segmentedTabButtonHeightClassName(layout: SegmentedTabLayout, wrapNarrow: boolean): string {
  if (layout === "equal-row" && wrapNarrow) {
    return "min-h-9 py-1.5";
  }
  return "h-9";
}
