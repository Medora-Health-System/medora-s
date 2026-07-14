import {
  computeTendonDispositionRecommendations,
  resolveTendonContextFromDiagnosis,
  type TendonContext,
  type TendonDiagnosisInput,
  type TendonDispositionRecommendation,
  type TendonModifier,
  type TendonRegion,
} from "@/lib/tendonClinicalIntelligence";

export type {
  TendonContext,
  TendonDiagnosisInput,
  TendonDispositionRecommendation,
  TendonModifier,
  TendonRegion,
};

export function recommendTendonDisposition(context: {
  regions: readonly TendonRegion[];
  modifiers: readonly TendonModifier[];
}): TendonDispositionRecommendation[] {
  return computeTendonDispositionRecommendations(context.regions, context.modifiers);
}

export function recommendTendonDispositionFromDiagnosis(input: TendonDiagnosisInput): TendonDispositionRecommendation[] {
  return resolveTendonContextFromDiagnosis(input).dispositionRecommendations;
}
