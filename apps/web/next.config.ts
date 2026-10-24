import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@craft-trust/contracts", "@craft-trust/api-client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" }
    ]
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  typedRoutes: false
};

export default nextConfig;
