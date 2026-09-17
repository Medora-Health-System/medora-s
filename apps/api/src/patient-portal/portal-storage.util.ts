/**
 * Optional patient-portal / diagnostic-release storage may be absent on a
 * facility that has not applied those migrations yet. Roster and workspace
 * reads must keep serving authoritative Patient + Encounter data instead of
 * collapsing the whole Digital Care board into a 500.
 *
 * Only missing optional portal/release relations may degrade. Syntax errors,
 * permission failures, malformed SQL, timeouts, and connectivity errors remain
 * real server failures.
 */
export const PATIENT_PORTAL_INACTIVE_MESSAGE = "Patient portal is not active for this patient.";
export const SECURE_MESSAGING_STORAGE_UNAVAILABLE_MESSAGE =
  "Secure messaging storage is unavailable.";

export const OPTIONAL_PORTAL_STORAGE_RELATIONS = [
  "PatientPortalMessageThread",
  "PatientPortalMessage",
  "PatientPortalLink",
  "PatientPortalAccount",
  "PatientDiagnosticResultRelease",
] as const;

export function isHttpLikeError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "getStatus" in error &&
      typeof (error as { getStatus?: unknown }).getStatus === "function",
  );
}

function errorParts(error: unknown): { code: string; haystack: string } {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  const message = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : String(error ?? "");
  const meta =
    error && typeof error === "object" && "meta" in error && (error as { meta?: unknown }).meta
      ? JSON.stringify((error as { meta?: unknown }).meta)
      : "";
  return { code, haystack: `${code} ${message} ${meta}`.toLowerCase() };
}

function mentionsOptionalPortalRelation(haystack: string): boolean {
  return OPTIONAL_PORTAL_STORAGE_RELATIONS.some((name) => haystack.includes(name.toLowerCase()));
}

function isUnrelatedInfrastructureFailure(code: string, haystack: string): boolean {
  if (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "P2024" ||
    code === "42601" ||
    code === "42501" ||
    code === "57014" ||
    code === "08006" ||
    code === "08001"
  ) {
    return true;
  }
  return (
    haystack.includes("syntax error") ||
    haystack.includes("permission denied") ||
    haystack.includes("malformed") ||
    haystack.includes("timeout") ||
    haystack.includes("timed out") ||
    haystack.includes("connection refused") ||
    haystack.includes("econnrefused") ||
    haystack.includes("etimedout") ||
    haystack.includes("can't reach database") ||
    haystack.includes("cannot reach database") ||
    haystack.includes("too many connections")
  );
}

function isMissingRelationOrTable(haystack: string): boolean {
  return (
    haystack.includes("42p01") ||
    haystack.includes("does not exist") ||
    haystack.includes("do not exist") ||
    (haystack.includes("relation") && haystack.includes("exist")) ||
    (haystack.includes("table") && (haystack.includes("does not exist") || haystack.includes("not found")))
  );
}

export function isOptionalPortalStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isHttpLikeError(error)) return false;
  const { code, haystack } = errorParts(error);
  if (isUnrelatedInfrastructureFailure(code, haystack)) return false;
  if (!mentionsOptionalPortalRelation(haystack)) return false;
  if (code === "P2021") return true;
  if (code === "42P01" || haystack.includes("42p01")) return true;
  if (code === "P2010") return isMissingRelationOrTable(haystack);
  return isMissingRelationOrTable(haystack);
}
