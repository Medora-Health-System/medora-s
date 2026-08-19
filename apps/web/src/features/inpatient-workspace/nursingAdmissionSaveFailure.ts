/**
 * MEDUI.INP.2B.2B — Classify Nursing Admission save failures for bedside copy.
 * Never surface canonical backend codes to nurses.
 */

export type NursingAdmissionSaveFailureKind =
  | "NETWORK"
  | "CONFLICT"
  | "AUTH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SERVER"
  | "AUTHORITATIVE_DOMAIN"
  | "VALIDATION"
  | "PRELOAD"
  | "UNKNOWN";

function readStatus(err: unknown): number {
  if (typeof err === "object" && err && "status" in err) {
    const n = Number((err as { status?: number }).status);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function readCode(err: unknown): string | null {
  if (typeof err !== "object" || !err) return null;
  const rec = err as { errorCode?: unknown; body?: unknown };
  if (typeof rec.errorCode === "string" && rec.errorCode.trim()) {
    return rec.errorCode.trim();
  }
  const body = rec.body;
  if (body && typeof body === "object") {
    const o = body as { code?: unknown; errorCode?: unknown; message?: unknown };
    if (typeof o.errorCode === "string" && o.errorCode.trim()) return o.errorCode.trim();
    if (typeof o.code === "string" && o.code.trim()) return o.code.trim();
    if (o.message && typeof o.message === "object") {
      const nested = o.message as { code?: unknown };
      if (typeof nested.code === "string" && nested.code.trim()) return nested.code.trim();
    }
  }
  return null;
}

function looksLikeNetwork(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /failed to fetch|network error|err_network|econnrefused|enotfound|unable to reach the server|erreur de communication/i.test(
    msg
  );
}

export function classifyNursingAdmissionSaveFailure(err: unknown): {
  kind: NursingAdmissionSaveFailureKind;
  code: string | null;
  status: number;
} {
  const status = readStatus(err);
  const code = readCode(err);
  if (status === 409 || code === "EXPECTED_VERSION_CONFLICT") {
    return { kind: "CONFLICT", code: code ?? "EXPECTED_VERSION_CONFLICT", status: status || 409 };
  }
  if (status === 401) {
    return { kind: "AUTH", code, status };
  }
  if (status === 403) {
    return { kind: "FORBIDDEN", code, status };
  }
  if (status === 404) {
    return { kind: "NOT_FOUND", code, status };
  }
  if (status >= 500) {
    return { kind: "SERVER", code, status };
  }
  if (code === "AUTHORITATIVE_DOMAIN_RECORD_REQUIRED" || code === "NURSING_SECTION_AUTHORITATIVE_RECORD_REQUIRED") {
    return { kind: "AUTHORITATIVE_DOMAIN", code, status: status || 400 };
  }
  if (code === "PRELOAD_ITEM_NOT_FOUND") {
    return { kind: "PRELOAD", code, status: status || 400 };
  }
  if (
    code === "SECTION_VALIDATION_FAILED" ||
    (status >= 400 && status < 500 && status !== 0)
  ) {
    return { kind: "VALIDATION", code, status };
  }
  if (status === 0 && looksLikeNetwork(err)) {
    return { kind: "NETWORK", code, status: 0 };
  }
  if (status === 0 && !code) {
    return { kind: "NETWORK", code, status: 0 };
  }
  return { kind: "UNKNOWN", code, status };
}

export function nursingAdmissionSaveFailureMessageKey(
  kind: NursingAdmissionSaveFailureKind
): string {
  switch (kind) {
    case "NETWORK":
      return "inpatientAdmissionInp2b2a.saveNetwork";
    case "AUTHORITATIVE_DOMAIN":
      return "inpatientAdmissionInp2b2a.saveDomainLink";
    case "VALIDATION":
      return "inpatientAdmissionInp2b2a.saveValidation";
    case "PRELOAD":
      return "inpatientAdmissionInp2b2a.savePreloadConfirm";
    case "AUTH":
      return "inpatientAdmissionInp2b2a.saveAuth";
    case "FORBIDDEN":
      return "inpatientAdmissionInp2b2a.saveForbidden";
    case "NOT_FOUND":
      return "inpatientAdmissionInp2b2a.saveNotFound";
    case "SERVER":
      return "inpatientAdmissionInp2b2a.saveServer";
    case "CONFLICT":
      return "inpatientAdmissionInp2b2a.conflict.body";
    default:
      return "inpatientAdmissionInp2b2a.saveFailed";
  }
}
