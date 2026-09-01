/**
 * ED.HOSP.1C — canonical Observation vs Inpatient destination-intent projection.
 *
 * Reuses InternalPlacementRequestedEncounterType (OBSERVATION | INPATIENT).
 * Do not add EncounterType.OBSERVATION, a database enum, or a parallel JSON namespace.
 *
 * Precedence (documented in hospitalDestinationIntent.test.ts):
 *   1. explicit requestedEncounterType (DTO arg or admissionSummaryJson)
 *   2. clinicalDestinationContext on the same admission summary (receiving stamp; same dest contract)
 *   3. placement requestedEncounterType when the caller already loaded it
 *   4. legacy observation-like careLevel / admission packet LOC
 *   5. otherwise null (unknown) — callers that must pick a placement default may treat null as INPATIENT
 *
 * Billing classification is a consequence, never an override of explicit clinical dest.
 * Encounter.type is not an input — type INPATIENT does not mean the provider chose admission.
 */

import { inferPlacementEncounterTypeFromCareLevel } from "./admissionSummaryMerge.js";
import type { InternalPlacementRequestedEncounterType } from "./internalPlacementStatusMachine.js";
import { isObservationShortStayCareLevel } from "../observationAdmissionCareLevel.js";

/**
 * Semantic alias only. The durable dest contract is InternalPlacementRequestedEncounterType.
 * Do not introduce a second destination vocabulary.
 */
export type HospitalDestinationIntent = InternalPlacementRequestedEncounterType;

export type HospitalDestinationIntentInput = {
  requestedEncounterType?: string | null;
  placementRequestedEncounterType?: string | null;
  careLevel?: string | null;
  admissionSummaryJson?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseHospitalDestinationIntent(
  raw: string | null | undefined
): HospitalDestinationIntent | null {
  const token = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (token === "OBSERVATION" || token === "INPATIENT") return token;
  return null;
}

function readSummaryDest(admissionSummaryJson: unknown): HospitalDestinationIntent | null {
  const root = asRecord(admissionSummaryJson);
  if (!root) return null;
  const fromRequested = parseHospitalDestinationIntent(
    typeof root.requestedEncounterType === "string" ? root.requestedEncounterType : null
  );
  if (fromRequested) return fromRequested;
  return parseHospitalDestinationIntent(
    typeof root.clinicalDestinationContext === "string" ? root.clinicalDestinationContext : null
  );
}

function readSummaryCareLevel(admissionSummaryJson: unknown, explicit?: string | null): string | null {
  const fromArg = String(explicit ?? "").trim();
  if (fromArg) return fromArg;
  const root = asRecord(admissionSummaryJson);
  if (!root) return null;
  const packet = asRecord(root.admissionPacketV1);
  const fromPacket =
    typeof packet?.levelOfCareCode === "string" && packet.levelOfCareCode.trim()
      ? packet.levelOfCareCode.trim()
      : "";
  if (fromPacket) return fromPacket;
  return typeof root.careLevel === "string" && root.careLevel.trim() ? root.careLevel.trim() : null;
}

/** Centralized observation-like LOC detection (1B heuristics + short-stay FR/EN aliases). */
export function isObservationLikeCareLevel(careLevel: string | null | undefined): boolean {
  const raw = String(careLevel ?? "").trim();
  if (!raw) return false;
  if (isObservationShortStayCareLevel(raw)) return true;
  return inferPlacementEncounterTypeFromCareLevel(raw) === "OBSERVATION";
}

/**
 * Resolve provider/hospital destination intent from durable authorities.
 * Does not read Encounter.type or billingClassification.
 */
export function resolveHospitalDestinationIntent(
  input: HospitalDestinationIntentInput
): HospitalDestinationIntent | null {
  const explicit =
    parseHospitalDestinationIntent(input.requestedEncounterType) ??
    readSummaryDest(input.admissionSummaryJson);
  if (explicit) return explicit;

  const fromPlacement = parseHospitalDestinationIntent(input.placementRequestedEncounterType);
  if (fromPlacement) return fromPlacement;

  const careLevel = readSummaryCareLevel(input.admissionSummaryJson, input.careLevel);
  if (!careLevel) return null;
  if (isObservationLikeCareLevel(careLevel)) return "OBSERVATION";
  return "INPATIENT";
}

export function isObservationHospitalDestinationIntent(
  input: HospitalDestinationIntentInput
): boolean {
  return resolveHospitalDestinationIntent(input) === "OBSERVATION";
}

/**
 * Billing classification follows destination intent (identity map).
 * Encounter.type INPATIENT must not force INPATIENT billing when dest is OBSERVATION.
 */
export function projectBillingClassificationForHospitalDestination(
  input: HospitalDestinationIntentInput & { billingClassification?: string | null }
): "OBSERVATION" | "INPATIENT" | null {
  const dest = resolveHospitalDestinationIntent(input);
  if (dest === "OBSERVATION" || dest === "INPATIENT") return dest;
  const billing = String(input.billingClassification ?? "")
    .trim()
    .toUpperCase();
  if (billing === "OBSERVATION" || billing === "INPATIENT") return billing;
  return null;
}

/**
 * Observation operations / receiving OBS charts: dest OBS even when Encounter.type is INPATIENT.
 * Ordinary inpatient admission (dest INPATIENT) is never classified as observation.
 * Billing OBS is a fallback only when dest intent is unknown — never overrides explicit dest.
 */
export function isObservationOperationalStay(input: {
  encounterType?: string | null;
  status?: string | null;
  requestedEncounterType?: string | null;
  placementRequestedEncounterType?: string | null;
  careLevel?: string | null;
  admissionSummaryJson?: unknown;
  billingClassification?: string | null;
}): boolean {
  const type = String(input.encounterType ?? "")
    .trim()
    .toUpperCase();
  if (type !== "INPATIENT") return false;
  const status = String(input.status ?? "")
    .trim()
    .toUpperCase();
  if (status && status !== "OPEN") return false;

  const dest = resolveHospitalDestinationIntent({
    requestedEncounterType: input.requestedEncounterType,
    placementRequestedEncounterType: input.placementRequestedEncounterType,
    careLevel: input.careLevel,
    admissionSummaryJson: input.admissionSummaryJson,
  });
  if (dest === "OBSERVATION") return true;
  if (dest === "INPATIENT") return false;
  return (
    String(input.billingClassification ?? "")
      .trim()
      .toUpperCase() === "OBSERVATION"
  );
}

/**
 * Same editability as Admission Observation Decision Board:
 * dest may change only when there is no placement, or status is DRAFT / SIGNED.
 * Does not alter the placement state machine.
 */
export function isInternalPlacementDestinationLocked(status?: string | null): boolean {
  const s = String(status ?? "")
    .trim()
    .toUpperCase();
  if (!s) return false;
  return s !== "DRAFT" && s !== "SIGNED";
}

/** Placement-create default when dest intent is unknown: keep historical INPATIENT fallback. */
export function hospitalDestinationIntentForPlacementCreate(
  input: HospitalDestinationIntentInput
): HospitalDestinationIntent {
  return resolveHospitalDestinationIntent(input) ?? "INPATIENT";
}

const NON_HOSPITAL_ED_DESTINATION_TOKENS = new Set([
  "HOME",
  "DISCHARGE",
  "DISCHARGE_HOME",
  "TRANSFER",
  "TRANSFER_EXTERNAL",
  "AMA",
  "LWBS",
  "ELOPEMENT",
  "ELOPED",
  "DECEASED",
  "DEATH",
  "OTHER",
]);

function signedAdmissionDecisionIsSupersededOrCanceled(root: Record<string, unknown>): boolean {
  if (root.admissionDecisionCanceled === true || root.admissionDecisionSuperseded === true) {
    return true;
  }
  const status = String(root.admissionDecisionStatus ?? "")
    .trim()
    .toUpperCase();
  return status === "CANCELED" || status === "CANCELLED" || status === "SUPERSEDED";
}

/**
 * Signed ED Observation/Admission only. Explicit dest token — never Home/AMA/Transfer
 * and never the INPATIENT fallback used at live SIGN time.
 */
export function signedHospitalBoundEdDisposition(
  admissionSummaryJson: unknown
): HospitalDestinationIntent | null {
  const root = asRecord(admissionSummaryJson);
  if (!root) return null;
  const mode = String(root.admissionDecisionMode ?? "")
    .trim()
    .toUpperCase();
  if (mode !== "SIGN") return null;
  if (signedAdmissionDecisionIsSupersededOrCanceled(root)) return null;
  const destRaw =
    typeof root.requestedEncounterType === "string"
      ? root.requestedEncounterType.trim().toUpperCase()
      : "";
  if (!destRaw || NON_HOSPITAL_ED_DESTINATION_TOKENS.has(destRaw)) return null;
  return parseHospitalDestinationIntent(destRaw);
}

export function signedHospitalBoundEdDecisionSignerUserId(
  admissionSummaryJson: unknown
): string | null {
  const root = asRecord(admissionSummaryJson);
  if (!root) return null;
  const signer = String(root.admissionDecisionByUserId ?? "").trim();
  return signer || null;
}

export function signedHospitalBoundEdDecisionAt(
  admissionSummaryJson: unknown
): Date | null {
  const root = asRecord(admissionSummaryJson);
  if (!root) return null;
  const raw = String(root.admissionDecisionAt ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type SignedHospitalBoundEdPlacementReconcileCandidate = {
  requestedEncounterType: HospitalDestinationIntent;
  signerUserId: string;
  decisionAt: Date;
};

/**
 * Historical placement backfill eligibility. Requires an explicit signed hospital dest,
 * original provider signer, and original decision timestamp. Does not infer dest.
 */
export function signedHospitalBoundEdPlacementReconcileCandidate(
  admissionSummaryJson: unknown
): SignedHospitalBoundEdPlacementReconcileCandidate | null {
  const dest = signedHospitalBoundEdDisposition(admissionSummaryJson);
  const signerUserId = signedHospitalBoundEdDecisionSignerUserId(admissionSummaryJson);
  const decisionAt = signedHospitalBoundEdDecisionAt(admissionSummaryJson);
  if (!dest || !signerUserId || !decisionAt) return null;
  return { requestedEncounterType: dest, signerUserId, decisionAt };
}
