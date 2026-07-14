import {
  computeAmputationDispositionRecommendations as recommendTraumaticAmputationDisposition,
  resolveAmputationContextFromDiagnosis,
} from "@/lib/traumaticAmputationClinicalIntelligence";
export { recommendTraumaticAmputationDisposition, resolveAmputationContextFromDiagnosis };
export function recommendTraumaticAmputationDispositionFromDiagnosis(input: import("@/lib/traumaticAmputationClinicalIntelligence").AmputationDiagnosisInput) {
  return resolveAmputationContextFromDiagnosis(input).dispositionRecommendations;
}
