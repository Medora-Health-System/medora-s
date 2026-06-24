/**
 * MEDUI.MEDICATION.PAIN_MANAGEMENT_AND_CONTROLLED_SUBSTANCES_EXPANSION.1
 * Billing passthrough — values copied verbatim from existing certified manifests only.
 * Never invent HCPCS / NDC.
 */

import { ENTERPRISE_WAVE2_BILLING_BY_CODE } from "./enterpriseWave2BillingManifest.js";
import { ENTERPRISE_WAVE3_BILLING_BY_CODE } from "./enterpriseWave3BillingManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE } from "./enterpriseWave4EdHospitalBillingManifest.js";
import { ENTERPRISE_OBGYN_BILLING_BY_CODE } from "./enterpriseObgynBillingManifest.js";
import { ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_BY_CODE } from "./enterpriseSurgeryPerioperativeBillingManifest.js";
import { MEDICATION_BILLING_MAPPING_BY_CODE } from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";

export type PainManagementNdcConfidence = "verified" | "review" | "placeholder";

export type EnterprisePainManagementBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: PainManagementNdcConfidence;
  certifiedSource: "wave2" | "wave3" | "wave4" | "obgyn" | "surgery_perioperative" | "haiti_billing_mapping" | "haiti_ndc_map";
};

const CERTIFIED_PAIN_BILLING_CODES = [
  "KETOROLAC_15_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "KETOROLAC_30MG_IM",
  "ACETAMINOPHEN_500",
  "ACETAMINOPHEN_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "ACETAMINOPHEN_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE",
  "PARACETAMOL_1G_100ML_IV",
  "PARACETAMOL_1_G_COMPRIME_ORAL",
  "PARACETAMOL_120_MG_PER_5_ML_SIROP_ORAL",
  "PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTAL",
  "IBUPROFEN_400_MG_COMPRIME_ORAL",
  "IBUPROFEN_200",
  "IBUPROFEN_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL",
  "DICLOFENAC_75_MG_PER_3_ML_INJECTABLE_INJECTION",
  "GABAPENTIN_300_MG_GELULE_ORALE",
  "GABAPENTIN_600_MG_COMPRIME_ORALE",
  "PREGABALIN_75_MG_GELULE_ORALE",
  "BACLOFEN_10_MG_COMPRIME_ORALE",
  "TRAMADOL_50_MG_CAPSULE_ORAL",
  "TRAMADOL_100_MG_PER_2_ML_INJECTABLE_INJECTION",
  "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_2MG_ML_INJECTABLE",
  "HYDROMORPHONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_50MCG_ML_INJECTABLE",
  "FENTANYL_50_MCG_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_100_MCG_2_ML_INJECTABLE_INTRAVEINEUSE",
] as const;

function pickCertifiedEntry(catalogCode: string): EnterprisePainManagementBillingEntry | null {
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
  const obgyn = ENTERPRISE_OBGYN_BILLING_BY_CODE[catalogCode];
  if (obgyn) {
    return {
      catalogCode: obgyn.catalogCode,
      hcpcs: obgyn.hcpcs,
      description: obgyn.description,
      billingUnitType: obgyn.billingUnitType,
      ndc11: obgyn.ndc11,
      ndcDisplay: obgyn.ndcDisplay,
      ndcConfidence: obgyn.ndcConfidence,
      certifiedSource: "obgyn",
    };
  }
  const surgery = ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_BY_CODE[catalogCode];
  if (surgery) {
    return {
      catalogCode: surgery.catalogCode,
      hcpcs: surgery.hcpcs,
      description: surgery.description,
      billingUnitType: surgery.billingUnitType,
      ndc11: surgery.ndc11,
      ndcDisplay: surgery.ndcDisplay,
      ndcConfidence: surgery.ndcConfidence,
      certifiedSource: "surgery_perioperative",
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

export const ENTERPRISE_PAIN_MANAGEMENT_BILLING_MANIFEST: EnterprisePainManagementBillingEntry[] =
  CERTIFIED_PAIN_BILLING_CODES.flatMap((catalogCode) => {
    const entry = pickCertifiedEntry(catalogCode);
    return entry ? [entry] : [];
  });

export const ENTERPRISE_PAIN_MANAGEMENT_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_PAIN_MANAGEMENT_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterprisePainManagementBillingEntry>;
