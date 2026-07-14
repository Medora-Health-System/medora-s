import {
  computeLigamentDispositionRecommendations,
  resolveLigamentContextFromDiagnosis,
  type LigamentContext,
  type LigamentDiagnosisInput,
  type LigamentDispositionRecommendation,
  type LigamentModifier,
  type LigamentRegion,
} from "@/lib/ligamentClinicalIntelligence";

export type {
  LigamentContext,
  LigamentDiagnosisInput,
  LigamentDispositionRecommendation,
  LigamentModifier,
  LigamentRegion,
};

export function recommendLigamentDisposition(context: {
  regions: readonly LigamentRegion[];
  modifiers: readonly LigamentModifier[];
}): LigamentDispositionRecommendation[] {
  return computeLigamentDispositionRecommendations(context.regions, context.modifiers);
}

export function recommendLigamentDispositionFromDiagnosis(
  input: LigamentDiagnosisInput
): LigamentDispositionRecommendation[] {
  return resolveLigamentContextFromDiagnosis(input).dispositionRecommendations;
}
