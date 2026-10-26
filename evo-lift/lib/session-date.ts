/**
 * Calendar day for a session (YYYY-MM-DD). Matches home planned vs completed split when
 * Supabase returns date-only or datetime strings.
 */
export function normalizeSessionDateOnly(value: string): string {
  return value.slice(0, 10);
}

export function getTodayYyyyMmDd(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateToYyyyMmDd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Inclusive 12-week window through today (84 days).
 * Date filters and the Insights 12w preset open on this span.
 */
export function getDefaultDateRange(today: Date): { from: string; to: string } {
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 83);
  return {
    from: formatDateToYyyyMmDd(fromDate),
    to: formatDateToYyyyMmDd(today),
  };
}

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * When restoring a new-session browser draft, use the user's local calendar:
 * invalid or **past** stored dates become today so abandoned drafts do not reopen on an old day.
 * Future dates (planned sessions) are kept.
 */
export function coalesceNewSessionDraftPerformedOn(stored: string): string {
  const d = normalizeSessionDateOnly(stored.trim());
  if (!YYYY_MM_DD.test(d)) {
    return getTodayYyyyMmDd();
  }
  const today = getTodayYyyyMmDd();
  return d < today ? today : d;
}

/** True when performed_on is after today (upcoming), consistent with session detail and home. */
export function isFutureSessionDate(performedOn: string): boolean {
  return normalizeSessionDateOnly(performedOn) > getTodayYyyyMmDd();
}
