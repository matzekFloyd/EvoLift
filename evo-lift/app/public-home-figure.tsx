import { ExerciseProgressPaceChart } from "@/app/components/chart-dynamic";
import { exerciseProgressPaceBuckets } from "@/app/components/exercise-progress-pace";
import { progressBadgeDescription, progressReadBadgeTone } from "@/app/components/insight-rows";
import { MuscleAreaCoverageBodies } from "@/app/components/muscle-area-figure";
import { SampleWeek } from "@/app/components/sample-week-row";
import { StatusBadge } from "@/app/components/status-badge";
import { progressReadLabel } from "@/lib/exercise-progress-insights";
import { muscleAreaCoverage } from "@/lib/muscle-area-coverage";
import { STARTER_PLANS } from "@/lib/starter-plans";
import {
  PUBLIC_HOME_EXAMPLE,
  PUBLIC_HOME_INSIGHTS_LIFTS,
  PUBLIC_HOME_INSIGHTS_PACE,
  PUBLIC_HOME_PLAN_EXAMPLE,
} from "@/app/public-home";

const tracePoints = [
  { x: 64, y: 228 },
  { x: 200, y: 206 },
  { x: 336, y: 184 },
] as const;

const tracePath = `M ${tracePoints.map((point) => `${point.x} ${point.y}`).join(" L ")}`;

const exampleTitle = `Example. ${PUBLIC_HOME_EXAMPLE.exercise}, ${PUBLIC_HOME_EXAMPLE.load} kilograms for ${PUBLIC_HOME_EXAMPLE.reps}. Earlier loads were ${PUBLIC_HOME_EXAMPLE.earlier.map((point) => `${point.load} on ${point.date}`).join(", ")}.`;

/**
 * The plate mark, large enough to hold one set, with the loads that came before it.
 * The bar, the plates, and the line draw once. Reduced motion shows the finished picture.
 */
export function PublicHomeFigure() {
  return (
    <figure className="panel mx-auto w-full max-w-md px-4 py-4 text-center lg:text-left">
      <svg viewBox="0 0 400 280" role="img" className="public-home-figure h-auto w-full">
        <title>{exampleTitle}</title>
        <text x="20" y="28" fill="#52525b" fontSize="14">
          {PUBLIC_HOME_EXAMPLE.caption}
        </text>
        <text x="20" y="58" fill="#18181b" fontSize="20" fontWeight="600">
          {PUBLIC_HOME_EXAMPLE.exercise}
        </text>
        <text x="20" y="86" fill="#52525b" fontSize="14">
          {PUBLIC_HOME_EXAMPLE.set}
        </text>
        <text x="78" y="86" fill="#52525b" fontSize="14">
          {PUBLIC_HOME_EXAMPLE.reps}
        </text>
        <text
          x="380"
          y="84"
          fill="#18181b"
          fontSize="32"
          fontWeight="600"
          textAnchor="end"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {PUBLIC_HOME_EXAMPLE.load}
        </text>
        <g className="public-home-plates">
          <rect x="28" y="104" width="16" height="36" rx="3" fill="#7dd3fc" />
          <rect x="48" y="94" width="22" height="56" rx="4" fill="#38bdf8" />
          <rect x="330" y="94" width="22" height="56" rx="4" fill="#38bdf8" />
          <rect x="356" y="104" width="16" height="36" rx="3" fill="#7dd3fc" />
        </g>
        <rect className="public-home-shaft" x="58" y="116" width="284" height="12" rx="3" fill="#0c4a6e" />
        <text x="20" y="176" fill="#52525b" fontSize="12">
          {PUBLIC_HOME_EXAMPLE.loadLabel}
        </text>
        <path
          className="public-home-trace"
          d={tracePath}
          fill="none"
          stroke="#0369a1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {tracePoints.map((point) => (
          <circle key={`${point.x}-${point.y}`} className="public-home-dot" cx={point.x} cy={point.y} r="5" fill="#0369a1" />
        ))}
        {PUBLIC_HOME_EXAMPLE.earlier.map((point, index) => (
          <g key={point.date}>
            <text
              x={tracePoints[index].x}
              y="252"
              fill="#52525b"
              fontSize="12"
              textAnchor="middle"
            >
              {point.date}
            </text>
            <text
              x={tracePoints[index].x}
              y="270"
              fill="#18181b"
              fontSize="14"
              fontWeight="600"
              textAnchor="middle"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {point.load}
            </text>
          </g>
        ))}
      </svg>
      <style>{`
        .public-home-figure {
          font-family: inherit;
        }
        @media (prefers-reduced-motion: no-preference) {
          .public-home-shaft {
            transform-box: fill-box;
            transform-origin: center;
            animation: public-home-shaft 640ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .public-home-plates {
            transform-box: fill-box;
            transform-origin: center;
            animation: public-home-plates 500ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both;
          }
          .public-home-trace {
            stroke-dasharray: 400;
            animation: public-home-trace 700ms cubic-bezier(0.22, 1, 0.36, 1) 360ms both;
          }
          .public-home-dot {
            animation: public-home-plates 400ms cubic-bezier(0.22, 1, 0.36, 1) 720ms both;
          }
        }
        @keyframes public-home-shaft {
          from { transform: scaleX(0.15); }
        }
        @keyframes public-home-plates {
          from { opacity: 0; }
        }
        @keyframes public-home-trace {
          from { stroke-dashoffset: 400; }
        }
      `}</style>
    </figure>
  );
}

const examplePanelClassName = "panel mx-auto w-full max-w-md px-4 py-4 text-center lg:text-left";

/** Matches the bench graphic: 20 units of inset in a 400-wide view, and the title under Example. */
const exampleChartInsetClassName = "px-[5%] pt-[3.35%] text-left";
const exampleChartCaptionClassName = "text-sm leading-none text-zinc-600";
const exampleChartTitleClassName = "mt-[2.4%] text-xl font-semibold leading-none text-zinc-900";

/** Muscle areas covered by the Upper / Lower starter plan. */
export function PublicHomePlanExample() {
  const plan = STARTER_PLANS.find((item) => item.name === PUBLIC_HOME_PLAN_EXAMPLE.name);
  const slugs = plan?.days.flatMap((day) => day.exercises.map((item) => item.slug)) ?? [];
  const coverage = muscleAreaCoverage(slugs);

  return (
    <figure className={examplePanelClassName}>
      <div className={exampleChartInsetClassName}>
        <figcaption className={exampleChartCaptionClassName}>{PUBLIC_HOME_PLAN_EXAMPLE.caption}</figcaption>
        <p className={exampleChartTitleClassName}>{PUBLIC_HOME_PLAN_EXAMPLE.name}</p>
        <div className="mt-4 flex items-center justify-center gap-6">
          <SampleWeek dayCount={plan?.days.length ?? 0} stacked />
          <MuscleAreaCoverageBodies areas={coverage.areas} />
        </div>
      </div>
    </figure>
  );
}

/** The same bench, marked on the Exercise progress donut. */
export function PublicHomeInsightsExample() {
  const buckets = exerciseProgressPaceBuckets(
    PUBLIC_HOME_INSIGHTS_PACE.map((read) => ({ read })),
  );

  return (
    <figure className={examplePanelClassName}>
      <div className={exampleChartInsetClassName}>
        <figcaption className={exampleChartCaptionClassName}>{PUBLIC_HOME_EXAMPLE.caption}</figcaption>
        <p className={exampleChartTitleClassName}>Exercise progress</p>
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <ul className="flex min-w-0 flex-col gap-4 text-left">
            {PUBLIC_HOME_INSIGHTS_LIFTS.map((lift) => (
              <li key={lift.exercise}>
                <p className="font-medium text-zinc-900">{lift.exercise}</p>
                <div className="mt-2">
                  <StatusBadge
                    tone={progressReadBadgeTone(lift.read)}
                    description={progressBadgeDescription(lift.read)}
                  >
                    {progressReadLabel(lift.read)}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
          <div className="shrink-0 sm:ml-auto">
            <ExerciseProgressPaceChart buckets={buckets} />
          </div>
        </div>
      </div>
    </figure>
  );
}
