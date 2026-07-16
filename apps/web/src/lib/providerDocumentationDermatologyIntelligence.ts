/** Phase 14 — Dermatologic Emergency complaint intelligence wiring (mirrors Phase 13 wiring in `providerDocumentationSoftTissueWoundInfectionIntelligence.ts`). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildAllergicInflammatoryDermatologyAdultV1Intel,
  buildDermatologicEmergencyAdultV1Intel,
  buildDermatologicRashAdultV1Intel,
  buildVesicularBullousSkinDisorderAdultV1Intel,
} from "./providerDocumentationDermatologyIntelGoldStandard";

const dermatologicRashAdult = (key: string) => `providerDocumentationComplaintIntel.dermatologicRashAdultV1.${key}`;
const allergicInflammatoryDermatologyAdult = (key: string) =>
  `providerDocumentationComplaintIntel.allergicInflammatoryDermatologyAdultV1.${key}`;
const vesicularBullousSkinDisorderAdult = (key: string) =>
  `providerDocumentationComplaintIntel.vesicularBullousSkinDisorderAdultV1.${key}`;
const dermatologicEmergencyAdult = (key: string) =>
  `providerDocumentationComplaintIntel.dermatologicEmergencyAdultV1.${key}`;

export const DERMATOLOGIC_RASH_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDermatologicRashAdultV1Intel(dermatologicRashAdult);
export const ALLERGIC_INFLAMMATORY_DERMATOLOGY_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAllergicInflammatoryDermatologyAdultV1Intel(allergicInflammatoryDermatologyAdult);
export const VESICULAR_BULLOUS_SKIN_DISORDER_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildVesicularBullousSkinDisorderAdultV1Intel(vesicularBullousSkinDisorderAdult);
export const DERMATOLOGIC_EMERGENCY_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDermatologicEmergencyAdultV1Intel(dermatologicEmergencyAdult);

export const DERMATOLOGY_COMPLAINT_V1_TEMPLATE_IDS = [
  "dermatologic_rash_adult_v1",
  "allergic_inflammatory_dermatology_adult_v1",
  "vesicular_bullous_skin_disorder_adult_v1",
  "dermatologic_emergency_adult_v1",
] as const;

export const DERMATOLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  dermatologic_rash_adult_v1: DERMATOLOGIC_RASH_ADULT_V1_INTEL,
  allergic_inflammatory_dermatology_adult_v1: ALLERGIC_INFLAMMATORY_DERMATOLOGY_ADULT_V1_INTEL,
  vesicular_bullous_skin_disorder_adult_v1: VESICULAR_BULLOUS_SKIN_DISORDER_ADULT_V1_INTEL,
  dermatologic_emergency_adult_v1: DERMATOLOGIC_EMERGENCY_ADULT_V1_INTEL,
} as const;
