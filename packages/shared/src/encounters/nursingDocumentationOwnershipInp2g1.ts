/**
 * MEDUI.INP.2G.1 — Owner-controlled correction for Nursing Admission & Assessment.
 *
 * Ownership is NEVER derived from assigned RN / shift assignment.
 * Additive JSON only — no Prisma migration / no parallel stores.
 */

import type { MedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import type { InpatientNursingAssessmentV1 } from "./inpatientNursingAssessmentV1.js";

export const NURSING_ADMISSION_NOT_DOCUMENT_OWNER =
  "NURSING_ADMISSION_NOT_DOCUMENT_OWNER" as const;
/** Signed document with no resolvable signedByUserId / documentOwnerUserId — never claimable. */
export const NURSING_ADMISSION_OWNER_UNRESOLVED =
  "NURSING_ADMISSION_OWNER_UNRESOLVED" as const;
export const NURSING_ASSESSMENT_DRAFT_NOT_OWNER =
  "NURSING_ASSESSMENT_DRAFT_NOT_OWNER" as const;
export const NURSING_ASSESSMENT_CORRECTION_NOT_OWNER =
  "NURSING_ASSESSMENT_CORRECTION_NOT_OWNER" as const;
export const NURSING_ASSESSMENT_CORRECTION_INVALID =
  "NURSING_ASSESSMENT_CORRECTION_INVALID" as const;

export const NURSING_ADMISSION_CORRECTION_REASONS = [
  "DOCUMENTATION_ERROR",
  "INCORRECT_VALUE",
  "INFORMATION_CLARIFIED",
  "LATE_ENTRY",
  "OTHER",
] as const;

export type NursingAdmissionCorrectionReason =
  (typeof NURSING_ADMISSION_CORRECTION_REASONS)[number];

/** Doc slice used by the owner resolver (avoid requiring a full document). */
export type NursingAdmissionOwnershipSlice = {
  documentOwnerUserId?: string | null;
  nurseSignature?: {
    signed?: boolean | null;
    signedByUserId?: string | null;
  } | null;
};

/**
 * resolveNursingAdmissionDocumentOwner(doc):
 *   if signed && signedByUserId → that userId
 *   else if documentOwnerUserId → that userId
 *   else null (unowned / claimable on first RN write)
 */
export function resolveNursingAdmissionDocumentOwner(
  doc: NursingAdmissionOwnershipSlice | null | undefined,
): string | null {
  const signed = Boolean(doc?.nurseSignature?.signed);
  const signer = doc?.nurseSignature?.signedByUserId?.trim() || null;
  if (signed && signer) return signer;
  const owner = doc?.documentOwnerUserId?.trim() || null;
  return owner || null;
}

/** Signed without a resolvable owner — READ ONLY / OWNER UNRESOLVED (never infer from assignment). */
export function isNursingAdmissionOwnerUnresolved(
  doc: NursingAdmissionOwnershipSlice | null | undefined,
): boolean {
  const signed = Boolean(doc?.nurseSignature?.signed);
  if (!signed) return false;
  return resolveNursingAdmissionDocumentOwner(doc) == null;
}

export function isNursingAdmissionDocumentOwner(
  doc: NursingAdmissionOwnershipSlice | null | undefined,
  actorUserId: string,
): boolean {
  const actor = String(actorUserId ?? "").trim();
  if (!actor) return false;
  // Signed + unresolved owner is never claimable and never writable by inference.
  if (isNursingAdmissionOwnerUnresolved(doc)) return false;
  const owner = resolveNursingAdmissionDocumentOwner(doc);
  if (!owner) return true; // unsigned + unowned → claimable on first RN write
  return owner === actor;
}

/**
 * First successful RN section draft write stamps immutable documentOwnerUserId.
 * Never transfers on shift change / assignment / later writers.
 */
export function stampNursingAdmissionDocumentOwnerOnDraftWrite<
  T extends Pick<MedSurgNursingAdmissionDocV1, "documentOwnerUserId">,
>(doc: T, actorUserId: string): T {
  const actor = String(actorUserId ?? "").trim();
  if (!actor) return doc;
  if (doc.documentOwnerUserId?.trim()) return doc;
  return { ...doc, documentOwnerUserId: actor };
}

export function assertNursingAdmissionOwnerWrite(input: {
  doc: NursingAdmissionOwnershipSlice;
  actorUserId: string;
}):
  | { ok: true }
  | {
      ok: false;
      code:
        | typeof NURSING_ADMISSION_NOT_DOCUMENT_OWNER
        | typeof NURSING_ADMISSION_OWNER_UNRESOLVED;
    } {
  if (isNursingAdmissionOwnerUnresolved(input.doc)) {
    return { ok: false, code: NURSING_ADMISSION_OWNER_UNRESOLVED };
  }
  if (isNursingAdmissionDocumentOwner(input.doc, input.actorUserId)) {
    return { ok: true };
  }
  return { ok: false, code: NURSING_ADMISSION_NOT_DOCUMENT_OWNER };
}

/** DRAFT / SAVED count as unsigned working copies owned by authorUserId. */
export function isInpatientNursingAssessmentUnsignedWorkingCopy(
  status: InpatientNursingAssessmentV1["status"] | null | undefined,
): boolean {
  return status === "DRAFT" || status === "SAVED";
}

export function isInpatientNursingAssessmentFinalized(
  status: InpatientNursingAssessmentV1["status"] | null | undefined,
): boolean {
  return status === "SIGNED" || status === "FINAL";
}

/**
 * When latest is an unsigned working copy by another author → deny write
 * (including starting a competing episode). Other RNs may start new episodes
 * only after latest is SIGNED/FINAL.
 */
export function assertInpatientNursingAssessmentWriteAllowed(input: {
  latest: Pick<InpatientNursingAssessmentV1, "status" | "authorUserId" | "sessionId"> | null | undefined;
  actorUserId: string;
  /** When correcting a prior session, skip the "latest draft lock" only after linkage validates. */
  isCorrection?: boolean;
}):
  | { ok: true }
  | { ok: false; code: typeof NURSING_ASSESSMENT_DRAFT_NOT_OWNER } {
  const actor = String(input.actorUserId ?? "").trim();
  const latest = input.latest;
  if (!latest) return { ok: true };
  if (input.isCorrection) return { ok: true };
  if (
    isInpatientNursingAssessmentUnsignedWorkingCopy(latest.status) &&
    latest.authorUserId !== actor
  ) {
    return { ok: false, code: NURSING_ASSESSMENT_DRAFT_NOT_OWNER };
  }
  return { ok: true };
}

export function assertInpatientNursingAssessmentCorrection(input: {
  actorUserId: string;
  correctionOfSessionId?: string | null;
  correctionReason?: string | null;
  /** Authoritative prior sessions (events + latest). */
  sessions: Array<Pick<InpatientNursingAssessmentV1, "sessionId" | "authorUserId" | "status">>;
}):
  | {
      ok: true;
      correctionOfSessionId: string;
      correctionReason: string;
      source: Pick<InpatientNursingAssessmentV1, "sessionId" | "authorUserId" | "status">;
    }
  | {
      ok: false;
      code:
        | typeof NURSING_ASSESSMENT_CORRECTION_INVALID
        | typeof NURSING_ASSESSMENT_CORRECTION_NOT_OWNER;
    } {
  const correctionOfSessionId = String(input.correctionOfSessionId ?? "").trim();
  const correctionReason = String(input.correctionReason ?? "").trim();
  if (!correctionOfSessionId && !correctionReason) {
    return { ok: false, code: NURSING_ASSESSMENT_CORRECTION_INVALID };
  }
  if (!correctionOfSessionId || !correctionReason) {
    return { ok: false, code: NURSING_ASSESSMENT_CORRECTION_INVALID };
  }
  const source = input.sessions.find((s) => s.sessionId === correctionOfSessionId);
  if (!source) {
    return { ok: false, code: NURSING_ASSESSMENT_CORRECTION_INVALID };
  }
  // Never allow "correcting session A by mutating session B" — linkage must match exact session.
  if (source.sessionId !== correctionOfSessionId) {
    return { ok: false, code: NURSING_ASSESSMENT_CORRECTION_INVALID };
  }
  const actor = String(input.actorUserId ?? "").trim();
  if (source.authorUserId !== actor) {
    return { ok: false, code: NURSING_ASSESSMENT_CORRECTION_NOT_OWNER };
  }
  return {
    ok: true,
    correctionOfSessionId,
    correctionReason,
    source,
  };
}
