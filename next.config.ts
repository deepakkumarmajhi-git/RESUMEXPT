import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "@napi-rs/canvas"],
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
