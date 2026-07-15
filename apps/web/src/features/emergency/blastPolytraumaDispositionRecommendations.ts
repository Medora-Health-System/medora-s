import {
  computeBlastPolytraumaDispositionRecommendations as recommendBlastPolytraumaDisposition,
  resolveBlastPolytraumaContextFromDiagnosis,
} from "@/lib/blastPolytraumaClinicalIntelligence";

export { recommendBlastPolytraumaDisposition, resolveBlastPolytraumaContextFromDiagnosis };

export function recommendBlastPolytraumaDispositionFromDiagnosis(
  input: import("@/lib/blastPolytraumaClinicalIntelligence").BlastPolytraumaDiagnosisInput,
) {
  return resolveBlastPolytraumaContextFromDiagnosis(input).dispositionRecommendations;
}
