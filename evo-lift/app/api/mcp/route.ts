import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { LanguageCode } from "@/lib/supabase/database.types";
import { authenticateBearer } from "@/server/auth/api-request";
import { listExercisesWithTranslations } from "@/server/db/exercises";

export const runtime = "nodejs";
export const maxDuration = 60;

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

async function authFromExtra(extra: { authInfo?: AuthInfo }) {
  return authenticateBearer(extra.authInfo?.token);
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "get_targets",
      "Show this EvoLift deployment origin. Hosted MCP always queries this app (production on evo-lift.vercel.app).",
      {},
      async () =>
        jsonResult({
          deployment: deploymentOrigin(),
          mcpUrl: `${deploymentOrigin()}/api/mcp`,
          note: "This HTTP MCP has no local/prod switch. Use the laptop stdio MCP for local.",
        }),
    );

    server.tool(
      "get_openapi",
      "Fetch GET /api/openapi for this EvoLift deployment.",
      {},
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

    server.tool(
      "list_exercises",
      "Fetch GET /api/exercises on this EvoLift deployment. Optional lang: en or de.",
      {
        lang: z.enum(["en", "de"]).optional().describe("Optional language filter"),
      },
      async ({ lang }, extra) => {
        const auth = await authFromExtra(extra);
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

    server.tool(
      "evo_api_get",
      "GET an EvoLift /api/* route on this deployment. Prefer get_openapi first. Read-only.",
      {
        path: z.string().describe("Path starting with /api/, for example /api/exercises"),
        query: z
          .record(z.string(), z.string())
          .optional()
          .describe("Optional query string key/value pairs"),
      },
      async ({ path, query }, extra) => {
        const auth = await authFromExtra(extra);
        if ("error" in auth) {
          return jsonResult({ error: auth.error }, true);
        }
        const trimmed = path.trim();
        if (!trimmed.startsWith("/api/") || trimmed.includes("..") || trimmed.includes("://")) {
          return jsonResult({ error: "path must be a relative /api/... route" }, true);
        }
        const url = new URL(trimmed.split("?")[0], `${deploymentOrigin()}/`);
        for (const [key, value] of Object.entries(query ?? {})) {
          if (value) {
            url.searchParams.set(key, String(value));
          }
        }
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${extra.authInfo?.token ?? ""}`,
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
            url: url.toString(),
            body,
          },
          !response.ok,
        );
      },
    );
  },
  {},
  { basePath: "/api", maxDuration: 60, verboseLogs: false },
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
    scopes: ["evo:read"],
    extra: { userId: auth.userId },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
