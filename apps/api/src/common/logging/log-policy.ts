/**
 * Centralized environment-aware logging policy for Nest bootstrap, HTTP access,
 * and scheduler/worker call sites. Call sites must not parse env independently.
 */

export type NestLogLevel = "error" | "warn" | "log" | "debug" | "verbose";

export type MedoraLogPolicy = {
  nodeEnv: string;
  /** Nest levels passed to NestFactory / custom logger. */
  nestLevels: NestLogLevel[];
  /** When false, RoutesResolver / RouterExplorer (and similar) log lines are dropped. */
  startupRoutesEnabled: boolean;
  /** When false, routine successful HTTP responses are not logged (unless sampled/slow). */
  httpSuccessEnabled: boolean;
  /** 0–1; applied only when httpSuccessEnabled is true. */
  httpSuccessSampleRate: number;
  /** When false, zero-change scheduler completions use debug (or are omitted). */
  schedulerNoopEnabled: boolean;
  /** Log successful requests slower than this (ms) even when success logging is off. */
  slowRequestMs: number;
  /** Prewarm duration above this emits WARN. */
  prewarmWarnMs: number;
  /** Allow Nest debug/verbose application logs. */
  debugEnabled: boolean;
};

const STARTUP_NOISE_CONTEXTS = new Set([
  "RoutesResolver",
  "RouterExplorer",
  "InstanceLoader",
]);

const QUIET_HTTP_PATHS = new Set([
  "/",
  "/health",
  "/health/live",
  "/health/ready",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
]);

function readEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const v = env[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) return defaultValue;
  const n = raw.toLowerCase();
  if (n === "true" || n === "1" || n === "yes" || n === "on") return true;
  if (n === "false" || n === "0" || n === "no" || n === "off") return false;
  return defaultValue;
}

function parseSampleRate(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined) return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(1, Math.max(0, n));
}

function parsePositiveInt(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined) return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return defaultValue;
  return Math.floor(n);
}

function resolveLevelSet(
  env: NodeJS.ProcessEnv,
  nodeEnv: string,
): NestLogLevel[] {
  const explicit = readEnv(env, "MEDORA_LOG_LEVEL")?.toLowerCase();
  if (explicit === "silent" || explicit === "none") return [];
  if (explicit === "error") return ["error"];
  if (explicit === "warn") return ["error", "warn"];
  if (explicit === "log" || explicit === "info") return ["error", "warn", "log"];
  if (explicit === "debug") return ["error", "warn", "log", "debug"];
  if (explicit === "verbose") return ["error", "warn", "log", "debug", "verbose"];

  // Test: keep application `log` for spies/assertions; quiet via startup/HTTP/noop flags.
  if (nodeEnv === "test") return ["error", "warn", "log"];
  if (nodeEnv === "production") return ["error", "warn", "log"];
  // development / unset
  return ["error", "warn", "log", "debug"];
}

/**
 * Resolve policy from process env (or a test env object).
 * Defaults are production-safe; override with MEDORA_LOG_* variables.
 */
export function resolveLogPolicy(env: NodeJS.ProcessEnv = process.env): MedoraLogPolicy {
  const nodeEnv = (readEnv(env, "NODE_ENV") ?? "development").toLowerCase();
  const nestLevels = resolveLevelSet(env, nodeEnv);
  const isProd = nodeEnv === "production";
  const isTest = nodeEnv === "test";

  const debugEnabled = nestLevels.includes("debug") || nestLevels.includes("verbose");

  return {
    nodeEnv,
    nestLevels,
    startupRoutesEnabled: parseBool(
      readEnv(env, "MEDORA_LOG_STARTUP_ROUTES"),
      !isProd && !isTest,
    ),
    httpSuccessEnabled: parseBool(
      readEnv(env, "MEDORA_LOG_HTTP_SUCCESS"),
      !isProd && !isTest,
    ),
    httpSuccessSampleRate: parseSampleRate(
      readEnv(env, "MEDORA_LOG_SAMPLE_RATE"),
      isProd || isTest ? 0 : 1,
    ),
    schedulerNoopEnabled: parseBool(
      readEnv(env, "MEDORA_LOG_SCHEDULER_NOOP"),
      !isProd && !isTest,
    ),
    slowRequestMs: parsePositiveInt(readEnv(env, "MEDORA_LOG_SLOW_REQUEST_MS"), 2_000),
    prewarmWarnMs: parsePositiveInt(readEnv(env, "MEDORA_LOG_PREWARM_WARN_MS"), 30_000),
    debugEnabled,
  };
}

let cachedPolicy: MedoraLogPolicy | null = null;

/** Process-wide policy (cached). Tests may call `resetLogPolicyCache()`. */
export function getLogPolicy(): MedoraLogPolicy {
  if (!cachedPolicy) cachedPolicy = resolveLogPolicy();
  return cachedPolicy;
}

export function resetLogPolicyCache(): void {
  cachedPolicy = null;
}

export function isStartupNoiseContext(context: string | undefined): boolean {
  if (!context) return false;
  return STARTUP_NOISE_CONTEXTS.has(context);
}

export function nestLevelAllowed(
  level: NestLogLevel,
  policy: MedoraLogPolicy = getLogPolicy(),
): boolean {
  return policy.nestLevels.includes(level);
}

/**
 * Whether a Nest framework log line should be emitted (startup route noise filter).
 */
export function shouldEmitNestFrameworkLog(
  level: NestLogLevel,
  context: string | undefined,
  policy: MedoraLogPolicy = getLogPolicy(),
): boolean {
  if (!nestLevelAllowed(level, policy)) return false;
  if (
    (level === "log" || level === "debug" || level === "verbose") &&
    isStartupNoiseContext(context) &&
    !policy.startupRoutesEnabled
  ) {
    return false;
  }
  return true;
}

export function isQuietHttpPath(path: string): boolean {
  const normalized = (path.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (QUIET_HTTP_PATHS.has(normalized)) return true;
  if (normalized.startsWith("/assets/")) return true;
  if (normalized.startsWith("/icons/")) return true;
  if (/\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|map|woff2?)$/i.test(normalized)) {
    return true;
  }
  return false;
}

export type HttpLogDecisionInput = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  /** Inject for deterministic sampling tests. */
  random?: () => number;
};

/**
 * Production-safe HTTP access log gate.
 * Always logs 5xx; logs slow requests; never logs quiet probes / HEAD by default.
 */
export function shouldLogHttpRequest(
  input: HttpLogDecisionInput,
  policy: MedoraLogPolicy = getLogPolicy(),
): boolean {
  const method = (input.method || "GET").toUpperCase();
  const path = input.path || "/";
  const status = input.statusCode;
  const durationMs = input.durationMs;

  if (method === "HEAD" || method === "OPTIONS") return false;
  if (isQuietHttpPath(path) && status < 500) return false;

  if (status >= 500) return true;
  if (durationMs >= policy.slowRequestMs) return true;

  // Useful authz failures — keep visibility without logging every 2xx.
  if (status === 401 || status === 403) return true;

  if (status >= 400) {
    // Other 4xx: keep (validation noise is preferable to silent client failures).
    return true;
  }

  // 2xx / 3xx success path
  if (!policy.httpSuccessEnabled) return false;
  const rate = policy.httpSuccessSampleRate;
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  const rnd = input.random ?? Math.random;
  return rnd() < rate;
}

export function shouldLogSchedulerNoop(
  policy: MedoraLogPolicy = getLogPolicy(),
): boolean {
  return policy.schedulerNoopEnabled;
}

/** Structured helper: INFO only when records changed; DEBUG/suppress for no-op. */
export function schedulerCompletionLevel(
  changedRecords: number,
  policy: MedoraLogPolicy = getLogPolicy(),
): "log" | "debug" | "suppress" {
  if (changedRecords > 0) return "log";
  if (policy.schedulerNoopEnabled) return "debug";
  if (policy.debugEnabled) return "debug";
  return "suppress";
}
