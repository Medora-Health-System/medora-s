/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.1 + .2
 * Clinical condition family definitions — additive scaffold; does not replace registry resolution yet.
 */

import { DOMAIN_EXTENSION_CLINICAL_CONDITION_FAMILIES } from "./providerDischargeConditionFamiliesDomainExtensions";
import { PHASE1_CLINICAL_CONDITION_FAMILIES } from "./providerDischargeConditionFamiliesPhase1";
import { TIER1_CLINICAL_CONDITION_FAMILIES } from "./providerDischargeConditionFamiliesTier1";
import { TIER2_CLINICAL_CONDITION_FAMILIES } from "./providerDischargeConditionFamiliesTier2";
import type {
  ClinicalConditionFamilyDefinition,
  ClinicalConditionFamilyReviewStatus,
  ClinicalConditionFamilyRoutingStatus,
  EdClinicalDomain,
} from "./providerDischargeConditionFamilyTypes";

export type {
  ClinicalConditionFamilyDefinition,
  ClinicalConditionFamilyReviewStatus,
  ClinicalConditionFamilyRoutingStatus,
  EdClinicalDomain,
  ClinicalConditionFamilyAgeGuardrail,
  ClinicalConditionFamilySexGuardrail,
  ClinicalConditionFamilyGuardrails,
  ClinicalConditionFamilySafetyGuardrails,
  ClinicalConditionFamilyIcdExactTemplateOverrides,
} from "./providerDischargeConditionFamilyTypes";

/** Union of all family ids — string for extensibility in phase 2. */
export type ClinicalConditionFamilyId = string;

export const CLINICAL_CONDITION_FAMILY_DEFINITIONS: readonly ClinicalConditionFamilyDefinition[] = [
  ...PHASE1_CLINICAL_CONDITION_FAMILIES,
  ...TIER1_CLINICAL_CONDITION_FAMILIES,
  ...TIER2_CLINICAL_CONDITION_FAMILIES,
  ...DOMAIN_EXTENSION_CLINICAL_CONDITION_FAMILIES,
];

export function getClinicalConditionFamilyById(
  id: ClinicalConditionFamilyId
): ClinicalConditionFamilyDefinition | undefined {
  return CLINICAL_CONDITION_FAMILY_DEFINITIONS.find((f) => f.id === id);
}

export function getRoutableClinicalConditionFamilies(): readonly ClinicalConditionFamilyDefinition[] {
  return CLINICAL_CONDITION_FAMILY_DEFINITIONS.filter(
    (f) => f.routingStatus !== "UNSAFE_DO_NOT_MAP"
  );
}
