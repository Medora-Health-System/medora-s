import type { BillingClassification } from "./billingClassification.js";

/** Namespace keys — boolean presence only; never export field text. */
export const PROVIDER_DOCUMENTATION_NAMESPACE_KEY = "erProviderMseV1";
export const ER_NURSING_REASSESSMENT_V1_KEY = "erNursingReassessmentV1";

export type DocumentationCompletenessFlags = {
  hasPrimaryDiagnosis: boolean;
  hasProviderAttribution: boolean;
  hasMDM: boolean;
  hasDispositionDocumentation: boolean;
  hasReassessment: boolean;
  hasObservationDocumentation: boolean;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function namespaceHasContent(value: unknown): boolean {
  const obj = asObject(value);
  if (!obj) return false;
  return Object.values(obj).some((v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (v && typeof v === "object") return namespaceHasContent(v);
    return false;
  });
}

/**
 * PHI-safe documentation completeness booleans derived from encounter metadata.
 * Does not return note text, MDM narrative, or diagnosis descriptions.
 */
export function deriveDocumentationCompletenessFlags(input: {
  nursingAssessment?: unknown;
  dischargeStatus?: string | null;
  disposition?: string | null;
  dischargeSummaryJson?: unknown;
  providerDocumentationStatus?: string | null;
  hasPrimaryDiagnosis: boolean;
  hasProviderAttribution: boolean;
  observationReassessmentEventCount?: number;
  nursingReassessmentEventCount?: number;
}): DocumentationCompletenessFlags {
  const nursing = asObject(input.nursingAssessment);
  const providerDoc = asObject(nursing?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);

  const hasMDM = Boolean(
    providerDoc &&
      [
        "mdmWorkingAssessment",
        "differentialAssessmentText",
        "mdmDataReviewed",
        "mdmRiskLevel",
        "mdmClinicalRationale",
        "mdmPlanSummary",
        "mdmImmediateActionsRationale",
        "mdmConsultsDiscussed",
        "mdmAdmitObserveDischarge",
      ].some((key) => hasNonEmptyString(providerDoc[key])),
  );

  const hasDispositionDocumentation = Boolean(
    hasNonEmptyString(input.dischargeStatus) ||
      hasNonEmptyString(input.disposition) ||
      namespaceHasContent(input.dischargeSummaryJson) ||
      (providerDoc &&
        (hasNonEmptyString(providerDoc.mdmAdmitObserveDischarge) ||
          hasNonEmptyString(providerDoc.followUpDisposition) ||
          hasNonEmptyString(providerDoc.treatmentPlan))),
  );

  const hasReassessment = Boolean(
    (input.observationReassessmentEventCount ?? 0) > 0 ||
      (input.nursingReassessmentEventCount ?? 0) > 0 ||
      namespaceHasContent(nursing?.[ER_NURSING_REASSESSMENT_V1_KEY]) ||
      (providerDoc && hasNonEmptyString(providerDoc.examReassessmentExtra)),
  );

  const hasObservationDocumentation = Boolean(
    nursing != null &&
      (namespaceHasContent(nursing) ||
        (input.providerDocumentationStatus ?? "").trim() === "SIGNED"),
  );

  return {
    hasPrimaryDiagnosis: input.hasPrimaryDiagnosis,
    hasProviderAttribution: input.hasProviderAttribution,
    hasMDM,
    hasDispositionDocumentation,
    hasReassessment,
    hasObservationDocumentation,
  };
}

export function professionalDocumentationApplies(classification: BillingClassification): boolean {
  switch (classification) {
    case "CLINIC_VISIT":
    case "URGENT_CARE":
    case "EMERGENCY_DEPARTMENT":
    case "TELEHEALTH":
    case "PROCEDURE":
    case "OBSERVATION":
      return true;
    default:
      return false;
  }
}

export function dispositionDocumentationApplies(classification: BillingClassification): boolean {
  switch (classification) {
    case "EMERGENCY_DEPARTMENT":
    case "OBSERVATION":
    case "INPATIENT":
    case "URGENT_CARE":
      return true;
    default:
      return false;
  }
}
