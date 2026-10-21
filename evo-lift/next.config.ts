import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { legacySignedInRedirects } from "./lib/app-paths";
import {
  buildSecurityHeaders,
  shouldEnableHsts,
  shouldIncludeLocalSupabase,
} from "./lib/security-headers";

// Parent repo has its own lockfile (Android shell); pin Turbopack to this app.
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The app is opened at 127.0.0.1 while the dev server is bound to localhost.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: appRoot,
  },
  serverExternalPackages: ["ws"],
  devIndicators: false,
  async redirects() {
    return legacySignedInRedirects();
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
