import {
  resolveHumanBiteHighRiskWoundContextFromDiagnosis,
  type HumanBiteDiagnosisInput,
} from "@/lib/humanBiteHighRiskWoundClinicalIntelligence";

export {
  resolveHumanBiteHighRiskWoundContextFromDiagnosis,
};

/** Advisory only: clinician judgment determines disposition and consultation. */
export function recommendHumanBiteHighRiskWoundDispositionFromDiagnosis(input: HumanBiteDiagnosisInput) {
  return resolveHumanBiteHighRiskWoundContextFromDiagnosis(input).dispositionRecommendations;
}
