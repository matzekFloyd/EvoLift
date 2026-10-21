import type { Metadata } from "next";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";

/** One-line product statement. Also the search description for the public origin. */
export const PUBLIC_HOME_HEADING = "Log workouts, plans, and progress.";

export const PUBLIC_HOME_CTA_LABEL = "Start lifting";
export const PUBLIC_HOME_CTA_HREF = "/login";

export const PUBLIC_HOME_TERMS_LABEL = "Terms of use";
export const PUBLIC_HOME_PRIVACY_LABEL = "Privacy policy";

/** Search snippet for the public origin. Shared Open Graph metadata is separate. */
export const publicHomeMetadata: Metadata = {
  title: { absolute: APP_DOCUMENT_TITLE },
  description: PUBLIC_HOME_HEADING,
  alternates: {
    canonical: PUBLIC_APP_ORIGIN,
  },
};
