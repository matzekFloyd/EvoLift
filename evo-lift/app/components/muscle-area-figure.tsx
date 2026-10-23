"use client";

import { useId, type ReactNode } from "react";
import type { MuscleArea } from "@/lib/muscle-areas";
import {
  BODY_ELLIPSES,
  FRONT_MUSCLE_PATHS,
  MUSCLE_FIGURE_VIEW_BOX,
  REAR_MUSCLE_PATHS,
  muscleFigureRole,
  type MuscleEllipse,
  type MuscleFigureRole,
  type MuscleFigureSide,
} from "./muscle-area-figure-data";

type MuscleAreaFigureProps = {
  title: ReactNode;
  label: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  primary: MuscleArea;
  secondary: MuscleArea | null;
};

const LEGEND_TEXT = "max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-zinc-800";

function hatchId(raw: string): string {
  return `muscle-hatch-${raw.replace(/:/g, "")}`;
}

function HatchPattern({ id, size }: { id: string; size: number }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
      <rect width={size} height={size} className="fill-sky-100" />
      <path d={`M0 ${size} L${size} 0`} className="stroke-sky-700" strokeWidth={size > 6 ? 2.4 : 1.4} />
    </pattern>
  );
}

function regionPaint(role: MuscleFigureRole, pattern: string): { className: string; fill?: string } {
  if (role === "primary") {
    return { className: "fill-sky-600 stroke-sky-800" };
  }
  if (role === "secondary") {
    return { className: "stroke-sky-700", fill: `url(#${pattern})` };
  }
  return { className: "fill-white stroke-zinc-500" };
}

function BodySvg({
  side,
  muscles,
  primary,
  secondary,
}: {
  side: MuscleFigureSide;
  muscles: readonly MuscleEllipse[];
  primary: MuscleArea;
  secondary: MuscleArea | null;
}) {
  const pattern = hatchId(useId());
  const tagged = { primary, secondary };
  const needsHatch = muscles.some((shape) => muscleFigureRole(shape.area, tagged) === "secondary");

  return (
    <svg viewBox={MUSCLE_FIGURE_VIEW_BOX} className="h-16 w-auto" aria-hidden>
      {needsHatch ? (
        <defs>
          <HatchPattern id={pattern} size={8} />
        </defs>
      ) : null}
      {BODY_ELLIPSES.map((shape) => (
        <ellipse
          key={`${shape.cx}-${shape.cy}-${shape.rx}`}
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          className="fill-white stroke-zinc-500"
          strokeWidth="3"
        />
      ))}
      {muscles.map((shape) => {
        const paint = regionPaint(muscleFigureRole(shape.area, tagged), pattern);
        return (
          <ellipse
            key={`${shape.area}-${shape.cx}-${shape.cy}`}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            className={paint.className}
            fill={paint.fill}
            strokeWidth="3"
          />
        );
      })}
      {side === "front" ? (
        <path d="M60 22 v8" className="fill-none stroke-zinc-500" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path
          d="M60 62 v48"
          className={
            muscleFigureRole("back", tagged) === "rest" ? "fill-none stroke-zinc-500" : "fill-none stroke-white"
          }
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function MuscleSwatch({ role }: { role: "primary" | "secondary" }) {
  const pattern = hatchId(useId());
  const paint = regionPaint(role, pattern);
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 shrink-0">
      {role === "secondary" ? (
        <defs>
          <HatchPattern id={pattern} size={4} />
        </defs>
      ) : null}
      <rect
        x="0.6"
        y="0.6"
        width="10.8"
        height="10.8"
        rx="1.5"
        className={paint.className}
        fill={paint.fill}
        strokeWidth="1"
      />
    </svg>
  );
}

function MuscleLegend({
  label,
  primaryLabel,
  secondaryLabel,
  className,
}: {
  label: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  className: string;
}) {
  return (
    <p className={className}>
      <span className="text-zinc-600">{label}</span>
      <span className="inline-flex items-center gap-1.5">
        <MuscleSwatch role="primary" />
        <span className="font-medium">{primaryLabel}</span>
      </span>
      {secondaryLabel ? (
        <span className="inline-flex items-center gap-1.5">
          <MuscleSwatch role="secondary" />
          <span className="sr-only">Secondary</span>
          <span className="font-medium">{secondaryLabel}</span>
        </span>
      ) : null}
    </p>
  );
}

function MuscleBodies({
  primary,
  secondary,
}: {
  primary: MuscleArea;
  secondary: MuscleArea | null;
}) {
  return (
    <div className="flex shrink-0 items-end gap-2">
      <div className="flex flex-col items-center">
        <BodySvg side="front" muscles={FRONT_MUSCLE_PATHS} primary={primary} secondary={secondary} />
        <span className="text-[11px] leading-none text-zinc-600">Front</span>
      </div>
      <div className="flex flex-col items-center">
        <BodySvg side="rear" muscles={REAR_MUSCLE_PATHS} primary={primary} secondary={secondary} />
        <span className="text-[11px] leading-none text-zinc-600">Rear</span>
      </div>
    </div>
  );
}

/** Front and rear body, with the catalog primary filled and the secondary striped. */
export function MuscleAreaFigure({
  title,
  label,
  primaryLabel,
  secondaryLabel,
  primary,
  secondary,
}: MuscleAreaFigureProps) {
  return (
    <div className="@container">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @min-[40rem]:flex-nowrap @min-[40rem]:gap-x-4">
        <div className="@max-[18rem]:contents flex max-w-full shrink-0 grow basis-[max-content] flex-col items-start gap-1 @min-[40rem]:contents">
          <div className="max-w-full @max-[18rem]:basis-full @min-[40rem]:shrink-0">{title}</div>
          <MuscleLegend
            label={label}
            primaryLabel={primaryLabel}
            secondaryLabel={secondaryLabel}
            className={`flex min-w-0 @max-[18rem]:flex-1 @min-[18rem]:w-0 @min-[18rem]:min-w-full ${LEGEND_TEXT} @min-[40rem]:hidden`}
          />
        </div>
        <div className="shrink-0 @min-[40rem]:order-2">
          <MuscleBodies primary={primary} secondary={secondary} />
        </div>
        <MuscleLegend
          label={label}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
          className={`hidden ${LEGEND_TEXT} @min-[40rem]:order-1 @min-[40rem]:ml-auto @min-[40rem]:flex`}
        />
      </div>
    </div>
  );
}
