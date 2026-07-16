/** Phase 12 — ENT Emergencies complaint intelligence wiring (mirrors Phase 11 eye wiring in `providerDocumentationMskTraumaComplaintIntelligence19Mdm6.ts`). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildEntEarHearingVertigoAdultV1Intel,
  buildEntNoseEpistaxisAdultV1Intel,
  buildEntThroatNeckAirwayAdultV1Intel,
} from "./providerDocumentationEntEmergencyComplaintIntelGoldStandard";

const entEarHearingVertigoAdult = (key: string) => `providerDocumentationComplaintIntel.entEarHearingVertigoAdultV1.${key}`;
const entNoseEpistaxisAdult = (key: string) => `providerDocumentationComplaintIntel.entNoseEpistaxisAdultV1.${key}`;
const entThroatNeckAirwayAdult = (key: string) => `providerDocumentationComplaintIntel.entThroatNeckAirwayAdultV1.${key}`;

export const ENT_EAR_HEARING_VERTIGO_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildEntEarHearingVertigoAdultV1Intel(entEarHearingVertigoAdult);
export const ENT_NOSE_EPISTAXIS_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildEntNoseEpistaxisAdultV1Intel(entNoseEpistaxisAdult);
export const ENT_THROAT_NECK_AIRWAY_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildEntThroatNeckAirwayAdultV1Intel(entThroatNeckAirwayAdult);

export const ENT_EMERGENCY_COMPLAINT_V1_TEMPLATE_IDS = [
  "ent_ear_hearing_vertigo_adult_v1",
  "ent_nose_epistaxis_adult_v1",
  "ent_throat_neck_airway_adult_v1",
] as const;

export const ENT_EMERGENCY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  ent_ear_hearing_vertigo_adult_v1: ENT_EAR_HEARING_VERTIGO_ADULT_V1_INTEL,
  ent_nose_epistaxis_adult_v1: ENT_NOSE_EPISTAXIS_ADULT_V1_INTEL,
  ent_throat_neck_airway_adult_v1: ENT_THROAT_NECK_AIRWAY_ADULT_V1_INTEL,
} as const;
