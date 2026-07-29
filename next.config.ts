import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Clickjacking protection (plan §12/§14): every route is framed nowhere
  // except `/embed/*`, which is the one route meant to live inside a
  // customer's iframe.
  async headers() {
    return [
      {
        source: "/((?!embed).*)",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
      },
      {
        source: "/embed/:slug",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
};

export default nextConfig;
