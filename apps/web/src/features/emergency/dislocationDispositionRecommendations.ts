/**
 * Advisory dislocation disposition recommendations — never auto-applied to chart disposition.
 */
import {
  computeDislocationDispositionRecommendations,
  resolveDislocationContextFromDiagnosis,
  type DislocationContext,
  type DislocationDiagnosisInput,
  type DislocationDispositionRecommendation,
  type DislocationModifier,
  type DislocationRegion,
} from "@/lib/dislocationClinicalIntelligence";

export type {
  DislocationContext,
  DislocationDiagnosisInput,
  DislocationDispositionRecommendation,
  DislocationModifier,
  DislocationRegion,
};

export function recommendDislocationDisposition(context: {
  regions: readonly DislocationRegion[];
  modifiers: readonly DislocationModifier[];
}): DislocationDispositionRecommendation[] {
  return computeDislocationDispositionRecommendations(context.regions, context.modifiers);
}

export function recommendDislocationDispositionFromDiagnosis(
  input: DislocationDiagnosisInput
): DislocationDispositionRecommendation[] {
  return resolveDislocationContextFromDiagnosis(input).dispositionRecommendations;
}
