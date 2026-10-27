import type { StatusBadgeTone } from "@/app/components/status-badge";
import { appPath } from "@/lib/app-paths";
import {
  progressReadLabel,
  type ExerciseProgressRow,
  type LiftBalanceNote,
  type ProgressRead,
} from "@/lib/exercise-progress-insights";

export type InsightRow = {
  id: string;
  /** Null when the page title already names the lift, so the row leads with the estimate. */
  title: string | null;
  /** Exercise badge beside the title. Null when the title is omitted or the note is not one lift. */
  slug: string | null;
  href: string | null;
  badge: string;
  badgeTone: StatusBadgeTone;
  badgeDescription: string;
  detail: string;
  /** When set, the words “ExRx table” in `detail` open this page. */
  tableHref: string | null;
  meta: string | null;
  /** Quieter than the latest-estimate line. Used for the rank on exercise detail. */
  quiet?: boolean;
};

export function progressReadBadgeTone(read: ProgressRead): StatusBadgeTone {
  switch (read) {
    case "ahead":
      return "success";
    case "on-track":
      return "info";
    case "room":
    case "down":
      return "warning";
    case "early":
      return "neutral";
  }
}

export function progressBadgeDescription(read: ProgressRead): string {
  switch (read) {
    case "ahead":
      return "Estimated 1RM rose faster than a steady coaching pace, over at least 3 sessions and 2 weeks.";
    case "on-track":
      return "Estimated 1RM is keeping up with a steady coaching pace, over at least 3 sessions and 2 weeks.";
    case "room":
      return "Estimated 1RM is behind a steady coaching pace, so more progress would be expected.";
    case "down":
      return "Estimated 1RM is at least 2.5 kg below the first session in this range.";
    case "early":
      return "Fewer than 3 sessions, or less than 2 weeks, so there is no pace yet.";
  }
}

export function comparisonBadgeDescription(note: LiftBalanceNote): string {
  if (note.badge === "Below usual") {
    return "This estimated 1RM sits outside the usual ratio to the other lift.";
  }
  if (note.badge === "Missing") {
    return "A usual mix includes this kind of exercise, and none of them appear in this range.";
  }
  if (note.badge === "Untrained") {
    return "Below the ExRx novice standard for your sex and bodyweight, ages 18–39.";
  }
  if (note.badge === "Novice" || note.badge === "Intermediate" || note.badge === "Advanced" || note.badge === "Elite") {
    return `${note.badge} is the highest ExRx standard this estimated 1RM meets for your sex and bodyweight, ages 18–39.`;
  }
  return "Compared with the ExRx standards for your sex and bodyweight, ages 18–39.";
}

export function comparisonBadgeTone(note: LiftBalanceNote): StatusBadgeTone {
  if (note.kind === "balance") {
    return "warning";
  }
  if (note.badge === "Advanced" || note.badge === "Elite") {
    return "success";
  }
  if (note.badge === "Intermediate" || note.badge === "Novice") {
    return "info";
  }
  return "neutral";
}

function progressMeta(row: ExerciseProgressRow): string | null {
  if (row.latestE1rmKg == null) {
    return null;
  }
  const change =
    row.changeKg != null && row.read !== "early"
      ? ` · ${row.changeKg > 0.05 ? "+" : ""}${row.changeKg.toFixed(1)} kg`
      : "";
  return `Latest est. 1RM ${row.latestE1rmKg.toFixed(1)} kg${change}`;
}

/** Splits a bold estimate line so the change can use an arrow instead of + or -. */
export function estimateChangeMark(
  meta: string,
): { lead: string; direction: "up" | "down"; amount: string } | null {
  const match = /^(.*) · ([+-])(\d+\.\d+ kg)$/.exec(meta);
  if (!match) {
    return null;
  }
  return {
    lead: match[1],
    direction: match[2] === "-" ? "down" : "up",
    amount: match[3],
  };
}

/** Drops the change and latest estimate already shown on the bold line. */
export function exerciseLeadDetail(detail: string, hasRank: boolean): string {
  if (!detail.includes("since the first session in this range")) {
    return detail;
  }
  if (hasRank) {
    return "";
  }
  const best = detail.match(/Best in this range was .+$/);
  return best ? best[0] : "";
}

/** Says the rank is the best in the selected range, not the latest estimate. */
export function bestInRangeMeta(meta: string): string {
  return meta.replace(/^Best est\. 1RM /, "Best in this range, ").replace(" · ", " at ");
}

export function progressInsightRow(
  row: ExerciseProgressRow,
  options?: { link?: boolean; omitTitle?: boolean },
): InsightRow {
  return {
    id: row.exerciseId,
    title: options?.omitTitle ? null : row.label,
    slug: options?.omitTitle ? null : row.slug,
    href: options?.link === false ? null : appPath(`/exercises/${row.slug}`),
    badge: progressReadLabel(row.read),
    badgeTone: progressReadBadgeTone(row.read),
    badgeDescription: progressBadgeDescription(row.read),
    detail: row.detail,
    tableHref: null,
    meta: progressMeta(row),
  };
}

export function comparisonInsightRow(
  note: LiftBalanceNote,
  options?: { link?: boolean; omitTitle?: boolean },
): InsightRow {
  return {
    id: note.id,
    title: options?.omitTitle ? null : note.title,
    slug: options?.omitTitle ? null : note.titleSlug,
    href: options?.link === false || !note.titleSlug ? null : appPath(`/exercises/${note.titleSlug}`),
    badge: note.badge,
    badgeTone: comparisonBadgeTone(note),
    badgeDescription: comparisonBadgeDescription(note),
    detail: note.detail,
    tableHref: note.tableHref,
    meta: note.meta,
  };
}

/** Rank on exercise detail. Neutral so the latest-estimate chip is the only colored status. */
export function exerciseDetailRankRow(note: LiftBalanceNote): InsightRow {
  const rank = comparisonInsightRow(note, { link: false, omitTitle: true });
  return {
    ...rank,
    quiet: true,
    badgeTone: "neutral",
    meta: rank.meta ? bestInRangeMeta(rank.meta) : rank.meta,
  };
}
