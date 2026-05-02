import { redactPHI } from "./redact-phi";

/**
 * S17A — JSON lines for ops/audit pipelines. Core context fields are explicit (UUIDs / codes / actions).
 * Extended fields pass through `redactPHI` — never pass free-text clinical payloads here.
 */
export type MedoraLogPayload = {
  userId?: string | null;
  role?: string | null;
  encounterId?: string | null;
  facilityId?: string | null;
  action?: string | null;
  requestId?: string | null;
  timestamp?: string;
  [key: string]: unknown;
};

function baseLine(level: "info" | "error", event: string, payload: MedoraLogPayload): Record<string, unknown> {
  const {
    userId,
    role,
    encounterId,
    facilityId,
    action,
    requestId,
    timestamp: _ts,
    ...rest
  } = payload;
  const safeRest =
    rest && typeof rest === "object" && !Array.isArray(rest)
      ? (redactPHI(rest) as Record<string, unknown>)
      : {};
  return {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(userId != null && userId !== "" ? { userId } : {}),
    ...(role != null && role !== "" ? { role } : {}),
    ...(encounterId != null && encounterId !== "" ? { encounterId } : {}),
    ...(facilityId != null && facilityId !== "" ? { facilityId } : {}),
    action: action ?? event,
    ...(requestId != null && requestId !== "" ? { requestId } : {}),
    ...safeRest,
  };
}

function write(line: Record<string, unknown>): void {
  // Single JSON object per line for log aggregators
  process.stdout.write(`${JSON.stringify(line)}\n`);
}

export function logInfo(event: string, payload: MedoraLogPayload = {}): void {
  write(baseLine("info", event, payload));
}

export function logError(event: string, payload: MedoraLogPayload = {}): void {
  write(baseLine("error", event, payload));
}

/** Structured logger namespace (S17A) — prefer `logInfo` / `logError` imports for tree-shaking. */
export const medoraLogger = { logInfo, logError };
