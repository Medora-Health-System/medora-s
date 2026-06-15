/** Phase 19MDM.3 — Respiratory / ENT complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildChestCongestionComplaintV1Intel,
  buildCoughComplaintV1Intel,
  buildFluLikeIllnessComplaintV1Intel,
  buildUriCongestionComplaintV1Intel,
} from "./providerDocumentationCoughUriComplaintIntelGoldStandard";
import { buildSoreThroatComplaintIntel } from "./providerDocumentationSoreThroatComplaintIntelGoldStandard";
import {
  buildAsthmaWheezingComplaintV1Intel,
  buildCopdExacerbationComplaintV1Intel,
  buildPneumoniaSymptomsComplaintV1Intel,
  buildHemoptysisComplaintV1Intel,
} from "./providerDocumentationShortnessOfBreathComplaintIntelGoldStandard";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const cough = (key: string) => `providerDocumentationComplaintIntel.coughComplaintV1.${key}`;
const uriCongestion = (key: string) => `providerDocumentationComplaintIntel.uriCongestionComplaintV1.${key}`;
const soreThroat = (key: string) => `providerDocumentationComplaintIntel.soreThroatComplaintV1.${key}`;
const asthmaWheezing = (key: string) => `providerDocumentationComplaintIntel.asthmaWheezingComplaintV1.${key}`;
const copdExacerbation = (key: string) => `providerDocumentationComplaintIntel.copdExacerbationComplaintV1.${key}`;
const pneumoniaSymptoms = (key: string) => `providerDocumentationComplaintIntel.pneumoniaSymptomsComplaintV1.${key}`;
const hemoptysis = (key: string) => `providerDocumentationComplaintIntel.hemoptysisComplaintV1.${key}`;
const chestCongestion = (key: string) => `providerDocumentationComplaintIntel.chestCongestionComplaintV1.${key}`;
const fluLikeIllness = (key: string) => `providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.${key}`;

export const COUGH_COMPLAINT_V1_INTEL = buildCoughComplaintV1Intel(cough);

export const URI_CONGESTION_COMPLAINT_V1_INTEL = buildUriCongestionComplaintV1Intel(uriCongestion);

export const SORE_THROAT_COMPLAINT_V1_INTEL = buildSoreThroatComplaintIntel(soreThroat);

export const ASTHMA_WHEEZING_COMPLAINT_V1_INTEL = buildAsthmaWheezingComplaintV1Intel(asthmaWheezing);

export const COPD_EXACERBATION_COMPLAINT_V1_INTEL = buildCopdExacerbationComplaintV1Intel(copdExacerbation);

export const PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL = buildPneumoniaSymptomsComplaintV1Intel(pneumoniaSymptoms);

export const HEMOPTYSIS_COMPLAINT_V1_INTEL = buildHemoptysisComplaintV1Intel(hemoptysis);

export const CHEST_CONGESTION_COMPLAINT_V1_INTEL = buildChestCongestionComplaintV1Intel(chestCongestion);

export const FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL = buildFluLikeIllnessComplaintV1Intel(fluLikeIllness);

export const RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS = [
  "cough_complaint_v1",
  "uri_congestion_complaint_v1",
  "sore_throat_complaint_v1",
  "asthma_wheezing_complaint_v1",
  "copd_exacerbation_complaint_v1",
  "pneumonia_symptoms_complaint_v1",
  "hemoptysis_complaint_v1",
  "chest_congestion_complaint_v1",
  "flu_like_illness_complaint_v1"
] as const;

export const RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  cough_complaint_v1: COUGH_COMPLAINT_V1_INTEL,
  uri_congestion_complaint_v1: URI_CONGESTION_COMPLAINT_V1_INTEL,
  sore_throat_complaint_v1: SORE_THROAT_COMPLAINT_V1_INTEL,
  asthma_wheezing_complaint_v1: ASTHMA_WHEEZING_COMPLAINT_V1_INTEL,
  copd_exacerbation_complaint_v1: COPD_EXACERBATION_COMPLAINT_V1_INTEL,
  pneumonia_symptoms_complaint_v1: PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL,
  hemoptysis_complaint_v1: HEMOPTYSIS_COMPLAINT_V1_INTEL,
  chest_congestion_complaint_v1: CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  flu_like_illness_complaint_v1: FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
} as const;