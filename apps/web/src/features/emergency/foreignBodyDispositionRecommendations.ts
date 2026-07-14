import {
  computeForeignBodyDispositionRecommendations as recommendForeignBodyDisposition,
  resolveForeignBodyContextFromDiagnosis,
} from "@/lib/foreignBodyClinicalIntelligence";
export { recommendForeignBodyDisposition, resolveForeignBodyContextFromDiagnosis };
export function recommendForeignBodyDispositionFromDiagnosis(input: import("@/lib/foreignBodyClinicalIntelligence").ForeignBodyDiagnosisInput) {
  return resolveForeignBodyContextFromDiagnosis(input).dispositionRecommendations;
}
