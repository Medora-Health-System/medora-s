/**
 * Advisory sprain/strain disposition recommendations — never auto-applied to chart disposition.
 */
import {
  computeSprainStrainDispositionRecommendations,
  resolveSprainStrainContextFromDiagnosis,
  type SprainStrainContext,
  type SprainStrainDiagnosisInput,
  type SprainStrainDispositionRecommendation,
  type SprainStrainModifier,
  type SprainStrainRegion,
} from "@/lib/sprainStrainClinicalIntelligence";

export type {
  SprainStrainContext,
  SprainStrainDiagnosisInput,
  SprainStrainDispositionRecommendation,
  SprainStrainModifier,
  SprainStrainRegion,
};

export function recommendSprainStrainDisposition(context: {
  regions: readonly SprainStrainRegion[];
  modifiers: readonly SprainStrainModifier[];
}): SprainStrainDispositionRecommendation[] {
  return computeSprainStrainDispositionRecommendations(context.regions, context.modifiers);
}

export function recommendSprainStrainDispositionFromDiagnosis(
  input: SprainStrainDiagnosisInput
): SprainStrainDispositionRecommendation[] {
  return resolveSprainStrainContextFromDiagnosis(input).dispositionRecommendations;
}
