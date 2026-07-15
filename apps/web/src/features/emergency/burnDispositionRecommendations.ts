import {
  computeBurnDispositionRecommendations as recommendBurnDisposition,
  resolveBurnContextFromDiagnosis,
} from "@/lib/burnClinicalIntelligence";

export { recommendBurnDisposition, resolveBurnContextFromDiagnosis };

export function recommendBurnDispositionFromDiagnosis(input: import("@/lib/burnClinicalIntelligence").BurnDiagnosisInput) {
  return resolveBurnContextFromDiagnosis(input).dispositionRecommendations;
}
