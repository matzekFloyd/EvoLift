"use client";

import type { ComponentProps } from "react";
import { ResponsiveContainer } from "recharts";

type ChartResponsiveContainerProps = ComponentProps<typeof ResponsiveContainer>;

/**
 * Recharts 3 defaults `initialDimension` to -1×-1, which logs a console warning on the
 * first paint before ResizeObserver runs. Seed a positive size; the container still
 * measures the parent on mount.
 */
export function ChartResponsiveContainer({
  children,
  width = "100%",
  height = "100%",
  initialDimension = { width: 320, height: 200 },
  ...rest
}: ChartResponsiveContainerProps) {
  return (
    <ResponsiveContainer
      width={width}
      height={height}
      initialDimension={initialDimension}
      {...rest}
    >
      {children}
    </ResponsiveContainer>
  );
}
