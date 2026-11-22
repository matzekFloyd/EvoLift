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

function markerLabel(chartLabel: string) {
  return function MarkerLabel(props: {
    viewBox?: { x?: number; y?: number };
  }) {
    const x = props.viewBox?.x ?? 0;
    const y = (props.viewBox?.y ?? 0) + 11;
    const placeLeft = x > 88;
    return (
      <text
        x={placeLeft ? x - 4 : x + 4}
        y={y}
        textAnchor={placeLeft ? "end" : "start"}
        fill="#3f3f46"
        fontSize={10}
      >
        {chartLabel}
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
