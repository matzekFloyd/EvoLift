import Link from "next/link";
import { ExerciseName } from "@/app/components/exercise-badge-chip";
import { formatPersonalBestDate, formatPersonalBestLoad } from "@/lib/personal-bests";
import {
  formatProfileEstimated1Rm,
  profileBestWeightLabel,
  profileRecordSharedDate,
  type ProfileRecordRow,
} from "@/lib/profile-summary";

function MarkBlock({
  label,
  value,
  date,
  hideLabelOnWide,
  showDate,
  note,
}: {
  label: string;
  value: string;
  date: string;
  hideLabelOnWide: boolean;
  showDate: boolean;
  /** Visible clarification when the column header does not name this mark. */
  note?: string;
}) {
  const empty = value === "—";
  return (
    <div className="min-w-0">
      {note ? null : (
        <p className="text-[11px] font-medium leading-snug text-zinc-500">
          <span className={hideLabelOnWide ? "md:sr-only" : undefined}>{label}</span>
          {hideLabelOnWide ? (
            <span aria-hidden className="invisible hidden md:inline">
              {label}
            </span>
          ) : null}
        </p>
      )}
      <p className="text-sm font-medium tabular-nums text-zinc-900">{value}</p>
      {note ? <p className="text-sm text-zinc-800">{note}</p> : null}
      {empty || !showDate ? null : <p className="text-xs tabular-nums text-zinc-500">{date}</p>}
    </div>
  );
}

function columnWeightLabel(rows: ProfileRecordRow[]): string {
  if (rows.every((row) => row.isAssistance)) {
    return "Least assistance";
  }
  return "Best weight";
}

export function ProfileRecordsList({ rows }: { rows: ProfileRecordRow[] }) {
  const weightColumn = columnWeightLabel(rows);
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
      <div
        aria-hidden
        className="hidden border-b border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-500 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4"
      >
        <span />
        <span>{weightColumn}</span>
        <span>Estimated 1RM</span>
      </div>
      <ul className="divide-y divide-zinc-200">
        {rows.map((row) => {
          const sharedDate = profileRecordSharedDate(row);
          const weightLabel = profileBestWeightLabel(row.isAssistance);
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
                  label={weightLabel}
                  value={formatPersonalBestLoad(row.bestWeight)}
                  date={formatPersonalBestDate(row.bestWeight)}
                  hideLabelOnWide={weightLabel === weightColumn}
                  showDate={sharedDate == null}
                  note={row.isAssistance && weightColumn === "Best weight" ? "Least assistance" : undefined}
                />
                <MarkBlock
                  label="Estimated 1RM"
                  value={formatProfileEstimated1Rm(row.bestE1rm?.valueKg ?? null)}
                  date={formatPersonalBestDate(row.bestE1rm)}
                  hideLabelOnWide
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
  );
}
