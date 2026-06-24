/**
 * MEDUI.MEDICATION.SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_EXPANSION.1
 * Billing passthrough — values copied verbatim from existing certified wave manifests only.
 * Never invent HCPCS / NDC.
 */

import { ENTERPRISE_WAVE2_BILLING_BY_CODE } from "./enterpriseWave2BillingManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE } from "./enterpriseWave4EdHospitalBillingManifest.js";
import { ENTERPRISE_GASTROENTEROLOGY_BILLING_BY_CODE } from "./enterpriseGastroenterologyBillingManifest.js";
import { ENTERPRISE_OBGYN_BILLING_BY_CODE } from "./enterpriseObgynBillingManifest.js";

export type SurgeryPerioperativeNdcConfidence = "verified" | "review" | "placeholder";

export type EnterpriseSurgeryPerioperativeBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: SurgeryPerioperativeNdcConfidence;
  certifiedSource: "wave2" | "wave4" | "gastroenterology" | "obgyn";
};

const CERTIFIED_SURGERY_BILLING_CODES = [
  "CEFAZOLIN_2_G_POUDRE_INTRAVEINEUSE",
  "METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_INTRAVENOUS",
  "KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "KETOROLAC_15_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "TRANEXAMIC_ACID_500_MG_PER_5_ML_INJECTABLE_INJECTION",
  "LIDOCAINE_2_INJECTABLE_INJECTABLE",
  "BUPIVACAINE_0_5_INJECTABLE_INJECTABLE",
  "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
  "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION",
  "PANTOPRAZOLE_40MG_IV",
  "DOCUSATE_100_MG_GELULE_ORALE",
  "SENNA_8_6_MG_COMPRIME_ORALE",
  "POLYETHYLENE_GLYCOL_17_G_POUDRE_ORALE",
  "FAMOTIDINE_20MG_IV",
] as const;

function pickCertifiedEntry(
  catalogCode: string
): EnterpriseSurgeryPerioperativeBillingEntry | null {
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
  const gastro = ENTERPRISE_GASTROENTEROLOGY_BILLING_BY_CODE[catalogCode];
  if (gastro) {
    return {
      catalogCode: gastro.catalogCode,
      hcpcs: gastro.hcpcs,
      description: gastro.description,
      billingUnitType: gastro.billingUnitType,
      ndc11: gastro.ndc11,
      ndcDisplay: gastro.ndcDisplay,
      ndcConfidence: gastro.ndcConfidence,
      certifiedSource: "gastroenterology",
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
  return null;
}

export const ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_MANIFEST: EnterpriseSurgeryPerioperativeBillingEntry[] =
  CERTIFIED_SURGERY_BILLING_CODES.flatMap((catalogCode) => {
    const entry = pickCertifiedEntry(catalogCode);
    return entry ? [entry] : [];
  });

export const ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterpriseSurgeryPerioperativeBillingEntry>;
