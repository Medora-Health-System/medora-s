/**
 * Central policy for background workers (schedulers / pollers / prewarm).
 * Production defaults unchanged: workers remain opt-in or non-production-only as before,
 * except NODE_ENV=test disables them unless explicitly enabled.
 */

function readEnv(key: string): string | undefined {
  try {
    const v = process.env[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

function parseTriState(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  const n = raw.toLowerCase();
  if (n === "true" || n === "1" || n === "yes" || n === "on") return true;
  if (n === "false" || n === "0" || n === "no" || n === "off") return false;
  return undefined;
}

/**
 * Global kill-switch / enable for background workers.
 * - MEDORA_BACKGROUND_WORKERS_ENABLED=true|false overrides
 * - unset: false in production and test; true in development / unset NODE_ENV
 */
export function backgroundWorkersEnabledByDefault(): boolean {
  const forced = parseTriState(readEnv("MEDORA_BACKGROUND_WORKERS_ENABLED"));
  if (forced !== undefined) return forced;
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  if (nodeEnv === "production" || nodeEnv === "test") return false;
  return true;
}

/**
 * Resolve a worker-specific *_ENABLED env with safe defaults.
 * When unset, falls back to `backgroundWorkersEnabledByDefault()` unless
 * `legacyNonProductionDefault` is true (historical: enabled whenever not production).
 */
export function resolveWorkerEnabledFlag(
  envKey: string,
  options?: { legacyNonProductionDefault?: boolean },
): boolean {
  const forced = parseTriState(readEnv(envKey));
  if (forced !== undefined) return forced;
  const globalForced = parseTriState(readEnv("MEDORA_BACKGROUND_WORKERS_ENABLED"));
  if (globalForced !== undefined) return globalForced;
  if (options?.legacyNonProductionDefault) {
    const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
    if (nodeEnv === "test") return false;
    return nodeEnv !== "production";
  }
  return backgroundWorkersEnabledByDefault();
}

/** Catalog registry prewarm — skip in test unless explicitly enabled (expensive). */
export function registryPrewarmEnabled(): boolean {
  const forced = parseTriState(readEnv("MEDORA_REGISTRY_PREWARM_ENABLED"));
  if (forced !== undefined) return forced;
  return (process.env.NODE_ENV ?? "").toLowerCase() !== "test";
}
