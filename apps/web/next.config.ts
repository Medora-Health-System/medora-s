import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "https://*.replit.dev",
    "https://*.riker.replit.dev",
    "https://*.repl.co"
  ]
};

export default nextConfig;

