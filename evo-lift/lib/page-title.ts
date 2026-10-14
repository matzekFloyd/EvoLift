export const APP_DOCUMENT_TITLE = "EvoLift";

/** Full browser tab title. Empty page names stay the product name, matching Home. */
export function formatDocumentTitle(page: string): string {
  const trimmed = page.trim();
  if (!trimmed) {
    return APP_DOCUMENT_TITLE;
  }
  return `${APP_DOCUMENT_TITLE} - ${trimmed}`;
}

export function workoutSessionPageTitle(sessionNumber: number): string {
  return `Workout session #${sessionNumber}`;
}

/** Tab segment for an exercise page. Uses the English name, then the slug. */
export function exercisePageTitle(name: string | null | undefined, slug: string): string | null {
  const label = name?.trim() || slug.trim();
  return label.length > 0 ? label : null;
}
