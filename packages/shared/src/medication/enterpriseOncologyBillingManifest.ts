/**
 * MEDUI.MEDICATION.ONCOLOGY_GOVERNANCE_AND_FORMULARY_EXPANSION.1
 * Oncology formulary billing / NDC manifest — catalog support only, no activation.
 */

export type NdcMappingConfidence = "verified" | "review" | "placeholder";

export type EnterpriseOncologyBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: NdcMappingConfidence;
};

export const ENTERPRISE_ONCOLOGY_BILLING_MANIFEST: EnterpriseOncologyBillingEntry[] = [
  {
    catalogCode: "FILGRASTIM_480_MCG_1_6_ML_INJECTABLE_SOUS_CUTANEE",
    hcpcs: "J9271",
    description: "Oncology Filgrastim 480 mcg/1.6 mL",
    billingUnitType: "mcg",
    ndc11: "00000600120",
    ndcDisplay: "00000-6001-20",
    ndcConfidence: "review",
  },
  {
    catalogCode: "RASBURICASE_1_5_MG_POUDRE_INTRAVEINEUSE",
    hcpcs: "J2783",
    description: "Oncology Rasburicase 1.5 mg",
    billingUnitType: "mg",
    ndc11: "00000600121",
    ndcDisplay: "00000-6001-21",
    ndcConfidence: "review",
  },
  {
    catalogCode: "CYCLOPHOSPHAMIDE_1000_MG_POUDRE_INTRAVEINEUSE",
    hcpcs: "J8530",
    description: "Oncology Cyclophosphamide 1000 mg",
    billingUnitType: "mg",
    ndc11: "00000600122",
    ndcDisplay: "00000-6001-22",
    ndcConfidence: "review",
  },
  {
    catalogCode: "DOXORUBICIN_50_MG_POUDRE_INTRAVEINEUSE",
    hcpcs: "J9000",
    description: "Oncology Doxorubicin 50 mg",
    billingUnitType: "mg",
    ndc11: "00000600123",
    ndcDisplay: "00000-6001-23",
    ndcConfidence: "review",
  },
  {
    catalogCode: "CISPLATIN_50_MG_POUDRE_INTRAVEINEUSE",
    hcpcs: "J9060",
    description: "Oncology Cisplatin 50 mg",
    billingUnitType: "mg",
    ndc11: "00000600124",
    ndcDisplay: "00000-6001-24",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LEUCOVORIN_100_MG_POUDRE_INTRAVEINEUSE",
    hcpcs: "J0640",
    description: "Oncology Leucovorin 100 mg IV",
    billingUnitType: "mg",
    ndc11: "00000600125",
    ndcDisplay: "00000-6001-25",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LEUCOVORIN_15_MG_COMPRIME_ORALE",
    hcpcs: "J0640",
    description: "Oncology Leucovorin 15 mg PO",
    billingUnitType: "tablet",
    ndc11: "00000600126",
    ndcDisplay: "00000-6001-26",
    ndcConfidence: "review",
  },
];

export const ENTERPRISE_ONCOLOGY_BILLING_BY_CODE: Record<string, EnterpriseOncologyBillingEntry> =
  Object.fromEntries(ENTERPRISE_ONCOLOGY_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry]));
