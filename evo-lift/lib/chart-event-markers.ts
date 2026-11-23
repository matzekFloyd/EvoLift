import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatDateToYyyyMmDd } from "@/lib/session-date";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHART_LABEL_MAX = 22;

export type ChartEventKind = "plan-switch" | "deload";

/** A dated mark to draw on a progress chart. Deload dates are unused until deloads are stored. */
export type ChartEvent = {
  on: string;
  kind: ChartEventKind;
  label: string;
};

export type ChartEventMarker = {
  x: string;
  labels: string[];
  chartLabel: string;
  kinds: ChartEventKind[];
};

export function planSwitchEvent(activatedOn: string, planName: string): ChartEvent {
  return {
    on: activatedOn.slice(0, 10),
    kind: "plan-switch",
    label: `Plan: ${planName}`,
  };
}

export function deloadEvent(on: string): ChartEvent {
  return { on: on.slice(0, 10), kind: "deload", label: "Deload" };
}

function calendarDay(value: string): string {
  return value.slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function shortenChartLabel(label: string): string {
  if (label.length <= CHART_LABEL_MAX) {
    return label;
  }
  return `${label.slice(0, CHART_LABEL_MAX - 1)}…`;
}

function indexForEvent(
  points: readonly { date: string }[],
  eventOn: string,
  spanDays: number,
): number {
  if (points.length === 0 || !DATE_RE.test(eventOn)) {
    return -1;
  }
  if (spanDays > 1) {
    return points.findIndex((point) => {
      const start = calendarDay(point.date);
      if (!DATE_RE.test(start)) {
        return false;
      }
      return start <= eventOn && addDays(start, spanDays) > eventOn;
    });
  }
  const first = calendarDay(points[0]?.date ?? "");
  if (!DATE_RE.test(first) || eventOn < first) {
    return -1;
  }
  return points.findIndex((point) => DATE_RE.test(calendarDay(point.date)) && calendarDay(point.date) >= eventOn);
}

/**
 * Place events on chart categories.
 * Session points (spanDays 1) use the first point on or after the date, inside the series.
 * Week points (spanDays 7) use the week that contains the date.
 * Points must already be in chart order.
 */
export function placeChartEvents(
  points: readonly { date: string; x: string }[],
  events: readonly ChartEvent[],
  options?: { spanDays?: number },
): ChartEventMarker[] {
  const spanDays = options?.spanDays ?? 1;
  const grouped = new Map<string, { labels: string[]; kinds: ChartEventKind[]; order: number }>();
  const sorted = [...events].sort(
    (a, b) => a.on.localeCompare(b.on) || a.label.localeCompare(b.label),
  );

  for (const event of sorted) {
    const index = indexForEvent(points, calendarDay(event.on), spanDays);
    if (index < 0) {
      continue;
    }
    const point = points[index];
    if (!point) {
      continue;
    }
    const current = grouped.get(point.x) ?? { labels: [], kinds: [], order: index };
    if (!current.labels.includes(event.label)) {
      current.labels.push(event.label);
    }
    if (!current.kinds.includes(event.kind)) {
      current.kinds.push(event.kind);
    }
    grouped.set(point.x, current);
  }

  return [...grouped.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([x, value]) => ({
      x,
      labels: value.labels,
      chartLabel: shortenChartLabel(value.labels.join(" · ")),
      kinds: value.kinds,
    }));
}

export function sessionChartMarkers(
  points: readonly { performedOn: string; xTickLabel: string }[],
  events: readonly ChartEvent[],
): ChartEventMarker[] {
  return placeChartEvents(
    points.map((point) => ({ date: point.performedOn, x: point.xTickLabel })),
    events,
  );
}

export function weekChartMarkers(
  points: readonly { weekStart: string }[],
  events: readonly ChartEvent[],
): ChartEventMarker[] {
  return placeChartEvents(
    points.map((point) => ({ date: point.weekStart, x: point.weekStart })),
    events,
    { spanDays: 7 },
  );
}

export function chartEventLabelsAt(markers: readonly ChartEventMarker[], x: string): string[] {
  return markers.find((marker) => marker.x === x)?.labels ?? [];
}

/** Plan activation dates for progress-chart markers. Deloads are not stored yet. */
export async function loadPlanSwitchEvents(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ChartEvent[]> {
  const [activations, plans] = await Promise.all([
    client
      .from("workout_plan_activations")
      .select("plan_id, activated_at")
      .eq("user_id", userId)
      .order("activated_at", { ascending: true }),
    client.from("workout_plans").select("id, name").eq("user_id", userId),
  ]);
  if (activations.error || plans.error) {
    throw new Error("Could not load plan history.");
  }

  const nameById = new Map((plans.data ?? []).map((plan) => [plan.id, plan.name]));
  const events: ChartEvent[] = [];
  for (const row of activations.data ?? []) {
    const name = nameById.get(row.plan_id);
    if (!name) {
      continue;
    }
    events.push(planSwitchEvent(formatDateToYyyyMmDd(new Date(row.activated_at)), name));
  }
  return events;
}
