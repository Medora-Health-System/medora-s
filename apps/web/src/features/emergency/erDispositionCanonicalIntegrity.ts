/**
 * Phase 19Z.1A — pure canonical ER disposition integrity validator.
 * Non-blocking infrastructure: callers may log or surface warnings; does not gate save yet.
 */

import { parseAdmissionSummaryForChart, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import {
  ER_DISCHARGE_MODE_ADMISSION,
  ER_DISCHARGE_MODE_AMA,
  ER_DISCHARGE_MODE_DECEASED,
  ER_DISCHARGE_MODE_HOME,
  ER_DISCHARGE_MODE_OTHER,
  ER_DISCHARGE_MODE_TRANSFER,
  erDispositionSupplementFromEncounter,
} from "./emergencyDispositionV1";
import { readNursingDischargeExecutionStored } from "./nursingDischargeExecutionModel";
import {
  ER_DISPOSITION_SCHEMA_VERSION,
  hasStructuredProviderDischargeDocumentation,
  readDispositionSchemaVersion,
} from "./providerDischargeDocumentationModel";

export type ErDispositionCanonicalIntegrityResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type ErDispositionCanonicalIntegrityInput = {
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
};

const HOME_NURSING_DESTINATIONS = new Set(["HOME", "HOME_WITH_FAMILY"]);

function trim(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function nursingExecutionCompleted(nursingAssessment: unknown): boolean {
  return readNursingDischargeExecutionStored(nursingAssessment) != null;
}

function nursingIndicatesHomeDeparture(nursingAssessment: unknown): boolean {
  const exec = readNursingDischargeExecutionStored(nursingAssessment);
  if (!exec) return false;
  if (!exec.nursingDestination) return true;
  return HOME_NURSING_DESTINATIONS.has(exec.nursingDestination);
}

function hasProviderDiagnosisDocs(dischargeSummaryJson: unknown): boolean {
  if (!dischargeSummaryJson || typeof dischargeSummaryJson !== "object" || Array.isArray(dischargeSummaryJson)) {
    return false;
  }
  const docs = (dischargeSummaryJson as Record<string, unknown>).providerDischargeDiagnosisDocs;
  return Array.isArray(docs) && docs.length > 0;
}

function hasProviderDispositionDecision(dischargeSummaryJson: unknown): boolean {
  const parsed = parseDischargeSummaryForChart(dischargeSummaryJson);
  return Boolean(trim(parsed?.dischargeMode));
}

function isHomeDischargeMode(mode: string): boolean {
  return mode === ER_DISCHARGE_MODE_HOME;
}

/**
 * Validates canonical ER disposition invariants across discharge JSON, admission JSON, and nursing execution.
 */
export function validateErDispositionCanonicalIntegrity(
  input: ErDispositionCanonicalIntegrityInput
): ErDispositionCanonicalIntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const discharge = input.dischargeSummaryJson;
  const admission = input.admissionSummaryJson;
  const nursing = input.nursingAssessment;

  const parsedDischarge = parseDischargeSummaryForChart(discharge);
  const parsedAdmission = parseAdmissionSummaryForChart(admission);
  const dischargeMode = trim(parsedDischarge?.dischargeMode);
  const hasStructuredProvider = hasStructuredProviderDischargeDocumentation(discharge);
  const hasDiagnosisDocs = hasProviderDiagnosisDocs(discharge);
  const hasProviderDecision = hasProviderDispositionDecision(discharge);
  const schemaVersion = readDispositionSchemaVersion(discharge);
  const nursingExec = readNursingDischargeExecutionStored(nursing);
  const nursingCompleted = nursingExecutionCompleted(nursing);

  if (!schemaVersion) {
    warnings.push("LEGACY_NO_DISPOSITION_SCHEMA_VERSION");
  } else if (schemaVersion !== ER_DISPOSITION_SCHEMA_VERSION) {
    warnings.push("UNKNOWN_DISPOSITION_SCHEMA_VERSION");
  }

  if (hasStructuredProvider && !dischargeMode) {
    errors.push("PROVIDER_DOCS_WITHOUT_DISCHARGE_MODE");
  }

  if (hasDiagnosisDocs && !dischargeMode) {
    errors.push("DIAGNOSIS_DOCS_WITHOUT_DISCHARGE_MODE");
  }

  if (dischargeMode === ER_DISCHARGE_MODE_HOME) {
    const disposition = trim(parsedDischarge?.disposition);
    const instructions = trim(parsedDischarge?.dischargeInstructions);
    const diagnosisSummary = trim(parsedDischarge?.dischargeDiagnosisSummary);
    const hasClinicalText =
      Boolean(disposition) || Boolean(instructions) || Boolean(diagnosisSummary) || hasDiagnosisDocs;
    if (!hasClinicalText) {
      warnings.push("HOME_DISCHARGE_WITHOUT_CLINICAL_TEXT");
    }
  }

  if (nursingCompleted && !hasProviderDecision) {
    errors.push("NURSING_EXECUTION_WITHOUT_PROVIDER_DISPOSITION");
  }

  if (nursingCompleted && nursingIndicatesHomeDeparture(nursing)) {
    if (dischargeMode === ER_DISCHARGE_MODE_AMA) {
      errors.push("AMA_MODE_WITH_HOME_NURSING_EXECUTION");
    }
    if (dischargeMode === ER_DISCHARGE_MODE_DECEASED) {
      errors.push("DECEASED_MODE_WITH_HOME_NURSING_EXECUTION");
    }
    if (dischargeMode === ER_DISCHARGE_MODE_TRANSFER) {
      errors.push("TRANSFER_MODE_WITH_HOME_NURSING_EXECUTION");
    }
    if (dischargeMode === ER_DISCHARGE_MODE_ADMISSION) {
      errors.push("ADMISSION_MODE_WITH_HOME_NURSING_EXECUTION");
    }
    const sup = erDispositionSupplementFromEncounter(nursing);
    if (dischargeMode === ER_DISCHARGE_MODE_OTHER && sup.lwbsNarrative.trim()) {
      errors.push("LWBS_MODE_WITH_HOME_NURSING_EXECUTION");
    }
  }

  if (dischargeMode === ER_DISCHARGE_MODE_ADMISSION) {
    const careLevel = trim(parsedAdmission?.careLevel);
    if (careLevel === "Observation") {
      /* aligned */
    } else if (careLevel && careLevel !== "Observation") {
      /* admission without observation care level is valid */
    } else if (!careLevel) {
      warnings.push("ADMISSION_MODE_WITHOUT_ADMISSION_CARE_LEVEL");
    }
  }

  if (trim(parsedAdmission?.careLevel) === "Observation" && dischargeMode && dischargeMode !== ER_DISCHARGE_MODE_ADMISSION) {
    warnings.push("OBSERVATION_CARE_LEVEL_WITHOUT_ADMISSION_MODE");
  }

  if (dischargeMode && !hasStructuredProvider && !hasDiagnosisDocs) {
    warnings.push("LEGACY_DISCHARGE_MODE_WITHOUT_PROVIDER_DOCS");
  }

  if (nursingCompleted && isHomeDischargeMode(dischargeMode)) {
    const patientLeftEdAt =
      discharge && typeof discharge === "object" && !Array.isArray(discharge) ?
        (discharge as Record<string, unknown>).patientLeftEdAt
      : undefined;
    const hasLeftAt = typeof patientLeftEdAt === "string" && patientLeftEdAt.trim().length > 0;
    const hasNursingAt = Boolean(trim(nursingExec?.dischargeSortieCompletedAt));
    if (!hasLeftAt && !hasNursingAt) {
      warnings.push("NURSING_EXECUTION_WITHOUT_DEPARTURE_TIMESTAMP");
    }
  }

  if (hasProviderDecision && nursingCompleted) {
    /* provider/nursing separation preserved when both exist with distinct stores */
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Non-blocking integrity read — safe for post-save telemetry or dev diagnostics (does not gate PATCH).
 */
export function evaluateErDispositionIntegritySoft(
  input: ErDispositionCanonicalIntegrityInput
): ErDispositionCanonicalIntegrityResult {
  return validateErDispositionCanonicalIntegrity(input);
}
