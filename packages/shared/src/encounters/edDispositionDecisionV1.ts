/**
 * Disposition decision draft/sign/revision metadata on existing
 * `nursingAssessment.erDispositionV1` JSON — no Prisma migration.
 *
 * Soft save stamps (`signature`) remain for backward compatibility.
 * `documentationStatus` is the legal-record decision state for D1.
 */

import { ER_DISPOSITION_V1_KEY } from "./edEncounterLifecycle.js";

export const EdDispositionDocumentationStatus = {
  DRAFT: "DRAFT",
  SIGNED: "SIGNED",
} as const;

export type EdDispositionDocumentationStatus =
  (typeof EdDispositionDocumentationStatus)[keyof typeof EdDispositionDocumentationStatus];

export type EdDispositionDecisionMeta = {
  documentationStatus: EdDispositionDocumentationStatus | null;
  signedAt: string | null;
  signedByDisplayName: string | null;
  revision: number;
  previousPath: string | null;
  revisionReason: string | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStr(o: Record<string, unknown> | null, key: string): string | null {
  if (!o) return null;
  const v = o[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Read disposition decision metadata from nursingAssessment.erDispositionV1. */
export function readEdDispositionDecisionFromNursingAssessment(
  nursingAssessment: unknown
): EdDispositionDecisionMeta {
  const nursing = asObject(nursingAssessment);
  const ns = asObject(nursing?.[ER_DISPOSITION_V1_KEY]);
  const statusRaw = readStr(ns, "documentationStatus");
  const documentationStatus =
    statusRaw === EdDispositionDocumentationStatus.SIGNED ||
    statusRaw === EdDispositionDocumentationStatus.DRAFT
      ? statusRaw
      : null;
  const revisionRaw = ns?.revision;
  const revision =
    typeof revisionRaw === "number" && Number.isFinite(revisionRaw)
      ? Math.max(0, Math.floor(revisionRaw))
      : typeof revisionRaw === "string" && /^\d+$/.test(revisionRaw.trim())
        ? Math.max(0, parseInt(revisionRaw.trim(), 10))
        : 0;

  return {
    documentationStatus,
    signedAt: readStr(ns, "signedAt"),
    signedByDisplayName: readStr(ns, "signedByDisplayName"),
    revision,
    previousPath: readStr(ns, "previousPath"),
    revisionReason: readStr(ns, "revisionReason"),
  };
}

/**
 * Infer signed when explicit SIGNED status is set, or legacy soft signature exists
 * with a selected disposition path (backward compatible).
 */
export function isEdDispositionDecisionSigned(
  nursingAssessment: unknown,
  dispositionPathSelected: boolean
): boolean {
  const meta = readEdDispositionDecisionFromNursingAssessment(nursingAssessment);
  if (meta.documentationStatus === EdDispositionDocumentationStatus.SIGNED) return true;
  if (meta.documentationStatus === EdDispositionDocumentationStatus.DRAFT) return false;
  // Legacy: soft signature stamp alone does not imply legal sign unless path selected
  // and no explicit DRAFT was ever written — treat as draft for D1 safety.
  void dispositionPathSelected;
  return false;
}

/** Stamp fields excluded from material clinical-event change detection. */
export const ED_DISPOSITION_DECISION_STAMP_KEYS = [
  "signature",
] as const;

const SIGNED_ADMISSION_DECISION_KEYS = [
  "admissionDecisionMode",
  "admissionDecisionAt",
  "admissionDecisionByUserId",
  "admissionDecisionClientRequestId",
  "requestedEncounterType",
] as const;

/**
 * RN / non-provider PATCH must not downgrade or re-attribute a SIGNED provider
 * disposition stored on `nursingAssessment.erDispositionV1`. Nursing-owned keys
 * (handoff, drafts, adaptive execution) are preserved.
 */
export function preserveSignedProviderDispositionOnNursingWrite(
  previousNursingAssessment: unknown,
  incomingNursingAssessment: unknown
): unknown {
  const priorMeta = readEdDispositionDecisionFromNursingAssessment(previousNursingAssessment);
  if (priorMeta.documentationStatus !== EdDispositionDocumentationStatus.SIGNED) {
    return incomingNursingAssessment;
  }
  const priorRoot = asObject(previousNursingAssessment);
  const priorNs = asObject(priorRoot?.[ER_DISPOSITION_V1_KEY]);
  if (!priorNs) return incomingNursingAssessment;

  const incoming = asObject(incomingNursingAssessment);
  if (!incoming) {
    return previousNursingAssessment;
  }
  const nextNs = asObject(incoming[ER_DISPOSITION_V1_KEY]);
  const priorSig = asObject(priorNs.signature);
  const nextSig = asObject(nextNs?.signature);
  return {
    ...incoming,
    [ER_DISPOSITION_V1_KEY]: {
      ...(nextNs ?? {}),
      ...priorNs,
      documentationStatus: EdDispositionDocumentationStatus.SIGNED,
      signedAt: priorMeta.signedAt ?? priorNs.signedAt,
      signedByDisplayName: priorMeta.signedByDisplayName ?? priorNs.signedByDisplayName,
      revision: priorMeta.revision,
      previousPath: priorMeta.previousPath ?? priorNs.previousPath ?? null,
      revisionReason: priorMeta.revisionReason ?? priorNs.revisionReason ?? null,
      signature: priorSig ?? nextSig ?? priorNs.signature,
    },
  };
}

/**
 * RN / non-provider PATCH must not rewrite signed admission/observation decision
 * stamps or destination on `admissionSummaryJson`.
 */
export function preserveSignedAdmissionDecisionOnSummaryWrite(
  previousAdmissionSummary: unknown,
  incomingAdmissionSummary: Record<string, unknown>
): Record<string, unknown> {
  const prior = asObject(previousAdmissionSummary);
  if (!prior) return incomingAdmissionSummary;
  if (String(prior.admissionDecisionMode ?? "").toUpperCase() !== "SIGN") {
    return incomingAdmissionSummary;
  }
  const out: Record<string, unknown> = { ...incomingAdmissionSummary };
  for (const key of SIGNED_ADMISSION_DECISION_KEYS) {
    if (prior[key] !== undefined) {
      out[key] = prior[key];
    }
  }
  return out;
}
