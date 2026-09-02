"use client";

import { useEffect, useRef } from "react";
import type { SwaggerUIBundle } from "swagger-ui-dist";
import "swagger-ui-dist/swagger-ui.css";
import "./api-docs-explorer.css";

type ApiDocsExplorerProps = {
  accessToken: string;
};

export function ApiDocsExplorer({ accessToken }: ApiDocsExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    let cancelled = false;
    let ui: ReturnType<SwaggerUIBundle> | undefined;

    void (async () => {
      const { SwaggerUIBundle } = await import("swagger-ui-dist");
      if (cancelled || !containerRef.current) {
        return;
      }

      ui = SwaggerUIBundle({
        url: "/api/openapi",
        domNode: containerRef.current,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        deepLinking: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        requestInterceptor: (request) => {
          const headers = (request.headers ?? {}) as Record<string, string>;
          if (!headers.Authorization && !headers.authorization && accessToken) {
            request.headers = {
              ...headers,
              Authorization: `Bearer ${accessToken}`,
            };
          }
          return request;
        },
        onComplete: () => {
          ui?.preauthorizeApiKey("bearerAuth", accessToken);
        },
      });
    })();

    return () => {
      cancelled = true;
      node.replaceChildren();
    };
  }, [accessToken]);

  return <div ref={containerRef} className="api-docs-explorer" />;
}
