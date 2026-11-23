import { SectionHeading } from "@/app/components/section-heading";
import { StatusBadge } from "@/app/components/status-badge";
import { overallLevelBadgeDescription, overallLevelBadgeTone } from "@/app/components/insight-rows";
import { overallLevelFacts, type OverallLevelFacts } from "@/app/components/overall-level-facts";
import { LEVEL_FIGURE_VIEW_BOX, levelFigure, markedOverallLevel } from "@/app/components/overall-level-figure";
import type { OverallLifterLevel } from "@/lib/exercise-progress-insights";
import type { ExrxLevel } from "@/lib/strength-standards";

type OverallLevelPanelProps = {
  overall: OverallLifterLevel | null;
  hint: string | null;
  facts: OverallLevelFacts;
  className?: string;
};

function LevelBody({ level }: { level: ExrxLevel }) {
  const figure = levelFigure(level);
  return (
    <svg viewBox={LEVEL_FIGURE_VIEW_BOX} className="h-44 w-auto" aria-hidden>
      <path d={figure.body} className="fill-sky-500 stroke-sky-950" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={figure.head} className="fill-sky-500 stroke-sky-950" strokeWidth="1.6" strokeLinejoin="round" />
      {figure.seams.map((seamPath) => (
        <path key={seamPath} d={seamPath} fill="none" className="stroke-sky-950" strokeWidth="1.1" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function OverallLevelPanel({ overall, hint, facts, className }: OverallLevelPanelProps) {
  const marked = markedOverallLevel(overall?.badge ?? null);
  const rows = overallLevelFacts(facts);
  return (
    <section
      className={["panel flex h-full min-w-0 flex-col gap-3 p-5", className].filter(Boolean).join(" ")}
      aria-labelledby="overall-level-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <SectionHeading id="overall-level-heading">Overall level</SectionHeading>
        {overall && marked == null ? (
          <StatusBadge tone={overallLevelBadgeTone(overall.badge)} description={overallLevelBadgeDescription(overall.badge)}>
            {overall.badge}
          </StatusBadge>
        ) : null}
      </div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        {marked ? (
          <div className="flex w-28 shrink-0 flex-col items-center">
            <LevelBody level={marked} />
            <span className="mt-1.5 text-sm font-medium text-zinc-950">{marked}</span>
          </div>
        ) : null}
        <dl className="grid grid-cols-[max-content_auto] items-baseline gap-x-6 gap-y-2 pt-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-zinc-600">{row.label}</dt>
              <dd className="font-medium text-zinc-950">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {overall?.meta ? <p className="text-sm text-zinc-800">{overall.meta}</p> : null}
      {!overall && hint ? <p className="max-w-prose text-sm leading-relaxed text-zinc-800">{hint}</p> : null}
    </section>
  );
}
