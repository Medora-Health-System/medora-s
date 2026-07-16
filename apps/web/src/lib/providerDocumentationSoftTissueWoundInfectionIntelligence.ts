/** Phase 13 — Soft Tissue and Wound Infection complaint intelligence wiring (mirrors Phase 12 ENT wiring in `providerDocumentationEntEmergencyComplaintIntelligence.ts`). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildAbscessPurulentInfectionAdultV1Intel,
  buildHighRiskWoundInfectionAdultV1Intel,
  buildSoftTissueInfectionAdultV1Intel,
} from "./providerDocumentationSoftTissueWoundInfectionIntelGoldStandard";

const softTissueInfectionAdult = (key: string) => `providerDocumentationComplaintIntel.softTissueInfectionAdultV1.${key}`;
const abscessPurulentInfectionAdult = (key: string) =>
  `providerDocumentationComplaintIntel.abscessPurulentInfectionAdultV1.${key}`;
const highRiskWoundInfectionAdult = (key: string) =>
  `providerDocumentationComplaintIntel.highRiskWoundInfectionAdultV1.${key}`;

export const SOFT_TISSUE_INFECTION_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildSoftTissueInfectionAdultV1Intel(softTissueInfectionAdult);
export const ABSCESS_PURULENT_INFECTION_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAbscessPurulentInfectionAdultV1Intel(abscessPurulentInfectionAdult);
export const HIGH_RISK_WOUND_INFECTION_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHighRiskWoundInfectionAdultV1Intel(highRiskWoundInfectionAdult);

export const SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_TEMPLATE_IDS = [
  "soft_tissue_infection_adult_v1",
  "abscess_purulent_infection_adult_v1",
  "high_risk_wound_infection_adult_v1",
] as const;

export const SOFT_TISSUE_WOUND_INFECTION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  soft_tissue_infection_adult_v1: SOFT_TISSUE_INFECTION_ADULT_V1_INTEL,
  abscess_purulent_infection_adult_v1: ABSCESS_PURULENT_INFECTION_ADULT_V1_INTEL,
  high_risk_wound_infection_adult_v1: HIGH_RISK_WOUND_INFECTION_ADULT_V1_INTEL,
} as const;
