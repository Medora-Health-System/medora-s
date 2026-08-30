/**
 * D3B — pure eligibility rules for HospitalEpisode creation / linkage.
 * Does not mutate encounters. Does not replace type-flip admission workflow.
 */

import { resolveHospitalDestinationIntent } from "./hospitalDestinationIntent.js";
import {
  resolveEdDispositionPath,
  type EdDispositionPath,
  type EdEncounterLifecycleEncounterSnapshot,
} from "./edEncounterLifecycle.js";
import {
  EdDispositionDocumentationStatus,
  isEdDispositionDecisionSigned,
  readEdDispositionDecisionFromNursingAssessment,
} from "./edDispositionDecisionV1.js";

export const HospitalEpisodeEligibilityDenialReason = {
  FEATURE_FLAG_OFF: "FEATURE_FLAG_OFF",
  NOT_ED_ENCOUNTER: "NOT_ED_ENCOUNTER",
  DISPOSITION_PATH_NOT_INTERNAL: "DISPOSITION_PATH_NOT_INTERNAL",
  DECISION_NOT_SIGNED: "DECISION_NOT_SIGNED",
  DECISION_DRAFT: "DECISION_DRAFT",
  HOME_DISCHARGE: "HOME_DISCHARGE",
  EXTERNAL_TRANSFER: "EXTERNAL_TRANSFER",
  NON_INTERNAL_PATH: "NON_INTERNAL_PATH",
  ALREADY_LINKED: "ALREADY_LINKED",
  PATIENT_FACILITY_MISMATCH: "PATIENT_FACILITY_MISMATCH",
  ENCOUNTER_MISSING: "ENCOUNTER_MISSING",
} as const;

export type HospitalEpisodeEligibilityDenialReason =
  (typeof HospitalEpisodeEligibilityDenialReason)[keyof typeof HospitalEpisodeEligibilityDenialReason];

export type HospitalEpisodeInternalPlacementKind = "OBSERVATION" | "INPATIENT_ADMISSION" | "INTERNAL_UNSPECIFIED";

export type HospitalEpisodeEligibilityInput = EdEncounterLifecycleEncounterSnapshot & {
  id?: string | null;
  type?: string | null;
  facilityId?: string | null;
  patientId?: string | null;
  hospitalEpisodeId?: string | null;
  /** When provided, must match encounter.patientId / facilityId. */
  expectedFacilityId?: string | null;
  expectedPatientId?: string | null;
  featureFlagEnabled?: boolean;
};

export type HospitalEpisodeEligibilityResult = {
  eligible: boolean;
  denialReason: HospitalEpisodeEligibilityDenialReason | null;
  dispositionPath: EdDispositionPath;
  decisionSigned: boolean;
  decisionStatus: "NONE" | "DRAFT" | "SIGNED";
  internalPlacementKind: HospitalEpisodeInternalPlacementKind | null;
};

export function resolveHospitalEpisodeInternalPlacementKind(
  admissionSummaryJson: unknown
): HospitalEpisodeInternalPlacementKind {
  const dest = resolveHospitalDestinationIntent({ admissionSummaryJson });
  if (dest === "OBSERVATION") return "OBSERVATION";
  if (dest === "INPATIENT") return "INPATIENT_ADMISSION";
  return "INTERNAL_UNSPECIFIED";
}

/**
 * Whether an encounter is eligible to open / link a HospitalEpisode for internal placement.
 * Feature flag is checked when `featureFlagEnabled` is provided (defaults treated as OFF when false).
 */
export function validateHospitalEpisodeEncounterEligibility(
  input: HospitalEpisodeEligibilityInput
): HospitalEpisodeEligibilityResult {
  const dispositionPath = resolveEdDispositionPath(input);
  const decisionMeta = readEdDispositionDecisionFromNursingAssessment(input.nursingAssessment);
  const pathSelected = dispositionPath !== "NONE";
  const decisionSigned = isEdDispositionDecisionSigned(input.nursingAssessment, pathSelected);
  const decisionStatus: "NONE" | "DRAFT" | "SIGNED" =
    decisionMeta.documentationStatus === EdDispositionDocumentationStatus.SIGNED
      ? "SIGNED"
      : decisionMeta.documentationStatus === EdDispositionDocumentationStatus.DRAFT
        ? "DRAFT"
        : "NONE";

  const base = {
    dispositionPath,
    decisionSigned,
    decisionStatus,
    internalPlacementKind: null as HospitalEpisodeInternalPlacementKind | null,
  };

  if (input.featureFlagEnabled === false) {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.FEATURE_FLAG_OFF,
      ...base,
    };
  }

  if (!input.id) {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.ENCOUNTER_MISSING,
      ...base,
    };
  }

  if (input.expectedFacilityId && input.facilityId && input.expectedFacilityId !== input.facilityId) {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.PATIENT_FACILITY_MISMATCH,
      ...base,
    };
  }
  if (input.expectedPatientId && input.patientId && input.expectedPatientId !== input.patientId) {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.PATIENT_FACILITY_MISMATCH,
      ...base,
    };
  }

  const type = String(input.type ?? "").trim().toUpperCase();
  if (type && type !== "EMERGENCY") {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.NOT_ED_ENCOUNTER,
      ...base,
    };
  }

  if (input.hospitalEpisodeId) {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.ALREADY_LINKED,
      ...base,
    };
  }

  if (dispositionPath === "HOME") {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.HOME_DISCHARGE,
      ...base,
    };
  }
  if (dispositionPath === "TRANSFER") {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.EXTERNAL_TRANSFER,
      ...base,
    };
  }
  if (dispositionPath !== "ADMISSION") {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.NON_INTERNAL_PATH,
      ...base,
    };
  }

  if (decisionStatus === "DRAFT") {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.DECISION_DRAFT,
      ...base,
      internalPlacementKind: resolveHospitalEpisodeInternalPlacementKind(input.admissionSummaryJson),
    };
  }
  if (!decisionSigned) {
    return {
      eligible: false,
      denialReason: HospitalEpisodeEligibilityDenialReason.DECISION_NOT_SIGNED,
      ...base,
      internalPlacementKind: resolveHospitalEpisodeInternalPlacementKind(input.admissionSummaryJson),
    };
  }

  const internalPlacementKind = resolveHospitalEpisodeInternalPlacementKind(input.admissionSummaryJson);
  return {
    eligible: true,
    denialReason: null,
    dispositionPath,
    decisionSigned: true,
    decisionStatus: "SIGNED",
    internalPlacementKind,
  };
}

/**
 * ED encounter close must never imply HospitalEpisode closure.
 * Pure documentation helper for service/state tests (D3C wires production close).
 */
export function hospitalEpisodeRemainsActiveAfterEdEncounterClose(params: {
  episodeStatus: string | null | undefined;
  encounterStatus: string | null | undefined;
}): boolean {
  const episode = String(params.episodeStatus ?? "").toUpperCase();
  const encounter = String(params.encounterStatus ?? "").toUpperCase();
  return episode === "ACTIVE" && encounter === "CLOSED";
}
