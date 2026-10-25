import {
  SAMPLE_WEEK_DAY_LABEL,
  SAMPLE_WEEK_HEADING,
  SAMPLE_WEEK_REST_LABEL,
  sampleWeek,
  type SampleWeekCell,
} from "@/app/components/sample-week";

const cellClassName =
  "rounded-md border px-0.5 py-1 text-center text-xs font-medium leading-none whitespace-nowrap sm:px-1";

const cellTone: Record<SampleWeekCell, string> = {
  day: "border-sky-300 bg-sky-50 text-sky-950",
  rest: "border-zinc-300 bg-white text-zinc-700",
};

type SampleWeekProps = {
  dayCount: number;
  className?: string;
};

/** Typical spacing for the current day count. Training and rest cells both say what they are. */
export function SampleWeek({ dayCount, className }: SampleWeekProps) {
  const view = sampleWeek(dayCount);
  if (view.kind === "hidden") {
    return null;
  }

  return (
    <div className={className}>
      <h2 className="text-xs font-medium text-zinc-600">{SAMPLE_WEEK_HEADING}</h2>
      {view.kind === "longer" ? (
        <p className="mt-1 text-sm text-zinc-700">{view.message}</p>
      ) : (
        <>
          <ol className="mt-1 grid w-full max-w-lg grid-cols-7 gap-1">
            {view.cells.map((cell, index) => (
              <li key={`${cell}-${index}`} className={`${cellClassName} ${cellTone[cell]}`}>
                {cell === "day" ? SAMPLE_WEEK_DAY_LABEL : SAMPLE_WEEK_REST_LABEL}
              </li>
            ))}
          </ol>
          <p className="mt-1 text-xs text-zinc-600">{view.countLine}</p>
        </>
      )}
    </div>
  );
}
