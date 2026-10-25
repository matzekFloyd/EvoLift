"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  AppTable,
  AppTableActionsHeader,
  appTableHeadRowClassName,
  appTableRowClassName,
  appTableTdClassName,
  appTableThClassName,
} from "@/app/components/app-table";
import { TableRowActions } from "@/app/components/table-row-actions";
import type { NamedListSortDirection } from "@/lib/named-list-sort";

const nameLinkClassName = "font-medium text-sky-800 underline-offset-2 hover:underline";

const statusChipClassName =
  "rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800";

type NamedListTableProps = {
  sortDirection: NamedListSortDirection;
  onToggleSort: () => void;
  countHeading: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Name, one count, and row actions. The name opens the editor. */
export function NamedListTable({
  sortDirection,
  onToggleSort,
  countHeading,
  children,
  className,
}: NamedListTableProps) {
  return (
    <AppTable className={className} rowTone="group">
      <thead>
        <tr className={appTableHeadRowClassName}>
          <th className={appTableThClassName}>
            <button type="button" onClick={onToggleSort} className="inline-flex items-center gap-1">
              Name <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
            </button>
          </th>
          <th className={`${appTableThClassName} w-16 whitespace-nowrap sm:w-24`}>{countHeading}</th>
          <AppTableActionsHeader />
        </tr>
      </thead>
      {children}
    </AppTable>
  );
}

type NamedListTableRowProps = {
  name: string;
  href: string;
  count: number;
  /** Omitted when the list has no status, such as templates. */
  statusLabel?: string | null;
  /** Shown under the name, such as a plan's sample week. */
  belowName?: ReactNode;
  children: ReactNode;
};

export function NamedListTableRow({
  name,
  href,
  count,
  statusLabel,
  belowName,
  children,
}: NamedListTableRowProps) {
  return (
    <tbody>
      <tr className={appTableRowClassName}>
        <td className={`${appTableTdClassName} break-words whitespace-normal`}>
          <span className="inline-flex flex-wrap items-center gap-2">
            <Link href={href} className={nameLinkClassName}>
              {name}
            </Link>
            {statusLabel ? <span className={statusChipClassName}>{statusLabel}</span> : null}
          </span>
        </td>
        <td className={`${appTableTdClassName} text-zinc-600`}>{count}</td>
        <td className={appTableTdClassName}>
          <TableRowActions stackUntil="md">{children}</TableRowActions>
        </td>
      </tr>
      {belowName ? (
        <tr className={appTableRowClassName}>
          <td colSpan={3} className={`${appTableTdClassName} pt-0`}>
            {belowName}
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}
