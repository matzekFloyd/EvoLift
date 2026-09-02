import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [{ source: "/api", destination: "/docs", permanent: false }];
  },
};

export default nextConfig;
