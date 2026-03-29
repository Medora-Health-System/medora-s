import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@medora/shared"],
  reactStrictMode: true,
  /** Pièces jointes base64 (résultats labo/imagerie) via le proxy `/api/backend`. */
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  allowedDevOrigins: [
    "https://*.replit.dev",
    "https://*.riker.replit.dev",
    "https://*.repl.co"
  ]
};

export default nextConfig;

