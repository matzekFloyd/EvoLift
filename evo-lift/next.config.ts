import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import {
  buildSecurityHeaders,
  shouldEnableHsts,
  shouldIncludeLocalSupabase,
} from "./lib/security-headers";

// Parent repo has its own lockfile (Android shell); pin Turbopack to this app.
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  devIndicators: false,
  async redirects() {
    return [{ source: "/api", destination: "/docs", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          enableHsts: shouldEnableHsts(),
          includeLocalSupabase: shouldIncludeLocalSupabase(),
        }),
      },
    ];
  },
};

export default nextConfig;
