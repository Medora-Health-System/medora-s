/**
 * D4A.0 — Connected inpatient admission intake contracts:
 * demographic confirmation, required bed, clinical shell sections, belongings/valuables/wound shells.
 */

import {
  admissionIntakeMayCreatePatient,
  patientIdentityRequiresExplicitSelection,
  resolveAuthoritativePatientId,
  typedPatientTextIsAuthoritativeIdentity,
} from "../patients/patientSearchAndSelectV1.js";
import { isHospitalAdmissionSource } from "./concurrentEncounterPolicyV1.js";
import {
  isHospitalAdmittingService,
  isHospitalRequestedLevelOfCare,
  isLevelOfCareCompatibleWithUnit,
} from "./hospitalAdmissionIntakeVocabV1.js";
import { isBedAssignableWithoutOverride, type BedOperationalStatus } from "./bedOperationalStatus.js";
import { parseCanonicalBedKey, validateBedInPool } from "./facilityBedGovernance.js";

export {
  CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID,
} from "../patients/patientSearchAndSelectV1.js";

export type ConnectedAdmissionIntakeInput = {
  selectedPatientId?: string | null;
  typedPatientQuery?: string | null;
  demographicsConfirmed?: boolean;
  admissionSource?: string | null;
  sourceEncounterId?: string | null;
  admittedAt?: string | null;
  requestedUnit?: string | null;
  assignedBedKey?: string | null;
  admissionDiagnosis?: string | null;
  reasonForAdmission?: string | null;
  admittingService?: string | null;
  requestedLevelOfCare?: string | null;
  receivingNurseUserIdFromClient?: string | null;
};

export type ConnectedAdmissionIntakeBlocker =
  | "PATIENT_REQUIRED"
  | "DEMOGRAPHICS_NOT_CONFIRMED"
  | "ADMISSION_SOURCE_REQUIRED"
  | "ADMISSION_SOURCE_INVALID"
  | "SOURCE_ED_REQUIRED"
  | "ADMITTED_AT_INVALID"
  | "ADMITTED_AT_FUTURE_PROHIBITED"
  | "REQUESTED_UNIT_REQUIRED"
  | "ASSIGNED_BED_REQUIRED"
  | "BED_UNIT_MISMATCH"
  | "BED_NOT_IN_POOL"
  | "ADMISSION_DIAGNOSIS_REQUIRED"
  | "REASON_FOR_ADMISSION_REQUIRED"
  | "ADMITTING_SERVICE_REQUIRED"
  | "ADMITTING_SERVICE_INVALID"
  | "LEVEL_OF_CARE_REQUIRED"
  | "LEVEL_OF_CARE_INVALID"
  | "LEVEL_OF_CARE_UNIT_INCOMPATIBLE"
  | "CLIENT_RECEIVING_NURSE_FORBIDDEN"
  | "TYPED_TEXT_NOT_IDENTITY";

export function validateConnectedAdmissionIntakeHardBlockers(
  input: ConnectedAdmissionIntakeInput,
  options?: { nowMs?: number; allowFutureMinutes?: number }
): ConnectedAdmissionIntakeBlocker[] {
  const blockers: ConnectedAdmissionIntakeBlocker[] = [];
  const patientId = resolveAuthoritativePatientId({
    selectedPatientId: input.selectedPatientId,
    typedQuery: input.typedPatientQuery,
  });
  if (!patientId) blockers.push("PATIENT_REQUIRED");
  if (typedPatientTextIsAuthoritativeIdentity()) blockers.push("TYPED_TEXT_NOT_IDENTITY");
  if (!patientIdentityRequiresExplicitSelection()) blockers.push("PATIENT_REQUIRED");
  if (admissionIntakeMayCreatePatient()) blockers.push("TYPED_TEXT_NOT_IDENTITY");
  if (input.demographicsConfirmed !== true) blockers.push("DEMOGRAPHICS_NOT_CONFIRMED");

  const source = String(input.admissionSource ?? "").trim().toUpperCase();
  if (!source) blockers.push("ADMISSION_SOURCE_REQUIRED");
  else if (!isHospitalAdmissionSource(source)) blockers.push("ADMISSION_SOURCE_INVALID");
  else if (
    source === "EMERGENCY_DEPARTMENT" &&
    !String(input.sourceEncounterId ?? "").trim()
  ) {
    // Soft advisory when no open ED exists is handled by callers; when source is ED
    // and a candidate list was provided empty, intake may still proceed without link.
  }

  const admittedRaw = String(input.admittedAt ?? "").trim();
  if (admittedRaw) {
    const admitted = new Date(admittedRaw);
    if (!Number.isFinite(admitted.getTime())) blockers.push("ADMITTED_AT_INVALID");
    else {
      const now = options?.nowMs ?? Date.now();
      const skewMs = (options?.allowFutureMinutes ?? 15) * 60_000;
      if (admitted.getTime() > now + skewMs) blockers.push("ADMITTED_AT_FUTURE_PROHIBITED");
    }
  }

  const unit = String(input.requestedUnit ?? "").trim().toUpperCase();
  if (!unit) blockers.push("REQUESTED_UNIT_REQUIRED");

  const bedKey = String(input.assignedBedKey ?? "").trim();
  if (!bedKey) blockers.push("ASSIGNED_BED_REQUIRED");
  else {
    const parsed = parseCanonicalBedKey(bedKey);
    if (!parsed || !validateBedInPool(parsed.unit, parsed.room)) {
      blockers.push("BED_NOT_IN_POOL");
    } else if (unit && parsed.unit !== unit) {
      blockers.push("BED_UNIT_MISMATCH");
    }
  }

  if (!String(input.admissionDiagnosis ?? "").trim()) {
    blockers.push("ADMISSION_DIAGNOSIS_REQUIRED");
  }
  if (!String(input.reasonForAdmission ?? "").trim()) {
    blockers.push("REASON_FOR_ADMISSION_REQUIRED");
  }

  const service = String(input.admittingService ?? "").trim().toUpperCase();
  if (!service) blockers.push("ADMITTING_SERVICE_REQUIRED");
  else if (!isHospitalAdmittingService(service)) blockers.push("ADMITTING_SERVICE_INVALID");

  const level = String(input.requestedLevelOfCare ?? "").trim().toUpperCase();
  if (!level) blockers.push("LEVEL_OF_CARE_REQUIRED");
  else if (!isHospitalRequestedLevelOfCare(level)) blockers.push("LEVEL_OF_CARE_INVALID");
  else if (unit && !isLevelOfCareCompatibleWithUnit(level, unit)) {
    blockers.push("LEVEL_OF_CARE_UNIT_INCOMPATIBLE");
  }

  if (String(input.receivingNurseUserIdFromClient ?? "").trim()) {
    blockers.push("CLIENT_RECEIVING_NURSE_FORBIDDEN");
  }

  return blockers;
}

export function canStartInpatientEncounterFromIntake(
  input: ConnectedAdmissionIntakeInput
): boolean {
  return validateConnectedAdmissionIntakeHardBlockers(input).length === 0;
}

export function isBedSelectableForAdmissionIntake(
  status: BedOperationalStatus | string | null | undefined
): boolean {
  const s = String(status ?? "").trim().toUpperCase();
  if (s !== "AVAILABLE") return false;
  return isBedAssignableWithoutOverride(s as BedOperationalStatus);
}

export const BED_NO_LONGER_AVAILABLE_CODE = "BED_NO_LONGER_AVAILABLE" as const;

/** Clinical admission workspace section ids (connected shell — D4A deepens content). */
export const INPATIENT_ADMISSION_CLINICAL_SECTIONS = [
  "OVERVIEW",
  "IDENTITY_DEMOGRAPHICS",
  "SOURCE_ENCOUNTER_SUMMARY",
  "NURSING_ADMISSION_ASSESSMENT",
  "MEDICAL_HISTORY",
  "SURGICAL_HISTORY",
  "HOME_MEDICATIONS",
  "ALLERGIES",
  "SOCIAL_HISTORY",
  "BELONGINGS_VALUABLES",
  "SKIN_WOUND",
  "LINES_DRAINS_DEVICES",
  "FALL_SAFETY",
  "PAIN",
  "FUNCTIONAL_MOBILITY",
  "NUTRITION",
  "ELIMINATION",
  "PSYCHOSOCIAL",
  "EDUCATION_COMMUNICATION",
  "PROVIDER_ADMISSION",
] as const;

export type InpatientAdmissionClinicalSection =
  (typeof INPATIENT_ADMISSION_CLINICAL_SECTIONS)[number];

export const ADMISSION_SECTION_COMPLETION_STATES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
  "NOT_APPLICABLE",
  "UNABLE_TO_COMPLETE",
] as const;

export type AdmissionSectionCompletionState =
  (typeof ADMISSION_SECTION_COMPLETION_STATES)[number];

export const ADMISSION_HISTORY_VERIFICATION_STATUSES = [
  "CONFIRMED",
  "UPDATED",
  "UNABLE_TO_VERIFY",
  "UNKNOWN",
] as const;

export type AdmissionHistoryVerificationStatus =
  (typeof ADMISSION_HISTORY_VERIFICATION_STATUSES)[number];

export const HOME_MEDICATION_RECON_STATUSES = [
  "CONFIRMED",
  "UPDATED",
  "NOT_TAKING",
  "UNABLE_TO_VERIFY",
] as const;

export const BELONGINGS_CATEGORIES = [
  "CLOTHING",
  "SHOES",
  "EYEGLASSES",
  "CONTACT_LENSES",
  "HEARING_AIDS",
  "DENTURES",
  "PROSTHETIC_DEVICES",
  "MOBILITY_AIDS",
  "PHONE",
  "CHARGER",
  "TABLET",
  "LAPTOP",
  "WALLET",
  "PURSE",
  "KEYS",
  "JEWELRY",
  "IDENTIFICATION",
  "MEDICATIONS_FROM_HOME",
  "MEDICAL_DEVICES",
  "OTHER",
] as const;

export const BELONGINGS_DISPOSITIONS = [
  "KEPT_WITH_PATIENT",
  "SENT_HOME_WITH_FAMILY",
  "SECURED_BY_FACILITY",
  "TRANSFERRED_WITH_PATIENT",
  "DISCARDED_WITH_CONSENT",
] as const;

export type BelongingsDisposition = (typeof BELONGINGS_DISPOSITIONS)[number];

export type BelongingsInventoryItemV1 = {
  category: (typeof BELONGINGS_CATEGORIES)[number] | string;
  description: string;
  quantity: number;
  condition?: string | null;
  disposition: BelongingsDisposition;
  storageLocation?: string | null;
  witnessUserId?: string | null;
  notes?: string | null;
};

export type CashDenominationCountV1 = {
  currency: string;
  denomination: number;
  quantity: number;
};

export function sumCashDenominationTotal(rows: readonly CashDenominationCountV1[]): number {
  return rows.reduce((sum, row) => {
    const denom = Number(row.denomination);
    const qty = Number(row.quantity);
    if (!Number.isFinite(denom) || !Number.isFinite(qty) || qty < 0) return sum;
    return sum + denom * qty;
  }, 0);
}

export type AdmissionWoundEntryV1 = {
  anatomicalLocation: string;
  laterality?: string | null;
  woundType?: string | null;
  presentOnAdmission: boolean;
  stage?: string | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  notes?: string | null;
};

export function preloadedHistoryRequiresVerification(): true {
  return true;
}

export function preloadedHistoryMustRetainProvenance(): true {
  return true;
}

export function homeMedicationsMustNotAutoConvertToInpatientOrders(): true {
  return true;
}

export function admissionDocumentationSupportsSaveAndResume(): true {
  return true;
}
