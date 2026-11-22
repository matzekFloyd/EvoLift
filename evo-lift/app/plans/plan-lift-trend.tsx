import { ChangeMark } from "@/app/components/change-mark";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { planLiftsQuietText, type PlanInsightLift } from "@/lib/plan-insights";

function PlanLiftTrend({ lift }: { lift: PlanInsightLift }) {
  const direction =
    lift.changeKg == null ? null : lift.changeKg > 0 ? "up" : lift.changeKg < 0 ? "down" : "unchanged";
  const amount = lift.changeKg == null ? null : `${Math.abs(lift.changeKg).toFixed(1)} kg`;
  const single = lift.points.length === 1 ? lift.points[0] : null;

  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-zinc-200 py-1.5">
      <span className="text-sm text-zinc-800">{lift.label}</span>
      <span className="text-right text-sm font-medium tabular-nums text-zinc-900">
        {single ? `${lift.summary} on ${formatDateOnlyForLocale(single.performedOn)}` : lift.summary}
        {direction && amount ? (
          <>
            {" "}
            <ChangeMark
              direction={direction}
              amount={amount}
              label={direction === "down" ? "Down" : direction === "up" ? "Up" : "Unchanged"}
            />
          </>
        ) : null}
      </span>
    </li>
  );
}

export function PlanLiftTrends({ lifts }: { lifts: PlanInsightLift[] }) {
  const plotted = lifts.filter((lift) => lift.points.length > 0);
  const quiet = planLiftsQuietText(lifts);
  if (plotted.length === 0) {
    return quiet ? <p className="mt-3 text-sm text-zinc-600">{quiet}</p> : null;
  }
  return (
    <>
      <ul className="mt-3">
        {plotted.map((lift) => (
          <PlanLiftTrend key={lift.slug} lift={lift} />
        ))}
      </ul>
      {quiet ? <p className="mt-3 text-sm text-zinc-600">{quiet}</p> : null}
    </>
  );
}
