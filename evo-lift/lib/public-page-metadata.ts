import type { Metadata } from "next";
import { PUBLIC_PAGE_PATHS } from "@/lib/auth-route-access";
import { APP_DOCUMENT_TITLE, formatDocumentTitle } from "@/lib/page-title";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";

export type PublicPagePath = (typeof PUBLIC_PAGE_PATHS)[number];

/** Absolute canonical URL on the public origin. `/` has no trailing slash. */
export function publicCanonicalUrl(path: PublicPagePath): string {
  return path === "/" ? PUBLIC_APP_ORIGIN : `${PUBLIC_APP_ORIGIN}${path}`;
}

type PublicPageMetadataInput = {
  title: string;
  description: string;
  path: PublicPagePath;
  /** Document title is exactly `title`. The root template would prefix the product name again. */
  absoluteTitle?: boolean;
};

/**
 * Search title, description, canonical URL, and the same words for Open Graph.
 * There is no share image. The app icon is not one.
 */
export function publicPageMetadata(input: PublicPageMetadataInput): Metadata {
  const canonical = publicCanonicalUrl(input.path);
  const socialTitle = input.absoluteTitle ? input.title : formatDocumentTitle(input.title);

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description: input.description,
      url: canonical,
      siteName: APP_DOCUMENT_TITLE,
      type: "website",
    },
  };
}

export const loginMetadata: Metadata = publicPageMetadata({
  title: "Log in",
  description: "Log in to your EvoLift account.",
  path: "/login",
});

export const glossaryMetadata: Metadata = publicPageMetadata({
  title: "Glossary",
  description: "Definitions for the words EvoLift uses.",
  path: "/glossary",
});

export const privacyMetadata: Metadata = publicPageMetadata({
  title: "Privacy policy",
  description: "What EvoLift stores for an account, and how to delete it.",
  path: "/privacy",
});

export const termsMetadata: Metadata = publicPageMetadata({
  title: "Terms of use",
  description: "Terms for using EvoLift accounts, the app, and personal API tokens.",
  path: "/terms",
});
