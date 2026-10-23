/**
 * Set history columns on a narrow phone.
 * Date is the only flexible track. Set, load, total, and reps stay fixed so Reps
 * remains on screen without scrolling the table sideways.
 * At 22rem and wider, a type column is inserted.
 */
export const compactHistoryGridClassName =
  "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2rem_2.5rem_2.5rem_2.25rem] gap-x-1 [&>*]:min-w-0 @min-[22rem]:grid-cols-[minmax(0,1fr)_4.75rem_2rem_2.5rem_2.5rem_2.25rem]";

/** Assistance exercises omit Total. */
export const compactHistoryAssistanceGridClassName =
  "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2rem_2.5rem_2.25rem] gap-x-1 [&>*]:min-w-0 @min-[22rem]:grid-cols-[minmax(0,1fr)_4.75rem_2rem_2.5rem_2.25rem]";

/**
 * Cancels the history section's horizontal padding (`p-4`, `sm:p-5`) so the
 * grid can use the panel width on a phone.
 */
export const compactHistoryFrameClassName =
  "@container -mx-4 w-[calc(100%+2rem)] overflow-x-auto rounded-md border border-zinc-200 bg-white sm:-mx-5 sm:w-[calc(100%+2.5rem)]";

/** Horizontal padding on the compact header and each row. Matches `px-1`. */
export const compactHistoryCellPaddingClassName = "px-1";

/** Shares the panel width so the last column (Reps) stays visible in landscape. */
export const historyTableClassName = "table-fixed";
