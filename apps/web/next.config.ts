import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@medora/shared"],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
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

