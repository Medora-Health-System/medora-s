import type {
  MsppDepartmentReviewSnapshot,
  MsppReviewActionBody,
} from "@/lib/msppApi";

function nonEmpty(s: string | null | undefined, fallback: string): string {
  const t = s?.trim();
  return t ? t : fallback;
}

function parseExposure(
  v: string | null | undefined
): MsppReviewActionBody["exposureRisk"] {
  if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "UNKNOWN") return v;
  return "UNKNOWN";
}

/**
 * Construit le corps API MSPP pour une décision **centrale** : reprend la chaîne départementale
 * et n’expose à la saisie que les champs centraux (notes, classification, justification, commentaire épidémiologique optionnel).
 */
export function buildReviewActionBodyForCentral(
  department: MsppDepartmentReviewSnapshot,
  central: {
    comment: string;
    caseClassification: MsppReviewActionBody["caseClassification"];
    finalDecisionRationale: string;
    epidemiologicComment?: string;
  }
): MsppReviewActionBody {
  const main = central.finalDecisionRationale.trim();
  const epi = central.epidemiologicComment?.trim();
  const finalRationale = epi
    ? `${main}\n\n[Commentaire épidémiologique — décision centrale]\n${epi}`
    : main;

  let symptomOnsetDate: string | undefined;
  if (department.symptomOnsetDate && department.symptomOnsetDate.length >= 10) {
    symptomOnsetDate = department.symptomOnsetDate.slice(0, 10);
  }

  return {
    comment: central.comment.trim(),
    fever: department.validationFever ?? false,
    duration: nonEmpty(department.validationDuration, "Non précisé"),
    labConfirmed: department.validationLabConfirmed ?? false,
    exposureRisk: parseExposure(department.validationExposureRisk),
    caseClassification: central.caseClassification,
    inclusionCriteriaSummary: nonEmpty(department.inclusionCriteriaSummary, "—"),
    exclusionCriteriaSummary: nonEmpty(department.exclusionCriteriaSummary, "—"),
    symptomOnsetDate,
    hospitalized: department.hospitalized ?? false,
    outcomeStatus: nonEmpty(department.outcomeStatus, "Non précisé"),
    labEvidenceType:
      (department.labEvidenceType as MsppReviewActionBody["labEvidenceType"]) ?? "NONE",
    epiLinkedCase: department.epiLinkedCase ?? false,
    travelOrExposureContext: nonEmpty(department.travelOrExposureContext, "Non précisé"),
    finalDecisionRationale: finalRationale,
  };
}
