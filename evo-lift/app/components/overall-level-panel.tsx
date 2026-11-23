import Link from "next/link";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusBadge } from "@/app/components/status-badge";
import { overallLevelBadgeDescription, overallLevelBadgeTone } from "@/app/components/insight-rows";
import {
  LEVEL_BODY_LEVELS,
  LEVEL_FIGURE_VIEW_BOX,
  levelFigure,
  markedOverallLevel,
} from "@/app/components/overall-level-figure";
import { appPath } from "@/lib/app-paths";
import type { OverallLifterLevel } from "@/lib/exercise-progress-insights";
import type { ExrxLevel } from "@/lib/strength-standards";

type OverallLevelPanelProps = {
  overall: OverallLifterLevel | null;
  hint: string | null;
};

function LevelBody({ level, marked }: { level: ExrxLevel; marked: boolean }) {
  const figure = levelFigure(level);
  const muscle = marked ? "fill-sky-500 stroke-sky-950" : "fill-white stroke-zinc-500";
  const seam = marked ? "stroke-sky-950" : "stroke-zinc-500";
  return (
    <svg viewBox={LEVEL_FIGURE_VIEW_BOX} className="h-44 w-auto" aria-hidden>
      <path d={figure.body} className={muscle} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={figure.head} className={muscle} strokeWidth="1.6" strokeLinejoin="round" />
      {figure.seams.map((seamPath) => (
        <path key={seamPath} d={seamPath} fill="none" className={seam} strokeWidth="1.1" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function OverallLevelPanel({ overall, hint }: OverallLevelPanelProps) {
  const marked = markedOverallLevel(overall?.badge ?? null);
  const note = overall?.detail ?? hint ?? "Log the four main barbell lifts to see an overall level.";
  return (
    <section className="panel flex min-w-0 flex-col gap-3 p-5" aria-labelledby="overall-level-heading">
      <div className="flex items-start justify-between gap-3">
        <SectionHeading id="overall-level-heading">Overall level</SectionHeading>
        {overall && marked == null ? (
          <StatusBadge tone={overallLevelBadgeTone(overall.badge)} description={overallLevelBadgeDescription(overall.badge)}>
            {overall.badge}
          </StatusBadge>
        ) : null}
      </div>
      <ul aria-label="ExRx levels from lowest to highest" className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-5 sm:gap-x-2">
        {LEVEL_BODY_LEVELS.map((level) => {
          const current = level === marked;
          return (
            <li key={level} aria-current={current ? "true" : undefined} className="flex min-w-0 flex-col items-center">
              <div className="flex h-44 items-end justify-center">
                <LevelBody level={level} marked={current} />
              </div>
              <span
                className={[
                  "mt-1.5 max-w-full text-center text-[11px] leading-tight sm:text-xs",
                  current ? "font-medium text-zinc-950" : "text-zinc-600",
                ].join(" ")}
              >
                {level}
              </span>
            </li>
          );
        })}
      </ul>
      {overall?.meta ? <p className="text-sm text-zinc-800">{overall.meta}</p> : null}
      <p className="max-w-prose text-sm leading-relaxed text-zinc-800">
        {note}{" "}
        <Link href={appPath("/insights")} className="font-medium text-sky-800 underline-offset-2 hover:underline">
          Open Insights
        </Link>{" "}
        for each lift.
      </p>
    </section>
  );
}
