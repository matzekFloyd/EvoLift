import type { ReactNode } from "react";

type TableRowActionsStackUntil = "sm" | "md";

type TableRowActionsProps = {
  children: ReactNode;
  className?: string;
  /**
   * Breakpoint where actions switch from a stacked column to a horizontal row.
   * Use `md` when a row has several labeled actions that would overflow on `sm`.
   */
  stackUntil?: TableRowActionsStackUntil;
};

/**
 * Match secondary ActionButton on PanelInset for Next.js Link row actions.
 * Dimensions come from `TableRowActions`.
 */
export const tableRowActionLinkClassName =
  "rounded-md border border-zinc-300 bg-white text-xs font-medium leading-none text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0 [&_svg]:text-sky-700";

const horizontalFromSm = [
  "sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end",
  "sm:[&>*]:!w-[8.5rem] sm:[&>*]:px-2 sm:[&>*]:text-xs",
] as const;

const horizontalFromMd = [
  "md:w-auto md:flex-row md:flex-wrap md:justify-end",
  "md:[&>*]:!w-[8.5rem] md:[&>*]:px-2 md:[&>*]:text-xs",
] as const;

/**
 * Equal-width row actions for data tables.
 * Stacked in one column on compact widths; horizontal from `stackUntil` up.
 */
export function TableRowActions({
  children,
  className = "",
  stackUntil = "sm",
}: TableRowActionsProps) {
  const horizontalClasses = stackUntil === "md" ? horizontalFromMd : horizontalFromSm;
  return (
    <div
      className={[
        "ml-auto flex w-[6.75rem] flex-col gap-2",
        ...horizontalClasses,
        "[&>*]:inline-flex [&>*]:!h-8 [&>*]:!w-full [&>*]:shrink-0 [&>*]:items-center [&>*]:justify-center [&>*]:gap-1 [&>*]:px-1.5 [&>*]:text-[11px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
