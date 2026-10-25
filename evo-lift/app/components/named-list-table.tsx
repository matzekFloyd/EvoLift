"use client";

import { createContext, useContext, type ReactNode } from "react";
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

const NamedListLayoutContext = createContext(false);

const nameLinkClassName = "group font-medium text-sky-800";
const nameLinkTextClassName = "underline-offset-2 group-hover:underline";

/** Shared by the plans header and each plan row so Days lines up with the day count. */
const planListRowGridClassName =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1fr)_5.5rem_max-content_17.5rem] md:gap-x-6";

/**
 * Same width as the Active plan checkbox and the paired row actions.
 * Empty tracks would collapse, which pushes Days to the right edge.
 */
const planListHeaderReserveClassName =
  "invisible hidden normal-case tracking-normal md:inline-flex";

const statusChipClassName =
  "rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800";

type NamedListCountSort = {
  label: string;
  active: boolean;
  direction: NamedListSortDirection;
  onToggle: () => void;
};

type NamedListTableProps = {
  sortDirection: NamedListSortDirection;
  onToggleSort: () => void;
  /** False when another column, such as Days, is the active sort. Defaults to true. */
  nameSortActive?: boolean;
  /** Omitted when the count sits in the row detail, such as a plan's sample week. */
  countHeading?: ReactNode;
  /** Sort control for the count column. Lines up with an inline day count. */
  countSort?: NamedListCountSort;
  /**
   * The name, detail, and actions share one cell.
   * Actions sit beside the detail from `sm`, and under it on a narrow screen.
   */
  embedActions?: boolean;
  children: ReactNode;
  className?: string;
};

function SortHeading({
  label,
  active,
  direction,
  onToggle,
  className = "",
}: {
  label: string;
  active: boolean;
  direction: NamedListSortDirection;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onToggle} className={`inline-flex items-center gap-1 ${className}`}>
      {label}
      {active ? <span>{direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

/** Name, an optional count, and row actions. The name opens the editor. */
export function NamedListTable({
  sortDirection,
  onToggleSort,
  nameSortActive = true,
  countHeading,
  countSort,
  embedActions = false,
  children,
  className,
}: NamedListTableProps) {
  const showCountColumn = !embedActions && countHeading != null;
  return (
    <NamedListLayoutContext.Provider value={embedActions}>
      <AppTable className={className} rowTone="group">
        <thead>
          <tr className={appTableHeadRowClassName}>
            <th className={appTableThClassName}>
              {countSort ? (
                <div className={planListRowGridClassName}>
                  <SortHeading
                    label="Name"
                    active={nameSortActive}
                    direction={sortDirection}
                    onToggle={onToggleSort}
                  />
                  <SortHeading
                    label={countSort.label}
                    active={countSort.active}
                    direction={countSort.direction}
                    onToggle={countSort.onToggle}
                    className="justify-self-end md:justify-self-start"
                  />
                  <span aria-hidden className={`${planListHeaderReserveClassName} min-h-10 items-center gap-2 text-sm font-medium`}>
                    <span className="inline-flex h-4 w-4 shrink-0" />
                    Active plan
                  </span>
                  <span aria-hidden className={`${planListHeaderReserveClassName} w-[17.5rem]`} />
                </div>
              ) : (
                <button type="button" onClick={onToggleSort} className="inline-flex items-center gap-1">
                  Name <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                </button>
              )}
            </th>
            {showCountColumn ? (
              <th className={`${appTableThClassName} w-16 whitespace-nowrap sm:w-24`}>{countHeading}</th>
            ) : null}
            {embedActions ? null : <AppTableActionsHeader />}
          </tr>
        </thead>
        {children}
      </AppTable>
    </NamedListLayoutContext.Provider>
  );
}

type NamedListTableRowProps = {
  name: string;
  href: string;
  /** Omitted when the table embeds actions and the count lives in `detail`. */
  count?: number;
  /** Omitted when the list has no status, such as templates. */
  statusLabel?: string | null;
  /** Shown under the name, such as a plan's sample week. */
  belowName?: ReactNode;
  /** Extra facts for the row. Under the name, or on the same line when `detailInline`. */
  detail?: ReactNode;
  /** Name, day count, and other facts share one line and wrap together. */
  detailInline?: boolean;
  children: ReactNode;
};

export function NamedListTableRow({
  name,
  href,
  count,
  statusLabel,
  belowName,
  detail,
  detailInline = false,
  children,
}: NamedListTableRowProps) {
  const embedActions = useContext(NamedListLayoutContext);
  const showCount = !embedActions && count != null;
  const nameLink = (
    <Link href={href} className={nameLinkClassName}>
      <span className={nameLinkTextClassName}>{name}</span>
    </Link>
  );
  const nameCell = detailInline ? (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      {nameLink}
      {statusLabel ? <span className={statusChipClassName}>{statusLabel}</span> : null}
      {detail}
    </div>
  ) : (
    <>
      <span className="inline-flex flex-wrap items-center gap-2">
        {nameLink}
        {statusLabel ? <span className={statusChipClassName}>{statusLabel}</span> : null}
      </span>
      {detail ? <div className="mt-2">{detail}</div> : null}
    </>
  );

  if (embedActions && detailInline) {
    return (
      <tbody>
        <tr className={appTableRowClassName}>
          <td className={`${appTableTdClassName} break-words whitespace-normal`}>
            <div className={planListRowGridClassName}>
              <Link
                href={href}
                className={`${nameLinkClassName} relative flex min-w-0 items-center self-stretch break-words before:absolute before:-top-3 before:right-0 before:-left-4 before:bottom-0 before:content-[''] md:before:-bottom-3`}
              >
                <span className={nameLinkTextClassName}>{name}</span>
              </Link>
              {detail}
              <TableRowActions pairBelow="md" className="col-span-2 md:col-span-1">
                {children}
              </TableRowActions>
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  if (embedActions) {
    return (
      <tbody>
        <tr className={`${appTableRowClassName} align-top`}>
          <td className={`${appTableTdClassName} break-words whitespace-normal`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">{nameCell}</div>
              <TableRowActions stackUntil="md" className="shrink-0">
                {children}
              </TableRowActions>
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  const columnCount = 2 + (showCount ? 1 : 0);
  return (
    <tbody>
      <tr className={`${appTableRowClassName}${detail ? " align-top" : ""}`}>
        <td className="h-px break-words whitespace-normal p-0">
          <Link
            href={href}
            className={`${nameLinkClassName} flex h-full items-center px-4 py-3 break-words`}
          >
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className={nameLinkTextClassName}>{name}</span>
              {statusLabel ? <span className={statusChipClassName}>{statusLabel}</span> : null}
            </span>
          </Link>
          {detail ? <div className="px-4 pb-3">{detail}</div> : null}
        </td>
        {showCount ? <td className={`${appTableTdClassName} text-zinc-600`}>{count}</td> : null}
        <td className={appTableTdClassName}>
          <TableRowActions stackUntil="md">{children}</TableRowActions>
        </td>
      </tr>
      {belowName ? (
        <tr className={appTableRowClassName}>
          <td colSpan={columnCount} className={`${appTableTdClassName} pt-0`}>
            {belowName}
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}
