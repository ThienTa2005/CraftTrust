import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@craft-trust/contracts", "@craft-trust/api-client"],
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "http", hostname: "127.0.0.1", port: "55321" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost", port: "55321" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" }
    ]
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  typedRoutes: false
};

export default nextConfig;
