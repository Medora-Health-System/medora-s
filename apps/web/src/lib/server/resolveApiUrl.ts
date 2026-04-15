/**
 * Resolves the Nest API base URL for Next.js Route Handlers (BFF).
 * In production, rejects missing or localhost URLs to avoid silent misconfiguration.
 */
export function resolveApiUrl(): string {
  const raw = process.env.API_URL?.trim() || process.env.MEDORA_API_URL?.trim() || "";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!raw || raw.includes("localhost")) {
      throw new Error("Invalid API_URL in production — must point to api.medoras.com");
    }
    return raw;
  }

  return raw || "http://localhost:3001";
}
