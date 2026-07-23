/**
 * D4A.2.8-HF1 — Map bootstrap client failures to stable UI categories.
 * Never surface raw Prisma / SQL to clinicians.
 */

import type { EncounterResolutionFailureCategory } from "@medora/shared";

export function classifyInpatientBootstrapClientError(
  err: unknown
): EncounterResolutionFailureCategory {
  if (err == null) return "NETWORK";

  const e = err as {
    status?: number;
    errorCode?: string | null;
    message?: string;
    name?: string;
  };
  const status = typeof e.status === "number" ? e.status : null;
  const code = String(e.errorCode ?? "").toUpperCase();
  const msg = String(e.message ?? "").toUpperCase();

  if (
    code.includes("SCHEMA") ||
    code.includes("DIRECT_ADMISSION_SCHEMA") ||
    msg.includes("SCHEMA_COMPATIBILITY") ||
    msg.includes("HOSPITALEPISODEID")
  ) {
    return "SCHEMA_COMPATIBILITY";
  }

  if (status === 401 || code === "UNAUTHORIZED") return "UNAUTHORIZED";
  if (status === 403 || code === "FORBIDDEN") return "FORBIDDEN";
  if (status === 404 || code === "NOT_FOUND") return "NOT_FOUND";
  if (
    status === 409 ||
    code === "ENCOUNTER_TYPE_MISMATCH" ||
    code === "WRONG_ENCOUNTER_TYPE" ||
    msg.includes("ENCOUNTER_TYPE_MISMATCH")
  ) {
    return "ENCOUNTER_TYPE_MISMATCH";
  }
  if (status === 503 && (code.includes("SCHEMA") || msg.includes("SCHEMA"))) {
    return "SCHEMA_COMPATIBILITY";
  }
  if (status != null && status >= 500) return "SERVER_ERROR";

  // Fetch / connectivity failures typically have no HTTP status.
  if (status == null) return "NETWORK";
  return "SERVER_ERROR";
}
