/**
 * MEDUI.INP.2G.2 — Canonical Nursing Admission clinical attribution.
 *
 * Completed by  ← documentOwnerUserId (+ display when same as signer)
 * Completed at  ← clinicalDocumentedAt, else last section write at/before signedAt
 * Signed by     ← nurseSignature.displayName / credentials / signedByUserId
 * Signed at     ← nurseSignature.signedAt
 *
 * Never invent identity from assignment or current session.
 * Never project UUIDs to clinicians.
 */

import type { MedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import { nursingDocAmendments } from "./nursingAdmissionDomainIntegrationD4a25a.js";

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export function clinicianFacingDisplayName(raw?: string | null): string | null {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) return null;
  if (looksLikeUuid(name)) return null;
  if (name.toLowerCase() === "medora platform") return null;
  return name;
}

export type NursingAdmissionAttributionLineV1 = {
  displayName: string | null;
  credentials: string | null;
  atIso: string | null;
  /** Persisted user id — never render in clinician UI */
  userId: string | null;
};

export type NursingAdmissionClinicalAttributionV1 = {
  completed: NursingAdmissionAttributionLineV1;
  signed: NursingAdmissionAttributionLineV1;
  latestCorrection: (NursingAdmissionAttributionLineV1 & { reason: string | null }) | null;
  hasCorrections: boolean;
};

function isIso(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

/**
 * Last persisted section write at or before the signature clock.
 * Used only when clinicalDocumentedAt was never set — reconstructs from section audit, not assignment.
 */
export function resolveNursingAdmissionCompletionTimestamp(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined
): string | null {
  if (!doc) return null;
  if (isIso(doc.clinicalDocumentedAt)) return doc.clinicalDocumentedAt;
  const signedAt = doc.nurseSignature?.signed ? doc.nurseSignature.signedAt : null;
  const signedMs = isIso(signedAt) ? Date.parse(signedAt) : null;
  let best: string | null = null;
  let bestMs = -Infinity;
  const sections = doc.sections ?? {};
  for (const sec of Object.values(sections)) {
    if (!sec || typeof sec !== "object") continue;
    const at = (sec as { updatedAt?: string | null }).updatedAt;
    if (!isIso(at)) continue;
    const ms = Date.parse(at);
    if (signedMs != null && ms > signedMs) continue; // exclude post-sign correction writes
    if (ms >= bestMs) {
      bestMs = ms;
      best = at;
    }
  }
  return best;
}

export function projectNursingAdmissionClinicalAttribution(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined
): NursingAdmissionClinicalAttributionV1 {
  const empty: NursingAdmissionAttributionLineV1 = {
    displayName: null,
    credentials: null,
    atIso: null,
    userId: null,
  };
  if (!doc) {
    return { completed: empty, signed: empty, latestCorrection: null, hasCorrections: false };
  }

  const sig = doc.nurseSignature;
  const signed: NursingAdmissionAttributionLineV1 =
    sig?.signed === true
      ? {
          displayName: clinicianFacingDisplayName(sig.displayName ?? null),
          credentials:
            typeof sig.credentials === "string" && sig.credentials.trim()
              ? sig.credentials.trim()
              : null,
          atIso: isIso(sig.signedAt) ? sig.signedAt : null,
          userId: typeof sig.signedByUserId === "string" ? sig.signedByUserId : null,
        }
      : empty;

  const ownerId =
    typeof doc.documentOwnerUserId === "string" && doc.documentOwnerUserId.trim()
      ? doc.documentOwnerUserId.trim()
      : null;

  // Display name for completion author: only from persisted clinician label when owner === signer
  // (signature carries the authoritative display snapshot). Never show UUID.
  const ownerMatchesSigner =
    Boolean(ownerId) && Boolean(signed.userId) && ownerId === signed.userId;
  const completed: NursingAdmissionAttributionLineV1 = {
    userId: ownerId ?? (signed.userId && sig?.signed ? signed.userId : null),
    displayName:
      ownerMatchesSigner || (!ownerId && signed.userId) ? signed.displayName : null,
    credentials:
      ownerMatchesSigner || (!ownerId && signed.userId) ? signed.credentials : null,
    atIso: resolveNursingAdmissionCompletionTimestamp(doc),
  };

  const amendments = nursingDocAmendments(doc);
  const corrections = amendments.filter((a) => a.type === "CORRECTION");
  const last = corrections.length ? corrections[corrections.length - 1] : null;
  const latestCorrection = last
    ? {
        userId: typeof last.createdByUserId === "string" ? last.createdByUserId : null,
        displayName:
          last.createdByUserId && signed.userId && last.createdByUserId === signed.userId
            ? signed.displayName
            : clinicianFacingDisplayName(
                typeof (last as { displayName?: string | null }).displayName === "string"
                  ? (last as { displayName?: string | null }).displayName
                  : null
              ),
        credentials: (
          typeof last.credentials === "string" && last.credentials.trim()
            ? last.credentials.trim()
            : null
        ) ?? (
          last.createdByUserId && signed.userId && last.createdByUserId === signed.userId
            ? signed.credentials
            : null
        ),
        atIso: isIso(last.createdAt) ? last.createdAt : null,
        reason: typeof last.reason === "string" && last.reason.trim() ? last.reason.trim() : null,
      }
    : null;

  return {
    completed,
    signed,
    latestCorrection,
    hasCorrections: corrections.length > 0,
  };
}

/** Format "Name, RN" for UI (caller localizes date/time separately). */
export function formatNursingAdmissionAttributionClinician(
  line: NursingAdmissionAttributionLineV1
): string | null {
  const name = line.displayName?.trim() || null;
  if (!name) return null;
  const cred = line.credentials?.trim();
  return cred ? `${name}, ${cred}` : name;
}
