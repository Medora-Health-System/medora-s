/**
 * Browser CORS allowlist for the Nest API.
 * The Medora web app calls the API from Next.js Route Handlers (server-side) — no browser CORS for that path.
 * CORS still applies if a browser loads the API origin directly (tools, future SPAs, or misconfigured clients).
 *
 * Production: set CORS_ORIGINS to your web app origin(s), e.g. https://app.example.com
 * (comma-separated). Localhost defaults are included only when NODE_ENV !== "production".
 */
export function buildCorsOriginList(): string[] {
  const isProd = process.env.NODE_ENV === "production";
  const devDefaults = isProd
    ? []
    : ["http://localhost:3002", "http://localhost:3003", "http://127.0.0.1:3002", "http://127.0.0.1:3003"];

  const extra = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const merged = [...devDefaults, ...extra];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of merged) {
    if (seen.has(o)) continue;
    seen.add(o);
    out.push(o);
  }

  if (isProd && out.length === 0) {
    console.warn(
      "⚠️ CORS_ORIGINS is empty in production. API will reject all browser-origin requests. This is expected only if using BFF proxy. Verify configuration."
    );
  }

  return out;
}
