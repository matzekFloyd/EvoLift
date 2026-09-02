#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_LOCAL_BASE_URL = "http://localhost:3000";

const TargetSchema = z
  .enum(["local", "prod"])
  .optional()
  .describe("Which EvoLift API to call. Default local. Use prod for production.");

function stripSlash(url) {
  return url.replace(/\/+$/, "");
}

function resolveTarget(target = "local") {
  if (target === "prod") {
    const base = process.env.EVO_API_PROD_URL?.trim();
    if (!base) {
      return {
        error: {
          error: "Production API URL is not configured.",
          hint: "Set EVO_API_PROD_URL to the production origin (no path), for example https://your-app.vercel.app. Use a production user JWT in EVO_ACCESS_TOKEN_PROD.",
        },
      };
    }
    return {
      label: "prod",
      base: stripSlash(base),
      token: process.env.EVO_ACCESS_TOKEN_PROD?.trim() || "",
      tokenEnv: "EVO_ACCESS_TOKEN_PROD",
    };
  }

  return {
    label: "local",
    base: stripSlash(process.env.EVO_API_BASE_URL?.trim() || DEFAULT_LOCAL_BASE_URL),
    token: process.env.EVO_ACCESS_TOKEN?.trim() || "",
    tokenEnv: "EVO_ACCESS_TOKEN",
  };
}

function jsonResult(payload, isError = false) {
  return {
    isError,
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function normalizeApiPath(path) {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/api/")) {
    throw new Error("path must start with /api/");
  }
  if (trimmed.includes("://") || trimmed.includes("..") || trimmed.includes("\\")) {
    throw new Error("path must be a relative /api/... route");
  }
  return trimmed.split("?")[0];
}

async function evoFetch(path, query = {}, target = "local") {
  const resolved = resolveTarget(target);
  if (resolved.error) {
    return jsonResult(resolved.error, true);
  }

  const url = new URL(normalizeApiPath(path), `${resolved.base}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  const headers = { Accept: "application/json" };
  if (resolved.token) {
    headers.Authorization = `Bearer ${resolved.token}`;
  }

  let response;
  try {
    response = await fetch(url, { method: "GET", headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint =
      resolved.label === "prod"
        ? `Check EVO_API_PROD_URL (${resolved.base}) and that production is reachable.`
        : `Start the app (cd evo-lift && npm run dev). Base URL: ${resolved.base}`;
    return jsonResult(
      {
        error: "Could not reach the EvoLift API.",
        target: resolved.label,
        hint,
        detail: message,
      },
      true,
    );
  }

  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (response.status === 401) {
    return jsonResult(
      {
        error: "Missing or invalid bearer token.",
        target: resolved.label,
        hint: `Set ${resolved.tokenEnv} to a user JWT for that environment (local Docker vs production Supabase are different tokens).`,
        status: 401,
        body,
      },
      true,
    );
  }

  if (!response.ok) {
    return jsonResult(
      {
        error: "EvoLift API request failed.",
        target: resolved.label,
        status: response.status,
        url: url.toString(),
        body,
      },
      true,
    );
  }

  return jsonResult({
    target: resolved.label,
    status: response.status,
    url: url.toString(),
    body,
  });
}

const server = new McpServer({
  name: "evo-lift-api",
  version: "0.1.0",
});

server.tool(
  "get_targets",
  "Show which EvoLift API environments are configured (local vs prod). Does not print tokens.",
  {},
  async () => {
    const local = resolveTarget("local");
    const prod = resolveTarget("prod");
    return jsonResult({
      local: {
        configured: true,
        base: local.base,
        tokenConfigured: Boolean(local.token),
      },
      prod: prod.error
        ? { configured: false, base: null, tokenConfigured: false, hint: prod.error.hint }
        : {
            configured: true,
            base: prod.base,
            tokenConfigured: Boolean(prod.token),
          },
    });
  },
);

server.tool(
  "get_openapi",
  "Fetch GET /api/openapi. Use this to see which EvoLift HTTP routes exist before calling them.",
  { target: TargetSchema },
  async ({ target }) => evoFetch("/api/openapi", {}, target ?? "local"),
);

server.tool(
  "list_exercises",
  "Fetch GET /api/exercises (exercise catalog with translations). Optional lang: en or de. Set target to prod for production.",
  {
    lang: z.enum(["en", "de"]).optional().describe("Optional language filter"),
    target: TargetSchema,
  },
  async ({ lang, target }) =>
    evoFetch("/api/exercises", lang ? { lang } : {}, target ?? "local"),
);

server.tool(
  "evo_api_get",
  "GET an EvoLift /api/* route. Prefer this after get_openapi when a newer endpoint exists. Read-only. Set target to prod for production.",
  {
    path: z
      .string()
      .describe("Path starting with /api/, for example /api/exercises"),
    query: z
      .record(z.string())
      .optional()
      .describe("Optional query string key/value pairs"),
    target: TargetSchema,
  },
  async ({ path, query, target }) => {
    try {
      return await evoFetch(path, query ?? {}, target ?? "local");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonResult({ error: message }, true);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
