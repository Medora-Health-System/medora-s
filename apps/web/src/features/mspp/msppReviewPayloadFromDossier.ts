import type { MsppFacilityDossier, MsppReviewActionBody } from "@/lib/msppApi";

export type DepartmentReviewFormValues = {
  comment: string;
  inclusionCriteriaSummary: string;
  exclusionCriteriaSummary: string;
  caseClassification: MsppReviewActionBody["caseClassification"];
  finalDecisionRationale: string;
};

/**
 * Fusionne le dossier établissement avec la revue départementale saisie pour respecter le DTO MSPP existant
 * (sans resaisie des champs clinique/labo par le validateur).
 */
export function buildReviewActionBodyFromFacilityDossier(
  dossier: MsppFacilityDossier | null | undefined,
  dept: DepartmentReviewFormValues
): MsppReviewActionBody {
  const d = dossier;
  const duration =
    d?.symptomDuration?.trim() || "Non précisé dans le dossier établissement";
  const outcome =
    d?.outcomeStatus?.trim() || "Non précisé dans le dossier établissement";
  const travel =
    d?.travelOrExposureContext?.trim() || "Non précisé dans le dossier établissement";

  const labEt =
    (d?.labEvidenceType as MsppReviewActionBody["labEvidenceType"]) ?? "NONE";

  let symptomOnsetDate: string | undefined;
  if (d?.onsetDate && d.onsetDate.length >= 10) {
    symptomOnsetDate = d.onsetDate.slice(0, 10);
  }

  return {
    comment: dept.comment.trim(),
    inclusionCriteriaSummary: dept.inclusionCriteriaSummary.trim(),
    exclusionCriteriaSummary: dept.exclusionCriteriaSummary.trim(),
    caseClassification: dept.caseClassification,
    finalDecisionRationale: dept.finalDecisionRationale.trim(),
    fever: d?.feverReported ?? false,
    duration,
    labConfirmed: d?.labConfirmed ?? false,
    exposureRisk: "UNKNOWN",
    symptomOnsetDate,
    hospitalized: d?.hospitalized ?? false,
    outcomeStatus: outcome,
    labEvidenceType: labEt,
    epiLinkedCase: d?.epiLinkedCase ?? false,
    travelOrExposureContext: travel,
  };
}
