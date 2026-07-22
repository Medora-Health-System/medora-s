/**
 * D3E.8 — Server-owned admission correlation consistency diagnostics.
 */

import {
  assertPlacementReceivingMatchesCorrelation,
  readHospitalAdmissionCorrelation,
  type HospitalAdmissionCorrelationV1,
} from "./hospitalAdmissionCorrelationV1.js";

export type AdmissionCorrelationFindingSeverity =
  | "HARD_ERROR"
  | "REVIEW_REQUIRED"
  | "INFORMATIONAL";

export type AdmissionCorrelationFinding = {
  code: string;
  severity: AdmissionCorrelationFindingSeverity;
  detail: string;
  correlationId?: string | null;
  placementRequestId?: string | null;
  receivingEncounterId?: string | null;
};

export type AdmissionCorrelationDiagnosticInput = {
  correlation?: HospitalAdmissionCorrelationV1 | null;
  placement?: {
    id: string;
    patientId: string;
    facilityId: string;
    receivingEncounterId?: string | null;
    admissionCorrelationId?: string | null;
  } | null;
  receivingEncounter?: {
    id: string;
    patientId: string;
    facilityId: string;
    hospitalEpisodeId?: string | null;
    admissionSummaryJson?: unknown;
  } | null;
  sourceEncounter?: {
    id: string;
    patientId: string;
    facilityId: string;
  } | null;
  /** Other correlations claiming the same receiving encounter. */
  otherCorrelationsForReceiving?: Array<{ admissionCorrelationId: string }>;
  /** Other active correlations for same patient/facility. */
  otherActiveCorrelations?: Array<{ admissionCorrelationId: string }>;
};

export function diagnoseAdmissionCorrelation(
  input: AdmissionCorrelationDiagnosticInput
): AdmissionCorrelationFinding[] {
  const findings: AdmissionCorrelationFinding[] = [];
  const corr = input.correlation;

  if (!corr) {
    if (input.placement) {
      findings.push({
        code: "PLACEMENT_WITHOUT_CORRELATION",
        severity: "REVIEW_REQUIRED",
        detail: "Placement request has no admission correlation",
        placementRequestId: input.placement.id,
      });
    }
    return findings;
  }

  if (!corr.patientId) {
    findings.push({
      code: "CORRELATION_WITHOUT_PATIENT",
      severity: "HARD_ERROR",
      detail: "Correlation missing patientId",
      correlationId: corr.admissionCorrelationId,
    });
  }
  if (!corr.facilityId) {
    findings.push({
      code: "CORRELATION_WITHOUT_FACILITY",
      severity: "HARD_ERROR",
      detail: "Correlation missing facilityId",
      correlationId: corr.admissionCorrelationId,
    });
  }

  if (input.placement) {
    if (input.placement.patientId !== corr.patientId) {
      findings.push({
        code: "CORRELATION_LINKED_TO_WRONG_PATIENT",
        severity: "HARD_ERROR",
        detail: "Placement patient does not match correlation",
        correlationId: corr.admissionCorrelationId,
        placementRequestId: input.placement.id,
      });
    }
    if (input.placement.facilityId !== corr.facilityId) {
      findings.push({
        code: "CROSS_FACILITY_CORRELATION",
        severity: "HARD_ERROR",
        detail: "Placement facility does not match correlation",
        correlationId: corr.admissionCorrelationId,
        placementRequestId: input.placement.id,
      });
    }
    const match = assertPlacementReceivingMatchesCorrelation({
      placementReceivingEncounterId: input.placement.receivingEncounterId,
      correlationReceivingEncounterId: corr.receivingEncounterId,
    });
    if (!match.ok) {
      findings.push({
        code: "PLACEMENT_CORRELATION_RECEIVING_MISMATCH",
        severity: "HARD_ERROR",
        detail: match.detail,
        correlationId: corr.admissionCorrelationId,
        placementRequestId: input.placement.id,
        receivingEncounterId: corr.receivingEncounterId,
      });
    }
  }

  if (input.receivingEncounter) {
    if (input.receivingEncounter.patientId !== corr.patientId) {
      findings.push({
        code: "RECEIVING_PATIENT_MISMATCH",
        severity: "HARD_ERROR",
        detail: "Receiving encounter patient mismatch",
        correlationId: corr.admissionCorrelationId,
        receivingEncounterId: input.receivingEncounter.id,
      });
    }
    const stamped = readHospitalAdmissionCorrelation(
      input.receivingEncounter.admissionSummaryJson
    );
    if (
      stamped?.admissionCorrelationId &&
      stamped.admissionCorrelationId !== corr.admissionCorrelationId
    ) {
      findings.push({
        code: "RECEIVING_CORRELATION_ID_MISMATCH",
        severity: "HARD_ERROR",
        detail: "Receiving encounter stamped with a different correlation",
        correlationId: corr.admissionCorrelationId,
        receivingEncounterId: input.receivingEncounter.id,
      });
    }
    if (
      corr.hospitalEpisodeId &&
      input.receivingEncounter.hospitalEpisodeId &&
      corr.hospitalEpisodeId !== input.receivingEncounter.hospitalEpisodeId
    ) {
      findings.push({
        code: "CROSS_HOSPITAL_EPISODE_LINKAGE",
        severity: "HARD_ERROR",
        detail: "Correlation and receiving encounter HospitalEpisode differ",
        correlationId: corr.admissionCorrelationId,
        receivingEncounterId: input.receivingEncounter.id,
      });
    }
  }

  if (input.sourceEncounter) {
    if (input.sourceEncounter.patientId !== corr.patientId) {
      findings.push({
        code: "SOURCE_ENCOUNTER_PATIENT_MISMATCH",
        severity: "HARD_ERROR",
        detail: "Source encounter patient mismatch",
        correlationId: corr.admissionCorrelationId,
      });
    }
  }

  if ((input.otherCorrelationsForReceiving?.length ?? 0) > 0) {
    findings.push({
      code: "RECEIVING_ENCOUNTER_LINKED_TO_TWO_CORRELATIONS",
      severity: "HARD_ERROR",
      detail: "Receiving encounter claimed by multiple correlations",
      correlationId: corr.admissionCorrelationId,
      receivingEncounterId: corr.receivingEncounterId,
    });
  }

  if (
    corr.status === "ARRIVED" &&
    !corr.receivingEncounterId &&
    !input.receivingEncounter
  ) {
    findings.push({
      code: "ARRIVED_WITHOUT_RECEIVING_ENCOUNTER",
      severity: "HARD_ERROR",
      detail: "Arrived correlation has no receiving encounter",
      correlationId: corr.admissionCorrelationId,
    });
  }

  if (
    corr.status === "ACTIVE" &&
    corr.completedAt
  ) {
    findings.push({
      code: "ACTIVE_CORRELATION_WITH_COMPLETED_MARKER",
      severity: "REVIEW_REQUIRED",
      detail: "Active correlation has completedAt set",
      correlationId: corr.admissionCorrelationId,
    });
  }

  if ((input.otherActiveCorrelations?.length ?? 0) > 0) {
    findings.push({
      code: "DUPLICATE_ACTIVE_ADMISSION_CORRELATIONS",
      severity: "REVIEW_REQUIRED",
      detail: "Multiple active admission correlations for patient/facility",
      correlationId: corr.admissionCorrelationId,
    });
  }

  if (findings.length === 0) {
    findings.push({
      code: "CORRELATION_HEALTHY",
      severity: "INFORMATIONAL",
      detail: "No correlation consistency issues detected",
      correlationId: corr.admissionCorrelationId,
    });
  }

  return findings;
}
