import type { ReactNode } from "react";

type TableRowActionsProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Match secondary ActionButton on PanelInset for Next.js Link row actions.
 * Dimensions come from `TableRowActions`.
 */
export const tableRowActionLinkClassName =
  "rounded-md border border-zinc-300 bg-white text-xs font-medium leading-none text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0 [&_svg]:text-sky-700";

/**
 * Equal-width row actions for data tables.
 * Stacked in one column on compact widths; horizontal from `sm` up.
 */
export function TableRowActions({ children, className = "" }: TableRowActionsProps) {
  return (
    <div
      className={[
        "ml-auto flex w-[6.75rem] flex-col gap-2",
        "sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end",
        "[&>*]:inline-flex [&>*]:!h-8 [&>*]:!w-full [&>*]:shrink-0 [&>*]:items-center [&>*]:justify-center [&>*]:gap-1 [&>*]:px-1.5 [&>*]:text-[11px]",
        "sm:[&>*]:!w-[8.5rem] sm:[&>*]:px-2 sm:[&>*]:text-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
