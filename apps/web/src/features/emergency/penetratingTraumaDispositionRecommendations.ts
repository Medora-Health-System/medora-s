import {
  computePenetratingTraumaDispositionRecommendations as recommendPenetratingTraumaDisposition,
  resolvePenetratingTraumaContextFromDiagnosis,
} from "@/lib/penetratingTraumaClinicalIntelligence";

export { recommendPenetratingTraumaDisposition, resolvePenetratingTraumaContextFromDiagnosis };

export function recommendPenetratingTraumaDispositionFromDiagnosis(input: import("@/lib/penetratingTraumaClinicalIntelligence").PenetratingTraumaDiagnosisInput) {
  return resolvePenetratingTraumaContextFromDiagnosis(input).dispositionRecommendations;
}
