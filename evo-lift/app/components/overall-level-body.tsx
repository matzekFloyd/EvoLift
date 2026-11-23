import { LEVEL_FIGURE_VIEW_BOX, levelFigure } from "@/app/components/overall-level-figure";
import type { ExrxLevel } from "@/lib/strength-standards";

type OverallLevelBodyProps = {
  level: ExrxLevel;
  className?: string;
};

/** Decorative body for one ExRx level. The level name stays in text beside it. */
export function OverallLevelBody({ level, className }: OverallLevelBodyProps) {
  const figure = levelFigure(level);
  return (
    <svg
      viewBox={LEVEL_FIGURE_VIEW_BOX}
      className={["h-36 w-auto", className].filter(Boolean).join(" ")}
      aria-hidden
    >
      <path d={figure.body} className="fill-sky-500 stroke-sky-950" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={figure.head} className="fill-sky-500 stroke-sky-950" strokeWidth="1.6" strokeLinejoin="round" />
      {figure.seams.map((seamPath) => (
        <path key={seamPath} d={seamPath} fill="none" className="stroke-sky-950" strokeWidth="1.1" strokeLinecap="round" />
      ))}
    </svg>
  );
}
