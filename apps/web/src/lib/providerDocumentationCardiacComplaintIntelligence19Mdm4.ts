/** Phase 19MDM.4 — Cardiac / vascular complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildAfibRapidRateComplaintV1Intel,
  buildChfSymptomsComplaintV1Intel,
  buildEdemaVolumeOverloadComplaintV1Intel,
  buildExertionalDyspneaComplaintV1Intel,
  buildGeneralizedWeaknessCardiacEquivalentComplaintV1Intel,
  buildHypertensionComplaintV1Intel,
  buildLegSwellingDvtComplaintV1Intel,
  buildPalpitationsComplaintV1Intel,
  CARDIAC_NON_CHEST_PAIN_TEMPLATE_IDS,
} from "./providerDocumentationCardiacNonChestPainComplaintIntelGoldStandard";
import { buildNearSyncopeComplaintV1Intel } from "./providerDocumentationDizzinessVertigoComplaintIntelGoldStandard";

const palpitations = (key: string) => `providerDocumentationComplaintIntel.palpitationsComplaintV1.${key}`;
const hypertension = (key: string) => `providerDocumentationComplaintIntel.hypertensionComplaintV1.${key}`;
const legSwellingDvt = (key: string) => `providerDocumentationComplaintIntel.legSwellingDvtComplaintV1.${key}`;
const chfSymptoms = (key: string) => `providerDocumentationComplaintIntel.chfSymptomsComplaintV1.${key}`;
const afibRapidRate = (key: string) => `providerDocumentationComplaintIntel.afibRapidRateComplaintV1.${key}`;
const generalizedWeaknessCardiacEquivalent = (key: string) =>
  `providerDocumentationComplaintIntel.generalizedWeaknessCardiacEquivalentComplaintV1.${key}`;
const nearSyncope = (key: string) => `providerDocumentationComplaintIntel.nearSyncopeComplaintV1.${key}`;
const exertionalDyspnea = (key: string) => `providerDocumentationComplaintIntel.exertionalDyspneaComplaintV1.${key}`;
const edemaVolumeOverload = (key: string) => `providerDocumentationComplaintIntel.edemaVolumeOverloadComplaintV1.${key}`;

export const PALPITATIONS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPalpitationsComplaintV1Intel(palpitations);
export const HYPERTENSION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHypertensionComplaintV1Intel(hypertension);
export const LEG_SWELLING_DVT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildLegSwellingDvtComplaintV1Intel(legSwellingDvt);
export const CHF_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildChfSymptomsComplaintV1Intel(chfSymptoms);
export const AFIB_RAPID_RATE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAfibRapidRateComplaintV1Intel(afibRapidRate);
export const GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildGeneralizedWeaknessCardiacEquivalentComplaintV1Intel(generalizedWeaknessCardiacEquivalent);
export const NEAR_SYNCOPE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildNearSyncopeComplaintV1Intel(nearSyncope);
export const EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildExertionalDyspneaComplaintV1Intel(exertionalDyspnea);
export const EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildEdemaVolumeOverloadComplaintV1Intel(edemaVolumeOverload);

export const CARDIAC_COMPLAINT_V1_TEMPLATE_IDS = CARDIAC_NON_CHEST_PAIN_TEMPLATE_IDS;

export const CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  palpitations_complaint_v1: PALPITATIONS_COMPLAINT_V1_INTEL,
  hypertension_complaint_v1: HYPERTENSION_COMPLAINT_V1_INTEL,
  leg_swelling_dvt_complaint_v1: LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  chf_symptoms_complaint_v1: CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  afib_rapid_rate_complaint_v1: AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  generalized_weakness_cardiac_equivalent_complaint_v1: GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  near_syncope_complaint_v1: NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  exertional_dyspnea_complaint_v1: EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  edema_volume_overload_complaint_v1: EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
} as const;
