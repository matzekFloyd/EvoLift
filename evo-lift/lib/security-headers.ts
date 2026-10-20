/**
 * HTTP security headers for the Next app (see SECURITY.md).
 * Keep CSP allowlists here so next.config and tests stay aligned.
 */

export type SecurityHeader = { key: string; value: string };

export function buildContentSecurityPolicy(options?: {
  /** Allow local Supabase (`supabase start`) connect targets. */
  includeLocalSupabase?: boolean;
}): string {
  // Next.js + Swagger UI still need inline style/script in places; tighten later with nonces.
  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ];
  if (options?.includeLocalSupabase) {
    connectSrc.push(
      "http://127.0.0.1:54321",
      "http://localhost:54321",
      "ws://127.0.0.1:54321",
      "ws://localhost:54321",
    );
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "worker-src 'self' blob:",
    `connect-src ${connectSrc.join(" ")}`,
  ];
  return directives.join("; ");
}

export function buildSecurityHeaders(options?: {
  /** Set Strict-Transport-Security (production HTTPS only). */
  enableHsts?: boolean;
  includeLocalSupabase?: boolean;
}): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({
        includeLocalSupabase: options?.includeLocalSupabase,
      }),
    },
  ];

  if (options?.enableHsts) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

type EnvLike = {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

/** True for Vercel production (or NODE_ENV production when not on Vercel). */
export function shouldEnableHsts(env: EnvLike = process.env): boolean {
  if (env.VERCEL_ENV) {
    return env.VERCEL_ENV === "production";
  }
  return env.NODE_ENV === "production";
}

/** Allow local Supabase outside Vercel production. */
export function shouldIncludeLocalSupabase(env: EnvLike = process.env): boolean {
  if (env.VERCEL_ENV === "production") {
    return false;
  }
  return true;
}
