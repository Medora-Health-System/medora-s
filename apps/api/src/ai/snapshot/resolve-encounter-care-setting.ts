import {
  type AiEncounterCareSetting,
  type AiJurisdiction,
} from "@medora/shared";
import {
  EncounterType,
  BillingClassification,
  type Facility,
  type Encounter,
} from "@prisma/client";

export interface EncounterCareSettingResolutionInput {
  encounter: {
    type: EncounterType;
    serviceLine: string | null;
    billingClassification: BillingClassification;
    workflowState?: string | null;
  };
  facility: {
    facilityType: Facility["facilityType"];
    billingSiteType?: string | null;
    billingClassificationMode?: string | null;
  };
  hasActiveHospitalEpisode?: boolean;
  hasActiveCriticalCareLine?: boolean;
}

/**
 * Resolve the clinical care-setting profile for an encounter using only authoritative
 * Medora fields. Does NOT implement E/M level selection, coding rules, or payer logic.
 *
 * Never guesses: returns REVIEW_REQUIRED when the setting cannot be determined safely.
 */
export function resolveEncounterCareSetting(
  input: EncounterCareSettingResolutionInput
): AiEncounterCareSetting {
  const { encounter, facility, hasActiveCriticalCareLine = false } = input;

  if (hasActiveCriticalCareLine) {
    return "CRITICAL_CARE";
  }

  const facilityType = facility.facilityType;
  const billingClass = encounter.billingClassification;

  // Hospital enterprise with inpatient/observation billing classification → inpatient/observation.
  if (facilityType === "HOSPITAL") {
    if (billingClass === BillingClassification.INPATIENT) {
      return "HOSPITAL_INPATIENT_OBSERVATION";
    }
    if (billingClass === BillingClassification.OBSERVATION) {
      return "HOSPITAL_INPATIENT_OBSERVATION";
    }
  }

  // Explicit emergency department billing classification or emergency encounter type.
  if (
    billingClass === BillingClassification.EMERGENCY_DEPARTMENT ||
    encounter.type === EncounterType.EMERGENCY
  ) {
    return "EMERGENCY_DEPARTMENT";
  }

  // Outpatient clinic visit.
  if (
    encounter.type === EncounterType.OUTPATIENT &&
    billingClass === BillingClassification.CLINIC_VISIT
  ) {
    return "OFFICE_OUTPATIENT_CLINIC";
  }

  // Urgent care operating as outpatient clinic.
  if (
    encounter.type === EncounterType.URGENT_CARE &&
    billingClass === BillingClassification.URGENT_CARE
  ) {
    return "OFFICE_OUTPATIENT_CLINIC";
  }

  // Telehealth is not mapped to a physical care setting.
  if (billingClass === BillingClassification.TELEHEALTH) {
    return "OTHER";
  }

  // Facility-level billing workflow hints when billingClassification is ambiguous.
  const mode = facility.billingClassificationMode;
  if (mode === "EMERGENCY_ONLY" || facility.billingSiteType === "FREESTANDING_ER") {
    if (encounter.type === EncounterType.URGENT_CARE) {
      return "EMERGENCY_DEPARTMENT";
    }
  }
  if (mode === "CLINIC_ONLY") {
    if (encounter.type === EncounterType.OUTPATIENT) {
      return "OFFICE_OUTPATIENT_CLINIC";
    }
  }
  if (mode === "HOSPITAL_ENTERPRISE") {
    return "HOSPITAL_INPATIENT_OBSERVATION";
  }

  return "REVIEW_REQUIRED";
}

const COUNTRY_TO_JURISDICTION: Record<string, AiJurisdiction> = {
  "United States": "US",
  "United States of America": "US",
  US: "US",
  "Dominican Republic": "DO",
  "República Dominicana": "DO",
  DO: "DO",
  Haiti: "HT",
  Haïti: "HT",
  HT: "HT",
};

export function resolveFacilityJurisdiction(country: string): AiJurisdiction {
  return COUNTRY_TO_JURISDICTION[country] ?? "OTHER";
}
