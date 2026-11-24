/** Header Vercel sets on each function request. The env var is not set there. */
export const VERCEL_OIDC_HEADER = "x-vercel-oidc-token";

/** API key, then the request OIDC token, then the local OIDC env var. */
export function readGatewayCredential(
  env: Record<string, string | undefined>,
  requestOidcToken?: string | null,
): string | null {
  const key =
    env["AI_GATEWAY_API_KEY"]?.trim() ||
    requestOidcToken?.trim() ||
    env["VERCEL_OIDC_TOKEN"]?.trim();
  return key || null;
}
