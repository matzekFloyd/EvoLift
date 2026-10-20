import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { LanguageCode } from "@/lib/supabase/database.types";
import {
  authenticateBearer,
  getBearerCredential,
} from "@/server/auth/api-request";
import { listExercisesWithTranslations } from "@/server/db/exercises";
import { MCP_API_PATH_ERROR, buildMcpApiUrl } from "@/server/mcp/api-path";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  MCP_USER_LIMIT_PER_WINDOW,
  RATE_LIMIT_MESSAGE,
} from "@/server/rate-limit";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ToolCtx = { http?: { authInfo?: AuthInfo } };

function jsonResult(payload: unknown, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function deploymentOrigin(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) {
    return `https://${production.replace(/^https?:\/\//, "")}`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}

async function authFromCtx(ctx: ToolCtx) {
  return authenticateBearer(ctx.http?.authInfo?.token);
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_targets",
      {
        description:
          "Show this EvoLift deployment origin. Hosted MCP always queries this app (production on evo-lift.vercel.app).",
      },
      async () =>
        jsonResult({
          deployment: deploymentOrigin(),
          mcpUrl: `${deploymentOrigin()}/api/mcp`,
          note: "This HTTP MCP has no local/prod switch. Use the laptop stdio MCP for local.",
        }),
    );

    server.registerTool(
      "get_openapi",
      {
        description: "Fetch GET /api/openapi for this EvoLift deployment.",
      },
      async () => {
        const response = await fetch(`${deploymentOrigin()}/api/openapi`, {
          headers: { Accept: "application/json" },
        });
        const body = await response.json().catch(() => null);
        return jsonResult({
          target: "deployment",
          status: response.status,
          url: `${deploymentOrigin()}/api/openapi`,
          body,
        });
      },
    );

    server.registerTool(
      "list_exercises",
      {
        description: "Fetch GET /api/exercises on this EvoLift deployment. Optional lang: en or de.",
        inputSchema: z.object({
          lang: z.enum(["en", "de"]).optional().describe("Optional language filter"),
        }),
      },
      async ({ lang }, ctx) => {
        const auth = await authFromCtx(ctx);
        if ("error" in auth) {
          return jsonResult({ error: auth.error }, true);
        }
        const exercises = await listExercisesWithTranslations(
          auth.client,
          lang as LanguageCode | undefined,
        );
        return jsonResult({
          target: "deployment",
          status: 200,
          url: `${deploymentOrigin()}/api/exercises${lang ? `?lang=${lang}` : ""}`,
          body: { data: exercises },
        });
      },
    );

    server.registerTool(
      "evo_api_get",
      {
        description:
          "GET an EvoLift /api/* route on this deployment. Prefer get_openapi first. Read-only.",
        inputSchema: z.object({
          path: z.string().describe("Path starting with /api/, for example /api/exercises"),
          query: z
            .record(z.string(), z.string())
            .optional()
            .describe("Optional query string key/value pairs"),
        }),
      },
      async ({ path, query }, ctx) => {
        const auth = await authFromCtx(ctx);
        if ("error" in auth) {
          return jsonResult({ error: auth.error }, true);
        }
        const built = buildMcpApiUrl(path, deploymentOrigin(), query);
        if ("error" in built) {
          return jsonResult({ error: MCP_API_PATH_ERROR }, true);
        }
        const response = await fetch(built.url, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${ctx.http?.authInfo?.token ?? ""}`,
          },
        });
        const text = await response.text();
        let body: unknown = text;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = text;
        }
        return jsonResult(
          {
            target: "deployment",
            status: response.status,
            url: built.url.toString(),
            body,
          },
          !response.ok,
        );
      },
    );

    server.registerTool(
      "evo_api_request",
      {
        description:
          "Call an EvoLift /api/* route on this deployment (GET, POST, PATCH, PUT, DELETE). Prefer get_openapi first. JSON body for write methods.",
        inputSchema: z.object({
          method: z
            .enum(["GET", "POST", "PATCH", "PUT", "DELETE"])
            .describe("HTTP method"),
          path: z.string().describe("Path starting with /api/, for example /api/sessions"),
          query: z
            .record(z.string(), z.string())
            .optional()
            .describe("Optional query string key/value pairs"),
          body: z.any().optional().describe("JSON object body for POST, PATCH, PUT"),
        }),
      },
      async ({ method, path, query, body }, ctx) => {
        const auth = await authFromCtx(ctx);
        if ("error" in auth) {
          return jsonResult({ error: auth.error }, true);
        }
        const built = buildMcpApiUrl(path, deploymentOrigin(), query);
        if ("error" in built) {
          return jsonResult({ error: MCP_API_PATH_ERROR }, true);
        }
        const headers: Record<string, string> = {
          Accept: "application/json",
          Authorization: `Bearer ${ctx.http?.authInfo?.token ?? ""}`,
        };
        const init: RequestInit = { method, headers };
        if (body !== undefined && method !== "GET") {
          headers["Content-Type"] = "application/json";
          init.body = JSON.stringify(body);
        }
        const response = await fetch(built.url, init);
        const text = await response.text();
        let parsed: unknown = text;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = text;
        }
        return jsonResult(
          {
            target: "deployment",
            status: response.status,
            url: built.url.toString(),
            body: parsed,
          },
          !response.ok,
        );
      },
    );
  },
  { verboseLogs: false },
);

const verifyToken = async (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  const auth = await authenticateBearer(bearerToken);
  if ("error" in auth) {
    return undefined;
  }
  return {
    token: bearerToken ?? "",
    clientId: auth.userId,
    scopes: ["evo:api"],
    extra: { userId: auth.userId },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

async function withMcpRateLimit(request: Request): Promise<Response> {
  const credential = getBearerCredential(request as NextRequest);
  const auth = await authenticateBearer(credential);
  if (!("error" in auth)) {
    const userLimit = consumeRateLimit(`mcp:user:${auth.userId}`, MCP_USER_LIMIT_PER_WINDOW);
    if (!userLimit.ok) {
      return new Response(JSON.stringify({ error: RATE_LIMIT_MESSAGE }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "Retry-After": String(userLimit.retryAfterSec),
        },
      });
    }
  } else {
    const ip = clientIpFromHeaders(request.headers);
    const ipLimit = consumeRateLimit(`mcp:ip:${ip}`, MCP_USER_LIMIT_PER_WINDOW);
    if (!ipLimit.ok) {
      return new Response(JSON.stringify({ error: RATE_LIMIT_MESSAGE }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "Retry-After": String(ipLimit.retryAfterSec),
        },
      });
    }
  }
  return authHandler(request);
}

export {
  withMcpRateLimit as GET,
  withMcpRateLimit as POST,
  withMcpRateLimit as DELETE,
};
