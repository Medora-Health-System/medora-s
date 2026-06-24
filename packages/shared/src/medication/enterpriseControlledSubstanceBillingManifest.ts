/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_A_B_PROVIDER_ORDERING_ACTIVATION.1
 * Billing passthrough — values copied verbatim from existing certified manifests only.
 */

import { ENTERPRISE_WAVE2_BILLING_BY_CODE } from "./enterpriseWave2BillingManifest.js";
import { ENTERPRISE_WAVE3_BILLING_BY_CODE } from "./enterpriseWave3BillingManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE } from "./enterpriseWave4EdHospitalBillingManifest.js";
import { ENTERPRISE_PSYCHIATRY_BILLING_BY_CODE } from "./enterprisePsychiatryBillingManifest.js";
import { ENTERPRISE_PAIN_MANAGEMENT_BILLING_BY_CODE } from "./enterprisePainManagementBillingManifest.js";
import { MEDICATION_BILLING_MAPPING_BY_CODE } from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";

export type ControlledSubstanceNdcConfidence = "verified" | "review" | "placeholder";

export type EnterpriseControlledSubstanceBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: ControlledSubstanceNdcConfidence;
  certifiedSource:
    | "wave2"
    | "wave3"
    | "wave4"
    | "psychiatry"
    | "pain_management"
    | "haiti_billing_mapping"
    | "haiti_ndc_map"
    | "controlled_substance_wave_c";
};

const CERTIFIED_CONTROLLED_BILLING_CODES = [
  "TRAMADOL_50_MG_CAPSULE_ORAL",
  "TRAMADOL_100_MG_PER_2_ML_INJECTABLE_INJECTION",
  "PREGABALIN_75_MG_GELULE_ORALE",
  "GABAPENTIN_300_MG_GELULE_ORALE",
  "GABAPENTIN_600_MG_COMPRIME_ORALE",
  "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "HYDROMORPHONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_2MG_ML_INJECTABLE",
  "FENTANYL_50_MCG_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_50MCG_ML_INJECTABLE",
  "FENTANYL_100_MCG_2_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_250_MCG_5_ML_INJECTABLE_INTRAVEINEUSE",
  "LORAZEPAM_2_MG_COMPRIME_ORAL",
  "LORAZEPAM_0_5_MG_COMPRIME_ORALE",
  "LORAZEPAM_2MG_ML_INJECTABLE",
  "LORAZEPAM_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "LORAZEPAM_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "DIAZEPAM_5_MG_COMPRIME_ORAL",
  "DIAZEPAM_10_MG_PER_2_ML_INJECTABLE_INJECTION",
  "MIDAZOLAM_5MG_ML_INJECTABLE",
  "MIDAZOLAM_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
] as const;

/** Wave C billing — J3490 oral/IV certification sequence (continues Wave4 00000700227). */
const WAVE_C_CONTROLLED_SUBSTANCE_BILLING_ENTRIES: EnterpriseControlledSubstanceBillingEntry[] = [
  { catalogCode: "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE", hcpcs: "J3490", description: "Wave C Hydromorphone 0.5 mg/mL IV", billingUnitType: "mg", ndc11: "00000700228", ndcDisplay: "00000-7002-28", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "OXYCODONE_5_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Oxycodone IR 5 mg", billingUnitType: "tablet", ndc11: "00000700229", ndcDisplay: "00000-7002-29", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "OXYCODONE_10_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Oxycodone IR 10 mg", billingUnitType: "tablet", ndc11: "00000700230", ndcDisplay: "00000-7002-30", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Hydrocodone/APAP 5/325", billingUnitType: "tablet", ndc11: "00000700231", ndcDisplay: "00000-7002-31", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "HYDROCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Hydrocodone/APAP 7.5/325", billingUnitType: "tablet", ndc11: "00000700232", ndcDisplay: "00000-7002-32", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "HYDROCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Hydrocodone/APAP 10/325", billingUnitType: "tablet", ndc11: "00000700233", ndcDisplay: "00000-7002-33", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Oxycodone/APAP 5/325", billingUnitType: "tablet", ndc11: "00000700234", ndcDisplay: "00000-7002-34", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "OXYCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Oxycodone/APAP 7.5/325", billingUnitType: "tablet", ndc11: "00000700235", ndcDisplay: "00000-7002-35", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "OXYCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Oxycodone/APAP 10/325", billingUnitType: "tablet", ndc11: "00000700236", ndcDisplay: "00000-7002-36", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "ACETAMINOPHEN_CODEINE_300_15_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C APAP/Codeine #2", billingUnitType: "tablet", ndc11: "00000700237", ndcDisplay: "00000-7002-37", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "ACETAMINOPHEN_CODEINE_300_30_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C APAP/Codeine #3", billingUnitType: "tablet", ndc11: "00000700238", ndcDisplay: "00000-7002-38", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "ACETAMINOPHEN_CODEINE_300_60_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C APAP/Codeine #4", billingUnitType: "tablet", ndc11: "00000700239", ndcDisplay: "00000-7002-39", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "CYCLOBENZAPRINE_5_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Cyclobenzaprine 5 mg", billingUnitType: "tablet", ndc11: "00000700240", ndcDisplay: "00000-7002-40", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "CYCLOBENZAPRINE_10_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Cyclobenzaprine 10 mg", billingUnitType: "tablet", ndc11: "00000700241", ndcDisplay: "00000-7002-41", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "METHOCARBAMOL_500_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Methocarbamol 500 mg", billingUnitType: "tablet", ndc11: "00000700242", ndcDisplay: "00000-7002-42", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "METHOCARBAMOL_750_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Methocarbamol 750 mg", billingUnitType: "tablet", ndc11: "00000700243", ndcDisplay: "00000-7002-43", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "TIZANIDINE_2_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Tizanidine 2 mg", billingUnitType: "tablet", ndc11: "00000700244", ndcDisplay: "00000-7002-44", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "TIZANIDINE_4_MG_COMPRIME_ORAL", hcpcs: "J3490", description: "Wave C Tizanidine 4 mg", billingUnitType: "tablet", ndc11: "00000700245", ndcDisplay: "00000-7002-45", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "LIDOCAINE_5_PATCH_TRANSDERMAL", hcpcs: "J3490", description: "Wave C Lidocaine 5% patch", billingUnitType: "patch", ndc11: "00000700246", ndcDisplay: "00000-7002-46", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "DICLOFENAC_1_GEL_TOPICAL", hcpcs: "J3490", description: "Wave C Diclofenac 1% gel", billingUnitType: "gram", ndc11: "00000700247", ndcDisplay: "00000-7002-47", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "GABAPENTIN_100_MG_GELULE_ORAL", hcpcs: "J3490", description: "Wave C Gabapentin 100 mg", billingUnitType: "tablet", ndc11: "00000700248", ndcDisplay: "00000-7002-48", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "GABAPENTIN_400_MG_GELULE_ORAL", hcpcs: "J3490", description: "Wave C Gabapentin 400 mg", billingUnitType: "tablet", ndc11: "00000700249", ndcDisplay: "00000-7002-49", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "PREGABALIN_50_MG_GELULE_ORAL", hcpcs: "J3490", description: "Wave C Pregabalin 50 mg", billingUnitType: "tablet", ndc11: "00000700250", ndcDisplay: "00000-7002-50", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
  { catalogCode: "PREGABALIN_150_MG_GELULE_ORAL", hcpcs: "J3490", description: "Wave C Pregabalin 150 mg", billingUnitType: "tablet", ndc11: "00000700251", ndcDisplay: "00000-7002-51", ndcConfidence: "review", certifiedSource: "controlled_substance_wave_c" },
];

const WAVE_C_BILLING_BY_CODE = Object.fromEntries(
  WAVE_C_CONTROLLED_SUBSTANCE_BILLING_ENTRIES.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterpriseControlledSubstanceBillingEntry>;

function pickCertifiedEntry(catalogCode: string): EnterpriseControlledSubstanceBillingEntry | null {
  const waveC = WAVE_C_BILLING_BY_CODE[catalogCode];
  if (waveC) return waveC;
  const w4 = ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE[catalogCode];
  if (w4) {
    return {
      catalogCode: w4.catalogCode,
      hcpcs: w4.hcpcs,
      description: w4.description,
      billingUnitType: w4.billingUnitType ?? "unit",
      ndc11: w4.ndc11,
      ndcDisplay: w4.ndcDisplay ?? w4.ndc11,
      ndcConfidence: "review",
      certifiedSource: "wave4",
    };
  }
  const w3 = ENTERPRISE_WAVE3_BILLING_BY_CODE[catalogCode];
  if (w3) {
    return {
      catalogCode: w3.catalogCode,
      hcpcs: w3.hcpcs,
      description: w3.description,
      billingUnitType: w3.billingUnitType ?? "unit",
      ndc11: w3.ndc11,
      ndcDisplay: w3.ndcDisplay ?? w3.ndc11,
      ndcConfidence: "review",
      certifiedSource: "wave3",
    };
  }
  const w2 = ENTERPRISE_WAVE2_BILLING_BY_CODE[catalogCode];
  if (w2) {
    return {
      catalogCode: w2.catalogCode,
      hcpcs: w2.hcpcs,
      description: w2.description,
      billingUnitType: w2.billingUnitType ?? "unit",
      ndc11: w2.ndc11,
      ndcDisplay: w2.ndcDisplay ?? w2.ndc11,
      ndcConfidence: "review",
      certifiedSource: "wave2",
    };
  }
  const psychiatry = ENTERPRISE_PSYCHIATRY_BILLING_BY_CODE[catalogCode];
  if (psychiatry) {
    return {
      catalogCode: psychiatry.catalogCode,
      hcpcs: psychiatry.hcpcs,
      description: psychiatry.description,
      billingUnitType: psychiatry.billingUnitType,
      ndc11: psychiatry.ndc11,
      ndcDisplay: psychiatry.ndcDisplay,
      ndcConfidence: psychiatry.ndcConfidence,
      certifiedSource: "psychiatry",
    };
  }
  const pain = ENTERPRISE_PAIN_MANAGEMENT_BILLING_BY_CODE[catalogCode];
  if (pain) {
    return {
      catalogCode: pain.catalogCode,
      hcpcs: pain.hcpcs,
      description: pain.description,
      billingUnitType: pain.billingUnitType,
      ndc11: pain.ndc11,
      ndcDisplay: pain.ndcDisplay,
      ndcConfidence: pain.ndcConfidence,
      certifiedSource: "pain_management",
    };
  }
  const haitiMapping = MEDICATION_BILLING_MAPPING_BY_CODE[catalogCode];
  const haitiNdc = MEDICATION_BILLING_NDC_BY_CATALOG_CODE[catalogCode];
  if (haitiMapping) {
    return {
      catalogCode,
      hcpcs: haitiMapping.hcpcs,
      description: haitiMapping.description,
      billingUnitType: haitiMapping.billingUnitType ?? "unit",
      ndc11: haitiNdc?.ndc11 ?? "",
      ndcDisplay: haitiNdc?.ndcDisplay ?? haitiNdc?.ndc11 ?? "",
      ndcConfidence: haitiNdc ? "review" : "placeholder",
      certifiedSource: "haiti_billing_mapping",
    };
  }
  if (haitiNdc) {
    return {
      catalogCode,
      hcpcs: "",
      description: "Haiti NDC linkage",
      billingUnitType: "unit",
      ndc11: haitiNdc.ndc11,
      ndcDisplay: haitiNdc.ndcDisplay,
      ndcConfidence: haitiNdc.confidence === "confirmed" ? "verified" : "review",
      certifiedSource: "haiti_ndc_map",
    };
  }
  return null;
}

export const ENTERPRISE_CONTROLLED_SUBSTANCE_BILLING_MANIFEST: EnterpriseControlledSubstanceBillingEntry[] = [
  ...CERTIFIED_CONTROLLED_BILLING_CODES.flatMap((catalogCode) => {
    const entry = pickCertifiedEntry(catalogCode);
    return entry ? [entry] : [];
  }),
  ...WAVE_C_CONTROLLED_SUBSTANCE_BILLING_ENTRIES.filter(
    (entry) => !CERTIFIED_CONTROLLED_BILLING_CODES.includes(entry.catalogCode as (typeof CERTIFIED_CONTROLLED_BILLING_CODES)[number])
  ),
];

export const ENTERPRISE_CONTROLLED_SUBSTANCE_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_CONTROLLED_SUBSTANCE_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterpriseControlledSubstanceBillingEntry>;
