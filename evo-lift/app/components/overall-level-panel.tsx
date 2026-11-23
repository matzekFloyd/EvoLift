import Link from "next/link";
import { overallLevelFacts, type OverallLevelFacts } from "@/app/components/overall-level-facts";
import { LEVEL_FIGURE_VIEW_BOX, levelFigure, markedOverallLevel } from "@/app/components/overall-level-figure";
import { appPath } from "@/lib/app-paths";
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
    <svg viewBox={LEVEL_FIGURE_VIEW_BOX} className="h-36 w-auto sm:h-44" aria-hidden>
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
  const levelName = marked ?? overall?.badge ?? null;
  const rows = overallLevelFacts(facts);
  return (
    <section
      className={["panel flex h-full min-w-0 flex-col items-center justify-center gap-3 p-5", className].filter(Boolean).join(" ")}
      aria-label="Overall level"
    >
      <div className="flex items-center gap-x-5 sm:gap-x-8">
        {marked ? (
          <div className="shrink-0">
            <LevelBody level={marked} />
          </div>
        ) : null}
        <dl className="grid grid-cols-[max-content_auto] items-baseline gap-x-6 gap-y-2 text-sm">
          {levelName ? (
            <div className="contents">
              <dt className="text-zinc-600">Level</dt>
              <dd className="font-medium text-zinc-950">{levelName}</dd>
            </div>
          ) : null}
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-zinc-600">{row.label}</dt>
              <dd className={row.value ? "font-medium text-zinc-950" : undefined}>
                {row.value ? (
                  row.value
                ) : (
                  <Link
                    href={appPath("/account")}
                    className="font-medium text-sky-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                  >
                    Set in Settings
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {overall && marked == null ? (
        <p className="max-w-prose text-sm leading-relaxed text-zinc-800">{overall.detail}</p>
      ) : null}
      {!overall && hint ? <p className="max-w-prose text-sm leading-relaxed text-zinc-800">{hint}</p> : null}
    </section>
  );
}
