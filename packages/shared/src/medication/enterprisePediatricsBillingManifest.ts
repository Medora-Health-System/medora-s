/**
 * MEDUI.MEDICATION.PEDIATRICS_PROVIDER_ORDERING_EXPANSION.1
 * Billing / NDC manifest for pediatrics catalog remediation and Haiti gap fill.
 */

export type PediatricsNdcConfidence = "verified" | "review" | "placeholder";

export type EnterprisePediatricsBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: PediatricsNdcConfidence;
};

export const ENTERPRISE_PEDIATRICS_BILLING_MANIFEST: EnterprisePediatricsBillingEntry[] = [
  {
    catalogCode: "CEFDINIR_125_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL",
    hcpcs: "J3490",
    description: "Cefdinir 125 mg/5 mL oral suspension",
    billingUnitType: "mL",
    ndc11: "00001000101",
    ndcDisplay: "00000-1001-01",
    ndcConfidence: "review",
  },
  {
    catalogCode: "ERYTHROMYCIN_0_5_OPHTHALMIQUE_OPHTHALMIQUE",
    hcpcs: "J3490",
    description: "Erythromycin 0.5% ophthalmic ointment",
    billingUnitType: "gram",
    ndc11: "00001000102",
    ndcDisplay: "00000-1001-02",
    ndcConfidence: "review",
  },
  {
    catalogCode: "PARACETAMOL_120_MG_PER_5_ML_SIROP_ORAL",
    hcpcs: "J3490",
    description: "Acetaminophen 120 mg/5 mL oral",
    billingUnitType: "mL",
    ndc11: "00001000103",
    ndcDisplay: "00000-1001-03",
    ndcConfidence: "review",
  },
  {
    catalogCode: "PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTAL",
    hcpcs: "J3490",
    description: "Acetaminophen 250 mg suppository",
    billingUnitType: "suppository",
    ndc11: "00001000104",
    ndcDisplay: "00000-1001-04",
    ndcConfidence: "review",
  },
  {
    catalogCode: "CETIRIZINE_1_MG_PER_ML_SIROP_ORAL",
    hcpcs: "J3490",
    description: "Cetirizine 1 mg/mL oral syrup",
    billingUnitType: "mL",
    ndc11: "00001000105",
    ndcDisplay: "00000-1001-05",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LORATADINE_5_MG_PER_5_ML_SIROP_ORAL",
    hcpcs: "J3490",
    description: "Loratadine 5 mg/5 mL oral syrup",
    billingUnitType: "mL",
    ndc11: "00001000106",
    ndcDisplay: "00000-1001-06",
    ndcConfidence: "review",
  },
  {
    catalogCode: "CLINDAMYCIN_300_MG_CAPSULE_ORAL",
    hcpcs: "J3490",
    description: "Clindamycin 300 mg oral",
    billingUnitType: "capsule",
    ndc11: "00001000107",
    ndcDisplay: "00000-1001-07",
    ndcConfidence: "review",
  },
  {
    catalogCode: "PHYTONADIONE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    hcpcs: "J3420",
    description: "Vitamin K (phytonadione) injection",
    billingUnitType: "mg",
    ndc11: "00001000108",
    ndcDisplay: "00000-1001-08",
    ndcConfidence: "review",
  },
];

export const ENTERPRISE_PEDIATRICS_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_PEDIATRICS_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterprisePediatricsBillingEntry>;
