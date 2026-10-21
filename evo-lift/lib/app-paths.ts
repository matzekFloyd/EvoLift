/**
 * Signed-in screens live under `/app`. Public pages and `/api/*` stay at the site root.
 */

export const APP_HOME_PATH = "/app";

/** Signed-in URL. `tail` is `/` for Home, or a path such as `/exercises` or `/sessions/${id}`. */
export function appPath(tail: string): string {
  if (tail === "" || tail === "/") {
    return APP_HOME_PATH;
  }
  const normalized = tail.startsWith("/") ? tail : `/${tail}`;
  return `${APP_HOME_PATH}${normalized}`;
}

export type AppNavMatch = "exact" | "section";

/** Home and Account match the path exactly. Other nav items also match their child routes. */
export function isAppNavItemActive(pathname: string, href: string, match: AppNavMatch): boolean {
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LEGACY_SIGNED_IN_TAILS = [
  "/exercises/:slug",
  "/exercises",
  "/sessions/new",
  "/sessions/:id",
  "/insights",
  "/goals",
  "/plans/new",
  "/plans/:id/edit",
  "/plans",
  "/templates/new",
  "/templates/:id/edit",
  "/templates",
  "/account",
  "/docs",
] as const;

export type LegacySignedInRedirect = {
  source: string;
  destination: string;
  permanent: false;
};

/** Old signed-in URLs, plus the bare `/api` bookmark. `/` stays the public page. */
export function legacySignedInRedirects(): LegacySignedInRedirect[] {
  return [
    ...LEGACY_SIGNED_IN_TAILS.map((source) => ({
      source,
      destination: `/app${source}`,
      permanent: false as const,
    })),
    { source: "/api", destination: appPath("/docs"), permanent: false as const },
  ];
}
