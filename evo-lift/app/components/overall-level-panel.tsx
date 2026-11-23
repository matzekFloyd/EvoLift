import Link from "next/link";
import { overallLevelFacts, type OverallLevelFacts } from "@/app/components/overall-level-facts";
import { markedOverallLevel } from "@/app/components/overall-level-figure";
import { OverallLevelBody } from "@/app/components/overall-level-body";
import { OverallLevelProgressBar } from "@/app/components/overall-level-progress-bar";
import { StrengthStandardsSource } from "@/app/components/strength-standards-source";
import { insightsLevelDetailsHref } from "@/app/insights/insights-presets";
import { actionLinkClassName } from "@/app/components/inline-link-class";
import { appPath } from "@/lib/app-paths";
import type { OverallLifterLevel } from "@/lib/exercise-progress-insights";

type OverallLevelPanelProps = {
  overall: OverallLifterLevel | null;
  hint: string | null;
  facts: OverallLevelFacts;
  className?: string;
};

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
            <OverallLevelBody level={marked} className="sm:h-44" />
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
      {overall ? <OverallLevelProgressBar progress={overall.progress} /> : null}
      {overall?.source ? <StrengthStandardsSource source={overall.source} /> : null}
      {overall ? (
        <Link href={insightsLevelDetailsHref()} className={actionLinkClassName}>
          Level details
        </Link>
      ) : null}
      {!overall && hint ? <p className="max-w-prose text-sm leading-relaxed text-zinc-800">{hint}</p> : null}
    </section>
  );
}
