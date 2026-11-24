/** Reads the AI Gateway credential from a runtime env object.
 * Direct `process.env.NAME` access is inlined at build time, and the OIDC token only exists when the function runs.
 */
export function readGatewayCredential(env: Record<string, string | undefined>): string | null {
  const key = env["AI_GATEWAY_API_KEY"]?.trim() || env["VERCEL_OIDC_TOKEN"]?.trim();
  return key || null;
}
