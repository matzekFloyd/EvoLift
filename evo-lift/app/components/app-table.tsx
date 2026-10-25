"use client";

import type { ReactNode } from "react";
import { PanelInsetSurfaceProvider } from "@/app/components/panel-inset";

type AppTableProps = {
  children: ReactNode;
  tableClassName?: string;
  className?: string;
  /** `group` paints every row in a tbody the same tone, so a detail row stays with its record. */
  rowTone?: "row" | "group";
};

export const appTableHeadRowClassName =
  "bg-zinc-200/60 text-left text-xs font-medium uppercase tracking-wide text-zinc-600";

export const appTableThClassName = "px-4 py-3";

export const appTableTdClassName = "px-4 py-3";

/** Zebra rows: white / grey. Prefer this on every `tbody` row. */
export const appTableRowClassName =
  "odd:bg-white even:bg-zinc-100 hover:bg-sky-50";

/** Visually empty actions header; keeps the column labeled for assistive tech. */
export function AppTableActionsHeader() {
  return (
    <th className={appTableThClassName}>
      <span className="sr-only">Actions</span>
    </th>
  );
}

/**
 * Full-width bordered table on a white `.panel` with alternating row tones.
 * Do not wrap in another inset.
 */
export function AppTable({ children, tableClassName, className, rowTone = "row" }: AppTableProps) {
  const zebra =
    rowTone === "group"
      ? [
          "[&_tbody:nth-of-type(odd)>tr:not(:hover)]:bg-white",
          "[&_tbody:nth-of-type(even)>tr:not(:hover)]:bg-zinc-100",
        ]
      : [
          "[&_tbody>tr:nth-child(odd):not(:hover)]:bg-white",
          "[&_tbody>tr:nth-child(even):not(:hover)]:bg-zinc-100",
        ];

  return (
    <PanelInsetSurfaceProvider>
      <div
        className={[
          "w-full overflow-x-auto rounded-md border border-zinc-200 bg-white",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <table
          className={[
            "w-full min-w-full divide-y divide-zinc-200 text-sm",
            // Zebra only when not hovered so hover can paint sky without !important wars.
            ...zebra,
            "[&_tbody>tr:hover]:bg-sky-50",
            tableClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </table>
      </div>
    </PanelInsetSurfaceProvider>
  );
}
