/** Phase 16 (Commit 1) — Toxicology / envenomation complaint intelligence wiring. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildEnvenomationPoisonousExposureAdultV1Intel,
  buildInhaledIndustrialToxicExposureAdultV1Intel,
  buildSubstanceIntoxicationWithdrawalAdultV1Intel,
  buildToxicIngestionOverdoseAdultV1Intel,
} from "./providerDocumentationToxicologyIntelGoldStandard";

const toxicIngestionOverdoseAdult = (key: string) =>
  `providerDocumentationComplaintIntel.toxicIngestionOverdoseAdultV1.${key}`;
const substanceIntoxicationWithdrawalAdult = (key: string) =>
  `providerDocumentationComplaintIntel.substanceIntoxicationWithdrawalAdultV1.${key}`;
const inhaledIndustrialToxicExposureAdult = (key: string) =>
  `providerDocumentationComplaintIntel.inhaledIndustrialToxicExposureAdultV1.${key}`;
const envenomationPoisonousExposureAdult = (key: string) =>
  `providerDocumentationComplaintIntel.envenomationPoisonousExposureAdultV1.${key}`;

export const TOXIC_INGESTION_OVERDOSE_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildToxicIngestionOverdoseAdultV1Intel(toxicIngestionOverdoseAdult);
export const SUBSTANCE_INTOXICATION_WITHDRAWAL_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildSubstanceIntoxicationWithdrawalAdultV1Intel(substanceIntoxicationWithdrawalAdult);
export const INHALED_INDUSTRIAL_TOXIC_EXPOSURE_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildInhaledIndustrialToxicExposureAdultV1Intel(inhaledIndustrialToxicExposureAdult);
export const ENVENOMATION_POISONOUS_EXPOSURE_ADULT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildEnvenomationPoisonousExposureAdultV1Intel(envenomationPoisonousExposureAdult);

export const TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS = [
  "toxic_ingestion_overdose_adult_v1",
  "substance_intoxication_withdrawal_adult_v1",
  "inhaled_industrial_toxic_exposure_adult_v1",
  "envenomation_poisonous_exposure_adult_v1",
] as const;

export const TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  toxic_ingestion_overdose_adult_v1: TOXIC_INGESTION_OVERDOSE_ADULT_V1_INTEL,
  substance_intoxication_withdrawal_adult_v1: SUBSTANCE_INTOXICATION_WITHDRAWAL_ADULT_V1_INTEL,
  inhaled_industrial_toxic_exposure_adult_v1: INHALED_INDUSTRIAL_TOXIC_EXPOSURE_ADULT_V1_INTEL,
  envenomation_poisonous_exposure_adult_v1: ENVENOMATION_POISONOUS_EXPOSURE_ADULT_V1_INTEL,
} as const;
