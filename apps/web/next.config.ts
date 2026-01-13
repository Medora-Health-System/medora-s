import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*"],
  experimental: {
    allowedDevOrigins: ["*"]
  }
};

export default nextConfig;

