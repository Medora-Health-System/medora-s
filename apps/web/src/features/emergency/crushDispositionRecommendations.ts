import {
  computeCrushDispositionRecommendations as recommendCrushDisposition,
  resolveCrushContextFromDiagnosis,
} from "@/lib/crushClinicalIntelligence";
export { recommendCrushDisposition, resolveCrushContextFromDiagnosis };
export function recommendCrushDispositionFromDiagnosis(input: import("@/lib/crushClinicalIntelligence").CrushDiagnosisInput) {
  return resolveCrushContextFromDiagnosis(input).dispositionRecommendations;
}
