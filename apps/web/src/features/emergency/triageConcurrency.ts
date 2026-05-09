/**
 * Stable code returned by the API when a triage save is rejected because the caller's
 * `lastKnownTriageUpdatedAt` token no longer matches the current row AND the save would
 * materially change non-vitals flat fields. Mirrors `TRIAGE_CONCURRENT_MODIFICATION_CODE`
 * from `apps/api/src/triage/triage-concurrency.util.ts`.
 *
 * The code is included in the 409 JSON body's `message` field so it propagates through the
 * shared `apiFetch` error path (which extracts `message` and re-throws as `Error`). Callers
 * use `isTriageStaleConflictError` to tell this case apart from a generic save failure and
 * surface a localized refresh prompt instead of a generic error.
 */
export const TRIAGE_CONCURRENT_MODIFICATION_CODE = "TRIAGE_CONCURRENT_MODIFICATION";

export function isTriageStaleConflictError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return typeof msg === "string" && msg.includes(TRIAGE_CONCURRENT_MODIFICATION_CODE);
}
