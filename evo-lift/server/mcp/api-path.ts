/**
 * Fail-closed path checks for MCP tools that proxy `/api/*`.
 * Hosted (`app/api/mcp`) and laptop stdio (`mcp/evo-api`) share this contract.
 */

export const MCP_API_PATH_ERROR = "path must be a relative /api/... route";

function isBlockedMcpPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/api/mcp" || normalized.startsWith("/api/mcp/");
}

function looksUnsafeApiPath(value: string): boolean {
  return (
    value.includes("..") ||
    value.includes("://") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.includes("//")
  );
}

/**
 * Validate a tool-supplied path before building a same-origin fetch URL.
 * Rejects traversal, absolute URLs, encoded `..`, and recursive `/api/mcp` calls.
 */
export function parseMcpApiPath(path: string): { pathname: string } | { error: string } {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/api/")) {
    return { error: MCP_API_PATH_ERROR };
  }

  const withoutQuery = trimmed.split("?")[0] ?? "";
  if (!withoutQuery.startsWith("/api/") || looksUnsafeApiPath(withoutQuery)) {
    return { error: MCP_API_PATH_ERROR };
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return { error: MCP_API_PATH_ERROR };
  }
  if (
    !decoded.startsWith("/api/") ||
    looksUnsafeApiPath(decoded) ||
    isBlockedMcpPath(decoded)
  ) {
    return { error: MCP_API_PATH_ERROR };
  }

  if (isBlockedMcpPath(withoutQuery)) {
    return { error: MCP_API_PATH_ERROR };
  }

  return { pathname: withoutQuery };
}

/**
 * Build a same-origin `/api/*` URL for this deployment. Fail closed if the
 * resolved origin or pathname leaves the allowlist (URL normalization tricks).
 */
export function buildMcpApiUrl(
  path: string,
  deploymentOrigin: string,
  query?: Record<string, string>,
): { url: URL } | { error: string } {
  const parsed = parseMcpApiPath(path);
  if ("error" in parsed) {
    return parsed;
  }

  const base = deploymentOrigin.replace(/\/+$/, "");
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(`${base}/`).origin;
  } catch {
    return { error: MCP_API_PATH_ERROR };
  }

  let url: URL;
  try {
    url = new URL(parsed.pathname, `${base}/`);
  } catch {
    return { error: MCP_API_PATH_ERROR };
  }

  if (url.origin !== expectedOrigin) {
    return { error: MCP_API_PATH_ERROR };
  }
  if (!url.pathname.startsWith("/api/") || looksUnsafeApiPath(url.pathname) || isBlockedMcpPath(url.pathname)) {
    return { error: MCP_API_PATH_ERROR };
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      url.searchParams.set(key, String(value));
    }
  }

  return { url };
}
