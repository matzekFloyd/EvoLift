import type { Metadata } from "next";
import { AUTH_REGISTER_PATH } from "@/lib/auth-email-redirect";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import { publicPageMetadata } from "@/lib/public-page-metadata";

/** Offer. One line. The subhead says it is quick. */
export const PUBLIC_HOME_HEADING_LINES = ["Log the load and the reps..."] as const;

export const PUBLIC_HOME_HEADING = PUBLIC_HOME_HEADING_LINES.join(" ");

/** Why the entry is convenient during a session. */
export const PUBLIC_HOME_SUBHEAD = "Quick to write down while you train.";

/** Footnote for the asterisk inside Start lifting. Right side of the footer. */
export const PUBLIC_HOME_FREE_LINE = "EvoLift is free.";

export const PUBLIC_HOME_CTA_LABEL = "Start lifting";
export const PUBLIC_HOME_CTA_HREF = AUTH_REGISTER_PATH;

export const PUBLIC_HOME_TERMS_LABEL = "Terms of use";
export const PUBLIC_HOME_PRIVACY_LABEL = "Privacy policy";
export const PUBLIC_HOME_LEGAL_LABEL = "Legal notice";

export const PUBLIC_HOME_EXAMPLE = {
  caption: "Example",
  exercise: "Barbell Bench Press",
  set: "Set 1",
  loadLabel: "Loaded (kg)",
  load: "82.5",
  repsLabel: "Reps",
  reps: "5 reps",
  earlier: [
    { date: "3 Mar", load: "77.5" },
    { date: "21 Mar", load: "80" },
    { date: "9 Apr", load: "82.5" },
  ],
} as const;

/** Plan and Insights. The bench card above is the log. */
export const PUBLIC_HOME_AREAS = [
  {
    title: "Plan",
    detail: "Set the week up once. Open it on training day and work through the session you planned.",
  },
  {
    title: "Insights",
    detail: "Look through the loads and reps you logged. The numbers show how each lift is moving.",
  },
] as const;

/** Named lifts beside the Exercise progress donut. Their reads are in the pace mix. */
export const PUBLIC_HOME_INSIGHTS_LIFTS = [
  { exercise: PUBLIC_HOME_EXAMPLE.exercise, read: "ahead" },
  { exercise: "Barbell Deadlift", read: "room" },
] as const;

/** The bench from the hero, placed in the pace mix. */
export const PUBLIC_HOME_INSIGHTS_LIFT = PUBLIC_HOME_INSIGHTS_LIFTS[0];

/** The Upper / Lower starter plan. The figure paints that plan's muscle areas. */
export const PUBLIC_HOME_PLAN_EXAMPLE = {
  caption: "Example",
  name: "Upper / Lower",
} as const;

/** Example pace mix for the Exercise progress donut. Labels come from the app. */
export const PUBLIC_HOME_INSIGHTS_PACE = [
  "room",
  "on-track",
  "on-track",
  "ahead",
  "ahead",
  "ahead",
  "ahead",
  "early",
] as const;

/** Concrete close above the second button. */
export const PUBLIC_HOME_CLOSE_LINES = ["...keep your plan and your pace."] as const;

/** Search and share text. The heading trails off, so this stays a finished sentence. */
export const PUBLIC_HOME_DESCRIPTION = PUBLIC_HOME_SUBHEAD;

/** Search snippet and matching share text for the public origin. */
export const publicHomeMetadata: Metadata = publicPageMetadata({
  title: APP_DOCUMENT_TITLE,
  description: PUBLIC_HOME_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});
