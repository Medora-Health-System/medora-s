/**
 * D3E.5 — Explicit admission intents, sources, hard blockers vs advisories.
 * Destination clinical context is always explicit (never inferred from time/location).
 */

export const ADMISSION_INTENTS = [
  "ADMIT_TO_OBSERVATION",
  "ADMIT_TO_INPATIENT",
  "DIRECT_INPATIENT_ADMISSION",
  "SCHEDULED_INPATIENT_ADMISSION",
  "TRANSFER_IN_TO_INPATIENT",
  "CONVERT_OBSERVATION_TO_INPATIENT",
] as const;

export type AdmissionIntent = (typeof ADMISSION_INTENTS)[number];

export const ADMISSION_SOURCES = [
  "EMERGENCY_DEPARTMENT",
  "DIRECT",
  "CLINIC",
  "SCHEDULED",
  "EXTERNAL_TRANSFER",
  "OTHER",
] as const;

export type AdmissionSource = (typeof ADMISSION_SOURCES)[number];

export type AdmissionDestinationContext = "OBSERVATION" | "INPATIENT";

export function destinationContextForAdmissionIntent(
  intent: AdmissionIntent
): AdmissionDestinationContext {
  switch (intent) {
    case "ADMIT_TO_OBSERVATION":
      return "OBSERVATION";
    case "ADMIT_TO_INPATIENT":
    case "DIRECT_INPATIENT_ADMISSION":
    case "SCHEDULED_INPATIENT_ADMISSION":
    case "TRANSFER_IN_TO_INPATIENT":
    case "CONVERT_OBSERVATION_TO_INPATIENT":
      return "INPATIENT";
  }
}

export function admissionIntentRequiresSourceEdEncounter(intent: AdmissionIntent): boolean {
  return intent === "ADMIT_TO_OBSERVATION" || intent === "ADMIT_TO_INPATIENT";
}

export function admissionIntentRequiresSourceObservationEncounter(
  intent: AdmissionIntent
): boolean {
  return intent === "CONVERT_OBSERVATION_TO_INPATIENT";
}

export function admissionIntentAllowsMissingEdEncounter(intent: AdmissionIntent): boolean {
  return (
    intent === "DIRECT_INPATIENT_ADMISSION" ||
    intent === "SCHEDULED_INPATIENT_ADMISSION" ||
    intent === "TRANSFER_IN_TO_INPATIENT"
  );
}

/** Observation feature flags must never block direct Inpatient admission. */
export function observationFlagsMustNotBlockDirectInpatientAdmission(): true {
  return true;
}

export type AdmissionBlocker = {
  code: string;
  message: string;
  authoritativeSource: string;
  remediation: string;
};

export type AdmissionAdvisory = {
  code: string;
  message: string;
  authoritativeSource: string;
  remediation: string;
};

export type EvaluateAdmissionGateInput = {
  intent: AdmissionIntent;
  patientId?: string | null;
  facilityId?: string | null;
  actorAuthorized: boolean;
  sourceEncounterId?: string | null;
  sourceEncounterPatientId?: string | null;
  sourceEncounterFacilityId?: string | null;
  sourceEncounterEligible: boolean;
  destinationContext: AdmissionDestinationContext;
  destinationAlreadyExists: boolean;
  crossFacilityDestination: boolean;
  duplicateIdempotencyKey: boolean;
  /** Optional documentation / census fields — advisory only. */
  assignedNurseMissing?: boolean;
  isolationUndocumented?: boolean;
  codeStatusUndocumented?: boolean;
  observationNoteMissing?: boolean;
  observationMarMissing?: boolean;
  medicationReconciliationPending?: boolean;
  shortLengthOfStay?: boolean;
};

export function evaluateAdmissionHardBlockers(
  input: EvaluateAdmissionGateInput
): AdmissionBlocker[] {
  const blockers: AdmissionBlocker[] = [];
  if (!String(input.patientId ?? "").trim()) {
    blockers.push({
      code: "PATIENT_REQUIRED",
      message: "Patient does not exist or was not supplied.",
      authoritativeSource: "patientId",
      remediation: "Select a valid patient before admission.",
    });
  }
  if (!String(input.facilityId ?? "").trim()) {
    blockers.push({
      code: "FACILITY_REQUIRED",
      message: "Facility scope is required.",
      authoritativeSource: "facilityId",
      remediation: "Authenticate into a facility session.",
    });
  }
  if (!input.actorAuthorized) {
    blockers.push({
      code: "UNAUTHORIZED_ACTOR",
      message: "Actor is not authorized for this admission action.",
      authoritativeSource: "server role check",
      remediation: "Use an authorized clinical role.",
    });
  }
  if (input.crossFacilityDestination) {
    blockers.push({
      code: "CROSS_FACILITY_DESTINATION",
      message: "Destination belongs to another facility.",
      authoritativeSource: "facility isolation",
      remediation: "Admit only within the active facility.",
    });
  }
  if (input.duplicateIdempotencyKey) {
    blockers.push({
      code: "DUPLICATE_IDEMPOTENCY_KEY",
      message: "Duplicate idempotency key for a conflicting admission payload.",
      authoritativeSource: "idempotency",
      remediation: "Reuse the prior response or issue a new key.",
    });
  }
  if (input.destinationAlreadyExists) {
    blockers.push({
      code: "DESTINATION_ENCOUNTER_ALREADY_EXISTS",
      message: "A receiving encounter already exists for this accepted placement.",
      authoritativeSource: "receivingEncounterId",
      remediation: "Return the existing destination encounter (idempotent).",
    });
  }

  const needsEd = admissionIntentRequiresSourceEdEncounter(input.intent);
  const needsObs = admissionIntentRequiresSourceObservationEncounter(input.intent);
  if (needsEd || needsObs) {
    if (!String(input.sourceEncounterId ?? "").trim()) {
      blockers.push({
        code: "SOURCE_ENCOUNTER_REQUIRED",
        message: "Source encounter is required for this admission pathway.",
        authoritativeSource: "sourceEncounterId",
        remediation: "Provide the originating encounter.",
      });
    } else {
      if (
        input.sourceEncounterPatientId &&
        input.patientId &&
        String(input.sourceEncounterPatientId) !== String(input.patientId)
      ) {
        blockers.push({
          code: "CROSS_PATIENT_SOURCE_ENCOUNTER",
          message: "Source encounter belongs to another patient.",
          authoritativeSource: "sourceEncounter.patientId",
          remediation: "Use the correct patient encounter.",
        });
      }
      if (
        input.sourceEncounterFacilityId &&
        input.facilityId &&
        String(input.sourceEncounterFacilityId) !== String(input.facilityId)
      ) {
        blockers.push({
          code: "CROSS_FACILITY_SOURCE_ENCOUNTER",
          message: "Source encounter belongs to another facility.",
          authoritativeSource: "sourceEncounter.facilityId",
          remediation: "Stay within facility scope.",
        });
      }
      if (!input.sourceEncounterEligible) {
        blockers.push({
          code: "SOURCE_ENCOUNTER_INELIGIBLE",
          message: "Source encounter is not in an eligible state for admission.",
          authoritativeSource: "sourceEncounter.status",
          remediation: "Use an open, eligible source encounter.",
        });
      }
    }
  }

  const expected = destinationContextForAdmissionIntent(input.intent);
  if (input.destinationContext !== expected) {
    blockers.push({
      code: "INVALID_DESTINATION_CONTEXT",
      message: `Destination context must be ${expected} for intent ${input.intent}.`,
      authoritativeSource: "admission intent",
      remediation: "Do not forge destination context from the client.",
    });
  }

  return blockers;
}

export function evaluateAdmissionAdvisories(
  input: EvaluateAdmissionGateInput
): AdmissionAdvisory[] {
  const advisories: AdmissionAdvisory[] = [];
  if (input.assignedNurseMissing) {
    advisories.push({
      code: "ASSIGNED_NURSE_MISSING",
      message: "Assigned nurse is not documented.",
      authoritativeSource: "census / assignment",
      remediation: "Assign a nurse after arrival; does not block admission.",
    });
  }
  if (input.isolationUndocumented) {
    advisories.push({
      code: "ISOLATION_UNDOCUMENTED",
      message: "Isolation status is not documented.",
      authoritativeSource: "clinical documentation",
      remediation: "Document isolation when known; does not block admission.",
    });
  }
  if (input.codeStatusUndocumented) {
    advisories.push({
      code: "CODE_STATUS_UNDOCUMENTED",
      message: "Code status is not documented.",
      authoritativeSource: "clinical documentation",
      remediation: "Document code status when known; does not block admission.",
    });
  }
  if (input.observationNoteMissing) {
    advisories.push({
      code: "OBSERVATION_NOTE_MISSING",
      message: "Observation note is missing (optional pathway).",
      authoritativeSource: "observation documentation",
      remediation: "Not required for direct Inpatient admission.",
    });
  }
  if (input.observationMarMissing) {
    advisories.push({
      code: "OBSERVATION_MAR_MISSING",
      message: "Observation MAR is missing (optional pathway).",
      authoritativeSource: "observation MAR",
      remediation: "Not required for direct Inpatient admission.",
    });
  }
  if (input.medicationReconciliationPending) {
    advisories.push({
      code: "MEDICATION_RECONCILIATION_PENDING",
      message: "Medication reconciliation is pending.",
      authoritativeSource: "medications",
      remediation: "Complete reconciliation after admission; does not block arrival.",
    });
  }
  if (input.shortLengthOfStay) {
    advisories.push({
      code: "SHORT_LENGTH_OF_STAY",
      message: "Length of stay is short (utilization only).",
      authoritativeSource: "utilization metrics",
      remediation: "Does not change clinical encounter identity.",
    });
  }
  return advisories;
}

export function admissionMayProceed(input: EvaluateAdmissionGateInput): boolean {
  return evaluateAdmissionHardBlockers(input).length === 0;
}

/** Conversion must create a new Inpatient encounter — never mutate Observation type. */
export function observationToInpatientRequiresNewEncounter(): true {
  return true;
}

export function observationEncounterTypeMustRemainUnchangedOnConversion(): true {
  return true;
}
