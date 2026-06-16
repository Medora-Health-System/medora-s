/** Phase 19MDM.2 — GI / abdominal complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { buildAbdominalPainComplaintV1Intel } from "./providerDocumentationAbdominalPainComplaintIntelGoldStandard";
import { buildNauseaVomitingComplaintV1Intel } from "./providerDocumentationNauseaVomitingComplaintIntelGoldStandard";
import { buildDiarrheaComplaintV1Intel } from "./providerDocumentationDiarrheaComplaintIntelGoldStandard";
import { buildFlankPainComplaintV1GiIntel } from "./providerDocumentationFlankPainRenalComplaintIntelGoldStandard";
import {
  buildConstipationComplaintV1Intel,
  buildDysphagiaComplaintV1Intel,
  buildGiBleedComplaintV1Intel,
  buildHerniaComplaintV1Intel,
  buildRectalPainComplaintV1Intel,
} from "./providerDocumentationGiExtensionsComplaintIntelGoldStandard";

const abdominalPain = (key: string) => `providerDocumentationComplaintIntel.abdominalPainComplaintV1.${key}`;
const nauseaVomiting = (key: string) => `providerDocumentationComplaintIntel.nauseaVomitingComplaintV1.${key}`;
const diarrhea = (key: string) => `providerDocumentationComplaintIntel.diarrheaComplaintV1.${key}`;
const constipation = (key: string) => `providerDocumentationComplaintIntel.constipationComplaintV1.${key}`;
const giBleed = (key: string) => `providerDocumentationComplaintIntel.giBleedComplaintV1.${key}`;
const flankPain = (key: string) => `providerDocumentationComplaintIntel.flankPainComplaintV1.${key}`;
const hernia = (key: string) => `providerDocumentationComplaintIntel.herniaComplaintV1.${key}`;
const rectalPain = (key: string) => `providerDocumentationComplaintIntel.rectalPainComplaintV1.${key}`;
const dysphagia = (key: string) => `providerDocumentationComplaintIntel.dysphagiaComplaintV1.${key}`;

export const ABDOMINAL_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAbdominalPainComplaintV1Intel(abdominalPain);

export const NAUSEA_VOMITING_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildNauseaVomitingComplaintV1Intel(nauseaVomiting);

export const DIARRHEA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDiarrheaComplaintV1Intel(diarrhea);

export const CONSTIPATION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildConstipationComplaintV1Intel(constipation);

export const GI_BLEED_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildGiBleedComplaintV1Intel(giBleed);

export const FLANK_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildFlankPainComplaintV1GiIntel(flankPain);

export const HERNIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHerniaComplaintV1Intel(hernia);

export const RECTAL_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildRectalPainComplaintV1Intel(rectalPain);

export const DYSPHAGIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDysphagiaComplaintV1Intel(dysphagia);

export const GI_COMPLAINT_V1_TEMPLATE_IDS = [
  "abdominal_pain_complaint_v1",
  "nausea_vomiting_complaint_v1",
  "diarrhea_complaint_v1",
  "constipation_complaint_v1",
  "gi_bleed_complaint_v1",
  "flank_pain_complaint_v1",
  "hernia_complaint_v1",
  "rectal_pain_complaint_v1",
  "dysphagia_complaint_v1",
] as const;

export const GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  abdominal_pain_complaint_v1: ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
  nausea_vomiting_complaint_v1: NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  diarrhea_complaint_v1: DIARRHEA_COMPLAINT_V1_INTEL,
  constipation_complaint_v1: CONSTIPATION_COMPLAINT_V1_INTEL,
  gi_bleed_complaint_v1: GI_BLEED_COMPLAINT_V1_INTEL,
  flank_pain_complaint_v1: FLANK_PAIN_COMPLAINT_V1_INTEL,
  hernia_complaint_v1: HERNIA_COMPLAINT_V1_INTEL,
  rectal_pain_complaint_v1: RECTAL_PAIN_COMPLAINT_V1_INTEL,
  dysphagia_complaint_v1: DYSPHAGIA_COMPLAINT_V1_INTEL,
} as const;
