"use client";

import Link from "next/link";
import { History, LayoutGrid } from "lucide-react";
import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import {
  formatPersonalBestDate,
  formatPersonalBestLoad,
  formatPersonalBestSet,
  type PersonalBestRow,
} from "@/lib/personal-bests";

type PersonalBestsPanelProps = {
  rows: PersonalBestRow[];
  hideEmpty: boolean;
  onHideEmptyChange: (hideEmpty: boolean) => void;
};

const pillBase =
  "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40";
const pillActive = "border-sky-600 bg-sky-100 text-sky-950";
const pillInactive = "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100";

function rowDetail(row: PersonalBestRow): string {
  const best = formatPersonalBestSet(row.bestSet);
  const load = formatPersonalBestLoad(row.heaviestLoad);
  return `Best set ${best}. Heaviest load ${load}.`;
}

function rowMeta(row: PersonalBestRow): string {
  const parts = [
    `Best ${formatPersonalBestDate(row.bestSet)}`,
    `Heaviest ${formatPersonalBestDate(row.heaviestLoad)}`,
  ];
  if (row.isAssistance) {
    parts.push("Assistance logged, not strength load");
  }
  return parts.join(" · ");
}

function MarkBlock({
  label,
  value,
  date,
}: {
  label: string;
  value: string;
  date: string;
}) {
  const empty = value === "—";
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
      {empty ? null : <p className="text-xs text-zinc-500">{date}</p>}
    </div>
  );
}

export function PersonalBestsPanel({ rows, hideEmpty, onHideEmptyChange }: PersonalBestsPanelProps) {
  return (
    <PanelInset className="p-4">
      <SectionHeading>Personal bests</SectionHeading>
      <p className="mt-1 text-sm text-zinc-800">
        {hideEmpty
          ? `${rows.length} exercise${rows.length === 1 ? "" : "s"} with a logged best in this range.`
          : `${rows.length} exercise${rows.length === 1 ? "" : "s"} in the catalog.`}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Best set uses Total (kg), then reps. Heaviest load uses Loaded (kg).
      </p>
      <details className="mt-2 text-xs text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">How ranking works</summary>
        <p className="mt-2 leading-relaxed">
          Warmups are left out. Best set picks the highest Total (kg), then the higher reps, then the
          earlier date. Heaviest load picks the highest Loaded (kg), then the earlier date. Dates are when
          that mark was first hit in this range. Assisted Dip and Assisted Pull-Up still show numbers;
          those figures are assistance, not the load you moved.
        </p>
      </details>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onHideEmptyChange(true)}
          className={`flex w-full flex-col items-center justify-center gap-1.5 text-center leading-tight ${pillBase} ${
            hideEmpty ? pillActive : pillInactive
          }`}
        >
          <History className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span>With logged sets</span>
        </button>
        <button
          type="button"
          onClick={() => onHideEmptyChange(false)}
          className={`flex w-full flex-col items-center justify-center gap-1.5 text-center leading-tight ${pillBase} ${
            !hideEmpty ? pillActive : pillInactive
          }`}
        >
          <LayoutGrid className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span>All exercises</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          {hideEmpty
            ? "No working sets with a logged load in this range yet."
            : "No exercises in the catalog."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
          {rows.map((row) => (
            <li key={row.exerciseId} className="px-3 py-2.5">
              {/* Mobile: same stacked copy as Exercise progress. */}
              <div className="min-w-0 md:hidden">
                <Link
                  href={row.href}
                  className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
                >
                  {row.label}
                </Link>
                <p className="mt-1 text-xs text-zinc-700">{rowDetail(row)}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{rowMeta(row)}</p>
              </div>

              {/* md+: exercise + two mark columns. */}
              <div className="hidden md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-4">
                <div className="min-w-0">
                  <Link
                    href={row.href}
                    className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
                  >
                    {row.label}
                  </Link>
                  {row.isAssistance ? (
                    <p className="mt-0.5 text-xs text-zinc-500">Assistance logged, not strength load</p>
                  ) : null}
                </div>
                <MarkBlock
                  label="Best set"
                  value={formatPersonalBestSet(row.bestSet)}
                  date={formatPersonalBestDate(row.bestSet)}
                />
                <MarkBlock
                  label="Heaviest load"
                  value={formatPersonalBestLoad(row.heaviestLoad)}
                  date={formatPersonalBestDate(row.heaviestLoad)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelInset>
  );
}
