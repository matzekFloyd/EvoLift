import { ReferenceLine } from "recharts";
import type { ChartEventMarker } from "@/lib/chart-event-markers";

const MARKER_SWATCH = "h-px w-4 border-t-2 border-dashed border-zinc-500";

export function chartEventLegendItems(markers: readonly ChartEventMarker[]): Array<{
  key: string;
  label: string;
  swatchClassName: string;
}> {
  const items: Array<{ key: string; label: string; swatchClassName: string }> = [];
  if (markers.some((marker) => marker.kinds.includes("plan-switch"))) {
    items.push({ key: "plan-switch", label: "Plan switch", swatchClassName: MARKER_SWATCH });
  }
  if (markers.some((marker) => marker.kinds.includes("deload"))) {
    items.push({ key: "deload", label: "Deload", swatchClassName: MARKER_SWATCH });
  }
  return items;
}

export function ChartEventNotes({ labels }: { labels: readonly string[] }) {
  if (labels.length === 0) {
    return null;
  }
  return labels.map((label) => (
    <p key={label} className="text-zinc-800">
      {label}
    </p>
  ));
}

/** The legend already says Plan switch. The chart shows the plan name in the margin. */
function marginLabel(chartLabel: string): string {
  return chartLabel.replace(/^Plan: /, "");
}

function markerLabel(chartLabel: string) {
  const label = marginLabel(chartLabel);
  return function MarkerLabel(props: {
    viewBox?: { x?: number; y?: number };
  }) {
    const x = props.viewBox?.x ?? 0;
    const y = props.viewBox?.y ?? 0;
    const placeLeft = x > 96;
    return (
      <text
        x={placeLeft ? x - 6 : x + 6}
        y={Math.max(y - 6, 11)}
        textAnchor={placeLeft ? "end" : "start"}
        fill="#52525b"
        fontSize={11}
      >
        {label}
      </text>
    );
  };
}

/** Direct ReferenceLine elements. Recharts ignores a wrapper component. */
export function chartEventReferenceLines(markers: readonly ChartEventMarker[]) {
  return markers.map((marker) => (
    <ReferenceLine
      key={marker.x}
      x={marker.x}
      stroke="#71717a"
      strokeDasharray="4 3"
      label={markerLabel(marker.chartLabel)}
    />
  ));
}
