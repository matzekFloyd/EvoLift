/**
 * Best-effort sliding-window rate limits for serverless isolates.
 * Counts are per Node process (not shared across Vercel instances).
 * Still blocks single-token / single-IP floods on a warm instance.
 */

export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Authenticated session JWT callers (web/app logging). */
export const API_USER_LIMIT_PER_WINDOW = 180;

/** Personal API token callers (service-role path). Slightly tighter. */
export const API_TOKEN_LIMIT_PER_WINDOW = 90;

/** All `/api` traffic via handleApi, keyed by client IP. */
export const API_IP_LIMIT_PER_WINDOW = 240;

/** Hosted MCP tool calls per user. */
export const MCP_USER_LIMIT_PER_WINDOW = 60;

/** Public `login_failed` posts to `/api/security/events`. */
export const SECURITY_EVENT_IP_LIMIT_PER_WINDOW = 30;

export const RATE_LIMIT_MESSAGE =
  "Too many requests. Wait a minute, then try again.";

type Bucket = number[];

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/** Test helper: clear all buckets. */
export function resetRateLimitStore(): void {
  buckets.clear();
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  nowMs: number = Date.now(),
): RateLimitResult {
  const cutoff = nowMs - windowMs;
  let timestamps = buckets.get(key);
  if (!timestamps) {
    timestamps = [];
    buckets.set(key, timestamps);
  }

  // Drop expired entries in place.
  let write = 0;
  for (let read = 0; read < timestamps.length; read += 1) {
    const ts = timestamps[read]!;
    if (ts > cutoff) {
      timestamps[write] = ts;
      write += 1;
    }
  }
  timestamps.length = write;

  if (timestamps.length >= limit) {
    const oldest = timestamps[0]!;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
    return { ok: false, retryAfterSec };
  }

  timestamps.push(nowMs);
  return { ok: true };
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return "unknown";
}
