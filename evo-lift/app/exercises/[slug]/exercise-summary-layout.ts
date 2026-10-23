/**
 * Summary KPIs.
 * Narrow: three set cards, then pairs. Mid: a full set row, then a full load row.
 * Wide: one row. Assistance has five cards, so that row is five columns.
 * Loaded weight adds Avg total and Max total, so that row is seven.
 * Class names stay whole literals so Tailwind can see them.
 */
export function exerciseSummaryGridClassName(assistance: boolean): string {
  if (assistance) {
    return "grid w-full grid-cols-6 gap-2 @min-[28rem]:grid-cols-12 @min-[56rem]:grid-cols-5";
  }
  return "grid w-full grid-cols-6 gap-2 @min-[28rem]:grid-cols-12 @min-[56rem]:grid-cols-7";
}

export const exerciseSummarySetCardClassName =
  "col-span-2 min-w-0 @min-[28rem]:col-span-4 @min-[56rem]:col-span-1";

/** Mid load span fills the 12-column row: two assistance cards, or four loaded cards. */
export function exerciseSummaryLoadCardClassName(assistance: boolean): string {
  if (assistance) {
    return "col-span-3 min-w-0 @min-[28rem]:col-span-6 @min-[56rem]:col-span-1";
  }
  return "col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1";
}
