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
  /**
   * Below `md`, the actions share one full-width row.
   * From `md`, they use the same horizontal widths as `stackUntil="md"`.
   */
  pairBelow?: "md";
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

const pairBelowMd = [
  "flex w-full flex-row gap-2",
  "[&>*]:inline-flex [&>*]:!h-8 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:!w-auto [&>*]:items-center [&>*]:justify-center [&>*]:gap-1 [&>*]:px-1.5 [&>*]:text-[11px]",
  "md:ml-auto md:w-auto md:justify-end",
  "md:[&>*]:!w-[8.5rem] md:[&>*]:flex-none md:[&>*]:shrink-0 md:[&>*]:px-2 md:[&>*]:text-xs",
] as const;

/**
 * Equal-width row actions for data tables.
 * Stacked in one column on compact widths; horizontal from `stackUntil` up.
 */
export function TableRowActions({
  children,
  className = "",
  stackUntil = "sm",
  pairBelow,
}: TableRowActionsProps) {
  const horizontalClasses = stackUntil === "md" ? horizontalFromMd : horizontalFromSm;
  const layoutClasses =
    pairBelow === "md"
      ? pairBelowMd
      : [
          "ml-auto flex w-[6.75rem] flex-col gap-2",
          ...horizontalClasses,
          "[&>*]:inline-flex [&>*]:!h-8 [&>*]:!w-full [&>*]:shrink-0 [&>*]:items-center [&>*]:justify-center [&>*]:gap-1 [&>*]:px-1.5 [&>*]:text-[11px]",
        ];
  return (
    <div
      className={[...layoutClasses, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
