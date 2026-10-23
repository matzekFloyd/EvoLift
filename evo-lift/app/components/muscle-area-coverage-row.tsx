import type { ReactNode } from "react";

/**
 * Figure and area list. Two columns wait until the list is wide enough, and the
 * figure sits beside the list only when both fit. A viewport breakpoint turns
 * the columns on while the figure is still taking the width.
 */
export function MuscleAreaCoverageLayout<T extends { area: string }>({
  figure,
  areas,
  renderArea,
  className = "mt-3",
}: {
  figure: ReactNode;
  areas: readonly T[];
  renderArea: (area: T) => ReactNode;
  className?: string;
}) {
  const midpoint = Math.ceil(areas.length / 2);
  const columns = [areas.slice(0, midpoint), areas.slice(midpoint)];
  return (
    <div className={["@container", className].filter(Boolean).join(" ")}>
      <div className="grid items-center gap-x-8 gap-y-3 @min-[56rem]:grid-cols-[auto_minmax(0,1fr)]">
        {figure}
        <div className="@container min-w-0">
          <div className="grid min-w-0 grid-cols-1 gap-x-8 @min-[40rem]:grid-cols-2">
            {columns.map((column) => (
              <ul key={column[0]?.area ?? "coverage"} className="min-w-0">
                {column.map((area) => renderArea(area))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** One area in the shared muscle-area list: name, relative bar, value. */
export function MuscleAreaCoverageRow({
  label,
  valueText,
  emphasized,
  barPercent,
}: {
  label: string;
  valueText: string;
  emphasized: boolean;
  barPercent: number;
}) {
  return (
    <li className="grid min-w-0 grid-cols-[minmax(0,7.25rem)_minmax(0,1fr)_max-content] items-center gap-x-2 border-b border-zinc-200 py-1.5">
      <span className="min-w-0 truncate text-sm text-zinc-800">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-sm bg-zinc-100" aria-hidden>
        {barPercent > 0 ? (
          <span className="block h-full rounded-sm bg-sky-600" style={{ width: `${barPercent}%` }} />
        ) : null}
      </span>
      <span
        className={
          emphasized
            ? "text-right text-lg font-medium tabular-nums leading-none text-sky-800"
            : "text-right text-sm whitespace-nowrap text-zinc-500"
        }
      >
        {valueText}
      </span>
    </li>
  );
}
