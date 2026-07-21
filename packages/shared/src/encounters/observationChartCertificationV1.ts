/**
 * D3D — Observation chart completeness certification (advisory until flag ON).
 */

export type ObservationCertDeficiencyCode =
  | "MISSING_PROVIDER_NOTE"
  | "MISSING_REASSESSMENT"
  | "MISSING_DISCHARGE_SUMMARY"
  | "MISSING_ORDERS_REVIEW"
  | "MISSING_NURSING_DOCUMENTATION";

export type ObservationCertInput = {
  hasProviderNote: boolean;
  hasReassessment: boolean;
  hasDischargeSummary: boolean;
  hasOrdersReview: boolean;
  hasNursingDocumentation: boolean;
  dispositionPathway?: string | null;
};

export type ObservationCertResult = {
  complete: boolean;
  deficiencies: ObservationCertDeficiencyCode[];
};

export function evaluateObservationChartCertification(
  input: ObservationCertInput
): ObservationCertResult {
  const deficiencies: ObservationCertDeficiencyCode[] = [];
  if (!input.hasProviderNote) deficiencies.push("MISSING_PROVIDER_NOTE");
  if (!input.hasReassessment) deficiencies.push("MISSING_REASSESSMENT");
  if (!input.hasNursingDocumentation) deficiencies.push("MISSING_NURSING_DOCUMENTATION");
  if (!input.hasOrdersReview) deficiencies.push("MISSING_ORDERS_REVIEW");

  const pathway = String(input.dispositionPathway ?? "").trim().toUpperCase();
  const needsDischarge =
    pathway === "DISCHARGE_HOME" || pathway === "AMA" || pathway === "DEATH" || pathway === "";
  if (needsDischarge && !input.hasDischargeSummary && pathway !== "") {
    deficiencies.push("MISSING_DISCHARGE_SUMMARY");
  }
  if (pathway === "" && !input.hasDischargeSummary) {
    // Open stay — discharge summary not required until disposition chosen.
  }

  return { complete: deficiencies.length === 0, deficiencies };
}
