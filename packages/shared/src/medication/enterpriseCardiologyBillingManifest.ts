/**
 * MEDUI.MEDICATION.CARDIOLOGY_PROVIDER_ORDERING_EXPANSION.1
 * Billing / NDC manifest for cardiology catalog remediation.
 */

export type CardiologyNdcConfidence = "verified" | "review" | "placeholder";

export type EnterpriseCardiologyBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: CardiologyNdcConfidence;
};

export const ENTERPRISE_CARDIOLOGY_BILLING_MANIFEST: EnterpriseCardiologyBillingEntry[] = [
  {
    catalogCode: "SACUBITRIL_VALSARTAN_24_26_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Cardiology Sacubitril/Valsartan 24/26 mg",
    billingUnitType: "tablet",
    ndc11: "00000600133",
    ndcDisplay: "00000-6001-33",
    ndcConfidence: "review",
  },
  {
    catalogCode: "SACUBITRIL_VALSARTAN_49_51_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Cardiology Sacubitril/Valsartan 49/51 mg",
    billingUnitType: "tablet",
    ndc11: "00000600134",
    ndcDisplay: "00000-6001-34",
    ndcConfidence: "review",
  },
  {
    catalogCode: "BUMETANIDE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    hcpcs: "J3490",
    description: "Cardiology Bumetanide 1 mg/mL IV",
    billingUnitType: "mg",
    ndc11: "00000600135",
    ndcDisplay: "00000-6001-35",
    ndcConfidence: "review",
  },
  {
    catalogCode: "NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_CARDIOLOGY",
    hcpcs: "J3490",
    description: "Cardiology Nitroglycerin 0.4 mg SL",
    billingUnitType: "tablet",
    ndc11: "00000600137",
    ndcDisplay: "00000-6001-37",
    ndcConfidence: "review",
  },
  {
    catalogCode: "FUROSEMIDE_40_MG_4_ML_INJECTABLE_INTRAVEINEUSE",
    hcpcs: "J1940",
    description: "Cardiology Furosemide 40 mg/4 mL IV",
    billingUnitType: "mg",
    ndc11: "00000600138",
    ndcDisplay: "00000-6001-38",
    ndcConfidence: "review",
  },
];

export const ENTERPRISE_CARDIOLOGY_BILLING_BY_CODE: Record<string, EnterpriseCardiologyBillingEntry> =
  Object.fromEntries(ENTERPRISE_CARDIOLOGY_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry]));
