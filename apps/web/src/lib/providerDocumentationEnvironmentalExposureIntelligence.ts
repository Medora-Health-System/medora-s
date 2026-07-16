/** Phase 15 (Commit 1) — Environmental / Exposure complaint intelligence wiring (mirrors Phase 14 wiring in `providerDocumentationDermatologyIntelligence.ts`). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildAltitudeDivingRadiationExposureAdultV1Intel,
  buildColdEnvironmentalInjuryAdultV1Intel,
  buildHeatEnvironmentalIllnessAdultV1Intel,
  buildSubmersionElectricalLightningAdultV1Intel,
} from "./providerDocumentationEnvironmentalExposureIntelGoldStandard";

const heatEnvironmentalIllnessAdult = (key: string) =>
  `providerDocumentationComplaintIntel.heatEnvironmentalIllnessAdultV1.${key}`;
const coldEnvironmentalInjuryAdult = (key: string) =>
  `providerDocumentationComplaintIntel.coldEnvironmentalInjuryAdultV1.${key}`;
const submersionElectricalLightningAdult = (key: string) =>
  `providerDocumentationComplaintIntel.submersionElectricalLightningAdultV1.${key}`;
const altitudeDivingRadiationExposureAdult = (key: string) =>
  `providerDocumentationComplaintIntel.altitudeDivingRadiationExposureAdultV1.${key}`;

export const HEAT_ENVIRONMENTAL_ILLNESS_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHeatEnvironmentalIllnessAdultV1Intel(heatEnvironmentalIllnessAdult);
export const COLD_ENVIRONMENTAL_INJURY_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildColdEnvironmentalInjuryAdultV1Intel(coldEnvironmentalInjuryAdult);
export const SUBMERSION_ELECTRICAL_LIGHTNING_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildSubmersionElectricalLightningAdultV1Intel(submersionElectricalLightningAdult);
export const ALTITUDE_DIVING_RADIATION_EXPOSURE_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAltitudeDivingRadiationExposureAdultV1Intel(altitudeDivingRadiationExposureAdult);

export const ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_TEMPLATE_IDS = [
  "heat_environmental_illness_adult_v1",
  "cold_environmental_injury_adult_v1",
  "submersion_electrical_lightning_adult_v1",
  "altitude_diving_radiation_exposure_adult_v1",
] as const;

export const ENVIRONMENTAL_EXPOSURE_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  heat_environmental_illness_adult_v1: HEAT_ENVIRONMENTAL_ILLNESS_ADULT_V1_INTEL,
  cold_environmental_injury_adult_v1: COLD_ENVIRONMENTAL_INJURY_ADULT_V1_INTEL,
  submersion_electrical_lightning_adult_v1: SUBMERSION_ELECTRICAL_LIGHTNING_ADULT_V1_INTEL,
  altitude_diving_radiation_exposure_adult_v1: ALTITUDE_DIVING_RADIATION_EXPOSURE_ADULT_V1_INTEL,
} as const;
