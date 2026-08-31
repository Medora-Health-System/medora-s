/**
 * Admission / Observation decision concurrency helpers.
 *
 * Canonical CAS token is Encounter.version from a server read or successful
 * mutation response. Callers must never invent, decrement, or last-write-wins
 * a token. A true stale write must still 409.
 */

export const ADMISSION_DECISION_STALE_CODE = "ADMISSION_DECISION_STALE";

function asNonNegativeInt(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || !Number.isInteger(raw)) {
    return undefined;
  }
  return raw;
}

/** Merge a server-observed Encounter.version into the client's last-known token. Never decreases. Never fabricates. */
export function mergeAdmissionDecisionExpectedVersion(
  current: number | null | undefined,
  incoming: number | null | undefined
): number | undefined {
  const next = asNonNegativeInt(incoming);
  const prev = asNonNegativeInt(current);
  if (next == null) return prev;
  if (prev == null) return next;
  return next > prev ? next : prev;
}

/** Prefer a newer encounter payload by canonical version; never regress the in-memory chart. */
export function preferNewerEncounterVersion<T extends { version?: number | null }>(
  current: T | null | undefined,
  incoming: T | null | undefined
): T | null {
  if (!incoming) return current ?? null;
  if (!current) return incoming;
  const cv = asNonNegativeInt(current.version);
  const nv = asNonNegativeInt(incoming.version);
  if (cv != null && (nv == null || nv < cv)) return current;
  return incoming;
}

export function parseEncounterVersionFromAdmissionDecisionResponse(res: unknown): number | undefined {
  if (!res || typeof res !== "object" || Array.isArray(res)) return undefined;
  const rec = res as { encounter?: { version?: unknown }; version?: unknown };
  return asNonNegativeInt(rec.encounter?.version) ?? asNonNegativeInt(rec.version);
}

export function isAdmissionDecisionStaleErrorCode(raw: unknown): boolean {
  return raw === ADMISSION_DECISION_STALE_CODE;
}

function readCodeFromRecord(rec: Record<string, unknown> | null): string | null {
  if (!rec) return null;
  for (const key of ["errorCode", "code"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Read PHI-safe admission-decision error code from apiFetch / Nest 409 bodies. */
export function extractAdmissionDecisionErrorCode(err: {
  errorCode?: string | null;
  body?: unknown;
}): string | null {
  if (typeof err.errorCode === "string" && err.errorCode.trim()) return err.errorCode.trim();
  const body = err.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const rec = body as Record<string, unknown>;
  const top = readCodeFromRecord(rec);
  if (top) return top;
  const nested = rec.message;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return readCodeFromRecord(nested as Record<string, unknown>);
  }
  return null;
}

/**
 * Client must never auto-replay SIGN after a concurrency conflict.
 * Refresh hydrates the latest decision; the provider must press Sign again.
 */
export function shouldAutomaticallyRetryAdmissionDecisionSignature(errorCode: unknown): boolean {
  void errorCode;
  return false;
}

/**
 * Save-draft then Sign must send the server-advanced token, not the pre-save GET version.
 * Stale GET/cache payloads must not decrease the token.
 */
export function nextAdmissionDecisionExpectedVersionAfterMutations(args: {
  hydratedFromGet: number | undefined;
  decisionResponseVersion: number | undefined;
  patchResponseVersion: number | undefined;
  subsequentGetVersion?: number | undefined;
}): number | undefined {
  let token = mergeAdmissionDecisionExpectedVersion(undefined, args.hydratedFromGet);
  token = mergeAdmissionDecisionExpectedVersion(token, args.decisionResponseVersion);
  token = mergeAdmissionDecisionExpectedVersion(token, args.patchResponseVersion);
  token = mergeAdmissionDecisionExpectedVersion(token, args.subsequentGetVersion);
  return token;
}
