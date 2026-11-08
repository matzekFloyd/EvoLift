"use client";

import Link from "next/link";
import { ExerciseName } from "@/app/components/exercise-badge-chip";
import { CollapsibleSection } from "@/app/components/collapsible-section";
import {
  formatPersonalBestDate,
  formatPersonalBestLoad,
  formatPersonalBestSet,
  personalBestLoadMarkLabel,
  personalBestSharedDate,
  type PersonalBestRow,
} from "@/lib/personal-bests";

type PersonalBestsPanelProps = {
  rows: PersonalBestRow[];
  defaultOpen?: boolean;
};

function MarkBlock({
  label,
  value,
  date,
  hideLabelOnWide,
  showDate,
}: {
  label: string;
  value: string;
  date: string;
  /** The list header already names this column on a wide screen. */
  hideLabelOnWide: boolean;
  showDate: boolean;
}) {
  const empty = value === "—";
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium leading-snug text-zinc-500">
        <span className={hideLabelOnWide ? "md:sr-only" : undefined}>{label}</span>
        {hideLabelOnWide ? (
          <span aria-hidden className="invisible hidden md:inline">
            {label}
          </span>
        ) : null}
      </p>
      <p className="text-sm font-medium tabular-nums text-zinc-900">{value}</p>
      {empty || !showDate ? null : <p className="text-xs tabular-nums text-zinc-500">{date}</p>}
    </div>
  );
}

function columnLoadLabel(rows: PersonalBestRow[]): string {
  if (rows.every((row) => row.isAssistance)) {
    return "Least assistance";
  }
  return "Heaviest load";
}

function PersonalBestColumnHeader({ rows }: { rows: PersonalBestRow[] }) {
  return (
    <div
      aria-hidden
      className="hidden border-b border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-500 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4"
    >
      <span />
      <span>Best set</span>
      <span>{columnLoadLabel(rows)}</span>
    </div>
  );
}

export function PersonalBestsPanel({
  rows,
  defaultOpen = false,
}: PersonalBestsPanelProps) {
  return (
    <CollapsibleSection title="Personal bests" defaultOpen={defaultOpen}>
      <p className="text-sm text-zinc-800">
        {rows.length} exercise{rows.length === 1 ? "" : "s"} with a logged best in this range.
      </p>
      <details className="mt-2 text-xs text-zinc-600">
        <summary className="cursor-pointer rounded-sm font-medium text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60">
          How ranking works
        </summary>
        <p className="mt-2 leading-relaxed">
          Warmups are left out. Best set picks the highest Total (kg), then the higher reps, then the
          earlier date. Heaviest load picks the highest Loaded (kg), then the earlier date. Dates are when
          that mark was first hit in this range. On Assisted Dip and Assisted Pull-Up, Best set picks the
          lowest assistance, then the higher reps, then the earlier date. Least assistance picks the lowest
          Assistance (kg), then the earlier date. That number is assistance, not a strength load. 0 kg is
          unassisted bodyweight.
        </p>
      </details>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          No working sets with a logged load in this range yet.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-md border border-zinc-200 bg-white">
          <PersonalBestColumnHeader rows={rows} />
          <ul className="divide-y divide-zinc-200">
            {rows.map((row) => {
              const sharedDate = personalBestSharedDate(row);
              const loadLabel = personalBestLoadMarkLabel(row.isAssistance);
              return (
                <li key={row.exerciseId} className="px-3 py-2.5">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-4">
                    <div className="col-span-2 min-w-0 md:col-span-1">
                      <ExerciseName slug={row.slug}>
                        <Link
                          href={row.href}
                          className="text-sm font-medium text-zinc-900 underline-offset-2 hover:text-sky-800 hover:underline"
                        >
                          {row.label}
                        </Link>
                      </ExerciseName>
                      {sharedDate ? (
                        <p className="mt-0.5 hidden text-xs tabular-nums text-zinc-500 md:block">{sharedDate}</p>
                      ) : null}
                    </div>
                    <MarkBlock
                      label="Best set"
                      value={formatPersonalBestSet(row.bestSet)}
                      date={formatPersonalBestDate(row.bestSet)}
                      hideLabelOnWide
                      showDate={sharedDate == null}
                    />
                    <MarkBlock
                      label={loadLabel}
                      value={formatPersonalBestLoad(row.heaviestLoad)}
                      date={formatPersonalBestDate(row.heaviestLoad)}
                      hideLabelOnWide={loadLabel === columnLoadLabel(rows)}
                      showDate={sharedDate == null}
                    />
                    {sharedDate ? (
                      <p className="col-span-2 text-xs tabular-nums text-zinc-500 md:hidden">{sharedDate}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </CollapsibleSection>
  );
}
