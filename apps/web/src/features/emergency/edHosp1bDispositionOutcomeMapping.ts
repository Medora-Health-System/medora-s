/**
 * ED.HOSP.1B — canonical UI mapping for ED disposition outcomes.
 * Presentation / provider-intent only. Does not change billing, close, or type-flip.
 */

import { inferPlacementEncounterTypeFromCareLevel } from "@medora/shared";
import type { ErDispositionOutcomeUi } from "./emergencyDispositionV1";

/** Provider-facing outcome order on the ED disposition board. */
export const ED_HOSP_1B_PROVIDER_OUTCOMES = [
  "HOME",
  "OBSERVATION",
  "ADMISSION",
  "TRANSFER",
  "AMA",
  "LWBS",
  "ELOPEMENT",
  "DECEASED",
  "OTHER",
] as const satisfies readonly ErDispositionOutcomeUi[];

export type EdHosp1bProviderOutcome = (typeof ED_HOSP_1B_PROVIDER_OUTCOMES)[number];

/** Engine path used by resolveEdDispositionPath / EMTALA / print routing — OBSERVATION stays ADMISSION. */
export type CanonicalEdDispositionEnginePath = Exclude<ErDispositionOutcomeUi, "OBSERVATION">;

export type EdPlacementRequestedEncounterType = "OBSERVATION" | "INPATIENT";

export type InferOutcomeUiHints = {
  careLevel?: string | null;
  requestedEncounterType?: string | null;
};

export function canonicalEdDispositionEnginePath(
  outcome: ErDispositionOutcomeUi
): CanonicalEdDispositionEnginePath {
  if (outcome === "OBSERVATION") return "ADMISSION";
  return outcome;
}

export function isAdmissionDecisionOutcome(outcome: ErDispositionOutcomeUi): boolean {
  return outcome === "ADMISSION" || outcome === "OBSERVATION";
}

export function requestedEncounterTypeForOutcomeUi(
  outcome: ErDispositionOutcomeUi
): EdPlacementRequestedEncounterType | null {
  if (outcome === "OBSERVATION") return "OBSERVATION";
  if (outcome === "ADMISSION") return "INPATIENT";
  return null;
}

/** True when persisted admission/placement intent is observation (not inpatient). */
export function isObservationPlacementIntent(hints?: InferOutcomeUiHints | null): boolean {
  const requested = String(hints?.requestedEncounterType ?? "")
    .trim()
    .toUpperCase();
  if (requested === "OBSERVATION") return true;
  if (requested === "INPATIENT") return false;
  return inferPlacementEncounterTypeFromCareLevel(hints?.careLevel) === "OBSERVATION";
}

/**
 * Legacy admission packet careLevel for flag-OFF compatibility.
 * OBSERVATION → OBSERVATION; ADMISSION → keep non-obs LOC or MEDICAL_SURGICAL.
 */
export function legacyCareLevelForOutcomeUi(
  outcome: ErDispositionOutcomeUi,
  currentCareLevel?: string | null
): string | null {
  const current = String(currentCareLevel ?? "").trim();
  if (outcome === "OBSERVATION") {
    if (current && inferPlacementEncounterTypeFromCareLevel(current) === "OBSERVATION") {
      return current;
    }
    return "OBSERVATION";
  }
  if (outcome === "ADMISSION") {
    if (current && inferPlacementEncounterTypeFromCareLevel(current) === "INPATIENT") {
      return current;
    }
    return "MEDICAL_SURGICAL";
  }
  return null;
}

export function inferOutcomeHintsFromAdmissionSummary(admissionSummaryJson: unknown): InferOutcomeUiHints {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object" || Array.isArray(admissionSummaryJson)) {
    return {};
  }
  const root = admissionSummaryJson as Record<string, unknown>;
  const packet =
    root.admissionPacketV1 && typeof root.admissionPacketV1 === "object" && !Array.isArray(root.admissionPacketV1)
      ? (root.admissionPacketV1 as Record<string, unknown>)
      : null;
  const careLevel =
    (typeof packet?.levelOfCareCode === "string" && packet.levelOfCareCode.trim()) ||
    (typeof root.careLevel === "string" && root.careLevel.trim()) ||
    null;
  const requestedEncounterType =
    typeof root.requestedEncounterType === "string" && root.requestedEncounterType.trim()
      ? root.requestedEncounterType
      : null;
  return { careLevel, requestedEncounterType };
}

/**
 * Same editability as AdmissionObservationDecisionBoard formLocked:
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

export function committedPlacementRequestedEncounterType(
  placement?: { requestedEncounterType?: string | null } | null
): EdPlacementRequestedEncounterType | null {
  const raw = String(placement?.requestedEncounterType ?? "")
    .trim()
    .toUpperCase();
  if (raw === "OBSERVATION") return "OBSERVATION";
  if (raw === "INPATIENT") return "INPATIENT";
  return null;
}

/** True when OBSERVATION ↔ ADMISSION would conflict with an already committed placement dest. */
export function isObservationAdmissionDestinationSwitchBlocked(input: {
  placementStatus?: string | null;
  placementRequestedEncounterType?: string | null;
  nextOutcome: ErDispositionOutcomeUi;
}): boolean {
  if (!isInternalPlacementDestinationLocked(input.placementStatus)) return false;
  const nextDest = requestedEncounterTypeForOutcomeUi(input.nextOutcome);
  if (nextDest == null) return false;
  const current = String(input.placementRequestedEncounterType ?? "")
    .trim()
    .toUpperCase();
  if (current === "OBSERVATION" || current === "INPATIENT") {
    return nextDest !== current;
  }
  return true;
}

export function humanReadablePlacementDestinationLabel(
  dest: EdPlacementRequestedEncounterType,
  labels: { observation: string; admission: string }
): string {
  return dest === "OBSERVATION" ? labels.observation : labels.admission;
}
