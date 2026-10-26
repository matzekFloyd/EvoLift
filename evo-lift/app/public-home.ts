import type { Metadata } from "next";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import { publicPageMetadata } from "@/lib/public-page-metadata";

/** Offer sentence. Also the search description for the public origin. */
export const PUBLIC_HOME_HEADING = "Log each set before the next one starts.";

/** Expectation under the offer. Not a second action. */
export const PUBLIC_HOME_ACCOUNT_NOTE = "Create an account. There is no charge.";

export const PUBLIC_HOME_CTA_LABEL = "Start lifting";
export const PUBLIC_HOME_CTA_HREF = "/login";

export const PUBLIC_HOME_TERMS_LABEL = "Terms of use";
export const PUBLIC_HOME_PRIVACY_LABEL = "Privacy policy";

/** Search snippet and matching share text for the public origin. */
export const publicHomeMetadata: Metadata = publicPageMetadata({
  title: APP_DOCUMENT_TITLE,
  description: PUBLIC_HOME_HEADING,
  path: "/",
  absoluteTitle: true,
});
