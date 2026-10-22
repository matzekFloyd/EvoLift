/**
 * What crawlers may index.
 * Signed-in screens live under `/app`. `/api/*` stays reachable for bearer auth.
 */

import { PUBLIC_PAGE_PATHS } from "@/lib/auth-route-access";
import { APP_HOME_PATH } from "@/lib/app-paths";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";

/** Prefixes crawlers must skip. `/app` covers Home and every signed-in screen. */
export const CRAWLER_DISALLOW_PATHS = [APP_HOME_PATH, "/api/"] as const;

/** Meta robots for the signed-in `/app` layout. Public pages stay indexable. */
export const signedInRobots = { index: false } as const;

export function crawlerRobots(): {
  rules: {
    userAgent: "*";
    allow: string[];
    disallow: string[];
  };
  sitemap: string;
} {
  return {
    rules: {
      userAgent: "*",
      allow: [...PUBLIC_PAGE_PATHS],
      disallow: [...CRAWLER_DISALLOW_PATHS],
    },
    sitemap: `${PUBLIC_APP_ORIGIN}/sitemap.xml`,
  };
}

/**
 * Absolute URLs for the public pages.
 * `/` is included because it is the marketing page, not a redirect to `/login`.
 */
export function publicSitemap(): Array<{ url: string }> {
  return PUBLIC_PAGE_PATHS.map((path) => ({
    url: path === "/" ? PUBLIC_APP_ORIGIN : `${PUBLIC_APP_ORIGIN}${path}`,
  }));
}
