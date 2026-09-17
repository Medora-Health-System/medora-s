/**
 * Optional patient-portal / diagnostic-release storage may be absent on a
 * facility that has not applied those migrations yet. Roster and workspace
 * reads must keep serving authoritative Patient + Encounter data instead of
 * collapsing the whole Digital Care board into a 500.
 */
export const PATIENT_PORTAL_INACTIVE_MESSAGE = "Patient portal is not active for this patient.";
export const SECURE_MESSAGING_STORAGE_UNAVAILABLE_MESSAGE =
  "Secure messaging storage is unavailable.";

export function isHttpLikeError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "getStatus" in error &&
      typeof (error as { getStatus?: unknown }).getStatus === "function",
  );
}

export function isOptionalPortalStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isHttpLikeError(error)) return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = error instanceof Error ? error.message : String(error);
  const meta =
    "meta" in error && (error as { meta?: unknown }).meta
      ? JSON.stringify((error as { meta?: unknown }).meta)
      : "";
  const haystack = `${code} ${message} ${meta}`.toLowerCase();
  return (
    code === "P2021" ||
    code === "P2010" ||
    haystack.includes("42p01") ||
    haystack.includes("does not exist") ||
    haystack.includes("patientportalmessagethread") ||
    haystack.includes("patientportalmessage") ||
    haystack.includes("patientportallink") ||
    haystack.includes("patientportalaccount") ||
    haystack.includes("patientdiagnosticresultrelease")
  );
}
