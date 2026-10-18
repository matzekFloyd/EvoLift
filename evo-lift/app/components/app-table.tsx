"use client";

import type { ReactNode } from "react";
import { PanelInset } from "@/app/components/panel-inset";

type AppTableProps = {
  children: ReactNode;
  tableClassName?: string;
  className?: string;
};

export const appTableHeadRowClassName =
  "text-left text-xs font-medium uppercase tracking-wide text-zinc-600";

export const appTableThClassName = "px-4 py-3";

export const appTableTdClassName = "px-4 py-3";

export const appTableRowClassName = "bg-white";

/** Visually empty actions header; keeps the column labeled for assistive tech. */
export function AppTableActionsHeader() {
  return (
    <th className={appTableThClassName}>
      <span className="sr-only">Actions</span>
    </th>
  );
}

/** Nested data table shell (PanelInset + scroll). Use for plans, templates, logs, etc. */
export function AppTable({ children, tableClassName, className }: AppTableProps) {
  return (
    <PanelInset className={["overflow-x-auto p-0", className].filter(Boolean).join(" ")}>
      <table
        className={["min-w-full divide-y divide-zinc-200 text-sm", tableClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </table>
    </PanelInset>
  );
}
