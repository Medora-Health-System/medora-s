/**
 * Advisory fracture disposition recommendations — never auto-applied to chart disposition.
 * Thin facade over `computeFractureDispositionRecommendations` for emergency-feature imports.
 */
import {
  computeFractureDispositionRecommendations,
  resolveFractureContextFromDiagnosis,
  type FractureContext,
  type FractureDiagnosisInput,
  type FractureDispositionRecommendation,
  type FractureModifier,
  type FractureRegion,
} from "@/lib/fractureClinicalIntelligence";

export type {
  FractureContext,
  FractureDiagnosisInput,
  FractureDispositionRecommendation,
  FractureModifier,
  FractureRegion,
};

export function recommendFractureDisposition(context: {
  regions: readonly FractureRegion[];
  modifiers: readonly FractureModifier[];
}): FractureDispositionRecommendation[] {
  return computeFractureDispositionRecommendations(context.regions, context.modifiers);
}

export function recommendFractureDispositionFromDiagnosis(
  input: FractureDiagnosisInput
): FractureDispositionRecommendation[] {
  return resolveFractureContextFromDiagnosis(input).dispositionRecommendations;
}
